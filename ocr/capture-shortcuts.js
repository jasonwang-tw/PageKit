// Read actual Chrome bindings; key assignment stays in native shortcut settings.
export function captureShortcuts({ commands, region, desktop, opener, target = window }) {
  let closed = false, revision = 0;
  async function refresh() {
    const attempt = ++revision;
    try {
      const all = await commands.getAll();
      if (closed || attempt !== revision) return;
      const key = name => all.find(item => item.name === name)?.shortcut || '';
      const web = key('capture-region'), screen = key('capture-desktop');
      region.textContent = web || '未設定'; desktop.textContent = screen || '未設定';
    } catch {
      if (closed || attempt !== revision) return;
      region.textContent = desktop.textContent = '無法讀取';
    }
  }
  target.addEventListener('focus', refresh); opener.addEventListener('click', refresh);
  return { initialize: refresh, refresh, destroy() { closed = true; revision++; target.removeEventListener('focus', refresh); opener.removeEventListener('click', refresh); } };
}
