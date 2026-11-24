import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json')));
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json')));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, pkg.version);
assert.equal(manifest.background.type, 'module');
assert.deepEqual(manifest.action.default_icon, manifest.icons);
for (const [size, path] of Object.entries(manifest.icons)) {
  const png = readFileSync(resolve(root, path));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `圖示不是 PNG：${path}`);
  assert.equal(png.readUInt32BE(16), Number(size), `圖示寬度不符：${path}`);
  assert.equal(png.readUInt32BE(20), Number(size), `圖示高度不符：${path}`);
}
assert.deepEqual(manifest.permissions.slice().sort(), ['activeTab', 'clipboardWrite', 'contextMenus', 'scripting', 'storage']);
assert.deepEqual(manifest.host_permissions, ['https://translate.google.com/*']);
assert.deepEqual(manifest.optional_host_permissions, ['https://paddle-model-ecology.bj.bcebos.com/*', 'https://huggingface.co/*', 'https://us.aws.cdn.hf.co/*']);
assert.ok(!manifest.side_panel && !manifest.options_page);
assert.equal(manifest.commands['capture-region'].suggested_key.default, 'Alt+Shift+S');
for (const path of [manifest.background.service_worker, ...Object.values(manifest.icons), ...manifest.content_scripts.flatMap(item => item.js), 'content/screenshot-region.js', 'ocr/annotation-editor.js', 'ocr/recognition.js', 'ocr/text-layout.js', 'ocr/cjk-recovery.js', 'ocr/diagram-recognition.js', 'ocr/ocr.html', 'ocr/ocr.js', 'ocr/ocr.css']) {
  assert.ok(existsSync(resolve(root, path)), `manifest 路徑不存在：${path}`);
}
function checkDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', 'output', 'vendor'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) checkDirectory(path);
    else if (/\.(?:js|mjs)$/.test(entry.name)) execFileSync(process.execPath, ['--check', path]);
  }
}
checkDirectory(root);
const content = readFileSync(resolve(root, 'content/translate-popup.js'), 'utf8');
assert.ok(!/ADD_TO_VOCABULARY|add-vocabulary|chrome\.storage|Open Chat Hub/.test(content), 'content script 仍有原專案依賴');
assert.ok(content.includes(`${manifest.version}-pagekit`), '注入版本必須一致');
assert.ok(manifest.content_security_policy.extension_pages.includes("'wasm-unsafe-eval'"));
assert.ok(!manifest.web_accessible_resources, 'OCR 僅在擴充功能頁執行，不公開資源給網頁');
const vendor = JSON.parse(readFileSync(resolve(root, 'vendor/ocr/sources.json')));
for (const [path, hash] of Object.entries(vendor.assets)) {
  assert.equal(createHash('sha256').update(readFileSync(resolve(root, 'vendor/ocr', path))).digest('hex'), hash, `OCR 資源異動：${path}`);
}
assert.equal(Object.keys(vendor.assets).filter(path => path.endsWith('.traineddata.gz')).length, 3);
assert.equal(Object.keys(vendor.assets).filter(path => path.endsWith('-lstm.wasm.js')).length, 3);
const paddle = JSON.parse(readFileSync(resolve(root, 'vendor/paddle/sources.json')));
for (const [path, hash] of Object.entries(paddle.assets)) {
  assert.ok(!/\.onnx$|\.tar$/.test(path), '選用模型不可封裝進上架資源');
  assert.equal(createHash('sha256').update(readFileSync(resolve(root, 'vendor/paddle', path))).digest('hex'), hash, `加強 OCR 資源異動：${path}`);
}
assert.ok(!manifest.content_security_policy.extension_pages.includes("'unsafe-eval'"));
assert.ok(readFileSync(resolve(root, 'ocr/ocr.html'), 'utf8').includes('content="connect-src \'self\'"'));
for (const path of ['capture-geometry.js','capture-transfer.js','page-capture.js','capture-preferences.js','editor-window.js','content/fullpage-capture.js','ocr/image-viewer.js','ocr/capture-reader.js','ocr/ocr-tiles.js']) assert.ok(existsSync(resolve(root,path)), `截圖資源不存在：${path}`);
const paddleWorker = readFileSync(resolve(root, 'ocr/paddle-worker.js'), 'utf8');
assert.ok(paddleWorker.includes("new URL('../vendor/paddle/ort/', import.meta.url)"));
assert.ok(paddleWorker.includes('verifyModel('));
const ui = JSON.parse(readFileSync(resolve(root, 'vendor/ui/sources.json')));
for (const [path, hash] of Object.entries(ui.assets)) assert.equal(createHash('sha256').update(readFileSync(resolve(root, 'vendor/ui', path))).digest('hex'), hash, `UI 資源異動：${path}`);
assert.ok(!/@import\s|url\(\s*["']?(?:https?:|\/\/)/i.test(readFileSync(resolve(root, 'vendor/ui/daisyui.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), 'UI 不得載入外部資源');
const editorHtml = readFileSync(resolve(root, 'ocr/ocr.html'), 'utf8');
assert.ok(editorHtml.includes('../vendor/ui/daisyui.css'));
assert.ok(editorHtml.includes('href="ui-theme.css"'));
for (const path of ['ui-style-service.js', 'ocr/ui-theme.css', 'content/ui-components.css']) assert.ok(existsSync(resolve(root,path)), `共用 UI 資源不存在：${path}`);
for (const path of ['ocr/editor-layout.js']) assert.ok(existsSync(resolve(root, path)));
for (const path of ['ocr/model-store.js', 'ocr/model-download.js', 'ocr/model-controls.js', 'ocr/paddle-worker.js', 'ocr/paddle-result.js']) assert.ok(existsSync(resolve(root, path)));
const cutout = JSON.parse(readFileSync(resolve(root, 'vendor/background-removal/sources.json')));
for (const [path, hash] of Object.entries(cutout.assets)) {
  assert.ok(!/\.(onnx|tar)$/.test(path), '去背模型不得封裝進安裝包');
  assert.equal(createHash('sha256').update(readFileSync(resolve(root,'vendor/background-removal',path))).digest('hex'), hash, `去背資源異動：${path}`);
}
for (const path of ['cutout-model-store.js','cutout-model-download.js','cutout-controls.js','cutout-worker.js','cutout-pixels.js']) assert.ok(existsSync(resolve(root,'ocr',path)));
for (const path of ['translation-controls.js','translation-port.js']) assert.ok(existsSync(resolve(root,'ocr',path)));
for (const path of ['speech-controls.js','speech-settings.js','speech-session.js','speech-audio.js','image-copy-shortcut.js','capture-settings.js']) assert.ok(existsSync(resolve(root,'ocr',path)));
for (const id of ['speak-original','speak-translated','speech-settings','speech-language','speech-rate']) assert.ok(editorHtml.includes(`id="${id}"`));
assert.ok(existsSync(resolve(root,'ocr/model-services.js')));
assert.ok(existsSync(resolve(root,'ocr/brush-cursor.js')));
assert.ok(existsSync(resolve(root,'ocr/line-geometry.js')) && editorHtml.includes('data-tool="line"'));
assert.ok(editorHtml.includes('id="model-services-dialog"') && editorHtml.includes('id="open-model-services"'));
assert.ok(!editorHtml.includes('id="model-management"') && !editorHtml.includes('id="cutout-model-management"'), '管理入口不得分散在工作區');
assert.ok(ui.parts.includes('components/modal.css'), '管理介面必須封裝 daisyUI modal');
assert.ok(ui.parts.includes('components/range.css'), '粗細拉桿必須封裝 daisyUI range');
for(const part of ['dropdown','input'])assert.ok(ui.parts.includes(`components/${part}.css`));
for(const path of ['style-controls.js','crop-controls.js','crop-document.js','crop-geometry.js','crop-presets.js'])assert.ok(existsSync(resolve(root,'ocr',path)));
for(const id of ['tool-style-popover','open-tool-style','crop-dialog','open-crop'])assert.ok(editorHtml.includes(`id="${id}"`));
const cropper=JSON.parse(readFileSync(resolve(root,'vendor/cropper/sources.json')));
for(const [path,hash]of Object.entries(cropper.assets))assert.equal(createHash('sha256').update(readFileSync(resolve(root,'vendor/cropper',path))).digest('hex'),hash,`裁切資源異動：${path}`);
assert.ok(editorHtml.includes('id="palette-dialog"') && editorHtml.includes('id="analyze-palette"'));
for (const path of ['palette-analysis.js', 'palette-worker.js', 'palette-controls.js', 'stroke-settings.js']) assert.ok(existsSync(resolve(root, 'ocr', path)));
const palette = JSON.parse(readFileSync(resolve(root, 'vendor/palette/sources.json')));
for (const [path, hash] of Object.entries(palette.assets)) assert.equal(createHash('sha256').update(readFileSync(resolve(root, 'vendor/palette', path))).digest('hex'), hash, `色票資源異動：${path}`);
assert.ok(editorHtml.includes('id="translation-language"') && editorHtml.includes('id="translated-text"'));
const cutoutStore = readFileSync(resolve(root,'ocr/cutout-model-store.js'),'utf8');
assert.ok(cutoutStore.includes(cutout.model.sha256) && cutoutStore.includes(cutout.revision));
const cutoutWorker = readFileSync(resolve(root,'ocr/cutout-worker.js'),'utf8');
assert.ok(cutoutWorker.includes("executionProviders: ['wasm']") && cutoutWorker.includes('verifyCutout(model)'));
console.log('Manifest、資源路徑、語法、版本與本機 OCR 資源完整性檢查通過');
