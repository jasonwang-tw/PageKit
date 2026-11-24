import { TRANSLATION_LANGUAGES, validateOcrTranslation } from '../translation-service.js';

export function translationControls({ source, locked, changed = () => {}, copyText = text => navigator.clipboard.writeText(text) }) {
  const $ = id => document.getElementById(id);
  const target = $('translation-language'), result = $('translated-text');
  for (const [code, name] of TRANSLATION_LANGUAGES) { const option = document.createElement('option'); option.value = code; option.textContent = name; target.append(option); }
  target.value = 'zh-TW';
  let port = null, heartbeat = null, snapshot = null, requestTarget = null, closing = false;
  function message(text, error = false) { $('translation-status').textContent = text; $('translation-status').classList.toggle('error', error); }
  function disconnect() { clearInterval(heartbeat); heartbeat = null; const previous = port; port = null; previous?.disconnect(); }
  function invalidate(text = '原文已更新，請按「翻譯」取得新譯文。') {
    disconnect(); snapshot = null; requestTarget = null; result.value = ''; $('translation-output').hidden = true;
    message(text); render(); changed();
  }
  function render() {
    if (snapshot !== null && (source.value !== snapshot || target.value !== requestTarget)) { invalidate(); return; }
    $('translate-ocr').disabled = locked() || Boolean(port) || !source.value.trim();
    $('translate-ocr').textContent = port ? '翻譯中…' : '翻譯';
    target.disabled = locked();
    $('copy-translation').disabled = !result.value || Boolean(port) || locked();
    $('translation-controls').setAttribute('aria-busy', String(Boolean(port)));
    result.dir = target.value === 'ar' ? 'rtl' : 'auto';
  }
  const sourceChanged = () => invalidate();
  const targetChanged = () => invalidate('目標語言已變更，請按「翻譯」。');
  source.addEventListener('input', sourceChanged); target.addEventListener('change', targetChanged);
  $('translate-ocr').addEventListener('click', () => {
    if (closing || locked() || port) return;
    try {
      validateOcrTranslation(source.value, target.value);
      disconnect(); snapshot = source.value; requestTarget = target.value;
      result.value = ''; $('translation-output').hidden = true; changed();
      port = chrome.runtime.connect({ name: 'pagekit-ocr-translation' });
      const current = port; message('正在翻譯，僅傳送結果框中的文字…'); render();
      current.onMessage.addListener(event => {
        if (port !== current || closing) return;
        if (source.value !== snapshot || target.value !== requestTarget || locked()) { invalidate(); return; }
        if (event.type === 'PROGRESS') { message(`翻譯中… ${event.completed} / ${event.total} 段`); return; }
        if (!['DONE', 'ERROR'].includes(event.type)) return;
        disconnect();
        if (event.type === 'DONE' && typeof event.translated === 'string' && event.translated.trim()) {
          result.value = event.translated; $('translation-output').hidden = false;
          message('翻譯完成；按「複製譯文」才會更新剪貼簿。');
        } else message(event.error || '翻譯服務未回傳譯文，請重試。', true);
        render(); changed();
      });
      current.onDisconnect.addListener(() => {
        if (port !== current || closing) return;
        const reason = chrome.runtime.lastError?.message; disconnect();
        message(reason || '翻譯連線中斷，請重試。', true); render();
      });
      heartbeat = setInterval(() => { try { current.postMessage({ type: 'PING' }); } catch {} }, 20000);
      current.postMessage({ type: 'START', text: snapshot, target: requestTarget });
    } catch (error) { disconnect(); message(error.message || '無法啟動翻譯，請重新載入擴充功能。', true); render(); }
  });
  $('copy-translation').addEventListener('click', async () => {
    if (!result.value || port || locked() || snapshot !== source.value || requestTarget !== target.value) return;
    const text = result.value;
    try { await copyText(text); if (!closing && result.value === text && snapshot === source.value) message('譯文已複製，可直接貼上。'); }
    catch { if (!closing && result.value === text) { result.focus(); result.select(); message('無法自動複製，請選取譯文後按 Ctrl+C／Cmd+C。', true); } }
  });
  render();
  return { render, invalidate, destroy() { closing = true; disconnect(); source.removeEventListener('input', sourceChanged); target.removeEventListener('change', targetChanged); result.value = ''; } };
}
