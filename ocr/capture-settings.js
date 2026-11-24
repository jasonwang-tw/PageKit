export const AUTO_COPY_SCREENSHOT_KEY = 'pagekitAutoCopyScreenshot';

export function captureSettings({ storage, checkbox, message }) {
  let enabled = true, revision = 0, closing = false, saving = false;
  const render = () => { checkbox.checked = enabled; checkbox.disabled = saving; };
  function report(text, error = false) { message.textContent = text; message.classList.toggle('error', error); }
  const changed = (changes, area) => {
    if (closing || area !== 'local' || !Object.hasOwn(changes, AUTO_COPY_SCREENSHOT_KEY)) return;
    revision++;
    enabled = changes[AUTO_COPY_SCREENSHOT_KEY].newValue !== false;
    render();
  };
  const save = async () => {
    if (closing || saving) return;
    const requested = checkbox.checked, previous = enabled;
    // Invalidate an in-flight automatic image even if toggled back on later.
    revision++;
    const attempt = revision;
    saving = true; checkbox.disabled = true;
    report('正在儲存設定…');
    try {
      await storage.local.set({ [AUTO_COPY_SCREENSHOT_KEY]: requested });
      if (closing) return;
      if (revision === attempt) enabled = requested;
      report(enabled ? '已開啟，下次截圖會自動複製圖片。' : '已關閉，截圖與 OCR 都不會自動複製。');
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
        const data = await storage.local.get(AUTO_COPY_SCREENSHOT_KEY);
        if (closing) return;
        if (revision === before) enabled = data[AUTO_COPY_SCREENSHOT_KEY] !== false;
        report('只影響下次截圖；OCR 文字一律按「複製文字」才複製。');
      } catch {
        if (closing) return;
        if (revision === before) enabled = false;
        report('無法讀取設定，本次不會自動複製圖片；請重新設定。', true);
      } finally { if (!closing) render(); }
    },
    destroy() { closing = true; revision++; checkbox.removeEventListener('change', save); storage.onChanged.removeListener(changed); }
  };
}
