import { JOB_TTL, screenshotRect, normalizeOcrText } from '../ocr-utils.js';
import { AnnotationEditor } from './annotation-editor.js';
import { recognizeCanvas } from './recognition.js';
import { modelControls } from './model-controls.js';
import { paddleResult } from './paddle-result.js';
import { imageViewer } from './image-viewer.js';
import { readCapture } from './capture-reader.js';
import { validateCaptureSize } from '../capture-geometry.js';
import { ocrTiles, findBlankRow } from './ocr-tiles.js';
import { cutoutControls } from './cutout-controls.js';
import { validateImportedImage, validateImageSize } from './cutout-pixels.js';
import { translationControls } from './translation-controls.js';
import { modelServices } from './model-services.js';
import { paletteControls } from './palette-controls.js';
import { strokeRange, clampStrokeWidth } from './stroke-settings.js';
import { styleControls } from './style-controls.js';
import { cropControls } from './crop-controls.js';
import { cropDocument } from './crop-document.js';
import { clipboardWrites } from './clipboard-writes.js';
import { speechControls } from './speech-controls.js';
import { imageCopyShortcut } from './image-copy-shortcut.js';

const $ = id => document.getElementById(id);
$('version').textContent = `v${chrome.runtime.getManifest().version}`;
const image = document.createElement('canvas');
const preview = $('preview');
const output = $('text');
let selected = null;
let editor = null;
let busy = false;
let generation = 0;
let currentWorker = null;
let abortRun = null;
let pendingRecognition = null;
let importing = false;
let initialized = false;
let cutout;
let translation;
let speech;
let documentNeedsRecognition=false;
let recognitionFailed = false;
let interactionMessage = false;
let captureMode = 'region';
let ocrRequested = false;
const annotationLocked = () => importing || Boolean(cutout?.working);
const clipboard = clipboardWrites({
  writeText: text => navigator.clipboard.writeText(text),
  writeImage: snapshot => navigator.clipboard.write([new ClipboardItem({ 'image/png': snapshot })])
});
const widths = { stroke: 3, highlight: 20 };
const styles = styleControls({ state: () => ({ tool: editor?.tool || 'pen', color: $('color').value, width: widths[editor?.tool === 'highlight' ? 'highlight' : 'stroke'], fontSize: Number($('text-size').value) }), locked: () => !selected || annotationLocked() || editor?.tool === 'pan' });
const documentHistory=cropDocument({image,editor:()=>editor,setPreview:value=>cutout.setPreview(value),changed:({imageChanged})=>{
  selected={x:0,y:0,width:image.width,height:image.height};$('dimensions').textContent=`${image.width} × ${image.height}`;fitPreview();
  if(imageChanged){documentNeedsRecognition=captureMode !== 'fullpage';if(captureMode === 'fullpage')ocrRequested=false;palette.reset();translation.invalidate('裁切範圍已更新，辨識完成後可重新翻譯。');output.value='';$('copy').disabled=true;$('quality-note').hidden=true;scheduleRecognition();}
}});
const crop=cropControls({source:()=>selected?image:null,preview:()=>$('screenshot'),locked:()=>busy||importing||Boolean(cutout?.working)||models.downloading,
  beforeOpen:()=>{styles.close();editor?.finishText(true);editor?.cancel();if(pendingRecognition){clearTimeout(pendingRecognition);pendingRecognition=null;documentNeedsRecognition=true;}},
  apply:async plan=>{importing=true;setBusy(busy);try{documentHistory.apply(plan);status(captureMode === 'fullpage' ? '裁切完成，標註可繼續編輯；請重新框選文字區或辨識整頁。' : '裁切完成，標註可繼續編輯；正在準備重新辨識。');}finally{importing=false;setBusy(busy);}},
  afterClose:()=>{if(documentNeedsRecognition)scheduleRecognition();}});
