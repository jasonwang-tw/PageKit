import { CAPTURE_LIMITS, validateCaptureSize, capturePositions, frameDestination } from './capture-geometry.js';

let captureQueue = Promise.resolve(), lastCapture = 0;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export function captureBlob(url) {
  const prefix = 'data:image/png;base64,';
  if (!url?.startsWith(prefix) || url.length - prefix.length > Math.ceil(CAPTURE_LIMITS.bytes / 3) * 4) throw new Error('網頁截圖無效或超出記憶體上限');
  // Decode locally: fetch(data:) is blocked by the extension's self-only CSP.
  const raw = atob(url.slice(prefix.length)), parts = [];
  for (let offset = 0; offset < raw.length; offset += 64 * 1024) parts.push(Uint8Array.from(raw.slice(offset, offset + 64 * 1024), char => char.charCodeAt(0)));
  return new Blob(parts, { type: 'image/png' });
}
// A single queue also protects captureVisibleTab's per-extension rate limit.
export function captureVisible(tabs, windowId, before = () => {}) {
  const request = captureQueue.catch(() => {}).then(async () => {
    await delay(Math.max(0, lastCapture + 550 - Date.now()));
    await before();
    lastCapture = Date.now();
    return tabs.captureVisibleTab(windowId, { format: 'png' });
  });
  captureQueue = request;
  return request;
}
export async function capturePage(tab, mode, api = chrome) {
  const id = crypto.randomUUID(), frames = [];
  let canvas, prepared = false, compressedBytes = 0;
  let initial;
  initial = await verifyTab();
  async function verifyTab() {
    const [active] = await api.tabs.query({ active: true, windowId: tab.windowId });
    if (active?.id !== tab.id || !/^https?:\/\//.test(active.url || '') || (initial?.url && active.url !== initial.url)) throw new Error('截圖時分頁已切換或導航，請回到原頁面重試');
    return active;
  }
  async function send(type, data = {}) {
    const response = await api.tabs.sendMessage(tab.id, { type: `PAGEKIT_FULL_${type}`, id, ...data }, { frameId: 0 });
    if (!response?.success) throw new Error(response?.error || '無法取得網頁截圖狀態');
    return response;
  }
  async function take(expected) {
    const check = async () => {
      await verifyTab();
      if (!expected) return;
      const now = await send('CHECK');
      if (['x', 'y', 'width', 'height', 'dpr', 'totalWidth', 'totalHeight'].some(key => now[key] !== expected[key])) throw new Error('擷取時網頁位置或版面已改變，請待頁面穩定後重試');
    };
    const url = await captureVisible(api.tabs, tab.windowId, check);
    await check();
    await verifyTab();
    if (!url?.startsWith('data:image/png;base64,')) throw new Error('網頁截圖失敗');
    const blob = captureBlob(url);
    compressedBytes += blob.size;
    if (compressedBytes > CAPTURE_LIMITS.bytes) throw new Error('截圖暫存超過 128 MiB 安全上限，請改用框選截圖');
    return blob;
  }
  try {
    if (mode === 'visible') {
      const blob = await take(), bitmap = await createImageBitmap(blob);
      try { validateCaptureSize(bitmap.width, bitmap.height); return { blob, width: bitmap.width, height: bitmap.height }; }
      finally { bitmap.close(); }
    }
    await api.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, files: ['content/fullpage-capture.js'] });
    const base = await send('PREPARE'); prepared = true;
    let dimensions = base, scale, width, height;
    const started = Date.now();
    // Extend only downward for lazy-loaded main pages, bounded by time/frames/size.
    let y = 0, coveredBottom = 0;
    for (;;) {
      const xs = capturePositions(dimensions.totalWidth, base.width);
      let coveredRight = 0, rowBottom = 0;
      for (const x of xs) {
        if (frames.length >= CAPTURE_LIMITS.frames || Date.now() - started > 180_000) throw new Error('頁面持續增長或擷取過久，已停止並還原頁面；請改用框選截圖');
        await verifyTab();
        const position = await send('SCROLL', { x, y });
        if (position.width !== base.width || position.height !== base.height || position.dpr !== base.dpr) throw new Error('擷取時視窗大小或縮放已變更，請重試');
        if (position.totalWidth !== base.totalWidth) throw new Error('擷取時頁面寬度已變更，請待版面穩定後重試');
        if (Math.abs(position.x - Math.min(x, Math.max(0, position.totalWidth - base.width))) > 2 || Math.abs(position.y - Math.min(y, Math.max(0, position.totalHeight - base.height))) > 2) throw new Error('網頁限制主頁面捲動，請改用框選截圖');
        const blob = await take(position), bitmap = await createImageBitmap(blob);
        try {
          scale ||= { x: bitmap.width / base.width, y: bitmap.height / base.height };
          if (Math.abs(bitmap.width / base.width - scale.x) > 0.001 || Math.abs(bitmap.height / base.height - scale.y) > 0.001) throw new Error('截圖像素比例已改變，請重試');
          width = Math.round(position.totalWidth * scale.x); height = Math.round(position.totalHeight * scale.y);
          validateCaptureSize(width, height);
          // Never overwrite an earlier overlap after sticky elements have been
          // hidden: that could erase the lower half of an already captured title.
          const cropLeft = Math.max(0, Math.round(coveredRight * scale.x) - Math.round(position.x * scale.x));
          const cropTop = Math.max(0, Math.round(coveredBottom * scale.y) - Math.round(position.y * scale.y));
          frames.push({ blob, x: position.x, y: position.y, width: bitmap.width, height: bitmap.height, cropLeft, cropTop });
          coveredRight = position.x + base.width;
          rowBottom = position.y + base.height;
        } finally { bitmap.close(); }
        dimensions = position;
        await send('COMMIT', { count: frames.length });
      }
      coveredBottom = rowBottom;
      if (y + base.height >= dimensions.totalHeight - 1) break;
      y = Math.min(dimensions.totalHeight - base.height, y + base.height - Math.min(96, base.height / 4));
    }
    // Last full-page frame reflects the final dimensions; earlier native tiles
    // overlap, and the final clamped tile fills the bottom without stretching.
    canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('瀏覽器無法建立原尺寸圖片，請縮小擷取範圍');
    context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);
    for (const frame of frames) {
      const bitmap = await createImageBitmap(frame.blob);
      try {
        const dest = frameDestination(frame, scale, width, height), left = frame.cropLeft, top = frame.cropTop;
        if (dest.width > left && dest.height > top) context.drawImage(bitmap, left, top, dest.width - left, dest.height - top, dest.x + left, dest.y + top, dest.width - left, dest.height - top);
      }
      finally { bitmap.close(); frame.blob = null; }
    }
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    if (!blob.size || blob.size > CAPTURE_LIMITS.bytes) throw new Error('瀏覽器無法輸出此原尺寸長圖，請改用框選截圖');
    return { blob, width, height };
  } finally {
    if (prepared) { try { await send('FINISH'); } catch {} }
    frames.length = 0;
    if (canvas) canvas.width = canvas.height = 1;
  }
}
