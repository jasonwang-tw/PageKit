import { SINGLE_EDITOR_WINDOW_KEY } from '../capture-preferences.js';

export const AUTO_COPY_SCREENSHOT_KEY = 'pagekitAutoCopyScreenshot';

export function captureSettings(controls) {
  return booleanSetting(controls, AUTO_COPY_SCREENSHOT_KEY, {
    saved: enabled => enabled ? '已開啟，下次截圖會自動複製圖片。' : '已關閉，截圖與 OCR 都不會自動複製。',
    ready: '只影響下次截圖；OCR 文字一律按「複製文字」才複製。',
    failed: '無法讀取設定，本次不會自動複製圖片；請重新設定。',
    fallback: false
  });
}

export function singleWindowSettings(controls) {
  return booleanSetting(controls, SINGLE_EDITOR_WINDOW_KEY, {
    saved: enabled => enabled ? '已開啟，下次截圖將重用編輯視窗。' : '已關閉，下次截圖將另開編輯視窗。',
    ready: '只影響之後的截圖，不會自動關閉已開啟的視窗。',
    failed: '無法讀取視窗設定，請重新設定後再截圖。',
    fallback: true
  });
}

function booleanSetting({ storage, checkbox, message }, key, messages) {
  let enabled = true, revision = 0, closing = false, saving = false;
  const render = () => { checkbox.checked = enabled; checkbox.disabled = saving; };
  function report(text, error = false) { message.textContent = text; message.classList.toggle('error', error); }
  const changed = (changes, area) => {
    if (closing || area !== 'local' || !Object.hasOwn(changes, key)) return;
    revision++;
    enabled = changes[key].newValue !== false;
    render();
  };
  const save = async () => {
    if (closing || saving) return;
    const requested = checkbox.checked, previous = enabled;
    // Revision also invalidates in-flight automatic image copies for that setting.
    revision++;
    const attempt = revision;
    saving = true; checkbox.disabled = true;
    report('正在儲存設定…');
    try {
      await storage.local.set({ [key]: requested });
      if (closing) return;
      if (revision === attempt) enabled = requested;
      report(messages.saved(enabled));
    } catch {
      if (closing) return;
      if (revision === attempt) enabled = previous;
      report('設定儲存失敗，已還原；請再試一次。', true);
    } finally {
      saving = false;
      if (!closing) render();
    }
  };
  checkbox.addEventListener('change', save);
  storage.onChanged.addListener(changed);
  return {
    get enabled() { return enabled; },
    get revision() { return revision; },
    async initialize() {
      const before = revision;
      checkbox.disabled = true;
      try {
        const data = await storage.local.get(key);
        if (closing) return;
        if (revision === before) enabled = data[key] !== false;
        report(messages.ready);
      } catch {
        if (closing) return;
        if (revision === before) enabled = messages.fallback;
        report(messages.failed, true);
      } finally { if (!closing) render(); }
    },
    destroy() { closing = true; revision++; checkbox.removeEventListener('change', save); storage.onChanged.removeListener(changed); }
  };
}
