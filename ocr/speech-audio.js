export function playSpeechAudio(base64, { rate, signal }) {
  signal.throwIfAborted();
  if (typeof base64 !== 'string' || !base64 || base64.length > 2_000_000) throw Error('語音資料無效');
  const binary = atob(base64), bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
  return new Promise((resolve, reject) => {
    const audio = new Audio(); let finished = false, timer;
    const abort = () => finish(signal.reason);
    function finish(error) {
      if (finished) return; finished = true;
      clearTimeout(timer); signal.removeEventListener('abort', abort);
      audio.onended = audio.onerror = null;
      audio.pause(); audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url);
      if (error) reject(error); else resolve();
    }
    audio.src = url; audio.playbackRate = rate; audio.preservesPitch = true;
    audio.onended = () => finish();
    audio.onerror = () => finish(Error('語音播放失敗'));
    signal.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => finish(Error('語音播放逾時，請重試')), 120000);
    try { void audio.play().catch(error => finish(error)); } catch (error) { finish(error); }
  });
}
async function availableVoices(synthesis, signal) {
  const voices = synthesis.getVoices(); if (voices.length) return voices;
  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => { clearTimeout(timer); synthesis.removeEventListener('voiceschanged', ready); signal.removeEventListener('abort', abort); };
    const ready = () => { const next = synthesis.getVoices(); if (next.length) { cleanup(); resolve(next); } };
    const abort = () => { cleanup(); reject(signal.reason); };
    synthesis.addEventListener('voiceschanged', ready); signal.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => { cleanup(); resolve(synthesis.getVoices()); }, 1200);
  });
}
export async function speakSystemText(text, { language, rate, signal }) {
  signal.throwIfAborted();
  const synthesis = globalThis.speechSynthesis;
  if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') throw Error('瀏覽器不支援語音，請確認網路後重試');
  const voices = await availableVoices(synthesis, signal); signal.throwIfAborted();
  const code = language.toLowerCase(), base = code.split('-')[0];
  const voice = voices.find(v => v.lang.toLowerCase() === code) || voices.find(v => v.lang.toLowerCase().split('-')[0] === base);
  if (!voice) throw Error('裝置沒有這個語言的可用聲音；請更換朗讀語言或恢復網路後重試');
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text); let finished = false, timer;
    const abort = () => { finish(signal.reason); synthesis.cancel(); };
    function finish(error) {
      if (finished) return; finished = true;
      clearTimeout(timer); signal.removeEventListener('abort', abort);
      utterance.onend = utterance.onerror = null;
      if (error) reject(error); else resolve();
    }
    utterance.lang = language; utterance.voice = voice; utterance.rate = rate;
    utterance.onend = () => finish();
    utterance.onerror = () => finish(Error('瀏覽器語音無法播放；請檢查裝置的聲音設定'));
    signal.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => { finish(Error('瀏覽器語音逾時，請重試')); synthesis.cancel(); }, 120000);
    synthesis.cancel();
    try { synthesis.speak(utterance); } catch (error) { finish(error); }
  });
}
