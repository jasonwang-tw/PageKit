import test from 'node:test';
import assert from 'node:assert/strict';
import { captureShortcuts } from '../ocr/capture-shortcuts.js';

function setup(getAll) {
  const target = new EventTarget(), opener = new EventTarget(), region = {}, desktop = {}, header = {};
  const controls = captureShortcuts({ commands: { getAll }, target, opener, region, desktop, header });
  return { controls, target, opener, region, desktop, header };
}
test('分別顯示瀏覽器實際綁定，未設定第二組時明示且不更改按鍵', async () => {
  let calls = 0;
  const s = setup(async () => { calls++; return [{ name: 'capture-region', shortcut: 'Alt+S' }, { name: 'capture-desktop', shortcut: '' }]; });
  await s.controls.initialize(); assert.equal(s.region.textContent, 'Alt+S'); assert.equal(s.desktop.textContent, '未設定'); assert.match(s.header.title, /桌面截圖：未設定/); assert.equal(calls, 1);
});
test('回到視窗或開設定時重新讀取兩組按鍵，包含使用者清除綁定', async () => {
  let bindings = [{ name: 'capture-region', shortcut: 'Alt+S' }, { name: 'capture-desktop', shortcut: 'Alt+D' }];
  const s = setup(async () => bindings); await s.controls.initialize(); assert.equal(s.desktop.textContent, 'Alt+D');
  bindings = [{ name: 'capture-region', shortcut: '' }, { name: 'capture-desktop', shortcut: 'Ctrl+Shift+9' }];
  s.target.dispatchEvent(new Event('focus')); await new Promise(resolve => setImmediate(resolve));
  assert.equal(s.region.textContent, '未設定'); assert.equal(s.desktop.textContent, 'Ctrl+Shift+9');
  bindings = []; s.opener.dispatchEvent(new Event('click')); await new Promise(resolve => setImmediate(resolve)); assert.equal(s.desktop.textContent, '未設定');
});
test('讀取失敗不誤稱已綁定，下一次更新仍可恢復', async () => {
  let failed = true;
  const s = setup(async () => { if (failed) throw Error('API unavailable'); return [{ name: 'capture-region', shortcut: 'Alt+S' }]; });
  await s.controls.initialize(); assert.equal(s.region.textContent, '無法讀取'); assert.equal(s.desktop.textContent, '無法讀取');
  failed = false; await s.controls.refresh(); assert.equal(s.region.textContent, 'Alt+S'); assert.equal(s.desktop.textContent, '未設定');
});
test('新的綁定勝過遲到回覆，離頁後不再監聽或修改介面', async () => {
  let deliver, calls = 0;
  const s = setup(() => ++calls === 1 ? new Promise(resolve => { deliver = resolve; }) : Promise.resolve([{ name: 'capture-desktop', shortcut: 'Alt+D' }]));
  const old = s.controls.initialize(); await s.controls.refresh(); deliver([{ name: 'capture-desktop', shortcut: 'Alt+X' }]); await old; assert.equal(s.desktop.textContent, 'Alt+D');
  s.controls.destroy(); s.target.dispatchEvent(new Event('focus')); s.opener.dispatchEvent(new Event('click')); assert.equal(calls, 2);
  let late; const closed = setup(() => new Promise(resolve => { late = resolve; })); const pending = closed.controls.initialize(); closed.controls.destroy(); late([]); await pending; assert.equal(closed.region.textContent, undefined);
});
