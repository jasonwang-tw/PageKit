// Copy only when the image is the implicit target. Explicit text/object/focus
// targets retain their native copy behavior, even while the pointer is over it.
export function imageCopyShortcut({ stage, canvas, enabled, selectedObject, copy }) {
  const doc = canvas.ownerDocument;
  const viewport = canvas.parentElement.parentElement;
  const neutral = new Set([doc.body, doc.documentElement, stage, viewport, canvas]);
  const keydown = event => {
    if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey || event.shiftKey
      || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'c') return;
    if (!enabled() || !doc.hasFocus() || !stage.matches(':hover') || selectedObject()) return;
    if (doc.querySelector('dialog[open], :popover-open') || doc.getSelection()?.isCollapsed === false) return;
    if (doc.activeElement && !neutral.has(doc.activeElement)) return;
    if (event.composedPath().some(node => node?.nodeType === 1 && !neutral.has(node)
      && (node.isContentEditable || node.matches('input,textarea,select,button,a[href],summary,[role="textbox"]')))) return;
    event.preventDefault();
    void copy();
  };
  doc.addEventListener('keydown', keydown);
  return { destroy() { doc.removeEventListener('keydown', keydown); } };
}
