import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const listeners = {};
const injections = [];
const messages = [];
const menus = [];
const captures = [];
const created = [];
let session = {};
let selectionResult = true;
let activeTab = { id: 3, windowId: 1, url: 'https://example.com/' };
const event = name => ({ addListener: listener => { listeners[name] = listener; } });
globalThis.chrome = {
  runtime: { id: 'test-extension', getURL: path => `chrome-extension://test-extension/${path}`, onInstalled: event('installed'), onMessage: event('message'), onConnect: event('connect') },
  contextMenus: {
    onClicked: event('context'),
    removeAll: done => { menus.length = 0; done(); },
    create: menu => menus.push(menu)
  },
  action: { onClicked: event('action') },
  commands: { onCommand: event('command') },
  windows: { create: async data => { created.push(data); }, getAll: async () => [], update: async () => {} },
  scripting: { executeScript: async data => { injections.push(data); return [{ result: selectionResult }]; } },
  storage: { local: { get: async () => ({}) }, session: {
    get: async () => session,
    set: async data => { Object.assign(session, data); },
    remove: async keys => { for (const key of [keys].flat()) delete session[key]; }
  } },
  tabs: {
    update: async () => {},
    sendMessage: async (...args) => { messages.push(args); return null; },
    query: async () => [activeTab],
    captureVisibleTab: async (...args) => { captures.push(args); return 'data:image/png;base64,AAAA'; },
    create: async () => { assert.fail('截圖不應新增一般頁籤'); }
  }
};
await import('../background.js');
afterEach(() => {
  mock.restoreAll(); injections.length = 0; messages.length = 0; captures.length = 0; created.length = 0;
  session = {}; selectionResult = true; activeTab = { id: 3, windowId: 1, url: 'https://example.com/' };
});

test('安裝時註冊翻譯、截圖與圖片 OCR 選單', () => {
  listeners.installed();
  assert.equal(menus.length, 9);
  assert.equal(menus.find(menu=>menu.id==='capture-visible').title, '視窗截圖');
  assert.equal(menus.find(menu=>menu.id==='capture-fullpage').title, '整頁截圖');
  assert.equal(menus[0].id, 'instant-translate');
  assert.deepEqual(menus[0].contexts, ['selection']);
});

test('桌面快捷鍵及圖示右鍵進入桌面模式，不注入網頁或擷取瀏覽器', async () => {
  mock.method(chrome.storage.local, 'get', async () => ({ pagekitShortcutCaptureMode: 'desktop' }));
  await listeners.command('capture-desktop', undefined);
  assert.match(created[0].url, /ocr\/ocr.html\?desktop=1$/); assert.equal(captures.length, 0); assert.equal(injections.length, 0);
  await listeners.context({ menuItemId: 'capture-desktop' }, { incognito: true });
  assert.equal(created[1].incognito, true); assert.match(created[1].url, /desktop=1/);
});
test('舊桌面模式偏好不再把網頁快捷鍵導向桌面，兩組指令固定分開', async () => {
  mock.method(chrome.storage.local, 'get', async () => ({ pagekitShortcutCaptureMode: 'desktop' }));
  await listeners.command('capture-region', activeTab);
  assert.equal(created.length, 0); assert.equal(captures.length, 1); assert.ok(messages.some(([,message])=>message.type==='REGION_CAPTURE_START'));
});
test('未知快捷鍵不擷取；桌面快捷鍵不依賴網頁或舊模式設定', async () => {
  await listeners.command('unknown', activeTab); assert.equal(created.length, 0); assert.equal(captures.length, 0);
  mock.method(chrome.storage.local, 'get', async key => { assert.notEqual(key, 'pagekitShortcutCaptureMode'); return {}; });
  await listeners.command('capture-desktop', { incognito: true }); assert.equal(created[0].incognito, true); assert.equal(captures.length, 0);
});

test('右鍵入口保留點選的 frame，先注入再送出文字', async () => {
  await listeners.context({ menuItemId: 'instant-translate', frameId: 7, selectionText: ' Hello ' }, { id: 12 });
  assert.deepEqual(injections[0].target, { tabId: 12, frameIds: [7] });
  assert.deepEqual(messages[0], [12, { type: 'TRANSLATE_SELECTION', data: { text: 'Hello' } }, { frameId: 7 }]);
});

