// One non-modal settings form shared by the original/translation gear buttons.
export function speechSettings() {
  const panel = document.getElementById('speech-settings');
  const triggers = [...document.querySelectorAll('[data-speech-settings]')];
  let anchor = null, frame;
  const open = () => panel.matches(':popover-open');
  const sync = value => { for (const button of triggers) button.setAttribute('aria-expanded', String(value && button === anchor)); };
  function close(focus = false) {
    cancelAnimationFrame(frame);
    if (open()) panel.hidePopover();
    sync(false);
    if (focus && anchor?.isConnected) anchor.focus({ preventScroll: true });
  }
  function position(force = false) {
    if (!anchor || (!open() && !force)) return;
    const a = anchor.getBoundingClientRect();
    if (!a.width || a.bottom < 0 || a.top > innerHeight) { close(); return; }
    const b = panel.getBoundingClientRect();
    const left = Math.max(8, Math.min(innerWidth - b.width - 8, a.right - b.width));
    const top = a.bottom + b.height + 8 <= innerHeight - 8 ? a.bottom + 8 : Math.max(8, a.top - b.height - 8);
    Object.assign(panel.style, { left: `${left}px`, top: `${top}px` });
  }
  const removers = [];
  const listen = (node, type, action, options) => { node.addEventListener(type, action, options); removers.push(() => node.removeEventListener(type, action, options)); };
  for (const button of triggers) listen(button, 'click', event => {
    event.preventDefault(); // Own positioning/focus; keep the native Popover dismissal.
    if (open() && anchor === button) { close(true); return; }
    anchor = button;
    if (!open()) panel.showPopover();
    sync(true); position();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { if (open()) { position(); document.getElementById('speech-language').focus({ preventScroll: true }); } });
  });
  listen(panel, 'beforetoggle', event => {
    if (event.newState !== 'open') return;
    panel.style.display = 'grid'; position(true); panel.style.removeProperty('display');
  });
  listen(panel, 'toggle', () => { sync(open()); if (!open()) cancelAnimationFrame(frame); });
  listen(panel, 'keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation(); close(true);
  });
  listen(document, 'focusin', event => { if (open() && !panel.contains(event.target) && !triggers.includes(event.target)) close(); });
  listen(document, 'scroll', () => position(), true);
  listen(window, 'resize', () => position());
  return { get isOpen() { return open(); }, destroy() { close(); for (const remove of removers) remove(); } };
}
