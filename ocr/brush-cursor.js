// Same display-space width rule used by AnnotationEditor when a stroke begins.
export const strokeWidth = (tool, width, highlightWidth = 20) => tool === 'highlight' ? highlightWidth : width;

export function brushCursor(canvas, state) {
  const doc = canvas.ownerDocument, win = doc.defaultView;
  const ns = 'http://www.w3.org/2000/svg';
  const ring = doc.createElementNS(ns, 'svg');
  ring.classList.add('brush-cursor'); ring.setAttribute('aria-hidden', 'true'); ring.setAttribute('focusable', 'false'); ring.setAttribute('hidden', '');
  const outlines = ['#111', '#fff'].map(color => { const circle = doc.createElementNS(ns, 'circle'); circle.setAttribute('fill', 'none'); circle.setAttribute('stroke', color); ring.append(circle); return circle; });
  canvas.parentElement.append(ring);
  let point = null;
  function refresh() {
    const current = state(), brush = ['pen', 'highlight'].includes(current.tool);
    if (current.cursor) { ring.setAttribute('hidden', ''); canvas.style.cursor = current.cursor; return; }
    const box = canvas.getBoundingClientRect();
    const visible = brush && !current.disabled && point && box.width > 0 && box.height > 0
      && point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom
      && doc.elementFromPoint(point.x, point.y) === canvas;
    ring.toggleAttribute('hidden', !visible);
    if (brush || current.disabled) canvas.style.cursor = visible ? 'none' : 'default';
    if (!visible) return;
    const scale = box.width / canvas.width;
    const diameter = current.nativeWidth != null ? current.nativeWidth * scale : strokeWidth(current.tool, current.width, current.highlightWidth);
    if (!Number.isFinite(diameter) || diameter <= 0) { ring.setAttribute('hidden', ''); canvas.style.cursor = 'default'; return; }
    const parent = canvas.parentElement.getBoundingClientRect();
    Object.assign(ring.style, { left: `${point.x - parent.left}px`, top: `${point.y - parent.top}px`, width: `${diameter}px`, height: `${diameter}px` });
    ring.setAttribute('viewBox', `0 0 ${diameter} ${diameter}`);
    const border = Math.min(1, diameter / 4);
    outlines.forEach((circle, index) => { circle.setAttribute('cx', diameter / 2); circle.setAttribute('cy', diameter / 2); circle.setAttribute('r', diameter / 2); circle.setAttribute('stroke-width', index === 0 ? border * 2 : border); });
  }
  const track = event => { point = event.pointerType === 'touch' ? null : { x: event.clientX, y: event.clientY }; refresh(); };
  const hide = () => { point = null; refresh(); };
  const events = { pointerenter: track, pointermove: track, pointerdown: track, pointerup: track, pointerleave: hide, pointercancel: hide };
  for (const [name, listener] of Object.entries(events)) canvas.addEventListener(name, listener);
  doc.addEventListener('scroll', refresh, true); doc.addEventListener('focusin', refresh);
  win.addEventListener('resize', refresh); win.addEventListener('blur', hide);
  return { refresh, destroy() {
    for (const [name, listener] of Object.entries(events)) canvas.removeEventListener(name, listener);
    doc.removeEventListener('scroll', refresh, true); doc.removeEventListener('focusin', refresh);
    win.removeEventListener('resize', refresh); win.removeEventListener('blur', hide); ring.remove();
  } };
}