const management = modelServices();
const palette = paletteControls({ source: () => selected ? image : null, locked: () => busy || importing || Boolean(cutout?.working), beforeOpen: () => { editor?.finishText(true); editor?.cancel(); } });
const models = modelControls({ locked: () => busy || importing || Boolean(cutout?.working), changed: () => { setBusy(busy); scheduleRecognition(); }, activityChanged: () => setBusy(busy), openManagement: management.open });
cutout = cutoutControls({ source: () => image, editor: () => editor, locked: () => busy || importing || models.downloading, changed: () => setBusy(busy), openManagement: management.open });
translation = translationControls({ source: output, locked: () => busy || importing, changed: () => speech?.render() });
speech = speechControls({ source: output, translated: $('translated-text'), target: $('translation-language'), locked: () => busy || importing });
const viewer = imageViewer({ image, editor: () => editor, selected: () => selected, locked: () => annotationLocked() || crop.isOpen,
  status, choose: rect => { if (busy) return; selected = rect; ocrRequested = true; void recognize(); } });
function fitPreview() { viewer.layout(); }
$('select-ocr-region').addEventListener('click', () => viewer.arm());
$('recognize-page').addEventListener('click', () => { viewer.cancel(); selected = { x: 0, y: 0, width: image.width, height: image.height }; ocrRequested = true; void recognize(); });
$('stop-recognition').addEventListener('click', () => abortRun?.());

