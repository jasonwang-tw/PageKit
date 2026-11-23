// Non-overlapping native-pixel work areas: no text-based deduplication, which
// would delete legitimate repeated headings or labels on a long page.
export function ocrTiles(rect, { pixels = 2_000_000, maxHeight = 1400, blankRow } = {}) {
  if (![rect.x, rect.y, rect.width, rect.height].every(Number.isSafeInteger) || rect.width <= 0 || rect.height <= 0 || rect.x < 0 || rect.y < 0) throw new Error('無效的文字辨識範圍');
  const height = Math.max(1, Math.min(maxHeight, Math.floor(pixels / rect.width))), areas = [];
  for (let at = 0; at < rect.height;) {
    let end = Math.min(rect.height, at + height);
    if (end < rect.height && blankRow) {
      const candidate = blankRow(rect.x, rect.y + at + Math.floor(height * .75), rect.width, end - at - Math.floor(height * .75));
      if (Number.isSafeInteger(candidate) && candidate > rect.y + at && candidate <= rect.y + end) end = candidate - rect.y;
    }
    areas.push({ x: rect.x, y: rect.y + at, width: rect.width, height: end - at });
    at = end;
  }
  return areas;
}
export function findBlankRow(context, x, y, width, height) {
  // Scan a bounded strip; prefer a uniform light/dark gap before a tile edge.
  const scanHeight = Math.min(80, height);
  if (scanHeight < 1) return null;
  const top = y + height - scanHeight;
  const { data } = context.getImageData(x, top, width, scanHeight);
  for (let row = scanHeight - 1; row >= 0; row--) {
    let low = 255, high = 0;
    for (let col = 0; col < width; col++) {
      const at = (row * width + col) * 4;
      const value = Math.round((data[at] + data[at + 1] + data[at + 2]) / 3 * data[at + 3] / 255 + 255 - data[at + 3]);
      low = Math.min(low, value); high = Math.max(high, value);
      if (high - low > 10) break;
    }
    if (high - low <= 10) return top + row + 1;
  }
  return null;
}