test('工具列圖示的匯入入口直接開啟編輯彈窗，不先截圖', async () => {
  await listeners.context({ menuItemId: 'import-image' }, { incognito: true });
  assert.deepEqual(created, [{ url: 'chrome-extension://test-extension/ocr/ocr.html', type: 'popup', width: 1200, height: 820, focused: true, incognito: true }]);
  assert.equal(captures.length, 0);
});

test('贊助入口只開固定支持頁，不讀取或清除目前圖片工作', async () => {
  session = { 'ocr:working': { dataUrl: 'data:image/png;base64,AAAA', createdAt: 123 } };
  const snapshot = structuredClone(session);
  const tabs = [];
  mock.method(chrome.tabs, 'create', async data => { tabs.push(data); });
  await listeners.context({ menuItemId: 'support-pagekit' }, activeTab);
  assert.deepEqual(tabs, [{ url: 'https://buymeacoffee.com/jasonwang0052' }]);
  assert.deepEqual(session, snapshot);
  assert.equal(captures.length, 0);
  assert.equal(injections.length, 0);
  assert.equal(messages.length, 0);
});

test('工具列有選取文字時維持翻譯入口', async () => {
  await listeners.action({ id: 3 });
  assert.equal(messages[0][1].type, 'TRANSLATE_SELECTION');
  assert.equal(messages[0][1].data.text, undefined);
});

test('工具列無選取文字時先在網頁框選，不新增頁籤或彈窗', async () => {
  selectionResult = false;
  await listeners.action(activeTab);
  assert.deepEqual(captures, [[1, { format: 'png' }]]);
  assert.equal(created.length, 0);
  assert.equal(messages.at(-1)[1].type, 'REGION_CAPTURE_START');
  const [job] = Object.values(session);
  assert.equal(job.dataUrl, 'data:image/png;base64,AAAA');
  assert.equal(typeof job.captureId, 'string');
});

test('圖片右鍵保留可見範圍，不取得或下載原圖 URL', async () => {
  const target = { rect: { x: 10, y: 20, width: 100, height: 50 }, viewport: { width: 800, height: 600 } };
  mock.method(chrome.tabs, 'sendMessage', async (...args) => { messages.push(args); return target; });
  await listeners.context({ menuItemId: 'image-ocr', frameId: 0, srcUrl: 'https://private.example/image' }, activeTab);
  assert.deepEqual(messages[0], [3, { type: 'OCR_IMAGE_RECT', srcUrl: 'https://private.example/image' }, { frameId: 0 }]);
  assert.deepEqual(Object.values(session)[0].target, target);
  assert.equal(created[0].type, 'popup');
  assert.ok(messages.every(message => message[1].type !== 'REGION_CAPTURE_START'));
  assert.ok(!JSON.stringify(session).includes('private.example'));
});

test('iframe 圖片向原 frame 取得已換算的頂層範圍，直接開啟編輯器', async () => {
  const target = { rect: { x: 110, y: 120, width: 100, height: 50 }, viewport: { width: 800, height: 600 } };
  mock.method(chrome.tabs, 'sendMessage', async (...args) => { messages.push(args); return args[1].type === 'OCR_IMAGE_RECT' ? target : null; });
  await listeners.context({ menuItemId: 'image-ocr', frameId: 7, srcUrl: 'https://frame.example/image.png' }, activeTab);
  assert.equal(messages[0][2].frameId, 7);
  assert.deepEqual(Object.values(session)[0].target, target);
  assert.equal(created[0].type, 'popup');
  assert.ok(messages.every(message => message[1].type !== 'REGION_CAPTURE_START'));
});

test('舊分頁沒有圖片監聽器時重新注入並重試，成功後不要求框選', async () => {
  const target = { rect: { x: 20, y: 30, width: 100, height: 50 }, viewport: { width: 800, height: 600 } };
  let requests = 0;
  mock.method(chrome.tabs, 'sendMessage', async (...args) => {
    messages.push(args);
    if (args[1].type !== 'OCR_IMAGE_RECT') return null;
    if (++requests === 1) throw Error('Receiving end does not exist');
    return target;
  });
  await listeners.context({ menuItemId: 'image-ocr', srcUrl: 'https://example.com/image.png' }, activeTab);
  assert.equal(requests, 2);
  assert.ok(injections.some(injection => injection.files?.includes('content/ocr-target.js') && injection.target.allFrames));
  assert.deepEqual(Object.values(session)[0].target, target);
  assert.ok(messages.every(message => message[1].type !== 'REGION_CAPTURE_START'));
});

