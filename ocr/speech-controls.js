import { TRANSLATION_LANGUAGES } from '../translation-service.js';
import { speechSession } from './speech-session.js';
import { playSpeechAudio, speakSystemText } from './speech-audio.js';
import { speechSettings } from './speech-settings.js';

export function speechControls({ source, translated, target, locked }) {
  const $ = id => document.getElementById(id);
  const language = $('speech-language'), rate = $('speech-rate');
  const settings = speechSettings();
  const fields = { original: source, translated };
  let snapshot = null, activeKey = null, closing = false;
  for (const [code, label] of TRANSLATION_LANGUAGES) { const option = document.createElement('option'); option.value = code; option.textContent = label; language.append(option); }
  const session = speechSession({
    requestAudio: async (text, lang) => {
      const response = await chrome.runtime.sendMessage({ type: 'TTS_FETCH', data: { text, lang } });
      if (!response?.success) throw Error(response?.error || '語音連線失敗');
      return response.base64;
    },
    playAudio: playSpeechAudio, speakSystem: speakSystemText, changed: () => render()
  });
  function render() {
    if (closing) return;
    const state = session.state, active = state.phase !== 'idle';
    if (snapshot !== null && (locked() || fields[activeKey]?.value !== snapshot)) {
      snapshot = null; activeKey = null;
      session.stop(active ? '內容已更新，朗讀已停止' : ''); return;
    }
    for (const key of ['original', 'translated']) {
      const button = $(key === 'original' ? 'speak-original' : 'speak-translated');
      const current = active && state.key === key;
      button.disabled = !current && (locked() || !fields[key].value.trim());
      button.setAttribute('aria-pressed', String(current));
      const label = current ? '停止朗讀' : key === 'original' ? '朗讀辨識原文' : '朗讀翻譯譯文';
      button.setAttribute('aria-label', label);
      button.title = label;
      const note = $(key === 'original' ? 'speech-original-status' : 'speech-translated-status');
      note.textContent = state.key === key ? state.message : '';
      note.classList.toggle('error', state.key === key && state.error);
    }
    const value = Number(rate.value);
    $('speech-rate-value').textContent = `${value} 倍`; rate.setAttribute('aria-valuetext', `${value} 倍`);
  }
  const listeners = [];
  const listen = (element, name, action) => { element.addEventListener(name, action); listeners.push(() => element.removeEventListener(name, action)); };
  for (const key of ['original', 'translated']) {
    listen($(key === 'original' ? 'speak-original' : 'speak-translated'), 'click', () => {
      if (session.state.phase !== 'idle' && session.state.key === key) { session.stop(); return; }
      if (locked() || !fields[key].value.trim()) return;
      activeKey = key; snapshot = fields[key].value;
      const preferred = language.value === 'auto' && key === 'translated' ? target.value : language.value;
      void session.start({ key, text: snapshot, language: preferred, rate: Number(rate.value) });
    });
  }
  listen(source, 'input', render);
  listen(language, 'change', () => { session.stop('朗讀設定已變更，請重新按「朗讀」'); render(); });
  listen(rate, 'input', () => { session.stop('朗讀設定已變更，請重新按「朗讀」'); render(); });
  render();
  return { render, get settingsOpen() { return settings.isOpen; }, destroy() { closing = true; settings.destroy(); session.destroy(); for (const remove of listeners) remove(); } };
}
