import test from 'node:test';
import assert from 'node:assert/strict';
import { clipboardWrites } from '../ocr/clipboard-writes.js';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('OCR 開始後手動複製圖片，遲到結果不寫入文字；下一次 OCR 仍可自動複製', async () => {
  const writes = [];
  const clipboard = clipboardWrites({ writeText: async text => writes.push(text), writeImage: async snapshot => writes.push(await snapshot) });
  const automaticRevision = clipboard.revision;
  await clipboard.copyImage(Promise.resolve('annotated PNG'));
  assert.equal(await clipboard.copyText('old OCR', { automaticRevision }), false);
  assert.deepEqual(writes, ['annotated PNG']);
  assert.equal(await clipboard.copyText('new OCR', { automaticRevision: clipboard.revision }), true);
  assert.deepEqual(writes, ['annotated PNG', 'new OCR']);
});

test('已開始的自動剪貼簿請求與手動複製競爭時，最後內容仍為手動圖片', async () => {
  const started = deferred(), release = deferred(), writes = [];
  const clipboard = clipboardWrites({
    writeText: async text => { started.resolve(); await release.promise; writes.push(text); },
    writeImage: async snapshot => writes.push(await snapshot)
  });
  const automatic = clipboard.copyText('OCR', { automaticRevision: clipboard.revision });
  await started.promise;
  const manual = clipboard.copyImage(Promise.resolve('PNG at click time'));
  release.resolve();
  await Promise.all([automatic, manual]);
  assert.deepEqual(writes, ['OCR', 'PNG at click time']);
});

test('圖片寫入失敗不讓同一輪 OCR 接著覆蓋，也不阻塞之後的手動複製', async () => {
  const writes = [];
  const clipboard = clipboardWrites({ writeText: async text => writes.push(text), writeImage: async () => { throw new Error('denied'); } });
  const automaticRevision = clipboard.revision;
  await assert.rejects(clipboard.copyImage(Promise.resolve('PNG')), /denied/);
  assert.equal(await clipboard.copyText('OCR', { automaticRevision }), false);
  await clipboard.copyText('manual text');
  assert.deepEqual(writes, ['manual text']);
});

test('排隊中的舊辨識在視窗關閉或取消後，不再寫入剪貼簿', async () => {
  const release = deferred(), writes = [];
  const clipboard = clipboardWrites({ writeText: async text => writes.push(text), writeImage: async () => release.promise });
  const manual = clipboard.copyImage(Promise.resolve('PNG'));
  let current = true;
  const automatic = clipboard.copyText('stale OCR', { automaticRevision: clipboard.revision, isCurrent: () => current });
  current = false;
  release.resolve();
  await manual;
  assert.equal(await automatic, false);
  assert.deepEqual(writes, []);
});