function status(text, error = false) {
  if (busy) interactionMessage = true;
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
}
function recognitionStatus(text, error = false, final = false) {
  recognitionFailed = error;
  if (!interactionMessage || final) {
    $('status').textContent = text;
    $('status').classList.toggle('error', error);
  }
  renderRecognitionState();
}
function renderRecognitionState() {
  const state = $('recognition-state');
  state.textContent = recognitionFailed ? '需確認' : busy ? '辨識中…' : output.value ? '已辨識' : selected ? captureMode === 'fullpage' && !ocrRequested ? '待框選' : '未辨識到文字' : '等待圖片';
  state.classList.toggle('complete', !busy && Boolean(output.value) && !recognitionFailed);
}
function updateControls(message) {
  const locked = annotationLocked();
  $('undo').disabled = locked || !editor?.canUndo;
  $('redo').disabled = locked || !editor?.canRedo;
  $('delete-selected').disabled = locked || !editor?.selectedItem;
  $('next-number').textContent = editor?.nextNumber || 1;
  if (message) status(message);
}
function setBusy(value) {
  busy = value;
  const locked = value || importing || cutout?.working;
  const editingLocked = annotationLocked();
  renderRecognitionState();
  const enhanced = models.engine === 'enhanced';
  models.render();
  cutout?.render();
  management.updateActivity(models.downloading, cutout?.downloading);
  translation?.render();
  speech?.render();
  palette.render();
  styles.render();
  crop.render();
  viewer.render();
  $('fullpage-ocr-controls').hidden = captureMode !== 'fullpage';
  output.placeholder = captureMode === 'fullpage' ? '請框選文字區，或按「辨識整頁」。\n辨識結果可在這裡編輯。' : '截圖載入後自動辨識，完成後自動複製。\n辨識結果可在這裡編輯。';
  for (const id of ['select-ocr-region', 'recognize-page']) $(id).disabled = locked || !selected || models.downloading || crop.isOpen;
  $('stop-recognition').hidden = !value;
  $('language').disabled = value || enhanced;
  $('upscale').disabled = value;
  $('layout').disabled = value;
  $('background').disabled = value || enhanced;
  $('cjk-recovery').disabled = value || enhanced || $('language').value === 'eng';
  $('uncertain-label').hidden = !enhanced;
  $('include-uncertain').disabled = value || !enhanced;
  for (const option of $('layout').options) option.disabled = enhanced && !['auto', 'columns'].includes(option.value);
  if (enhanced && !['auto', 'columns'].includes($('layout').value)) $('layout').value = 'auto';
  for (const id of ['language', 'upscale', 'layout', 'background', 'cjk-recovery', 'include-uncertain']) $(id).disabled ||= locked;
  for (const id of ['copy-image', 'save-image']) $(id).disabled = editingLocked || !selected;
  $('import-image').disabled = !initialized || locked || models.downloading;
  $('copy').disabled = value || !output.value;
  output.readOnly = value || importing;
  for (const element of document.querySelectorAll('[data-tool], #color, #width, #text-size')) element.disabled = editingLocked || !selected;
  $('progress').hidden = !value;
  preview.setAttribute('aria-busy', String(editingLocked));
  output.setAttribute('aria-busy', String(value));
  if (editor) { editor.disabled = editingLocked; editor.refreshCursor(); }
  updateControls();
}
async function recognize() {
  if (!selected || busy || importing || cutout.working || models.downloading || crop.isOpen) return;
  documentNeedsRecognition=false;
  ocrRequested = true;
  translation.invalidate('OCR 更新後，請手動按「翻譯」。');
  const run = ++generation;
  const clipboardRevision = clipboard.revision;
  recognitionFailed = false;
  interactionMessage = false;
  const enhanced = models.engine === 'enhanced';
  const options = { language: enhanced ? 'chi_tra+eng' : $('language').value, upscale: $('upscale').checked, layout: $('layout').value, background: $('background').value, recoverCjk: $('cjk-recovery').checked, includeUncertain: $('include-uncertain').checked };
  let worker;
  let timer;
  let segment = 0, segments = 1, tileIndex = 0;
  const scope = { ...selected };
  const tiles = scope.width * scope.height > 2_000_000 || captureMode === 'fullpage'
    ? ocrTiles(scope, { blankRow: (...args) => findBlankRow(image.getContext('2d'), ...args) }) : [scope];
  const parts = [];
  setBusy(true);
  $('progress').value = 0;
  recognitionStatus('正在載入本機 OCR 引擎…');
  $('quality-note').hidden = true;
  try {
    const interrupted = new Promise((_, reject) => {
      abortRun = () => reject(new Error('已取消辨識'));
      timer = setTimeout(() => reject(new Error('辨識逾時，請縮小範圍後重試')), 120_000 * Math.min(tiles.length, 10));
    });
    const work = (async () => {
      if (!enhanced) worker = await Tesseract.createWorker(options.language, 1, {
        workerPath: chrome.runtime.getURL('vendor/ocr/worker.min.js'),
        corePath: chrome.runtime.getURL('vendor/ocr/core'),
        langPath: chrome.runtime.getURL('vendor/ocr/lang'),
        workerBlobURL: false,
        cacheMethod: 'none',
        logger: message => {
          if (run !== generation) return;
          if (message.status === 'recognizing text') {
            const progress = (tileIndex + (segment + Math.max(0, Math.min(1, message.progress || 0))) / segments) / tiles.length;
            $('progress').value = progress;
            recognitionStatus(`本機辨識中… ${Math.round(progress * 100)}%（${tileIndex + 1}/${tiles.length} 區）`);
          }
        }
      });
      if (run !== generation) return;
      if (enhanced) worker = new Worker(chrome.runtime.getURL('ocr/paddle-worker.js'), { type: 'module' });
      currentWorker = worker;
      // Keep native pixels for line extraction; the recognizer enlarges each
      // text line once, or applies the requested 2x scale to whole-page OCR.
      let result, needsReview = false, filteredCount = 0;
      for (tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
        if (run !== generation) return;
        segment = 0; segments = 1;
        const area = tiles[tileIndex];
        const canvas = document.createElement('canvas');
        canvas.width = area.width;
        canvas.height = area.height;
        try {
          const context = canvas.getContext('2d');
          context.fillStyle = '#fff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
          if (enhanced) {
            if (options.upscale && canvas.width * canvas.height <= 4_000_000) {
              const copy = await createImageBitmap(canvas);
              canvas.width *= 2; canvas.height *= 2;
              canvas.getContext('2d').drawImage(copy, 0, 0, canvas.width, canvas.height); copy.close();
            }
            const bitmap = await createImageBitmap(canvas);
            if (run !== generation) { bitmap.close(); return; }
            const raw = await new Promise((resolve, reject) => {
              worker.onerror = event => { event.preventDefault(); reject(new Error(event.message || '加強 OCR 引擎啟動失敗')); };
              worker.onmessage = ({ data }) => {
                if (run !== generation) return;
                if (data.type === 'RESULT') resolve(data.result);
                else if (data.type === 'ERROR') reject(new Error(data.error));
                else { const progress = (tileIndex + Math.max(0, Math.min(1, data.value || 0))) / tiles.length; $('progress').value = progress; recognitionStatus(`加強辨識中… ${Math.round(progress * 100)}%（${tileIndex + 1}/${tiles.length} 區）`); }
              };
              worker.postMessage({ bitmap }, [bitmap]);
            });
            result = paddleResult(raw[0], options.layout === 'columns', canvas.width, { includeUncertain: options.includeUncertain });
          } else result = await recognizeCanvas(worker, canvas, { ...options, onSegment: (index, total) => { segment = index; segments = total; } });
          if (run !== generation) return;
          parts.push(normalizeOcrText(result.data.text, options.language));
          output.value = parts.filter(Boolean).join('\n\n');
          needsReview ||= Boolean(result.needsReview || Number.isFinite(result.data.confidence) && result.data.confidence < 75);
          filteredCount += result.filteredCount || 0;
          $('progress').value = (tileIndex + 1) / tiles.length;
        } finally { canvas.width = canvas.height = 0; }
      }
      result.filteredCount = filteredCount;
      $('quality-note').textContent = enhanced
        ? result.filteredCount
          ? `已略過 ${result.filteredCount} 個疑似圖案的低可信度候選；可勾選「顯示低可信度候選」還原核對。其餘文字仍請對照原圖。`
          : '部分文字可信度偏低，請對照原圖核對；可放大、縮小截圖範圍，或切回內建引擎比較。'
        : result.diagram
        ? '比較圖只採用兩種尺寸中位置與文字一致的結果，圖示或照片中的裝飾字仍可能漏辨，請對照原圖核對。'
        : '本次辨識可信度偏低，複製後請核對；可切換版面、底色或縮小截圖範圍再試。';
      $('quality-note').hidden = !output.value || !needsReview;
      $('copy').disabled = busy || !output.value;
      if (output.value) await copyResult({ automatic: true, run, clipboardRevision });
      else recognitionStatus('未辨識到文字，請調整範圍或辨識語言後重試', false, true);
    })();
    // A late initialization after cancel/timeout must still release its worker.
    work.finally(() => { void worker?.terminate(); }).catch(() => {});
    await Promise.race([work, interrupted]);
  } catch (error) {
    if (run === generation) {
      output.value = parts.filter(Boolean).join('\n\n');
      recognitionStatus(`${error.message || 'OCR 辨識失敗'}${parts.length ? `；已保留 ${parts.length}/${tiles.length} 區的部分結果，未自動複製。` : '，未自動複製。'}`, true, true);
    }
  } finally {
    clearTimeout(timer);
    if (run === generation) {
      generation++;
      abortRun = null;
      void worker?.terminate();
      currentWorker = null;
      setBusy(false);
    }
  }
}


