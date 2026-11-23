import { PaddleOCR } from '../vendor/paddle/paddle.js';
import { MODEL_FILES, readModel, verifyModel } from './model-store.js';

let enginePromise;
async function getEngine() {
  if (!enginePromise) enginePromise = (async () => {
    const model = await readModel();
    if (!model) throw new Error('尚未安裝加強模型，請先下載或切換內建引擎');
    for (const file of MODEL_FILES) await verifyModel(model[file.key], file);
    self.postMessage({ type: 'PROGRESS', value: 0.15 });
    return PaddleOCR.create({
      textDetectionModelName: 'PP-OCRv6_small_det', textRecognitionModelName: 'PP-OCRv6_small_rec',
      textDetectionModelAsset: { url: 'pagekit-model:det' }, textRecognitionModelAsset: { url: 'pagekit-model:rec' },
      fetch: async input => {
        const key = String(input).replace('pagekit-model:', '');
        if (!['det', 'rec'].includes(key) || String(input) !== `pagekit-model:${key}`) throw new Error('拒絕未封裝的 OCR 資源');
        return new Response(model[key]);
      },
      ortOptions: { backend: 'wasm', numThreads: 1, proxy: false, wasmPaths: new URL('../vendor/paddle/ort/', import.meta.url).href }
    });
  })().catch(error => { enginePromise = null; throw error; });
  return enginePromise;
}
let running = false;
self.onmessage = async ({ data }) => {
  if (running) { data.bitmap?.close(); return; }
  running = true;
  try {
    const engine = await getEngine();
    self.postMessage({ type: 'PROGRESS', value: 0.4 });
    const result = await engine.predict(data.bitmap);
    self.postMessage({ type: 'RESULT', result });
  } catch (error) { self.postMessage({ type: 'ERROR', error: error.message || String(error) }); }
  // The owning editor terminates this worker once per batch, releasing the
  // shared WASM sessions. Do not reload/verify both models for every work tile.
  finally { data.bitmap?.close(); running = false; }
};
