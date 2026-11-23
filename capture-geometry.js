export const CAPTURE_LIMITS = Object.freeze({ pixels: 64_000_000, side: 32_760, bytes: 128 * 1024 * 1024, frames: 160 });
export function validateCaptureSize(width, height) {
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0) || width > CAPTURE_LIMITS.side || height > CAPTURE_LIMITS.side || width * height > CAPTURE_LIMITS.pixels) {
    throw new Error('整頁圖片超過安全上限（6,400 萬像素／單邊 32,760px），請縮小網頁內容或改用框選截圖；未縮小或截斷原圖。');
  }
  return { width, height };
}
export function capturePositions(length, viewport, overlap = 96) {
  if (![length, viewport].every(value => Number.isFinite(value) && value > 0)) throw new Error('無效的頁面尺寸');
  const end = Math.max(0, length - viewport), step = Math.max(1, viewport - Math.min(overlap, viewport / 4));
  const positions = [0];
  for (let at = step; at < end; at += step) {
    if (positions.length >= CAPTURE_LIMITS.frames) throw new Error('頁面過長，請改用框選截圖');
    positions.push(at);
  }
  if (end) positions.push(end);
  return positions;
}
export function frameDestination(frame, scale, width, height) {
  const x = Math.round(frame.x * scale.x), y = Math.round(frame.y * scale.y);
  return { x, y, width: Math.min(frame.width, width - x), height: Math.min(frame.height, height - y) };
}
