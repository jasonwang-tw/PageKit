import test from 'node:test';
import assert from 'node:assert/strict';
import { editorWindows } from '../editor-window.js';
import { SINGLE_EDITOR_WINDOW_KEY as key } from '../capture-preferences.js';

const base = 'chrome-extension://pagekit/ocr/ocr.html';
const first = '11111111-1111-1111-1111-111111111111';
const second = '22222222-2222-2222-2222-222222222222';
const path = id => `ocr/ocr.html#${id}`;
function setup() {
  let windows = [], enabled;
  const created = [], navigated = [], focused = [], notices = [], discarded = [];
  const api = {
    runtime: { getURL: path => `chrome-extension://pagekit/${path}` },
    storage: { local: { get: async () => ({ [key]: enabled }) } },
    windows: {
      getAll: async () => structuredClone(windows),
      create: async props => {
        const id = created.length + 10;
        const window = { ...props, id, state: 'normal', tabs: [{ id: id + 100, url: props.url }] };
        created.push(props); windows.push(window); return structuredClone(window);
      },
      update: async (id, props) => { focused.push({ id, ...props }); }
    },
    tabs: {
      update: async (id, props) => {
        navigated.push({ id, ...props });
        const tab = windows.flatMap(w => w.tabs).find(t => t.id === id);
        if (!tab) throw Error('No tab');
        tab.url = props.url; delete tab.pendingUrl;
      },
      sendMessage: async (id, message) => { notices.push({ id, message }); }
    }
  };
  const createManager = () => editorWindows(api, { discard: async id => { discarded.push(id); } });
  return { api, created, navigated, focused, notices, discarded, createManager, open: createManager(),
    set enabled(value) { enabled = value; }, get windows() { return windows; }, set windows(value) { windows = value; } };
}
test('預設第一次建立 popup，之後截圖重用且完整導航，保留位置並聚焦', async () => {
  const s = setup(); await s.open(path(first));
  assert.equal(s.created.length, 1);
  assert.equal(s.created[0].type, 'popup');
  await s.open(path(second));
  assert.equal(s.created.length, 1);
  assert.equal(s.navigated[0].id, 110);
  const url = new URL(s.navigated[0].url);
  assert.equal(url.hash, `#${second}`);
  assert.ok(url.searchParams.get('editor'));
  assert.deepEqual(s.focused, [{ id: 10, focused: true }]);
  assert.deepEqual(s.discarded, [first]);
});
test('編輯器已移除 hash 後仍能辨識，連續重用每次都是不同文件網址', async () => {
  const s = setup(); await s.open(path(first)); s.windows[0].tabs[0].url = base;
  await s.open(path(second)); await s.open(path(second));
  assert.equal(s.created.length, 1);
  assert.notEqual(s.navigated[0].url, s.navigated[1].url);
});
test('快速並發十次不重複建立視窗，最後請求成為目前工作', async () => {
  const s = setup();
  await Promise.all(Array.from({ length: 10 }, (_, i) => s.open(path(i % 2 ? second : first))));
  assert.equal(s.created.length, 1); assert.equal(s.navigated.length, 9);
  assert.equal(new URL(s.windows[0].tabs[0].url).hash, `#${second}`);
});
test('關閉後建立新窗；背景服務重新啟動仍找得到既有視窗', async () => {
  const s = setup(); await s.open(path(first));
  await s.createManager()(path(second)); assert.equal(s.created.length, 1);
  s.windows = []; await s.open(path(first)); assert.equal(s.created.length, 2);
});
test('設定關閉後每次另開；重新啟用只重用一個而不關閉其他工作', async () => {
  const s = setup(); s.enabled = false;
  await s.open(path(first)); await s.open(path(second)); assert.equal(s.created.length, 2);
  s.enabled = true; await s.open(path(first));
  assert.equal(s.created.length, 2); assert.equal(s.windows.length, 2); assert.equal(s.navigated[0].id, 111);
});
test('一般與無痕視窗獨立，不會跨環境替換圖片', async () => {
  const s = setup(); await s.open(path(first)); await s.open(path(first), true);
  await s.open(path(second), true); await s.open(path(second));
  assert.deepEqual(s.created.map(w => w.incognito), [false, true]);
  assert.deepEqual(s.navigated.map(t => t.id), [111, 110]);
});
test('最小化視窗還原，其他視窗不改動大小或最大化狀態', async () => {
  const s = setup(); await s.open(path(first)); s.windows[0].state = 'minimized';
  await s.open(path(second)); assert.deepEqual(s.focused[0], { id: 10, focused: true, state: 'normal' });
  s.windows[0].state = 'maximized'; await s.open(path(first));
  assert.deepEqual(s.focused[1], { id: 10, focused: true });
});
test('匯入入口已有編輯器時只聚焦；截圖失敗只傳送提示不清除文件', async () => {
  const s = setup(); await s.open(path(first)); await s.open('ocr/ocr.html');
  await s.open('ocr/ocr.html?error=%E6%93%B7%E5%8F%96%E5%A4%B1%E6%95%97');
  assert.equal(s.created.length, 1); assert.equal(s.navigated.length, 0);
  assert.deepEqual(s.notices, [{ id: 110, message: { type: 'CAPTURE_ERROR', error: '擷取失敗' } }]);
  assert.equal(s.windows[0].tabs[0].url, `${base}#${first}`);
});
test('無既有編輯器時錯誤與空白匯入頁仍可建立', async () => {
  const s = setup(); await s.open('ocr/ocr.html?error=failed');
  assert.match(s.created[0].url, /error=failed/);
  s.windows = []; await s.open('ocr/ocr.html'); assert.equal(s.created[1].url, base);
});
test('不操作一般分頁、別的擴充功能、多分頁 popup 或相似網址', async () => {
  const s = setup();
  s.windows = [
    { id: 1, type: 'normal', tabs: [{ id: 1, url: base }] },
    { id: 2, type: 'popup', tabs: [{ id: 2, url: 'chrome-extension://other/ocr/ocr.html' }] },
    { id: 3, type: 'popup', tabs: [{ id: 3, url: `${base}.fake` }] },
    { id: 4, type: 'popup', tabs: [{ id: 4, url: base }, { id: 5, url: base }] },
    { id: 5, type: 'popup', tabs: [{ id: 6, url: base, pendingUrl: 'https://example.com/' }] }
  ];
  await s.open(path(first)); assert.equal(s.created.length, 1); assert.equal(s.navigated.length, 0);
});
test('已開始導航但未完成的編輯器仍可重用，不另開新窗', async () => {
  const s = setup();
  s.windows = [{ id: 3, type: 'popup', tabs: [{ id: 4, url: '', pendingUrl: `${base}#${first}` }] }];
  await s.open(path(second)); assert.equal(s.created.length, 0); assert.equal(s.navigated[0].id, 4);
  assert.deepEqual(s.discarded, [first]);
});
test('導航時目標被關閉才重建；仍存在時的 API 失敗不製造重複視窗', async () => {
  const s = setup(); await s.open(path(first));
  s.api.tabs.update = async () => { throw Error('navigation denied'); };
  await assert.rejects(s.open(path(second)), /navigation denied/);
  assert.equal(s.created.length, 1); assert.deepEqual(s.discarded, []);
  s.api.tabs.update = async () => { s.windows = []; throw Error('No tab'); };
  await s.open(path(second)); assert.equal(s.created.length, 2);
});
test('設定讀取失敗不任意替換圖片，佇列可在失敗後恢復', async () => {
  const s = setup(); const get = s.api.storage.local.get;
  s.api.storage.local.get = async () => { throw Error('storage failed'); };
  await assert.rejects(s.open(path(first)), /storage failed/); assert.equal(s.created.length, 0);
  s.api.storage.local.get = get; await s.open(path(second)); assert.equal(s.created.length, 1);
});
test('導航成功後聚焦失敗不再開窗或拋出錯誤，原工作已正確換圖', async () => {
  const s = setup(); await s.open(path(first)); s.api.windows.update = async () => { throw Error('window no longer focused'); };
  await s.open(path(second)); assert.equal(s.created.length, 1); assert.match(s.windows[0].tabs[0].url, new RegExp(second));
});
test('桌面入口在既有視窗傳訊，不導航、不清除舊圖，關閉單窗設定才另開', async () => {
  const s = setup(); await s.open(path(first));
  s.api.tabs.sendMessage = async (id, message) => { s.notices.push({ id, message }); return { ready: true }; };
  await s.open('ocr/ocr.html?desktop=1');
  assert.equal(s.created.length, 1); assert.equal(s.navigated.length, 0); assert.match(s.windows[0].tabs[0].url, new RegExp(first));
  assert.deepEqual(s.notices[0].message, { type: 'START_DESKTOP_CAPTURE' }); assert.deepEqual(s.discarded, []);
  s.enabled = false; await s.open('ocr/ocr.html?desktop=1'); assert.equal(s.created.length, 2); assert.match(s.created[1].url, /desktop=1/);
});
test('桌面入口等初始化就緒只啟動一次；權限 API 錯誤不當成新視窗', async () => {
  const s = setup(); await s.open(path(first)); let attempts = 0;
  s.api.tabs.sendMessage = async () => ({ ready: ++attempts === 2 });
  await s.open('ocr/ocr.html?desktop=1'); assert.equal(attempts, 2); assert.equal(s.created.length, 1);
  s.api.tabs.sendMessage = async () => { throw Error('access denied'); };
  await assert.rejects(s.open('ocr/ocr.html?desktop=1'), /access denied/); assert.equal(s.created.length, 1);
});