async function copyResult({ automatic = false, run, clipboardRevision } = {}) {
  if (!output.value) return;
  try {
    const copied = await clipboard.copyText(output.value, automatic ? { automaticRevision: clipboardRevision, isCurrent: () => run === generation } : {});
    if (run != null && run !== generation) return;
    if (automatic) recognitionStatus(copied ? '辨識完成，已自動複製，可直接貼上（Ctrl+V／Cmd+V）' : '辨識完成，已保留你複製的圖片；需要文字時請按「複製文字」。', false, true);
    else status('文字已複製，可直接貼上（Ctrl+V／Cmd+V）');
  } catch {
    if (run != null && run !== generation) return;
    if (!automatic && document.hasFocus()) {
      output.focus();
      output.select();
    }
    const message = '辨識文字尚未複製，請點「複製文字」或選取結果後按 Ctrl+C／Cmd+C';
    if (automatic) recognitionStatus(message, false, true);
    else status(message, true);
  }
}
$('copy').addEventListener('click', () => { void copyResult(); });

function scheduleRecognition() {
  if (captureMode === 'fullpage' && !ocrRequested) return;
  if (!selected || busy || importing || cutout.working || crop.isOpen) return;
  clearTimeout(pendingRecognition);
  status('設定已變更，即將自動重新辨識…');
  pendingRecognition = setTimeout(() => {
    pendingRecognition = null;
    void recognize();
  }, 300);
}
for (const id of ['language', 'upscale', 'layout', 'background', 'cjk-recovery', 'include-uncertain']) $(id).addEventListener('change', scheduleRecognition);
output.addEventListener('input', () => { $('copy').disabled = !output.value; });
for (const button of document.querySelectorAll('[data-tool]')) button.addEventListener('click', () => {
  if (!editor) return;
  styles.close();
  editor.finishText(true);
  editor.cancel();
  editor.tool = button.dataset.tool;
  viewer.cancel();
  syncStrokeControl();
  editor.refreshCursor();
  for (const tool of document.querySelectorAll('[data-tool]')) tool.setAttribute('aria-pressed', String(tool === button));
  $('text-size-label').hidden = editor.tool !== 'text';
  if (editor.tool === 'line') status('拖曳繪製直線，自動吸附水平（180°）、垂直（90°）及 45° 斜線；Esc 取消');
  if (editor.tool === 'text') status('點擊圖片任意位置輸入文字；拖曳可移動既有文字，點一下既有文字可編輯');
  if (editor.tool === 'number') status('點擊圖片依序新增編號；點既有編號可選取，拖曳可移動，Delete／Backspace 可刪除');
  if (editor.tool === 'pan') status('手掌：按住滑鼠左鍵拖曳可視區域；其他工具可按住空白鍵暫時拖曳。');
});
$('color').addEventListener('input', () => { if (editor) editor.color = $('color').value; styles.render(); });
function syncStrokeControl() {
  const tool = editor?.tool || 'pen', range = strokeRange(tool);
  const value = widths[tool === 'highlight' ? 'highlight' : 'stroke'];
  $('width-control').hidden = ['text', 'number', 'pan'].includes(tool);
  Object.assign($('width'), { min: range.min, max: range.max, value });
  $('width').setAttribute('aria-valuetext', `${value} px`);
  $('width-value').textContent = `${value} px`;
  if (editor) { editor.width = widths.stroke; editor.highlightWidth = widths.highlight; editor.refreshCursor(); }
  styles.render();
}
$('width').addEventListener('input', () => {
  if (!editor || $('width').disabled) return;
  widths[editor.tool === 'highlight' ? 'highlight' : 'stroke'] = clampStrokeWidth(editor.tool, $('width').value);
  syncStrokeControl();
});
$('text-size').addEventListener('change', () => { if (editor) editor.fontSize = Number($('text-size').value); styles.render(); });
$('undo').addEventListener('click', () => editor?.undo());
$('redo').addEventListener('click', () => editor?.redo());
$('delete-selected').addEventListener('click', () => editor?.deleteSelected());
document.addEventListener('keydown', event => {
  if (management.isOpen || palette.isOpen || styles.isOpen || crop.isOpen || speech?.settingsOpen) return;
  if (event.key === 'Escape') editor?.cancel();
  if (annotationLocked() || !editor || event.target.closest('input, textarea, select, [contenteditable=true]')) return;
  if (['Delete', 'Backspace'].includes(event.key) && editor.deleteSelected()) {
    event.preventDefault();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
    event.preventDefault();
    if (event.shiftKey || event.key.toLowerCase() === 'y') editor.redo();
    else editor.undo();
  }
});
function imageBlob() {
  editor?.finishText(true);
  return new Promise((resolve, reject) => $('screenshot').toBlob(blob => blob ? resolve(blob) : reject(new Error('圖片產生失敗')), 'image/png'));
}
async function copyImage() {
  if ($('copy-image').disabled) return;
  try {
    await clipboard.copyImage(imageBlob());
    status('圖片已複製，包含目前標註，可直接貼上');
  } catch { status('無法複製圖片，請改用「下載 PNG」', true); }
}
$('copy-image').addEventListener('click', () => { void copyImage(); });
const copyShortcut = imageCopyShortcut({ stage: $('canvas-viewport').parentElement, canvas: $('screenshot'),
  enabled: () => !$('copy-image').disabled,
  selectedObject: () => Boolean(editor?.selectedItem || editor?.textEditing || editor?.draft || editor?.moving || viewer.interacting),
  copy: copyImage });
