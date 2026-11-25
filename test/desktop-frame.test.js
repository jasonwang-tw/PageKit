import test from 'node:test';
import assert from 'node:assert/strict';
import { captureDesktopFrame } from '../ocr/desktop-frame.js';

function setup({ id = 'stream', width = 1920, height = 1080, failPlay, failDraw, emptyBlob, acquire, play, readyState = 2 } = {}) {
  const stops = [], events = [], cancelled = [], constraints = [];
  const track = { readyState: 'live', getSettings: () => ({ displaySurface: 'monitor' }), stop() { this.readyState = 'ended'; stops.push(1); events.push('stop'); } };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  let callback;
  const api = { runtime: {}, desktopCapture: {
    chooseDesktopMedia(sources, done) { assert.deepEqual(sources, ['screen', 'window']); callback = done; queueMicrotask(() => done(id)); return 7; },
    cancelChooseDesktopMedia: value => cancelled.push(value)
  } };
  const video = Object.assign(new EventTarget(), { readyState, videoWidth: width, videoHeight: height, playsInline: false, muted: false,
    async play() { events.push('play'); if (failPlay) throw Error('play failed'); if (play) await play(); },
    pause() { events.push('pause'); }, remove() {}, requestVideoFrameCallback() { assert.fail('擷取不能等待畫面繪製回呼'); }
  });
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() { if (failDraw) throw Error('draw failed'); events.push('draw'); } }),
    toBlob(done, type) { assert.equal(type, 'image/png'); assert.equal(track.readyState, 'ended', '在 PNG 編碼前停止所有串流'); events.push('blob'); done(emptyBlob ? null : new Blob(['png'], { type })); }
  };
  const controller = new AbortController();
  const options = { api, signal: controller.signal, mediaDevices: { getUserMedia: async value => { constraints.push(value); return acquire ? acquire(stream) : stream; } },
    document: { createElement: tag => tag === 'video' ? video : canvas }, timeoutMs: 50, pickerTimeoutMs: 50 };
  return { options, controller, stream, track, stops, events, cancelled, constraints, video, canvas, callback: () => callback };
}
test('完整尺寸 PNG、一幀擷取不含音訊，編碼前即停止串流並清空資源', async () => {
  const s = setup();
  const result = await captureDesktopFrame(s.options);
  assert.equal(result.width, 1920); assert.equal(result.height, 1080); assert.equal(result.blob.type, 'image/png');
  assert.equal(s.constraints[0].audio, false); assert.equal(s.constraints[0].video.mandatory.chromeMediaSourceId, 'stream');
  assert.ok(s.events.indexOf('draw') < s.events.indexOf('stop') && s.events.indexOf('stop') < s.events.indexOf('blob'));
  assert.equal(s.video.srcObject, null); assert.equal(s.canvas.width, 0);
});
test('取消原生選擇器不開啟串流，也不產生圖片', async () => {
  const s = setup({ id: '' }); assert.equal(await captureDesktopFrame(s.options), null); assert.equal(s.constraints.length, 0);
});
test('取消尚未回覆的 picker、關窗及遲到串流一律清理', async () => {
  const s = setup(); s.options.api.desktopCapture.chooseDesktopMedia = () => 9;
  const pending = captureDesktopFrame(s.options); s.controller.abort();
  await assert.rejects(pending, { name: 'AbortError' }); assert.deepEqual(s.cancelled, [9]);
  let deliver;
  const late = setup({ acquire: stream => new Promise(resolve => { deliver = () => resolve(stream); }) });
  const acquiring = captureDesktopFrame(late.options);
  await new Promise(resolve => setImmediate(resolve)); late.controller.abort(); await assert.rejects(acquiring, { name: 'AbortError' });
  deliver(); await new Promise(resolve => setImmediate(resolve)); assert.equal(late.track.readyState, 'ended');
});
test('播放／繪製／編碼失敗、無效尺寸或超限都釋放串流', async () => {
  for (const failure of [{ failPlay: true, readyState: 0 }, { failDraw: true }, { emptyBlob: true }, { width: 0 }, { width: 10000, height: 10000 }]) {
    const s = setup(failure); await assert.rejects(captureDesktopFrame(s.options)); assert.equal(s.track.readyState, 'ended'); assert.equal(s.video.srcObject, null);
  }
});
test('解碼逾時會停止串流；picker逾時會取消，不等待使用者叫回視窗', async () => {
  const s = setup({ readyState: 0 });
  await assert.rejects(captureDesktopFrame(s.options), /逾時/);
  assert.equal(s.track.readyState, 'ended');
  const picker = setup(); picker.options.api.desktopCapture.chooseDesktopMedia = () => 20;
  await assert.rejects(captureDesktopFrame(picker.options), /逾時/); assert.deepEqual(picker.cancelled, [20]);
});
test('ImageCapture直接取原始bitmap，不建立video或要求繪製回呼', async () => {
  const s = setup(); let closed = 0, selected = false;
  const frame = { width: 2560, height: 1440, close() { closed++; } };
  const result = await captureDesktopFrame({ ...s.options, onSelected: () => { selected = true; }, imageCapture: class { constructor(track) { assert.equal(track, s.track); } async grabFrame() { return frame; } } });
  assert.equal(result.width, 2560); assert.equal(result.height, 1440); assert.equal(closed, 1); assert.equal(selected, true); assert.ok(!s.events.includes('play')); assert.equal(s.track.readyState, 'ended');
});
test('抓圖取消與逾時都立刻停止分享；遲到bitmap會關閉', async () => {
  for (const cancel of [true, false]) {
    const s = setup(); let deliver, closed = 0;
    const pending = captureDesktopFrame({ ...s.options, imageCapture: class { grabFrame() { return new Promise(resolve => { deliver = () => resolve({ width: 10, height: 10, close() { closed++; } }); }); } } });
    await new Promise(resolve => setImmediate(resolve)); if (cancel) s.controller.abort();
    await assert.rejects(pending, { name: cancel ? 'AbortError' : 'TimeoutError' }); assert.equal(s.track.readyState, 'ended');
    deliver(); await new Promise(resolve => setImmediate(resolve)); assert.equal(closed, 1);
  }
});
test('備援不支援的ImageCapture，取得decoded data即可完成，不等play Promise或繪製', async () => {
  const s = setup({ readyState: 0 });
  s.video.play = () => { queueMicrotask(() => { s.video.readyState = 2; s.video.dispatchEvent(new Event('loadeddata')); }); return new Promise(() => {}); };
  const result = await captureDesktopFrame({ ...s.options, imageCapture: class { async grabFrame() { throw new DOMException('Unsupported', 'NotSupportedError'); } } });
  assert.equal(result.width, 1920); assert.equal(s.track.readyState, 'ended');
});
