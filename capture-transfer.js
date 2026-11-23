import { isModelPage } from './ocr/model-download.js';
import { CAPTURE_LIMITS } from './capture-geometry.js';

// Memory-only, single-consumer jobs. No image is persisted in session/local/IDB.
export function captureAssets(runtime, { ttl = 300_000 } = {}) {
  const jobs = new Map();
  function remove(id) { const job = jobs.get(id); if (job) clearTimeout(job.timer); jobs.delete(id); }
  function put(id, blob) {
    let bytes = blob.size;
    for (const job of jobs.values()) bytes += job.blob.size;
    if (blob.size > CAPTURE_LIMITS.bytes || bytes > CAPTURE_LIMITS.bytes || jobs.size >= 3) throw new Error('暫存圖片已達上限，請先開啟現有截圖後再試');
    const timer = setTimeout(() => remove(id), ttl);
    jobs.set(id, { blob, timer });
  }
  runtime.onConnect.addListener(port => {
    if (port.name !== 'pagekit-capture-transfer') return;
    if (!isModelPage(port.sender, runtime)) { port.disconnect(); return; }
    let blob, offset = 0, index = 0, waiting = false, started = false, closed = false;
    let timeout;
    function close() { closed = true; blob = null; clearTimeout(timeout); }
    const arm = () => { clearTimeout(timeout); timeout = setTimeout(() => { close(); port.disconnect(); }, 30_000); };
    port.onDisconnect.addListener(close);
    port.onMessage.addListener(async message => {
      if (closed || waiting) return;
      waiting = true;
      try {
        arm();
        if (message.type === 'READ' && !started) {
          started = true;
          const job = jobs.get(message.id);
          if (!job) throw new Error('截圖暫存已失效，請回到原頁面重新擷取');
          blob = job.blob; remove(message.id);
          port.postMessage({ type: 'META', size: blob.size, mime: blob.type });
        } else if (message.type === 'NEXT' && blob && message.index === index) {
          if (offset >= blob.size) { port.postMessage({ type: 'DONE' }); close(); return; }
          const bytes = new Uint8Array(await blob.slice(offset, offset + 48 * 1024).arrayBuffer());
          if (closed) return;
          let raw = ''; for (const byte of bytes) raw += String.fromCharCode(byte);
          port.postMessage({ type: 'CHUNK', index: index++, base64: btoa(raw) });
          offset += bytes.length;
        } else throw new Error('截圖傳輸順序錯誤，請重新擷取');
      } catch (error) {
        if (!closed) port.postMessage({ type: 'ERROR', error: error.message });
        close(); port.disconnect();
      } finally { waiting = false; }
    });
    arm();
  });
  return { put, remove };
}
