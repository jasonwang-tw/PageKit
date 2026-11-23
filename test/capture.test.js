import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPTURE_LIMITS, validateCaptureSize, capturePositions, frameDestination } from '../capture-geometry.js';
import { captureAssets } from '../capture-transfer.js';
import { readCapture } from '../ocr/capture-reader.js';
import { nativeRect, clampZoom } from '../ocr/image-viewer.js';
import { ocrTiles, findBlankRow } from '../ocr/ocr-tiles.js';
import { captureBlob, capturePage } from '../page-capture.js';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('加強引擎同一工作依序處理兩圖，只驗證及初始化一次模型', async () => {
  let creates = 0, verifies = 0, closed = 0;
  const replies = [], scope = { self: { postMessage: message => replies.push(message) }, URL,
    MODEL_FILES: [{ key: 'det' }, { key: 'rec' }], readModel: async () => ({ det: new ArrayBuffer(1), rec: new ArrayBuffer(1) }), verifyModel: async () => { verifies++; },
    PaddleOCR: { create: async () => { creates++; return { predict: async bitmap => ({ width: bitmap.width }) }; } } };
  const source = readFileSync(new URL('../ocr/paddle-worker.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('import.meta.url', JSON.stringify(import.meta.url));
  runInNewContext(source, scope);
  for (const width of [700, 900]) await scope.self.onmessage({ data: { bitmap: { width, close: () => closed++ } } });
  assert.equal(creates, 1); assert.equal(verifies, 2); assert.equal(closed, 2);
  assert.deepEqual(replies.filter(message => message.type === 'RESULT').map(message => message.result.width), [700, 900]);
});

test('整頁超限、視窗改變及切分頁皆拒絕輸出並還原擷取狀態', async () => {
  const originalBitmap = globalThis.createImageBitmap;
  globalThis.createImageBitmap = async () => ({ width: 800, height: 600, close() {} });
  try {
    for (const failure of ['limit', 'resize', 'tab']) {
      let restored = false, position, shots = 0;
      const base = { width: 800, height: 600, dpr: 1, totalWidth: 800, totalHeight: failure === 'limit' ? 100000 : 1800 };
      const api = { scripting: { executeScript: async () => {} }, tabs: {
        query: async () => [{ id: failure === 'tab' && shots ? 2 : 1, url: 'https://example.com/' }],
        captureVisibleTab: async () => { shots++; return 'data:image/png;base64,iVBORw=='; },
        sendMessage: async (id, message) => {
          const type = message.type.replace('PAGEKIT_FULL_', '');
          if (type === 'FINISH') { restored = true; return { success: true }; }
          if (type === 'PREPARE') return { ...base, success: true };
          if (type === 'SCROLL') { position = { ...base, x: message.x, y: message.y, success: true }; if (failure === 'resize') position.width++; return position; }
          return position;
        }
      } };
      await assert.rejects(capturePage({ id: 1, windowId: 1 }, 'fullpage', api), failure === 'limit' ? /上限/ : failure === 'resize' ? /大小或縮放/ : /分頁已切換/);
      assert.equal(restored, true, failure);
    }
  } finally { if (originalBitmap) globalThis.createImageBitmap = originalBitmap; else delete globalThis.createImageBitmap; }
});

test('截圖資料直接在本機解碼，無需 fetch data URL 或放寬 CSP', async () => {
  const bytes = new Uint8Array([137, 80, 78, 71, 0, 255]);
  const blob = captureBlob('data:image/png;base64,' + Buffer.from(bytes).toString('base64'));
  assert.equal(blob.type, 'image/png');
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
  assert.throws(() => captureBlob('https://example.com/image.png'), /無效/);
});

test('長圖安全界限以原生像素驗證，不受預覽縮放影響', () => {
  assert.deepEqual(validateCaptureSize(1920, 20000), { width: 1920, height: 20000 });
  for (const [w, h] of [[32761, 1], [1, 32761], [8000, 8001], [0, 1], [NaN, 2], [100.5, 2]]) assert.throws(() => validateCaptureSize(w, h), /安全上限/);
  assert.equal(validateCaptureSize(8000, 8000).width * 8000, CAPTURE_LIMITS.pixels);
});
test('捲動位置涵蓋最後一段、短頁與原尺寸 DPR 拼接，不重複最後座標', () => {
  const positions = capturePositions(2350, 900);
  assert.equal(positions[0], 0); assert.equal(positions.at(-1), 1450);
  for (let i = 1; i < positions.length; i++) { assert.ok(positions[i] > positions[i - 1]); assert.ok(positions[i] < positions[i - 1] + 900); }
  assert.deepEqual(capturePositions(800, 900), [0]);
  assert.deepEqual(frameDestination({ x: 0, y: 1450, width: 1600, height: 1800 }, { x: 2, y: 2 }, 1600, 4700), { x: 0, y: 2900, width: 1600, height: 1800 });
  assert.throws(() => capturePositions(1000000, 100), /過長/);
});
test('框選以原始像素夾限並包含反向拖曳；縮放10%至400%', () => {
  assert.deepEqual(nativeRect({ x: 900.4, y: 300.8 }, { x: -10, y: 100.2 }, 1000, 500), { x: 0, y: 100, width: 901, height: 201 });
  assert.deepEqual(nativeRect({ x: 50, y: 40 }, { x: 2000, y: 1000 }, 1000, 500), { x: 50, y: 40, width: 950, height: 460 });
  assert.equal(clampZoom(.01), .1); assert.equal(clampZoom(10), 4); assert.equal(clampZoom(NaN), 1);
});
test('大圖 OCR 區塊保留原始像素且恰好覆蓋來源，空隙可調整分界', () => {
  const rect = { x: 20, y: 70, width: 1920, height: 20000 };
  const tiles = ocrTiles(rect, { blankRow: (x, y, w, h) => y + h - 8 });
  let y = rect.y;
  for (const tile of tiles) { assert.equal(tile.y, y); assert.equal(tile.x, rect.x); assert.equal(tile.width, rect.width); assert.ok(tile.width * tile.height <= 2_000_000); y += tile.height; }
  assert.equal(y, rect.y + rect.height);
  assert.deepEqual(ocrTiles({ x: 0, y: 0, width: 10, height: 10 }), [{ x: 0, y: 0, width: 10, height: 10 }]);
  assert.throws(() => ocrTiles({ x: -1, y: 0, width: 10, height: 10 }), /無效/);
});
test('工作區交界偏好均勻空白列，找不到空隙仍保留所有像素', () => {
  const pixels = new Uint8ClampedArray(20 * 10 * 4).fill(255);
  // Last two rows contain text/graphics; the preceding row is blank.
  pixels[(8 * 20 + 10) * 4] = 0; pixels[(8 * 20 + 10) * 4 + 1] = 0; pixels[(8 * 20 + 10) * 4 + 2] = 0;
  pixels[(9 * 20 + 10) * 4] = 0; pixels[(9 * 20 + 10) * 4 + 1] = 0; pixels[(9 * 20 + 10) * 4 + 2] = 0;
  assert.equal(findBlankRow({ getImageData: () => ({ data: pixels }) }, 0, 50, 20, 10), 58);
});

function runtimePair() {
  const event = () => ({ listeners: [], addListener(fn) { this.listeners.push(fn); } });
  const runtime = { id: 'test', getURL: p => `chrome-extension://test/${p}`, onConnect: event() };
  runtime.sender = { id: runtime.id, url: runtime.getURL('ocr/ocr.html') };
  runtime.connect = ({ name }) => {
    const a = { name, onMessage: event(), onDisconnect: event() }, b = { name, sender: runtime.sender, onMessage: event(), onDisconnect: event() };
    let closed = false;
    for (const [from, to] of [[a, b], [b, a]]) {
      from.postMessage = message => { if (!closed) queueMicrotask(() => { if (!closed) for (const fn of to.onMessage.listeners) fn(message); }); };
      from.disconnect = () => { if (closed) return; closed = true; queueMicrotask(() => { for (const port of [a, b]) for (const fn of port.onDisconnect.listeners) fn(); }); };
    }
    queueMicrotask(() => { for (const fn of runtime.onConnect.listeners) fn(b); });
    return a;
  };
  return runtime;
}
test('記憶體交接分塊完整、限編輯頁且一次領取，重播失效', async () => {
  const runtime = runtimePair(), assets = captureAssets(runtime);
  const bytes = Uint8Array.from({ length: 200_000 }, (_, i) => i % 251);
  assets.put('valid', new Blob([bytes], { type: 'image/png' }));
  runtime.sender = { id: 'other', url: runtime.getURL('ocr/ocr.html') };
  await assert.rejects(readCapture(runtime, 'valid'), /失效/);
  runtime.sender = { id: runtime.id, url: runtime.getURL('content/not-editor.html') };
  await assert.rejects(readCapture(runtime, 'valid'), /失效/);
  runtime.sender = { id: runtime.id, url: runtime.getURL('ocr/ocr.html#anything') };
  const result = await readCapture(runtime, 'valid');
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), bytes);
  await assert.rejects(readCapture(runtime, 'valid'), /失效/);
});
test('記憶體交接逾時釋放，未領取圖片也不永久保留', async () => {
  const runtime = runtimePair(), assets = captureAssets(runtime, { ttl: 10 });
  assets.put('expired', new Blob(['png'], { type: 'image/png' }));
  await new Promise(resolve => setTimeout(resolve, 30));
  await assert.rejects(readCapture(runtime, 'expired'), /失效/);
});
