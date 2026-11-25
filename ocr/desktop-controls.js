import { captureDesktopFrame } from './desktop-frame.js';

// Permission requests are only made by direct clicks, never on load/message.
export function desktopControls({ api, controls, locked, changed, openManagement, accept, revision, notify = () => {},
  capture = options => captureDesktopFrame({ ...options, document, mediaDevices: navigator.mediaDevices }) }) {
  const { grant, revoke, start, cancel, message } = controls;
  const permission = { permissions: ['desktopCapture'] };
  let enabled = false, granting = false, closing = false, run = null;
  const report = (text, error = false) => { if (!closing) { message.textContent = text; message.classList.toggle('error', error); } };
  const captureReport = (text, error = false) => { report(text, error); if (!closing) notify(text, error); };
  function render() {
    if (closing) return;
    grant.hidden = enabled; grant.disabled = Boolean(run) || granting;
    revoke.hidden = !enabled; revoke.disabled = Boolean(run) || granting;
    start.disabled = Boolean(run) || granting || locked();
    cancel.hidden = !run;
  }
  async function refresh() {
    try { enabled = await api.permissions.contains(permission); }
    catch { enabled = false; }
    if (!closing) render();
  }
  async function enable() {
    if (closing || granting || run) return;
    granting = true; render();
    // Call request before the first await to retain the click's user activation.
    try {
      const granted = await api.permissions.request(permission);
      if (closing) return;
      enabled = granted; report(granted ? '桌面截圖權限已啟用，每次仍由你選擇要擷取的畫面。' : '未啟用權限，原圖與網頁截圖不受影響。', !granted);
    } catch { report('無法啟用桌面截圖權限，請重新點擊啟用。', true); }
    granting = false; render();
  }
  async function remove() {
    try {
      await api.permissions.remove(permission); await refresh();
      report(enabled ? '未能移除桌面截圖權限，請重試。' : '已移除桌面截圖權限；網頁框選仍可使用。', enabled);
    }
    catch { report('移除權限失敗，請重試。', true); }
  }
  async function begin(fromClick = false) {
    if (closing || run || granting) return;
    if (locked()) { captureReport('目前正在處理圖片，請完成後再擷取桌面。'); return; }
    const controller = new AbortController(), initialRevision = revision();
    run = controller; render(); changed();
    try {
      // Only a direct capture click may request permission. Shortcut messages
      // instead expose the explicit permission button in settings.
      const granted = fromClick ? await api.permissions.request(permission) : await api.permissions.contains(permission);
      if (closing || controller.signal.aborted) return;
      enabled = granted;
      if (!granted) { captureReport('請先按「啟用桌面截圖權限」，之後可沿用快捷鍵。', true); openManagement(); return; }
      captureReport('選定螢幕或應用程式視窗後按「分享」，將直接截取完整畫面，不需再次框選。');
      const result = await capture({ api, signal: controller.signal, onSelected: () => captureReport('正在擷取完整畫面，不需框選；完成後會自動停止分享。') });
      if (closing || controller.signal.aborted) return;
      if (!result) { captureReport('已取消桌面截圖，保留目前圖片與標註。'); return; }
      await accept(result.blob, initialRevision, controller.signal);
      // Focus after capture and track cleanup, without resizing/minimizing.
      try { const current = await api.windows.getCurrent(); await api.windows.update(current.id, { focused: true }); } catch {}
      report('桌面截圖已載入；請框選文字區或按「辨識整張」。');
    } catch (error) { captureReport(error.name === 'AbortError' ? '已取消桌面截圖，保留目前圖片與標註。' : error.message || '桌面截圖失敗，請重試。', error.name !== 'AbortError'); }
    finally { run = null; if (!closing) { render(); changed(); } }
  }
  const onStart = () => { void begin(true); }, onCancel = () => run?.abort();
  const onRemoved = value => { if (value.permissions?.includes('desktopCapture')) { enabled = false; run?.abort(); render(); } };
  const onAdded = value => { if (value.permissions?.includes('desktopCapture')) { enabled = true; render(); } };
  grant.addEventListener('click', enable); revoke.addEventListener('click', remove);
  start.addEventListener('click', onStart); cancel.addEventListener('click', onCancel);
  api.permissions?.onRemoved?.addListener(onRemoved); api.permissions?.onAdded?.addListener(onAdded);
  return {
    get working() { return Boolean(run); }, render, begin,
    initialize: refresh,
    destroy() {
      closing = true; run?.abort();
      grant.removeEventListener('click', enable); revoke.removeEventListener('click', remove);
      start.removeEventListener('click', onStart); cancel.removeEventListener('click', onCancel);
      api.permissions?.onRemoved?.removeListener(onRemoved); api.permissions?.onAdded?.removeListener(onAdded);
    }
  };
}
