export const clampZoom = value => Math.max(.1, Math.min(4, Number.isFinite(value) ? value : 1));
export function nativeRect(start, end, width, height) {
  const x = Math.max(0, Math.min(width, Math.floor(Math.min(start.x, end.x))));
  const y = Math.max(0, Math.min(height, Math.floor(Math.min(start.y, end.y))));
  return { x, y, width: Math.max(0, Math.min(width, Math.ceil(Math.max(start.x, end.x))) - x), height: Math.max(0, Math.min(height, Math.ceil(Math.max(start.y, end.y))) - y) };
}
export function imageViewer({ image, editor, locked, selected, choose, status }) {
  const $ = id => document.getElementById(id), viewport = $('canvas-viewport'), preview = $('preview'), canvas = $('screenshot');
  const box = document.createElement('div'); box.className = 'ocr-region-box'; box.hidden = true; box.setAttribute('aria-hidden', 'true'); preview.append(box);
  let zoom = 1, mode = 'fit', space = false, drag = null, armed = false;
  const editable = target => target.closest('input,textarea,select,button,[contenteditable=true]');
  const modal = () => Boolean(document.querySelector('dialog[open], :popover-open'));
  function cursor() {
    if (!editor()) return;
    editor().navigationOverride = space || armed;
    const pan = space || editor().tool === 'pan';
    editor().navigationCursor = pan ? drag ? 'grabbing' : 'grab' : armed ? 'crosshair' : null;
    viewport.style.cursor = pan ? drag ? 'grabbing' : 'grab' : '';
    editor().refreshCursor();
  }
  function layout(anchor = false) {
    if (!selected()) return;
    const styles = getComputedStyle(viewport), old = zoom;
    const width = Math.max(1, viewport.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight));
    const height = Math.max(1, viewport.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom));
    if (mode !== 'manual') zoom = clampZoom(mode === 'width' ? width / image.width : Math.min(1, width / image.width, height / image.height));
    const center = { x: (viewport.scrollLeft + viewport.clientWidth / 2) / old, y: (viewport.scrollTop + viewport.clientHeight / 2) / old };
    preview.style.width = `${image.width * zoom}px`;
    preview.style.maxWidth = 'none';
    $('zoom-reset').textContent = `${Math.round(zoom * 100)}%`;
    $('zoom-reset').setAttribute('aria-label', `目前縮放 ${Math.round(zoom * 100)}%，按下回到 100%`);
    if (anchor) { viewport.scrollLeft = center.x * zoom - viewport.clientWidth / 2; viewport.scrollTop = center.y * zoom - viewport.clientHeight / 2; }
    cursor();
  }
  function setZoom(value, anchor) {
    if (!selected() || locked() || modal()) return;
    const old = zoom;
    const before = canvas.getBoundingClientRect(), view = viewport.getBoundingClientRect();
    const clientX = anchor?.x ?? view.left + viewport.clientWidth / 2;
    const clientY = anchor?.y ?? view.top + viewport.clientHeight / 2;
    const x = (clientX - before.left) / old, y = (clientY - before.top) / old;
    mode = 'manual'; zoom = clampZoom(value);
    layout();
    const after = canvas.getBoundingClientRect();
    // Account for preview margins and viewport padding as well as scroll offset.
    viewport.scrollLeft += after.left + x * zoom - clientX;
    viewport.scrollTop += after.top + y * zoom - clientY;
  }
  const stage = viewport.parentElement;
  const wheel = event => {
    if (!event.ctrlKey || !selected() || !Number.isFinite(event.deltaY)) return;
    event.preventDefault();
    if (locked() || modal()) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    const delta = Math.max(-240, Math.min(240, event.deltaY * unit));
    setZoom(zoom * Math.exp(-delta * .002), { x: event.clientX, y: event.clientY });
  };
  stage.addEventListener('wheel', wheel, { passive: false });
  const downZoom = () => setZoom(zoom / 1.25), upZoom = () => setZoom(zoom * 1.25), resetZoom = () => setZoom(1);
  const fitWidth = () => { if (locked() || modal()) return; mode = 'width'; layout(); viewport.scrollLeft = 0; };
  $('zoom-out').addEventListener('click', downZoom); $('zoom-in').addEventListener('click', upZoom); $('zoom-reset').addEventListener('click', resetZoom); $('zoom-fit').addEventListener('click', fitWidth);
  const point = event => { const r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left) * image.width / r.width, y: (event.clientY - r.top) * image.height / r.height }; };
  function stop() {
    if (drag && viewport.hasPointerCapture(drag.id)) viewport.releasePointerCapture(drag.id);
    drag = null; box.hidden = true; cursor();
  }
  const down = event => {
    if (!selected() || locked() || modal() || event.button !== 0 || editable(event.target)) return;
    if (!(space || armed || editor()?.tool === 'pan')) return;
    if (armed && event.target !== canvas) return;
    event.preventDefault(); event.stopImmediatePropagation();
    editor()?.finishText(true); editor()?.cancel(); canvas.focus({ preventScroll: true });
    drag = { id: event.pointerId, region: armed && !space, start: point(event), x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId); cursor();
  };
  const move = event => {
    if (!drag || drag.id !== event.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (drag.region) {
      const rect = nativeRect(drag.start, point(event), image.width, image.height);
      Object.assign(box.style, { left: `${rect.x / image.width * 100}%`, top: `${rect.y / image.height * 100}%`, width: `${rect.width / image.width * 100}%`, height: `${rect.height / image.height * 100}%` }); box.hidden = false;
    } else { viewport.scrollLeft = drag.left - event.clientX + drag.x; viewport.scrollTop = drag.top - event.clientY + drag.y; }
  };
  const up = event => {
    if (!drag || drag.id !== event.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const rect = drag.region ? nativeRect(drag.start, point(event), image.width, image.height) : null;
    stop();
    if (rect) { armed = false; $('select-ocr-region').setAttribute('aria-pressed', 'false'); cursor(); if (rect.width >= 3 && rect.height >= 3) choose(rect); else status('範圍太小，請重新框選文字區。'); }
  };
  const cancel = () => { stop(); armed = false; space = false; $('select-ocr-region').setAttribute('aria-pressed', 'false'); cursor(); };
  const keydown = event => {
    const hoveringImage = event.code === 'Space' && event.target.closest('button') && viewport.matches(':hover');
    if ((editable(event.target) && !hoveringImage) || modal()) return;
    if (event.code === 'Space' && !locked() && selected()) { event.preventDefault(); if (!space) { space = true; editor()?.cancel(); cursor(); } }
    if (event.key === 'Escape') cancel();
  };
  const keyup = event => { if (event.code === 'Space') { space = false; stop(); cursor(); } };
  for (const [type, listener] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancel]]) viewport.addEventListener(type, listener, true);
  document.addEventListener('keydown', keydown); document.addEventListener('keyup', keyup); window.addEventListener('blur', cancel);
  const observer = new ResizeObserver(() => layout()); observer.observe(viewport);
  return {
    layout, cancel,
    get interacting() { return Boolean(drag || armed); },
    reset(fullpage = false) { cancel(); mode = fullpage ? 'width' : 'fit'; zoom = 1; layout(); viewport.scrollTo(0, 0); },
    arm() { cancel(); editor()?.finishText(true); editor()?.cancel(); armed = true; $('select-ocr-region').setAttribute('aria-pressed', 'true'); cursor(); status('拖曳框選要辨識的文字區；空白鍵暫時拖曳，Esc 取消。不會裁切圖片。'); },
    render() { for (const id of ['zoom-out','zoom-in','zoom-reset','zoom-fit']) $(id).disabled = !selected() || locked(); cursor(); },
    destroy() { cancel(); observer.disconnect(); box.remove(); stage.removeEventListener('wheel', wheel); for (const [type, listener] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancel]]) viewport.removeEventListener(type, listener, true); document.removeEventListener('keydown', keydown); document.removeEventListener('keyup', keyup); window.removeEventListener('blur', cancel); }
  };
}