$('save-image').addEventListener('click', async () => {
  try {
    const url = URL.createObjectURL(await imageBlob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `pagekit-${Date.now()}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    status('已開始下載 PNG，包含目前標註');
  } catch (error) { status(error.message, true); }
});
$('shortcuts').addEventListener('click', async () => {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'OPEN_SHORTCUT_SETTINGS' });
    if (!response?.success) throw new Error(response?.error || '無法開啟設定');
  } catch { status('請在 chrome://extensions/shortcuts（Edge：edge://extensions/shortcuts）設定快捷鍵', true); }
});
$('import-image').addEventListener('click', () => $('image-file').click());
const imageImportLocked = () => busy || importing || cutout.working || models.downloading || !initialized;
async function importImage(file, pasted = false) {
  if (!file || imageImportLocked()) return;
  let bitmap, loaded = false;
  try {
    validateImportedImage(file);
    importing = true; clearTimeout(pendingRecognition); pendingRecognition = null; setBusy(busy);
    bitmap = await createImageBitmap(file);
    validateImageSize(bitmap.width, bitmap.height);
    // Decoding/validation must finish before replacing the current image.
    translation.invalidate('已匯入新圖片，辨識完成後可手動翻譯。');
    crop.reset();palette.reset(); cutout.reset(); editor?.destroy();documentHistory.reset();documentNeedsRecognition=false;
    captureMode = 'region'; ocrRequested = false; viewer.cancel();
    image.width = bitmap.width; image.height = bitmap.height;
    image.getContext('2d').drawImage(bitmap, 0, 0);
    selected = { x: 0, y: 0, width: image.width, height: image.height };
    attachEditor(); loaded = true;
    output.value = ''; $('quality-note').hidden = true;
    status(pasted ? '已貼上新圖片並取代原圖，正在自動辨識。' : '圖片已匯入，正在自動辨識；完成後可使用去背。');
  } catch (error) { status(error.message || '圖片無法開啟，請選擇有效圖片', true); }
  finally { bitmap?.close(); importing = false; setBusy(busy); }
  if (loaded) await recognize();
}
$('image-file').addEventListener('change', () => {
  const file = $('image-file').files[0]; $('image-file').value = '';
  void importImage(file);
});
function pasteImage(event) {
  if (event.defaultPrevented || document.querySelector('dialog[open]') || event.composedPath().some(node => node instanceof HTMLElement && (node.isContentEditable || node.matches('input,textarea,select')))) return;
  const data = event.clipboardData;
  const file = [...(data?.items || [])].filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).find(Boolean)
    || [...(data?.files || [])].find(file => file.type.startsWith('image/'));
  if (!file) return;
  event.preventDefault();
  if (imageImportLocked()) { status('目前正在處理圖片，請完成後再貼上新圖片。'); return; }
  void importImage(file, true);
}
document.addEventListener('paste', pasteImage);
function attachEditor() {
  editor = new AnnotationEditor($('screenshot'), image, updateControls,documentHistory);
  // Annotation history is safe during OCR; crossing a crop boundary changes
  // source pixels and must wait until the current recognition run finishes.
  editor.historyAllowed = snapshot => !busy || !snapshot.document || snapshot.document.steps === documentHistory.capture().steps;
  editor.color = $('color').value; editor.fontSize = Number($('text-size').value);
  editor.tool = document.querySelector('[data-tool][aria-pressed="true"]')?.dataset.tool || 'pen';
  syncStrokeControl();
  preview.hidden = false; $('empty-image').hidden = true;
  $('dimensions').textContent = `${image.width} × ${image.height}`;
  viewer.reset(captureMode === 'fullpage'); setBusy(busy);
}
chrome.commands.getAll().then(commands => {
  const shortcut = commands.find(command => command.name === 'capture-region')?.shortcut;
  $('shortcuts').textContent = shortcut ? `快捷鍵：${shortcut}` : '設定截圖快捷鍵';
}).catch(() => {});
window.addEventListener('pagehide', () => {
  copyShortcut.destroy();
  document.removeEventListener('paste', pasteImage);
  viewer.destroy();
  models.destroy();
  cutout.destroy();
  speech.destroy();
  translation.destroy();
  management.destroy();
  styles.destroy();
  crop.destroy();
  palette.destroy();
  clearTimeout(pendingRecognition);
  generation++;
  abortRun?.();
  void currentWorker?.terminate();
  editor?.destroy();
  documentHistory.reset();
  image.width = image.height = 0;
  $('screenshot').width = $('screenshot').height = 0;
});

async function load() {
  await Promise.all([models.initialize(), cutout.initialize()]);
  initialized = true;
  setBusy(false);
  const error = new URLSearchParams(location.search).get('error');
  if (error) { status(error, true); return; }
  const id = location.hash.slice(1);
  history.replaceState(null, '', location.pathname);
  if (!id) { status('請匯入本機圖片，或回到網頁使用截圖／圖片右鍵。'); return; }
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('截圖識別無效，請重新截圖或匯入圖片');
  const key = `ocr:${id}`;
  const { [key]: job } = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);
  if (!job || Date.now() - job.createdAt > JOB_TTL) throw new Error('截圖已失效，請回到網頁重新截圖');
  importing = true;
  setBusy(false);
  try {
    let assetUrl;
    const bitmap = new Image();
    try {
      if (job.asset) assetUrl = URL.createObjectURL(await readCapture(chrome.runtime, id));
      bitmap.src = assetUrl || job.dataUrl;
      await bitmap.decode();
    } finally { if (assetUrl) URL.revokeObjectURL(assetUrl); }
    captureMode = job.captureMode || 'region';
    const crop = job.target ? screenshotRect(job.target.rect, job.target.viewport, bitmap.naturalWidth, bitmap.naturalHeight)
      : { x: 0, y: 0, width: bitmap.naturalWidth, height: bitmap.naturalHeight };
    if (job.asset) validateCaptureSize(crop.width, crop.height);
    const scale = job.asset ? 1 : Math.min(1, Math.sqrt(16_000_000 / (crop.width * crop.height)));
    image.width = Math.max(1, Math.round(crop.width * scale));
    image.height = Math.max(1, Math.round(crop.height * scale));
    const context = image.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, image.width, image.height);
    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, image.width, image.height);
    bitmap.removeAttribute('src');
    selected = { x: 0, y: 0, width: image.width, height: image.height };
    attachEditor();
  } finally { importing = false; setBusy(false); }
  if (captureMode === 'fullpage') status('整頁截圖已載入，保留原始像素；請框選文字區辨識，或選「辨識整頁」。');
  else await recognize();
}
load().catch(error => { recognitionStatus(error.message || '截圖載入失敗，請重新截圖', true, true); });
