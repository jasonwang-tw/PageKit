import { TRANSLATION_LANGUAGES } from '../translation-service.js';

export const MAX_SPEECH_LENGTH = 30000;
export function speechLanguage(text, preferred = 'auto') {
  if (preferred !== 'auto') {
    if (!TRANSLATION_LANGUAGES.some(([code]) => code === preferred)) throw Error('不支援的朗讀語言');
    return preferred;
  }
  if (/[\u3040-\u30ff]/u.test(text)) return 'ja';
  if (/[\uac00-\ud7a3]/u.test(text)) return 'ko';
  if (/[\u0e00-\u0e7f]/u.test(text)) return 'th';
  if (/[\u0600-\u06ff]/u.test(text)) return 'ar';
  return /\p{Script=Han}/u.test(text) ? 'zh-TW' : 'en';
}
export function speechChunks(text) {
  if (typeof text !== 'string' || !text.trim()) throw Error('請先辨識或輸入要朗讀的文字');
  if (text.length > MAX_SPEECH_LENGTH) throw Error('朗讀最多 30,000 字，請先縮短內容；不會只讀取一部分');
  try { encodeURIComponent(text); } catch { throw Error('文字含無效 Unicode 字元，請重新貼上'); }
  const chars = Array.from(text), chunks = [];
  for (let start = 0; start < chars.length;) {
    let end = Math.min(start + 180, chars.length);
    if (end < chars.length) for (let i = end - 1; i >= start + 90; i--) {
      if (/[\s.!?。！？；;]/u.test(chars[i])) { end = i + 1; break; }
    }
    chunks.push(chars.slice(start, end).join('')); start = end;
  }
  return chunks;
}
function whileCurrent(work, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(() => { signal.throwIfAborted(); return work(); }).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
export function speechSession({ requestAudio, playAudio, speakSystem, changed = () => {} }) {
  let generation = 0, controller = null, closing = false;
  let state = { phase: 'idle', key: null, message: '', error: false };
  const update = value => { state = { ...state, ...value }; if (!closing) changed(state); };
  function stop(message = '已停止朗讀') {
    generation++; controller?.abort(); controller = null;
    update({ phase: 'idle', message, error: false });
  }
  async function start({ key, text, language = 'auto', rate = 1 }) {
    if (closing) return;
    stop('');
    const run = ++generation;
    controller = new AbortController(); const signal = controller.signal;
    try {
      const chunks = speechChunks(text), lang = speechLanguage(text, language);
      if (!Number.isFinite(rate) || rate < .5 || rate > 2) throw Error('朗讀語速需介於 0.5–2 倍');
      let system = false;
      update({ key, phase: 'loading', message: '正在取得語音…', error: false });
      for (let index = 0; index < chunks.length; index++) {
        signal.throwIfAborted();
        if (!chunks[index].trim()) continue;
        const progress = `${index + 1} / ${chunks.length} 段`;
        if (!system) {
          try {
            update({ phase: 'loading', message: `正在取得語音… ${progress}` });
            const audio = await whileCurrent(() => requestAudio(chunks[index], lang), signal);
            signal.throwIfAborted();
            update({ phase: 'playing', message: `朗讀中… ${progress}` });
            await whileCurrent(() => playAudio(audio, { signal, rate }), signal);
            signal.throwIfAborted();
            continue;
          } catch (error) { if (signal.aborted) throw error; system = true; }
        }
        update({ phase: 'playing', message: `改用瀏覽器語音… ${progress}` });
        await whileCurrent(() => speakSystem(chunks[index], { language: lang, rate, signal }), signal);
      }
      if (run === generation) update({ phase: 'idle', message: '朗讀完成', error: false });
    } catch (error) {
      if (run === generation && !signal.aborted) update({ key, phase: 'idle', message: error.message || '無法朗讀，請檢查網路或裝置語音', error: true });
    } finally { if (run === generation) controller = null; }
  }
  return { start, stop, get state() { return state; }, destroy() { stop(''); closing = true; } };
}
