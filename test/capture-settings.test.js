import test from 'node:test';
import assert from 'node:assert/strict';
import { captureSettings, singleWindowSettings, AUTO_COPY_SCREENSHOT_KEY as key } from '../ocr/capture-settings.js';
import { SINGLE_EDITOR_WINDOW_KEY } from '../capture-preferences.js';

function setup({ value, get, set, factory = captureSettings, settingKey = key } = {}) {
  const listeners = new Set(), checkbox = new EventTarget();
  const message = { textContent: '', classList: { toggle() {} } };
  const writes = [];
  const storage = {
    local: { get: get || (async () => ({ [settingKey]: value })), set: async data => { if (set) await set(data); writes.push(data); } },
    onChanged: { addListener: f => listeners.add(f), removeListener: f => listeners.delete(f) }
  };
  const settings = factory({ storage, checkbox, message });
  const change = async value => { checkbox.checked = value; checkbox.dispatchEvent(new Event('change')); await new Promise(resolve => setImmediate(resolve)); };
  const remote = value => { for (const f of listeners) f({ [settingKey]: { newValue: value } }, 'local'); };
  return { settings, checkbox, message, writes, change, remote, listeners };
}
test('截圖自動複製預設開啟；已儲存的關閉選擇與重新開啟會保留', async () => {
  const first = setup(); await first.settings.initialize();
  assert.equal(first.settings.enabled, true); assert.equal(first.checkbox.checked, true);
  await first.change(false); assert.deepEqual(first.writes, [{ [key]: false }]); assert.equal(first.settings.enabled, false);
  const next = setup({ value: first.writes[0][key] }); await next.settings.initialize(); assert.equal(next.settings.enabled, false);
  await next.change(true); assert.equal(next.settings.enabled, true); assert.equal(next.checkbox.disabled, false);
});

test('單一視窗預設開啟，關閉／重新載入／開啟會保存到獨立鍵，不寫自動複製設定', async () => {
  const options = { factory: singleWindowSettings, settingKey: SINGLE_EDITOR_WINDOW_KEY };
  const s = setup(options); await s.settings.initialize(); assert.equal(s.settings.enabled, true);
  await s.change(false); assert.deepEqual(s.writes, [{ [SINGLE_EDITOR_WINDOW_KEY]: false }]);
  assert.match(s.message.textContent, /另開/);
  const next = setup({ ...options, value: false }); await next.settings.initialize(); assert.equal(next.checkbox.checked, false);
  await next.change(true); assert.equal(next.checkbox.checked, true); assert.match(next.message.textContent, /重用/);
  next.remote(false); assert.equal(next.checkbox.checked, false);
});
test('單一視窗設定儲存失敗還原，讀取錯誤可重新設定，關閉後停止監聽', async () => {
  const options = { factory: singleWindowSettings, settingKey: SINGLE_EDITOR_WINDOW_KEY };
  const s = setup({ ...options, set: async () => { throw Error('failed'); } });
  await s.settings.initialize(); await s.change(false); assert.equal(s.checkbox.checked, true); assert.match(s.message.textContent, /儲存失敗/);
  const r = setup({ ...options, get: async () => { throw Error('failed'); } });
  await r.settings.initialize(); assert.match(r.message.textContent, /無法讀取視窗/); await r.change(false); assert.equal(r.settings.enabled, false);
  r.settings.destroy(); assert.equal(r.listeners.size, 0);
});
test('跨窗變更勝過遲到的讀取；關閉再開啟仍使原有複製工作過期', async () => {
  let resolve; const s = setup({ get: () => new Promise(done => { resolve = done; }) });
  const loading = s.settings.initialize(); s.remote(false); resolve({ [key]: true }); await loading;
  assert.equal(s.settings.enabled, false);
  const revision = s.settings.revision; s.remote(true); assert.equal(s.settings.enabled, true); assert.notEqual(s.settings.revision, revision);
});
test('讀取失敗不自動複製，儲存失敗還原原選擇並可再操作', async () => {
  const readFailure = setup({ get: async () => { throw Error('unavailable'); } }); await readFailure.settings.initialize();
  assert.equal(readFailure.settings.enabled, false); assert.match(readFailure.message.textContent, /無法讀取/);
  const writeFailure = setup({ set: async () => { throw Error('quota'); } }); await writeFailure.settings.initialize(); await writeFailure.change(false);
  assert.equal(writeFailure.settings.enabled, true); assert.equal(writeFailure.checkbox.checked, true); assert.equal(writeFailure.checkbox.disabled, false); assert.match(writeFailure.message.textContent, /儲存失敗/);
});
test('關閉視窗解除訂閱，遲到初始化不再修改設定控制項', async () => {
  let resolve; const s = setup({ get: () => new Promise(done => { resolve = done; }) });
  const loading = s.settings.initialize(); s.settings.destroy(); const revision = s.settings.revision; resolve({ [key]: false }); await loading;
  assert.equal(s.listeners.size, 0); assert.equal(s.settings.revision, revision); assert.equal(s.checkbox.disabled, true);
});
