import { translateTextGoogle, fetchGoogleTTS } from './translation-service.js';
import { MAX_CAPTURE_LENGTH, JOB_TTL, screenshotRect } from './ocr-utils.js';
import { installModelService } from './ocr/model-download.js';
import { createUiStyleLoader } from './ui-style-service.js';
import { installCutoutService } from './ocr/cutout-model-download.js';
import { installOcrTranslation } from './ocr/translation-port.js';
import { capturePage, captureVisible } from './page-capture.js';
import { captureAssets } from './capture-transfer.js';

installModelService();
installCutoutService();
installOcrTranslation();
const loadUiStyles = createUiStyleLoader(path => chrome.runtime.getURL(path));
const assets = captureAssets(chrome.runtime);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const menu of [
      { id: 'instant-translate', title: '翻譯選取文字', contexts: ['selection'] },
      { id: 'screenshot-ocr', title: '截圖與標註', contexts: ['page', 'selection', 'image', 'link', 'video', 'audio', 'editable', 'frame'] },
      { id: 'capture-visible', title: '視窗截圖', contexts: ['page', 'selection', 'image', 'link', 'video', 'audio', 'editable', 'frame'] },
      { id: 'capture-fullpage', title: '整頁截圖', contexts: ['page', 'selection', 'image', 'link', 'video', 'audio', 'editable', 'frame'] },
      { id: 'image-ocr', title: '圖片文字辨識', contexts: ['image'] }
    ]) chrome.contextMenus.create({ ...menu, documentUrlPatterns: ['http://*/*', 'https://*/*'] });
    chrome.contextMenus.create({ id: 'screenshot-shortcut', title: '設定截圖快捷鍵', contexts: ['action'] });
    chrome.contextMenus.create({ id: 'import-image', title: '匯入圖片／本機去背', contexts: ['action'] });
    chrome.contextMenus.create({ id: 'support-pagekit', title: '請我喝杯咖啡（US$3／杯）', contexts: ['action'] });
  });
});

function editorWindow(url, incognito = false) {
  return chrome.windows.create({ url: chrome.runtime.getURL(url), type: 'popup', width: 1200, height: 820, focused: true, incognito });
}

async function openEditor(job, incognito = false) {
  const id = crypto.randomUUID();
  const key = `ocr:${id}`;
  await chrome.storage.session.set({ [key]: { ...job, createdAt: Date.now() } });
  try { await editorWindow(`ocr/ocr.html#${id}`, incognito); }
  catch (error) { await chrome.storage.session.remove(key); throw error; }
}

async function expireJobs() {
  const existing = await chrome.storage.session.get(null);
  const expired = Object.keys(existing).filter(key => /^(ocr|region):/.test(key) && Date.now() - existing[key].createdAt > JOB_TTL);
  if (expired.length) await chrome.storage.session.remove(expired);
}

const captureRequests = new Set();
async function requestScreenshot(tab, imageRequest) {
  const windowKey = `window:${tab.windowId}`;
  if (captureRequests.has(tab.id) || captureRequests.has(windowKey)) return;
  captureRequests.add(tab.id); captureRequests.add(windowKey);
  try {
    const [active] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
    if (active?.id !== tab.id) throw new Error('請回到原分頁再執行截圖');
    if (!/^https?:\/\//.test(active.url || tab.url || '')) throw new Error('此頁面不支援截圖，請在一般網頁使用');
    let target = null;
    if (imageRequest) {
      const message = { type: 'OCR_IMAGE_RECT', srcUrl: imageRequest.srcUrl };
      const frame = { frameId: imageRequest.frameId };
      try { target = await chrome.tabs.sendMessage(tab.id, message, frame); } catch {}
      if (!target || target.error) {
        // Updating an extension does not install listeners in existing pages.
        // Reinstall now, then locate the unique image from the browser's URL.
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content/ocr-target.js'] });
        } catch {
          await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, files: ['content/ocr-target.js'] });
        }
        try { target = await chrome.tabs.sendMessage(tab.id, message, frame); } catch { target = null; }
      }
      if (!target || target.error) throw new Error(target?.error || '無法取得圖片範圍，請重新整理網頁後再右鍵點選圖片');
      screenshotRect(target.rect, target.viewport, target.viewport?.width, target.viewport?.height);
    }
    await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, files: ['content/screenshot-region.js'] });
    await chrome.tabs.sendMessage(tab.id, { type: 'REGION_CAPTURE_CLEAR' }, { frameId: 0 });
    const dataUrl = await captureVisible(chrome.tabs, tab.windowId);
    const [after] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
    if (after?.id !== tab.id || (active.url && after.url !== active.url)) throw new Error('截圖時分頁已切換，請回到原分頁重試');
    if (!dataUrl?.startsWith('data:image/png;base64,') || dataUrl.length > MAX_CAPTURE_LENGTH) throw new Error('截圖過大，請縮小瀏覽器視窗後重試');
    await expireJobs();
    await chrome.storage.session.remove(`region:${tab.id}`);
    if (target) return await openEditor({ dataUrl, target }, Boolean(tab.incognito));
    const captureId = crypto.randomUUID();
    await chrome.storage.session.set({ [`region:${tab.id}`]: { captureId, dataUrl, createdAt: Date.now(), incognito: Boolean(tab.incognito) } });
    await chrome.tabs.sendMessage(tab.id, { type: 'REGION_CAPTURE_START', dataUrl, captureId }, { frameId: 0 });
  } catch (error) {
    await chrome.storage.session.remove(`region:${tab.id}`);
    try { await chrome.tabs.sendMessage(tab.id, { type: 'REGION_CAPTURE_CLEAR' }, { frameId: 0 }); } catch {}
    await editorWindow(`ocr/ocr.html?error=${encodeURIComponent(error.message)}`, Boolean(tab.incognito));
  } finally {
    captureRequests.delete(tab.id); captureRequests.delete(windowKey);
  }
}

