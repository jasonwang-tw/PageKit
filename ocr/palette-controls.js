import { paletteSize, PALETTE_COUNTS } from './palette-analysis.js';

export function paletteControls({ source, locked, beforeOpen, copyText = text => navigator.clipboard.writeText(text) }) {
  const $ = id => document.getElementById(id);
  const dialog = $('palette-dialog'), launcher = $('analyze-palette'), count = $('palette-count');
  const results = $('palette-results'), message = $('palette-status');
  let worker = null, timer = null, frame = null, previousFocus = null, generation = 0;
  function stop() { generation++; clearTimeout(timer); worker?.terminate(); worker = null; dialog.setAttribute('aria-busy', 'false'); }
  function note(text, error = false) { message.textContent = text; message.classList.toggle('error', error); }
  function render() { launcher.disabled = locked() || !source()?.width; }
  function show(colors) {
    results.replaceChildren();
    for (const { hex, rgb, percent } of colors) {
      const card = document.createElement('div'); card.className = 'card card-border palette-card';
      const swatch = document.createElement('button'); swatch.type = 'button'; swatch.className = 'btn palette-swatch';
      swatch.style.backgroundColor = hex; swatch.setAttribute('aria-label', `複製 HEX ${hex}`); swatch.title = `點擊複製 ${hex}`;
      const code = document.createElement('strong'); code.textContent = hex;
      const channels = document.createElement('span'); channels.textContent = `RGB ${rgb.join(', ')}`;
      const share = document.createElement('span'); share.className = 'palette-share'; share.textContent = `約 ${percent.toFixed(1)}%`;
      swatch.addEventListener('click', async () => {
        const run = generation;
        try { await copyText(hex); if (run === generation && dialog.open) note(`已複製 ${hex}，可直接貼上`); }
        catch { if (run === generation && dialog.open) note('無法複製，請選取下方 HEX 色碼後按 Ctrl+C／Cmd+C', true); }
      });
      card.append(swatch, code, channels, share); results.append(card);
    }
    note(colors.length ? `已擷取 ${colors.length} 色 · 點色塊複製 HEX` : '圖片完全透明，沒有可分析的顏色');
  }
  function analyze() {
    stop(); results.replaceChildren();
    const run = generation, original = source(), colorCount = Number(count.value);
    if (!dialog.open || !original?.width) return;
    if (!PALETTE_COUNTS.includes(colorCount)) { note('色票數量無效', true); return; }
    note('正在分析原始圖片…'); dialog.setAttribute('aria-busy', 'true');
    // Paint the modal before preparing the bounded sample. A closed/replaced
    // job cannot populate the next image's palette.
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (run !== generation || !dialog.open) return;
      try {
        const size = paletteSize(original.width, original.height), sample = document.createElement('canvas');
        sample.width = size.width; sample.height = size.height;
        const context = sample.getContext('2d', { willReadFrequently: true }); context.imageSmoothingEnabled = false;
        context.drawImage(original, 0, 0, size.width, size.height);
        const pixels = context.getImageData(0, 0, size.width, size.height);
        worker = new Worker(new URL('./palette-worker.js', import.meta.url), { type: 'module' });
        const fail = text => { if (run !== generation) return; stop(); results.replaceChildren(); note(text, true); };
        worker.onmessage = ({ data }) => {
          if (run !== generation || !dialog.open) return;
          if (data.error) { fail(data.error); return; }
          stop(); show(data.colors);
        };
        worker.onerror = event => { event.preventDefault(); fail('色票分析失敗，請關閉後重試'); };
        timer = setTimeout(() => fail('色票分析逾時，請關閉後重試'), 15_000);
        worker.postMessage({ pixels, count: colorCount }, [pixels.data.buffer]);
        sample.width = sample.height = 0;
      } catch { stop(); note('無法讀取圖片，請重新匯入後再試', true); }
    });
  }
  const open = () => {
    if (locked() || !source()?.width) return;
    beforeOpen(); previousFocus = document.activeElement;
    dialog.showModal(); $('close-palette').focus({ preventScroll: true }); analyze();
  };
  const close = () => { stop(); cancelAnimationFrame(frame); results.replaceChildren(); (previousFocus?.isConnected && !previousFocus.disabled ? previousFocus : launcher).focus({ preventScroll: true }); };
  const containTab = event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button, select')].filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
  };
  launcher.addEventListener('click', open); count.addEventListener('change', analyze); dialog.addEventListener('close', close); dialog.addEventListener('keydown', containTab);
  return { render, get isOpen() { return dialog.open; }, reset() { stop(); cancelAnimationFrame(frame); results.replaceChildren(); if (dialog.open) dialog.close(); },
    destroy() { stop(); cancelAnimationFrame(frame); launcher.removeEventListener('click', open); count.removeEventListener('change', analyze); dialog.removeEventListener('close', close); dialog.removeEventListener('keydown', containTab); if (dialog.open) dialog.close(); } };
}
