import test from 'node:test';
import assert from 'node:assert/strict';
import { desktopControls } from '../ocr/desktop-controls.js';

const control = () => ({ value: '', disabled: false, hidden: false, textContent: '', classList: { toggle() {} }, events: new Map(),
  addEventListener(name, fn) { this.events.set(name, fn); }, removeEventListener(name) { this.events.delete(name); }, async fire(name) { return this.events.get(name)?.(); } });
const event = () => ({ callbacks: new Set(), addListener(fn) { this.callbacks.add(fn); }, removeListener(fn) { this.callbacks.delete(fn); }, emit(value, area) { for (const fn of this.callbacks) fn(value, area); } });
function setup({ installed = false, capture = async () => null, set = async () => {} } = {}) {
  const controls = Object.fromEntries(['grant', 'revoke', 'start', 'cancel', 'message'].map(name => [name, control()]));
  const storageEvent = event(), removed = event(), added = event(), writes = [], accepted = [], restored = [];
  let requests = 0, opened = 0, blocked = false, granted = installed;
  const api = { storage: { local: { get: async () => ({}), set: async data => { writes.push(data); await set(data); } }, onChanged: storageEvent },
    permissions: { contains: async () => granted, request: async () => { requests++; return granted; }, remove: async () => { granted = false; removed.emit({ permissions: ['desktopCapture'] }); }, onRemoved: removed, onAdded: added },
    windows: { getCurrent: async () => ({ id: 4, state: 'maximized' }), update: async (id, props) => restored.push({ id, ...props }) }
  };
  const manager = desktopControls({ api, controls, capture, changed() {}, locked: () => blocked, revision: () => 17,
    openManagement: () => opened++, accept: async (...args) => accepted.push(args) });
  return { manager, controls, api, writes, accepted, storageEvent, removed, added, restored, get requests() { return requests; }, get opened() { return opened; }, set granted(value) { granted = value; }, set blocked(value) { blocked = value; } };
}
test('快捷鍵未授權只引導啟用，不自動彈授權；直接點擊才要求權限', async () => {
  const s = setup(); await s.manager.initialize(); await s.manager.begin(); assert.equal(s.requests, 0); assert.equal(s.opened, 1); assert.equal(s.accepted.length, 0);
  await s.controls.grant.fire('click'); assert.equal(s.requests, 1); assert.equal(s.controls.grant.hidden, false);
  s.granted = true; await s.controls.grant.fire('click'); assert.equal(s.controls.grant.hidden, true); assert.equal(s.controls.revoke.hidden, false);
  await s.controls.revoke.fire('click'); assert.equal(s.controls.grant.hidden, false);
});
test('來源操作鎖定不擷取；取消及錯誤保留舊圖；成功交付 PNG 與剪貼簿版本', async () => {
  let result, failure, calls = 0;
  const s = setup({ installed: true, capture: async () => { calls++; if (failure) throw Error('frame failed'); return result; } }); await s.manager.initialize();
  s.blocked = true; await s.manager.begin(); assert.equal(calls, 0); s.blocked = false;
  await s.manager.begin(); assert.equal(s.accepted.length, 0);
  failure = true; await s.manager.begin(); assert.equal(s.accepted.length, 0); assert.match(s.controls.message.textContent, /frame failed/);
  failure = false; result = { blob: new Blob(['png'], { type: 'image/png' }) }; await s.manager.begin();
  assert.equal(s.accepted[0][0], result.blob); assert.equal(s.accepted[0][1], 17); assert.equal(s.manager.working, false);
});
test('重複快捷鍵不開多個 picker；撤銷／關窗中斷，遲到結果不取代圖片', async () => {
  let finish, calls = 0, signal;
  const s = setup({ installed: true, capture: options => { calls++; signal = options.signal; return new Promise(resolve => { finish = resolve; }); } });
  await s.manager.initialize(); const first = s.manager.begin(); await new Promise(resolve => setImmediate(resolve));
  await s.manager.begin(); assert.equal(calls, 1); assert.equal(s.manager.working, true);
  s.removed.emit({ permissions: ['desktopCapture'] }); assert.equal(signal.aborted, true);
  finish({ blob: new Blob(['ignored']) }); await first; assert.equal(s.accepted.length, 0);
  const next = s.manager.begin(); await new Promise(resolve => setImmediate(resolve)); s.manager.destroy(); finish({ blob: new Blob(['ignored']) }); await next;
  assert.equal(s.accepted.length, 0); assert.equal(s.storageEvent.callbacks.size, 0); assert.equal(s.removed.callbacks.size, 0);
});
test('按分享就交付截圖，完成後只聚焦，不最小化或改變原本大小', async () => {
  let captured = false;
  const s = setup({ installed: true, capture: async ({ beforeFrame, onSelected }) => { assert.equal(beforeFrame, undefined); onSelected(); captured = true; return { blob: new Blob(['png'], { type: 'image/png' }) }; } });
  s.api.windows.update = async (id, props) => { assert.equal(captured, true); assert.equal(s.accepted.length, 1); s.restored.push({ id, ...props }); };
  await s.manager.initialize(); await s.manager.begin(); assert.deepEqual(s.restored, [{ id: 4, focused: true }]);
  assert.equal(s.accepted.length, 1);
});
