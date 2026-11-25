export function modelServices() {
  const dialog = document.getElementById('model-services-dialog');
  const launcher = document.getElementById('open-model-services');
  const activity = document.getElementById('model-services-activity');
  let previousFocus = null, frame = null;
  function open(section) {
    if (!dialog.open) { previousFocus = document.activeElement; dialog.showModal(); }
    cancelAnimationFrame(frame);
    // daisyUI transitions visibility; focus after the first open layout instead
    // of relying on autofocus while the dialog is still visually hidden.
    frame = requestAnimationFrame(() => {
      if (!dialog.open) return;
      const permissionButton = document.getElementById('enable-desktop-capture');
      const button = section === 'desktop'
        ? (permissionButton.hidden ? document.getElementById('capture-desktop') : permissionButton)
        : section === 'ocr' || section === 'cutout'
        ? document.getElementById(section === 'ocr' ? 'download-model' : 'download-cutout-model')
        : dialog.querySelector('[autofocus]');
      button.scrollIntoView({ block: 'nearest' }); button.focus({ preventScroll: true });
    });
  }
  const restoreFocus = () => {
    cancelAnimationFrame(frame);
    const target = previousFocus?.isConnected && previousFocus !== document.body && !previousFocus.disabled ? previousFocus : launcher;
    target.focus({ preventScroll: true });
  };
  const launch = () => open();
  const containTab = event => {
    if (!dialog.open || event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
      .filter(element => element.tabIndex >= 0 && !element.disabled && element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  launcher.addEventListener('click', launch);
  dialog.addEventListener('close', restoreFocus);
  dialog.addEventListener('keydown', containTab);
  return {
    open, get isOpen() { return dialog.open; },
    updateActivity(ocr, cutout) { activity.hidden = !ocr && !cutout; },
    destroy() { cancelAnimationFrame(frame); launcher.removeEventListener('click', launch); dialog.removeEventListener('close', restoreFocus); dialog.removeEventListener('keydown', containTab); if (dialog.open) dialog.close(); }
  };
}