async function requestPageCapture(tab, mode) {
  // Lock the source window, not just a tab, while scroll capture owns it.
  const windowKey = `window:${tab.windowId}`;
  if (captureRequests.has(tab.id) || captureRequests.has(windowKey)) return;
  captureRequests.add(tab.id); captureRequests.add(windowKey);
  let id;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, files: ['content/screenshot-region.js'] });
    await chrome.tabs.sendMessage(tab.id, { type: 'REGION_CAPTURE_CLEAR' }, { frameId: 0 });
    await chrome.storage.session.remove(`region:${tab.id}`);
    const result = await capturePage(tab, mode);
    id = crypto.randomUUID(); assets.put(id, result.blob);
    await expireJobs();
    await chrome.storage.session.set({ [`ocr:${id}`]: { asset: true, captureMode: mode, width: result.width, height: result.height, createdAt: Date.now() } });
    await editorWindow(`ocr/ocr.html#${id}`, Boolean(tab.incognito));
  } catch (error) {
    if (id) { assets.remove(id); await chrome.storage.session.remove(`ocr:${id}`); }
    await editorWindow(`ocr/ocr.html?error=${encodeURIComponent(error.message || '截圖失敗，請縮小範圍後重試')}`, Boolean(tab.incognito));
  } finally { captureRequests.delete(tab.id); captureRequests.delete(windowKey); }
}

async function finishRegion(message, sender) {
  if (sender.tab?.id == null || sender.frameId !== 0) throw new Error('無效的截圖來源');
  const key = `region:${sender.tab.id}`;
  const { [key]: job } = await chrome.storage.session.get(key);
  if (!job || job.captureId !== message.captureId) throw new Error('截圖已失效，請重新擷取');
  if (message.type === 'REGION_CAPTURE_CANCEL') { await chrome.storage.session.remove(key); return {}; }
  if (Date.now() - job.createdAt > JOB_TTL) { await chrome.storage.session.remove(key); throw new Error('截圖已失效，請重新擷取'); }
  screenshotRect(message.rect, message.viewport, message.viewport?.width, message.viewport?.height);
  await chrome.storage.session.remove(key);
  await openEditor({ dataUrl: job.dataUrl, target: { rect: message.rect, viewport: message.viewport } }, job.incognito);
  return {};
}

async function requestSelectionTranslation(tabId, frameId = 0, text) {
  try {
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: ['content/translate-popup.js'] });
    await chrome.tabs.sendMessage(tabId, { type: 'TRANSLATE_SELECTION', data: { text } }, { frameId });
  } catch (error) { console.warn('[頁匣 PageKit] 無法在此頁面翻譯：', error.message); }
}

function openShortcutSettings() {
  const scheme = /Edg\//.test(navigator.userAgent) ? 'edge' : 'chrome';
  return chrome.tabs.create({ url: `${scheme}://extensions/shortcuts` });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (tab?.id != null && ['capture-visible', 'capture-fullpage'].includes(info.menuItemId)) return requestPageCapture(tab, info.menuItemId === 'capture-fullpage' ? 'fullpage' : 'visible');
  if (info.menuItemId === 'support-pagekit') return chrome.tabs.create({ url: 'https://buymeacoffee.com/jasonwang0052' });
  if (info.menuItemId === 'import-image') return editorWindow('ocr/ocr.html', Boolean(tab?.incognito));
  if (info.menuItemId === 'screenshot-shortcut') return openShortcutSettings();
  if (tab?.id != null && ['screenshot-ocr', 'image-ocr'].includes(info.menuItemId)) return requestScreenshot(tab, info.menuItemId === 'image-ocr' ? { frameId: info.frameId ?? 0, srcUrl: info.srcUrl } : undefined);
  if (info.menuItemId === 'instant-translate' && tab?.id != null && info.selectionText?.trim()) return requestSelectionTranslation(tab.id, info.frameId ?? 0, info.selectionText.trim());
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'capture-region') return;
  if (tab?.id == null) [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id != null) return requestScreenshot(tab);
});

chrome.action.onClicked.addListener(async tab => {
  if (tab?.id == null) return;
  try {
    const [selection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => Boolean(window.getSelection()?.toString().trim()) });
    if (selection?.result) return requestSelectionTranslation(tab.id);
  } catch { /* Report protected pages in an editor popup. */ }
  return requestScreenshot(tab);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  let request;
  if (message.type === 'TRANSLATE_WORD') request = translateTextGoogle(message.data?.text);
  else if (message.type === 'GET_UI_KIT') request = loadUiStyles();
  else if (message.type === 'TTS_FETCH') request = fetchGoogleTTS(message.data?.text, message.data?.lang).then(base64 => ({ base64 }));
  else if (['REGION_CAPTURE_COMPLETE', 'REGION_CAPTURE_CANCEL'].includes(message.type)) request = finishRegion(message, sender);
  else if (message.type === 'OPEN_SHORTCUT_SETTINGS' && !sender.tab?.url?.startsWith('http')) request = openShortcutSettings().then(() => ({}));
  else return false;
  request.then(result => sendResponse({ success: true, ...result })).catch(error => sendResponse({ success: false, error: error.name === 'TimeoutError' ? '服務連線逾時，請稍後再試' : error.message }));
  return true;
});
