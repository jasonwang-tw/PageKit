import { CAPTURE_LIMITS } from '../capture-geometry.js';
export function readCapture(runtime, id) {
  return new Promise((resolve, reject) => {
    const port = runtime.connect({ name: 'pagekit-capture-transfer' });
    let size = 0, received = 0, index = 0, done = false, parts = [], timer;
    function finish(error, blob) {
      if (done) return;
      done = true; clearTimeout(timer); parts = []; port.disconnect();
      if (error) reject(error); else resolve(blob);
    }
    function next() { clearTimeout(timer); timer = setTimeout(() => finish(new Error('截圖傳輸逾時，請重新擷取')), 30_000); port.postMessage({ type: 'NEXT', index }); }
    port.onMessage.addListener(message => {
      try {
        if (done) return;
        if (message.type === 'META') {
          if (size || message.mime !== 'image/png' || !Number.isSafeInteger(message.size) || message.size <= 0 || message.size > CAPTURE_LIMITS.bytes) throw new Error('截圖資料無效');
          size = message.size; next();
        } else if (message.type === 'CHUNK') {
          if (!size || message.index !== index++ || typeof message.base64 !== 'string' || message.base64.length > 65_536) throw new Error('截圖區塊無效');
          const bytes = Uint8Array.from(atob(message.base64), char => char.charCodeAt(0));
          received += bytes.length;
          if (received > size) throw new Error('截圖大小不符');
          parts.push(bytes); next();
        } else if (message.type === 'DONE') {
          if (!size || received !== size) throw new Error('截圖未完整載入');
          finish(null, new Blob(parts, { type: 'image/png' }));
        } else throw new Error(message.error || '截圖傳輸失敗');
      } catch (error) { finish(error); }
    });
    port.onDisconnect.addListener(() => { const error = runtime.lastError; finish(new Error(error?.message || '截圖暫存已失效，請重新擷取')); });
    timer = setTimeout(() => finish(new Error('截圖傳輸逾時，請重新擷取')), 30_000);
    port.postMessage({ type: 'READ', id });
  });
}