test('無法定位圖片或範圍無效時顯示原因，不擷取整頁或偷偷改成框選', async () => {
  for (const target of [null, { error: '畫面有多張相同圖片，請重新右鍵點選' }, { rect: { x: NaN }, viewport: { width: 800, height: 600 } }]) {
    mock.method(chrome.tabs, 'sendMessage', async (...args) => { messages.push(args); return args[1].type === 'OCR_IMAGE_RECT' ? target : null; });
    await listeners.context({ menuItemId: 'image-ocr', frameId: 0 }, activeTab);
    assert.ok(created.at(-1).url.includes('?error='));
    assert.equal(captures.length, 0);
    assert.ok(messages.every(message => message[1].type !== 'REGION_CAPTURE_START'));
    assert.deepEqual(session, {});
    mock.restoreAll();
  }
});

test('分頁切換時拒絕截取另一頁並顯示錯誤', async () => {
  activeTab = { ...activeTab, id: 99 };
  await listeners.context({ menuItemId: 'screenshot-ocr' }, { id: 3, windowId: 1 });
  assert.equal(captures.length, 0);
  assert.match(decodeURIComponent(created[0].url), /請回到原分頁/);
});

test('截圖失敗顯示錯誤；不保存失敗影像', async () => {
  mock.method(chrome.tabs, 'captureVisibleTab', async () => { throw new Error('沒有截圖權限'); });
  await listeners.context({ menuItemId: 'screenshot-ocr' }, activeTab);
  assert.match(decodeURIComponent(created[0].url), /沒有截圖權限/);
  assert.deepEqual(session, {});
});

test('新工作清除過期影像，開彈窗失敗則移除本次影像', async () => {
  session = { 'ocr:old': { createdAt: 1 } };
  mock.method(chrome.tabs, 'sendMessage', async () => ({ rect: { x: 0, y: 0, width: 100, height: 50 }, viewport: { width: 800, height: 600 } }));
  mock.method(chrome.windows, 'create', async data => { if (data.url.includes('#')) throw new Error('開頁失敗'); created.push(data); });
  await listeners.context({ menuItemId: 'image-ocr', frameId: 0 }, activeTab);
  assert.deepEqual(session, {});
  assert.match(decodeURIComponent(created[0].url), /開頁失敗/);
});

test('不處理未知訊息或其他擴充功能訊息', () => {
  const fail = () => assert.fail('不應回覆');
  assert.equal(listeners.message({ type: 'ADD_TO_VOCABULARY' }, { id: chrome.runtime.id }, fail), false);
  assert.equal(listeners.message({ type: 'TRANSLATE_WORD' }, { id: 'other-extension' }, fail), false);
});

function send(message, sender = { id: chrome.runtime.id }) {
  return new Promise(resolve => {
    assert.equal(listeners.message(message, sender, resolve), true);
  });
}

test('快捷鍵即使有選取文字仍啟動框選截圖', async () => {
  await listeners.command('capture-region', activeTab);
  assert.equal(captures.length, 1);
  assert.equal(messages.at(-1)[1].type, 'REGION_CAPTURE_START');
  assert.equal(created.length, 0);
});

