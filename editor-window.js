import { SINGLE_EDITOR_WINDOW_KEY } from './capture-preferences.js';

// Inspect live extension popups rather than persisting IDs across worker restarts.
// Serialize opening: two captures must not both observe "no editor" and create one.
export function editorWindows(api, { discard = async () => {} } = {}) {
  const queues = new Map();
  const base = api.runtime.getURL('ocr/ocr.html');
  const isEditor = value => value === base || value?.startsWith(`${base}?`) || value?.startsWith(`${base}#`);
  async function find(incognito) {
    const windows = await api.windows.getAll({ populate: true, windowTypes: ['popup'] });
    return windows.filter(window => window.type === 'popup' && Boolean(window.incognito) === incognito && window.tabs?.length === 1)
      .filter(window => isEditor(window.tabs[0].pendingUrl || window.tabs[0].url))
      .sort((a, b) => Number(b.focused) - Number(a.focused) || b.id - a.id)[0];
  }
  async function focus(window) {
    // Navigation has already succeeded. A focus failure must not create a second
    // editor or replace a successfully loaded capture with an error document.
    try { await api.windows.update(window.id, { focused: true, ...(window.state === 'minimized' ? { state: 'normal' } : {}) }); } catch {}
  }
  async function open(path, incognito) {
    const url = new URL(api.runtime.getURL(path));
    if (!isEditor(url.href)) throw new Error('無效的編輯視窗網址');
    const preferences = await api.storage.local.get(SINGLE_EDITOR_WINDOW_KEY);
    const existing = preferences[SINGLE_EDITOR_WINDOW_KEY] !== false ? await find(incognito) : null;
    if (existing) {
      const tab = existing.tabs[0];
      if (url.searchParams.has('error')) {
        await api.tabs.sendMessage(tab.id, { type: 'CAPTURE_ERROR', error: url.searchParams.get('error') });
        await focus(existing);
        return existing;
      }
      // Opening the import entry should not erase an already open document.
      if (!url.hash) { await focus(existing); return existing; }
      // A hash-only update does not rerun load(). A unique query forces a full
      // document navigation and the editor's existing pagehide cleanup.
      url.searchParams.set('editor', crypto.randomUUID());
      try { await api.tabs.update(tab.id, { url: url.href, active: true }); }
      catch (error) {
        // A user may close/navigate the popup between discovery and navigation.
        // Only recover by creating when our target has really disappeared.
        const remaining = await find(incognito);
        if (remaining) throw error;
        return create(url.href, incognito);
      }
      const previous = new URL(tab.pendingUrl || tab.url).hash.slice(1);
      if (/^[a-f0-9-]{36}$/.test(previous) && previous !== url.hash.slice(1)) await discard(previous).catch(() => {});
      await focus(existing);
      return existing;
    }
    return create(url.href, incognito);
  }
  function create(url, incognito) {
    return api.windows.create({ url, type: 'popup', width: 1200, height: 820, focused: true, incognito });
  }
  return (path, incognito = false) => {
    incognito = Boolean(incognito);
    const next = (queues.get(incognito) || Promise.resolve()).then(() => open(path, incognito));
    const settled = next.catch(() => {});
    queues.set(incognito, settled);
    void settled.then(() => { if (queues.get(incognito) === settled) queues.delete(incognito); });
    return next;
  };
}
