import { validateCaptureSize, CAPTURE_LIMITS } from '../capture-geometry.js';

const abortError = () => new DOMException('已取消桌面截圖', 'AbortError');
const stop = stream => { for (const track of stream?.getTracks() || []) track.stop(); };

export async function captureDesktopFrame({ api, mediaDevices, document, signal, imageCapture = globalThis.ImageCapture,
  onSelected = () => {}, timeoutMs = 15_000, pickerTimeoutMs = 120_000 }) {
  let picker = null, stream, video, canvas, bitmap, loaded, failed;
  function wait(promise, duration = timeoutMs) {
    return new Promise((resolve, reject) => {
      let timer;
      const finish = (error, value) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); error ? reject(error) : resolve(value); };
      const abort = () => finish(abortError());
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => finish(new DOMException('桌面擷取逾時，請重新選擇畫面', 'TimeoutError')), duration);
      Promise.resolve(promise).then(value => finish(null, value), error => finish(error));
      if (signal?.aborted) abort();
    });
  }
  try {
    if (signal?.aborted) throw abortError();
    const streamId = await wait(new Promise((resolve, reject) => {
      picker = api.desktopCapture.chooseDesktopMedia(['screen', 'window'], id => {
        picker = null;
        const error = api.runtime.lastError;
        error ? reject(new Error(error.message)) : resolve(id);
      });
    }), pickerTimeoutMs);
    if (!streamId) return null;
    onSelected();
    const acquiring = mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId, maxWidth: CAPTURE_LIMITS.side, maxHeight: CAPTURE_LIMITS.side } } });
    let abandoned = false;
    void acquiring.then(value => { if (abandoned || signal?.aborted) stop(value); }, () => {});
    try { stream = await wait(acquiring); } catch (error) { abandoned = true; throw error; }
    const track = stream.getVideoTracks()[0];
    if (!track) throw new Error('所選來源沒有可擷取的畫面');
    if (track.readyState === 'ended' || signal?.aborted) throw abortError();
    if (imageCapture) {
      let dropped = false;
      try {
        const grabbing = new imageCapture(track).grabFrame();
        // grabFrame cannot be aborted. Release any bitmap arriving after cancel.
        void grabbing.then(value => { if (dropped || signal?.aborted) value.close(); }, () => {});
        try { bitmap = await wait(grabbing); } catch (error) { dropped = true; throw error; }
      } catch (error) {
        if (signal?.aborted || ['AbortError', 'TimeoutError'].includes(error.name) || track.readyState === 'ended') throw error;
        // Some browser/source combinations do not support ImageCapture.
      }
    }
    if (!bitmap) {
      video = document.createElement('video'); video.muted = true; video.playsInline = true; video.srcObject = stream;
      const decoded = new Promise((resolve, reject) => {
        loaded = () => { if (video.readyState >= 2) resolve(); };
        failed = () => reject(new Error('畫面解碼失敗，請重新選擇視窗'));
        video.addEventListener('loadeddata', loaded);
        video.addEventListener('error', failed);
        // Decoded pixels suffice. Neither play's foreground-dependent Promise
        // nor compositor callbacks should gate a one-frame screenshot.
        void video.play().catch(reject);
        loaded();
      });
      await wait(decoded);
    }
    if (signal?.aborted || track.readyState === 'ended') throw abortError();
    let width, height;
    try { ({ width, height } = validateCaptureSize(bitmap?.width ?? video.videoWidth, bitmap?.height ?? video.videoHeight)); }
    catch { throw new Error('桌面截圖超過安全上限（6,400 萬像素／單邊 32,760px），請改選較小視窗。'); }
    canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d'); if (!context) throw new Error('無法建立截圖，請縮小擷取範圍');
    context.drawImage(bitmap || video, 0, 0, width, height);
    bitmap?.close(); bitmap = null;
    stop(stream); stream = null;
    if (video) video.srcObject = null;
    const blob = await wait(new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('截圖 PNG 產生失敗')), 'image/png')));
    if (blob.size > CAPTURE_LIMITS.bytes) throw new Error('桌面截圖檔案過大，請選擇較小的視窗');
    if (signal?.aborted) throw abortError();
    return { blob, width, height };
  } finally {
    if (picker != null) api.desktopCapture.cancelChooseDesktopMedia(picker);
    stop(stream); bitmap?.close();
    if (video) { video.removeEventListener('loadeddata', loaded); video.removeEventListener('error', failed); video.pause(); video.srcObject = null; video.remove(); }
    if (canvas) canvas.width = canvas.height = 0;
  }
}
