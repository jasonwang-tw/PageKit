// Frozen viewport selector, isolated from website styles and scripts.
(() => {
  const version = '1.12.2';
  if (window.__easyCaptureVersion === version) return;
  window.__easyCaptureCleanup?.();
  window.__easyCaptureVersion = version;
  let host = null;
  let dispose = () => {};
  function clear() { dispose(); dispose = () => {}; host?.remove(); host = null; }
  function start({ dataUrl, captureId }) {
    clear();
    const viewport = { width: innerWidth, height: innerHeight };
    host = document.createElement('div');
    host.id = 'easy-browser-capture';
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;display:block;';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `<style>
      :host{all:initial}*{box-sizing:border-box}.screen{position:fixed;inset:0;cursor:crosshair;touch-action:none;user-select:none;background:#111;font:14px system-ui;color:white}
      img{width:100%;height:100%;display:block;pointer-events:none}.shade{position:absolute;inset:0;background:#0005;pointer-events:none}
      .box{position:absolute;border:2px solid #60a5fa;box-shadow:0 0 0 99999px #0006;pointer-events:none}
      .tip{position:absolute;top:20px;left:50%;transform:translateX(-50%);max-width:90%;padding:12px 16px;background:#14213df2;border:1px solid #94a3b8;border-radius:10px;text-align:center;cursor:default}
      button{margin-left:16px;font:inherit;color:inherit;background:transparent;border:1px solid #94a3b8;border-radius:5px;padding:4px 10px;cursor:pointer}
      [hidden]{display:none!important}
    </style><div class="screen" role="dialog" aria-modal="true" aria-label="框選截圖範圍" tabindex="-1"><img alt="目前畫面的截圖"><div class="shade"></div><div class="box" hidden></div><div class="tip card card-border"><span>拖曳框選範圍，放開後開啟編輯彈窗 · Esc 取消</span><button class="btn btn-outline btn-sm" type="button">取消</button></div></div>`;
    const uiStyle = document.createElement('style');
    root.appendChild(uiStyle);
    chrome.runtime.sendMessage({ type: 'GET_UI_KIT' }).then(response => {
      if (!response?.success || !root.host.isConnected) return;
      uiStyle.textContent = response.css;
      root.host.dataset.pagekitUiKit = 'daisyui';
    }).catch(() => {});
    const screen = root.querySelector('.screen');
    const box = root.querySelector('.box');
    const tip = root.querySelector('.tip span');
    root.querySelector('img').src = dataUrl;
    let drag = null;
    let sending = false;
    const point = event => ({ x: Math.max(0, Math.min(viewport.width, event.clientX)), y: Math.max(0, Math.min(viewport.height, event.clientY)) });
    function rect(event) {
      const end = point(event);
      return { x: Math.min(drag.x, end.x), y: Math.min(drag.y, end.y), width: Math.abs(end.x - drag.x), height: Math.abs(end.y - drag.y) };
    }
    async function cancel() {
      clear();
      try { await chrome.runtime.sendMessage({ type: 'REGION_CAPTURE_CANCEL', captureId }); } catch {}
    }
    function key(event) {
      event.stopImmediatePropagation();
      if (event.key === 'Escape') { event.preventDefault(); void cancel(); }
    }
    function resized() { void cancel(); }
    const previousFocus = document.activeElement;
    document.addEventListener('keydown', key, true);
    window.addEventListener('resize', resized);
    dispose = () => {
      document.removeEventListener('keydown', key, true);
      window.removeEventListener('resize', resized);
      previousFocus?.focus?.({ preventScroll: true });
    };
    screen.addEventListener('wheel', event => { event.preventDefault(); event.stopPropagation(); }, { passive: false });
    screen.addEventListener('contextmenu', event => event.preventDefault());
    screen.addEventListener('pointerdown', event => {
      event.stopPropagation();
      if (sending || event.button !== 0 || event.target.closest('.tip')) return;
      event.preventDefault();
      drag = { ...point(event), pointerId: event.pointerId };
      screen.setPointerCapture(event.pointerId);
      root.querySelector('.shade').hidden = true;
      box.hidden = false;
      Object.assign(box.style, { left: `${drag.x}px`, top: `${drag.y}px`, width: '0', height: '0' });
    });
    screen.addEventListener('pointermove', event => {
      if (drag?.pointerId !== event.pointerId) return;
      const r = rect(event);
      Object.assign(box.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
    });
    screen.addEventListener('pointercancel', () => { drag = null; box.hidden = true; root.querySelector('.shade').hidden = false; });
    screen.addEventListener('pointerup', async event => {
      if (drag?.pointerId !== event.pointerId) return;
      const selected = rect(event);
      screen.releasePointerCapture(event.pointerId);
      drag = null;
      if (selected.width < 5 || selected.height < 5) { tip.textContent = '範圍太小，請重新拖曳框選'; return; }
      sending = true;
      tip.textContent = '正在開啟編輯彈窗…';
      try {
        const response = await chrome.runtime.sendMessage({ type: 'REGION_CAPTURE_COMPLETE', captureId, rect: selected, viewport });
        if (!response?.success) throw new Error(response?.error || '截圖失敗');
        clear();
      } catch (error) {
        sending = false;
        tip.textContent = `${error.message}；請按 Esc 後重新截圖`;
      }
    });
    root.querySelector('button').addEventListener('click', () => { void cancel(); });
    document.documentElement.append(host);
    screen.focus({ preventScroll: true });
  }
  function onMessage(message, _sender, respond) {
    if (message.type === 'REGION_CAPTURE_START') { start(message); respond({ success: true }); }
    if (message.type === 'REGION_CAPTURE_CLEAR') {
      clear();
      requestAnimationFrame(() => requestAnimationFrame(() => respond({ success: true })));
      return true;
    }
  }
  chrome.runtime.onMessage.addListener(onMessage);
  window.__easyCaptureCleanup = () => { clear(); chrome.runtime.onMessage.removeListener(onMessage); };
})();
