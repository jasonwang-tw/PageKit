(() => {
  // Reinstall safely even after an extension reload invalidates old listeners.
  try { globalThis.__pagekitFullCapture?.dispose?.(); } catch {}
  let state;
  const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const size = () => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
    totalWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0, innerWidth),
    totalHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0, innerHeight) });
  function restore() {
    if (!state) return;
    const old = state; state = null;
    clearTimeout(old.watchdog); document.removeEventListener('keydown', old.key, true);
    for (const [element, style] of old.hidden) {
      if (style.value) element.style.setProperty('visibility', style.value, style.priority);
      else element.style.removeProperty('visibility');
    }
    // Keep scroll-behavior disabled until the original position is restored.
    old.host.remove(); scrollTo(old.x, old.y); old.style.remove();
  }
  function renew() { clearTimeout(state.watchdog); state.watchdog = setTimeout(restore, 15_000); }
  async function handle(message) {
    if (message.type === 'PAGEKIT_FULL_PREPARE') {
      if (state) throw new Error('另一個整頁截圖正在進行');
      const style = document.createElement('style');
      style.textContent = 'html,body{scroll-behavior:auto!important;scroll-snap-type:none!important}*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}';
      const host = document.createElement('div'), shadow = host.attachShadow({ mode: 'closed' });
      const notice = document.createElement('div');
      notice.style.cssText = 'position:fixed;right:16px;top:16px;z-index:2147483647;background:#17222b;color:#fff;padding:12px 18px;border-radius:10px;font:14px system-ui;box-shadow:0 2px 12px #0005';
      notice.textContent = '頁匣 PageKit：整頁擷取中，Esc 取消'; shadow.append(notice);
      host.style.cssText = 'all:initial!important;position:fixed!important;z-index:2147483647!important';
      state = { id: message.id, x: scrollX, y: scrollY, style, host, notice, hidden: new Map(), seen: new Set(), cancelled: false };
      state.key = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); if (state) { state.cancelled = true; state.notice.textContent = '正在取消並還原頁面…'; } } };
      document.addEventListener('keydown', state.key, true);
      document.documentElement.append(style, host);
      state.positioned = [...document.querySelectorAll('body *')].filter(element => ['fixed', 'sticky'].includes(getComputedStyle(element).position));
      renew();
      return size();
    }
    if (!state || message.id !== state.id) throw new Error('整頁擷取工作已失效，頁面已還原');
    renew();
    if (message.type === 'PAGEKIT_FULL_FINISH') { restore(); return {}; }
    if (state.cancelled) throw new Error('已取消整頁截圖');
    if (message.type === 'PAGEKIT_FULL_CHECK') {
      // Keep progress visible during scrolling/loading/throttling, then hide it
      // for the actual frame only. Otherwise quick COMMIT/SCROLL messages can
      // prevent the user from ever seeing a painted progress notice.
      state.host.style.setProperty('visibility', 'hidden', 'important');
      await paint();
      return { ...size(), x: scrollX, y: scrollY };
    }
    if (message.type === 'PAGEKIT_FULL_SCROLL') {
      state.host.style.removeProperty('visibility');
      scrollTo(message.x, message.y); await paint();
      const visible = [...document.images].filter(image => { const r = image.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; });
      await Promise.race([Promise.all(visible.map(image => image.decode().catch(() => {}))), new Promise(resolve => setTimeout(resolve, 700))]);
      if (!state || state.cancelled) throw new Error('已取消整頁截圖');
      for (const element of state.positioned) {
        if (state.seen.has(element) && !state.hidden.has(element)) {
          state.hidden.set(element, { value: element.style.getPropertyValue('visibility'), priority: element.style.getPropertyPriority('visibility') });
          element.style.setProperty('visibility', 'hidden', 'important');
        }
      }
      await paint();
      return { ...size(), x: scrollX, y: scrollY };
    }
    if (message.type === 'PAGEKIT_FULL_COMMIT') {
      for (const element of state.positioned) {
        const r = element.getBoundingClientRect();
        if (r.width && r.height && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && getComputedStyle(element).visibility !== 'hidden') state.seen.add(element);
      }
      state.host.style.removeProperty('visibility');
      state.notice.textContent = `頁匣 PageKit：已擷取 ${message.count} 區，Esc 取消`;
      return {};
    }
    throw new Error('無效的整頁擷取指令');
  }
  const listener = (message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || !message.type?.startsWith('PAGEKIT_FULL_')) return false;
    handle(message).then(result => respond({ ...result, success: true })).catch(error => { restore(); respond({ success: false, error: error.message }); });
    return true;
  };
  chrome.runtime.onMessage.addListener(listener);
  globalThis.__pagekitFullCapture = { dispose() { restore(); try { chrome.runtime.onMessage.removeListener(listener); } catch {} } };
})();