test('框選完成才建立 popup，保留裁切座標且消耗待選工作', async () => {
  await listeners.context({ menuItemId: 'screenshot-ocr' }, activeTab);
  const captureId = session['region:3'].captureId;
  const rect = { x: 10, y: 20, width: 200, height: 100 };
  const viewport = { width: 800, height: 600 };
  const response = await send({ type: 'REGION_CAPTURE_COMPLETE', captureId, rect, viewport }, { id: chrome.runtime.id, tab: activeTab, frameId: 0 });
  assert.equal(response.success, true);
  assert.equal(session['region:3'], undefined);
  assert.equal(created[0].type, 'popup');
  assert.match(created[0].url, /ocr\/ocr\.html#/);
  assert.deepEqual(Object.values(session)[0].target, { rect, viewport });
});

test('取消框選移除暫存，不建立任何視窗', async () => {
  await listeners.command('capture-region', activeTab);
  const captureId = session['region:3'].captureId;
  assert.equal((await send({ type: 'REGION_CAPTURE_CANCEL', captureId }, { id: chrome.runtime.id, tab: activeTab, frameId: 0 })).success, true);
  assert.deepEqual(session, {});
  assert.equal(created.length, 0);
});

test('連續快捷鍵截圖共用 popup，取消下一次框選不清除已完成工作', async () => {
  let view;
  const navigations = [];
  mock.method(chrome.windows, 'create', async props => {
    created.push(props);
    view = { ...props, id: 50, tabs: [{ id: 51, url: props.url }] };
    return view;
  });
  mock.method(chrome.windows, 'getAll', async () => view ? [structuredClone(view)] : []);
  mock.method(chrome.tabs, 'update', async (id, props) => { assert.equal(id, 51); navigations.push(props); view.tabs[0].url = props.url; });
  const sender = { id: chrome.runtime.id, tab: activeTab, frameId: 0 };
  const complete = async () => {
    await listeners.command('capture-region', activeTab);
    const captureId = session['region:3'].captureId;
    return send({ type: 'REGION_CAPTURE_COMPLETE', captureId, rect: { x: 0, y: 0, width: 200, height: 100 }, viewport: { width: 800, height: 600 } }, sender);
  };
  assert.equal((await complete()).success, true);
  assert.equal((await complete()).success, true);
  assert.equal(created.length, 1); assert.equal(navigations.length, 1);
  assert.ok(new URL(navigations[0].url).searchParams.has('editor'));
  const loadedUrl = view.tabs[0].url;
  await listeners.command('capture-region', activeTab);
  const captureId = session['region:3'].captureId;
  assert.equal((await send({ type: 'REGION_CAPTURE_CANCEL', captureId }, sender)).success, true);
  assert.equal(view.tabs[0].url, loadedUrl);
  assert.equal(created.length, 1); assert.equal(navigations.length, 1);
  assert.equal(Object.keys(session).filter(key => key.startsWith('ocr:')).length, 1);
});

test('拒絕不同分頁、frame、過期識別及無效框選座標', async () => {
  await listeners.command('capture-region', activeTab);
  const captureId = session['region:3'].captureId;
  const message = { type: 'REGION_CAPTURE_COMPLETE', captureId, rect: { x: 0, y: 0, width: 100, height: 100 }, viewport: { width: 800, height: 600 } };
  for (const sender of [
    { id: chrome.runtime.id, tab: { id: 4 }, frameId: 0 },
    { id: chrome.runtime.id, tab: activeTab, frameId: 7 }
  ]) assert.equal((await send(message, sender)).success, false);
  const sender = { id: chrome.runtime.id, tab: activeTab, frameId: 0 };
  assert.equal((await send({ ...message, captureId: 'other' }, sender)).success, false);
  assert.equal((await send({ ...message, rect: { ...message.rect, x: NaN } }, sender)).success, false);
  session['region:3'].createdAt = 1;
  assert.equal((await send(message, sender)).success, false);
  assert.deepEqual(session, {});
  assert.equal(created.length, 0);
});

test('翻譯非同步回覆可直接交給浮窗顯示', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json([[['你好']]]));
  assert.deepEqual(await send({ type: 'TRANSLATE_WORD', data: { text: 'Hello' } }), {
    success: true, original: 'Hello', translated: '你好', from: 'auto', to: 'zh-TW'
  });
});

test('無效輸入與逾時回傳明確錯誤', async () => {
  assert.equal((await send({ type: 'TRANSLATE_WORD' })).success, false);
  mock.method(globalThis, 'fetch', async () => { throw new DOMException('timeout', 'TimeoutError'); });
  assert.deepEqual(await send({ type: 'TRANSLATE_WORD', data: { text: 'hello' } }), {
    success: false, error: '服務連線逾時，請稍後再試'
  });
});

test('朗讀訊息回傳音訊且不需要原專案儲存或 provider', async () => {
  mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array([1, 2])));
  assert.deepEqual(await send({ type: 'TTS_FETCH', data: { text: 'Hello', lang: 'en' } }), {
    success: true, base64: btoa('\x01\x02')
  });
});

test('UI 樣式回覆僅接受本擴充功能訊息，內容皆來自固定本機檔案', async () => {
  assert.equal(listeners.message({type:'GET_UI_KIT'}, {id:'external'}, () => assert.fail('拒絕外部擴充功能')), false);
  const urls = [];
  mock.method(globalThis, 'fetch', async url => { urls.push(url); return new Response('/* UI CSS */'); });
  const result = await send({type:'GET_UI_KIT',url:'https://untrusted.example/styles'});
  assert.equal(result.success, true);
  assert.equal(urls.length, 3);
  assert.ok(urls.every(url => url.startsWith('chrome-extension://test-extension/')));
});
