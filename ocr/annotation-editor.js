// Non-destructive annotations; OCR always receives the clean cropped source.
import { brushCursor, strokeWidth } from './brush-cursor.js';
import { snappedLineEnd } from './line-geometry.js';
import { clipCropMask } from './crop-geometry.js';
export function drawAnnotation(context, item) {
  context.save();
  context.strokeStyle = item.color;
  context.fillStyle = item.color;
  context.lineWidth = item.width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (item.tool === 'text') {
    context.font = `${item.fontSize}px system-ui, sans-serif`;
    context.textBaseline = 'top';
    item.text.split('\n').forEach((line, index) => context.fillText(line, item.start.x, item.start.y + index * item.fontSize * 1.3));
  } else if (item.tool === 'number') {
    context.beginPath();
    context.arc(item.start.x, item.start.y, item.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fff';
    context.font = `bold ${item.fontSize}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(item.number), item.start.x, item.start.y, item.radius * 1.6);
  } else if (item.tool === 'rect') {
    context.strokeRect(item.start.x, item.start.y, item.end.x - item.start.x, item.end.y - item.start.y);
  } else if (item.tool === 'line') {
    context.beginPath();
    context.moveTo(item.start.x, item.start.y);
    context.lineTo(item.end.x, item.end.y);
    context.stroke();
  } else if (item.tool === 'arrow') {
    const angle = Math.atan2(item.end.y - item.start.y, item.end.x - item.start.x);
    const length = Math.max(item.width * 4, item.headSize);
    context.beginPath();
    context.moveTo(item.start.x, item.start.y);
    context.lineTo(item.end.x, item.end.y);
    context.moveTo(item.end.x - length * Math.cos(angle - Math.PI / 6), item.end.y - length * Math.sin(angle - Math.PI / 6));
    context.lineTo(item.end.x, item.end.y);
    context.lineTo(item.end.x - length * Math.cos(angle + Math.PI / 6), item.end.y - length * Math.sin(angle + Math.PI / 6));
    context.stroke();
  } else {
    if (item.tool === 'highlight') context.globalAlpha = 0.3;
    context.beginPath();
    context.moveTo(item.points[0].x, item.points[0].y);
    for (const point of item.points.slice(1)) context.lineTo(point.x, point.y);
    if (item.points.length === 1) context.lineTo(item.points[0].x + 0.01, item.points[0].y);
    context.stroke();
  }
  context.restore();
}

export class AnnotationEditor {
  constructor(canvas, source, onChange, documentHistory = null) {
    this.canvas = canvas;
    this.source = source;
    this.documentHistory = documentHistory;
    this.cropMasks = [];
    this.onChange = onChange;
    this.items = [];
    this.undoStack = [];
    this.redoItems = [];
    this.draft = null;
    this.moving = null;
    this.textEditing = null;
    this.selectedItem = null;
    this.tool = 'pen';
    this.color = '#ef4444';
    this.width = 3;
    this.highlightWidth = 20;
    this.fontSize = 24;
    this.disabled = false;
    this.historyAllowed = () => true;
    canvas.width = source.width;
    canvas.height = source.height;
    this.pointerEvents = { pointerdown: event => this.begin(event), pointermove: event => this.move(event), pointerup: event => this.end(event), pointercancel: () => this.cancel() };
    for (const [name, listener] of Object.entries(this.pointerEvents)) canvas.addEventListener(name, listener);
    if (canvas.ownerDocument) {
      this.selectionBox = canvas.ownerDocument.createElement('div');
      this.selectionBox.className = 'annotation-selection';
      this.selectionBox.hidden = true;
      this.selectionBox.setAttribute('aria-hidden', 'true');
      canvas.parentElement.append(this.selectionBox);
      this.brushCursor = brushCursor(canvas, () => ({ tool: this.tool, width: this.width, highlightWidth: this.highlightWidth, disabled: this.disabled || this.navigationOverride, cursor: !this.disabled && (this.navigationCursor || (this.tool === 'pan' ? 'grab' : null)), nativeWidth: this.draft?.tool === this.tool ? this.draft.width : undefined }));
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => { this.positionTextEditor(); this.positionSelection(); this.brushCursor?.refresh(); });
      this.resizeObserver.observe(canvas);
    }
    this.render();
  }
  get nextNumber() { return Math.max(0, ...this.items.filter(item => item.tool === 'number').map(item => item.number)) + 1; }
  get canUndo() { return !this.disabled && this.undoStack.length > 0 && this.historyAllowed(this.undoStack.at(-1)); }
  get canRedo() { return !this.disabled && this.redoItems.length > 0 && this.historyAllowed(this.redoItems.at(-1)); }
  refreshCursor() {
    this.canvas.style.cursor = this.disabled ? 'default' : this.navigationCursor || (this.tool === 'pan' ? 'grab' : this.tool === 'text' ? 'text' : 'crosshair');
    this.brushCursor?.refresh();
  }
  scale() { return this.canvas.width / this.canvas.getBoundingClientRect().width; }
  point(event) {
    const box = this.canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(this.canvas.width, (event.clientX - box.left) * this.canvas.width / box.width)),
      y: Math.max(0, Math.min(this.canvas.height, (event.clientY - box.top) * this.canvas.height / box.height))
    };
  }
  bounds(item) {
    if (item.tool === 'number') return { x: item.start.x - item.radius, y: item.start.y - item.radius, width: item.radius * 2, height: item.radius * 2 };
    const context = this.canvas.getContext('2d');
    context.save();
    context.font = `${item.fontSize}px system-ui, sans-serif`;
    const lines = item.text.split('\n');
    const width = Math.max(...lines.map(line => context.measureText(line).width), item.fontSize / 2);
    context.restore();
    return { x: item.start.x, y: item.start.y, width, height: lines.length * item.fontSize * 1.3 };
  }
  hit(point) {
    const padding = 5 * this.scale();
    for (let index = this.items.length - 1; index >= 0; index--) {
      const item = this.items[index];
      if (item.tool !== this.tool || !['text', 'number'].includes(item.tool)) continue;
      const box = this.bounds(item);
      if (point.x >= box.x - padding && point.x <= box.x + box.width + padding && point.y >= box.y - padding && point.y <= box.y + box.height + padding) return index;
    }
    return -1;
  }
  begin(event) {
    if (this.disabled || this.navigationOverride || this.tool === 'pan' || event.button !== 0 || this.draft || this.moving) return;
    event.preventDefault();
    this.canvas.focus?.({ preventScroll: true });
    this.finishText(true);
    const start = this.point(event);
    const scale = this.scale();
    const index = this.hit(start);
    if (index >= 0) {
      this.selectedItem = this.items[index];
      this.pointerId = event.pointerId;
      this.canvas.setPointerCapture(event.pointerId);
      this.moving = { index, original: this.items[index], from: start, item: this.items[index], moved: false };
      this.render();
      this.onChange(this.selectedItem.tool === 'number' ? `已選取編號 ${this.selectedItem.number}，可按 Delete／Backspace 或「刪除選取」` : '已選取文字，可拖曳移動或刪除');
      return;
    }
    this.selectedItem = null;
    this.onChange();
    if (this.tool === 'text') {
      this.editText({ tool: 'text', color: this.color, start, fontSize: this.fontSize * scale, text: '' });
      return;
    }
    if (this.tool === 'number') {
      const radius = Math.min(16 * scale, this.canvas.width / 2, this.canvas.height / 2);
      const center = { x: Math.max(radius, Math.min(this.canvas.width - radius, start.x)), y: Math.max(radius, Math.min(this.canvas.height - radius, start.y)) };
      this.commit({ tool: 'number', color: this.color, start: center, radius, fontSize: radius * 1.15, number: this.nextNumber });
      return;
    }
    this.pointerId = event.pointerId;
    this.canvas.setPointerCapture(event.pointerId);
    this.draft = { tool: this.tool, color: this.color, width: strokeWidth(this.tool, this.width, this.highlightWidth) * scale,
      start, end: start, points: [start], headSize: 14 * scale };
    this.render();
  }
  move(event) {
    if (this.navigationOverride || this.tool === 'pan') return;
    if (this.moving && event.pointerId === this.pointerId) {
      const point = this.point(event);
      const dx = point.x - this.moving.from.x;
      const dy = point.y - this.moving.from.y;
      if (Math.hypot(dx, dy) > 3 * this.scale()) this.moving.moved = true;
      if (this.moving.moved) {
        const item = this.moving.original;
        const box = this.bounds(item);
        const x = Math.max(item.start.x - box.x, Math.min(this.canvas.width - (box.width - (item.start.x - box.x)), item.start.x + dx));
        const y = Math.max(item.start.y - box.y, Math.min(this.canvas.height - (box.height - (item.start.y - box.y)), item.start.y + dy));
        this.moving.item = { ...item, start: { x, y } };
        this.render();
      }
      return;
    }
    if (!this.draft || event.pointerId !== this.pointerId) {
      this.canvas.style.cursor = ['text', 'number'].includes(this.tool) && this.hit(this.point(event)) >= 0 ? 'move' : (this.tool === 'text' ? 'text' : 'crosshair');
      return;
    }
    const point = this.point(event);
    this.draft.end = this.draft.tool === 'line' ? snappedLineEnd(this.draft.start, point, this.canvas.width, this.canvas.height) : point;
    if (this.draft.tool !== 'line' && this.draft.points.length < 5000) this.draft.points.push(this.draft.end);
    this.render();
  }
  end(event) {
    if (this.moving && event.pointerId === this.pointerId) {
      this.move(event);
      this.canvas.releasePointerCapture(event.pointerId);
      const moving = this.moving;
      this.moving = null;
      if (moving.moved) this.replace(moving.index, moving.item);
      else if (moving.original.tool === 'text') this.editText(moving.original, moving.index);
      return;
    }
    if (!this.draft || event.pointerId !== this.pointerId) return;
    this.move(event);
    this.canvas.releasePointerCapture(event.pointerId);
    const item = this.draft;
    this.draft = null;
    if (item.tool === 'line' && Math.hypot(item.end.x - item.start.x, item.end.y - item.start.y) < this.scale()) { this.render(); return; }
    this.commit(item);
  }
  historySnapshot() { return {items:this.items,document:this.documentHistory?.capture()}; }
  record(items, documentState) {
    const previous=this.historySnapshot();
    if(documentState!==undefined)this.documentHistory?.restore(documentState);
    this.undoStack.push(previous);
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.items = items;
    if (!items.includes(this.selectedItem)) this.selectedItem = null;
    this.redoItems = [];
    this.render(); this.onChange();
  }
  commit(item) {
    this.selectedItem = ['text', 'number'].includes(item.tool) ? item : null;
    this.record([...this.items, item].slice(-200));
  }
  replace(index, item) {
    if (this.selectedItem === this.items[index]) this.selectedItem = item;
    this.record(this.items.flatMap((value, i) => i === index ? (item ? [item] : []) : [value]));
  }
  deleteSelected() {
    const index = this.items.indexOf(this.selectedItem);
    if (this.disabled || index < 0) return false;
    const item = this.selectedItem;
    this.cancel();
    this.replace(index, null);
    this.onChange(item.tool === 'number' ? `已刪除編號 ${item.number}，可按「復原」還原` : '已刪除文字，可按「復原」還原');
    return true;
  }
  positionSelection() {
    if (!this.selectionBox) return;
    const index = this.items.indexOf(this.selectedItem);
    this.selectionBox.hidden = index < 0 || Boolean(this.textEditing);
    if (this.selectionBox.hidden) return;
    const item = this.moving?.index === index ? this.moving.item : this.selectedItem;
    const bounds = this.bounds(item);
    const canvas = this.canvas.getBoundingClientRect();
    const parent = this.canvas.parentElement.getBoundingClientRect();
    const scale = canvas.width / this.canvas.width;
    Object.assign(this.selectionBox.style, {
      left: `${canvas.left - parent.left + bounds.x * scale - 4}px`, top: `${canvas.top - parent.top + bounds.y * scale - 4}px`,
      width: `${bounds.width * scale + 8}px`, height: `${bounds.height * scale + 8}px`
    });
  }
  editText(item, index = -1) {
    const doc = this.canvas.ownerDocument;
    const panel = doc.createElement('div');
    panel.className = 'canvas-text-editor card card-border';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', '圖片上的文字標註');
    const field = doc.createElement('textarea');
    field.className = 'textarea textarea-sm annotation-textarea';
    field.setAttribute('aria-label', '圖片上的標註文字');
    field.placeholder = '在這裡輸入文字';
    field.maxLength = 500;
    field.value = item.text;
    const actions = doc.createElement('div');
    actions.className = 'card-actions';
    const done = doc.createElement('button'); done.type = 'button'; done.textContent = '完成文字';
    const cancel = doc.createElement('button'); cancel.type = 'button'; cancel.textContent = '取消文字';
    done.className = 'btn btn-primary btn-sm';
    cancel.className = 'btn btn-outline btn-sm';
    actions.append(done, cancel);
    panel.append(field, actions);
    this.textEditing = { item: { ...item }, index, panel, field };
    field.addEventListener('input', () => { if (this.textEditing) { this.textEditing.item.text = field.value; this.render(); } });
    field.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); this.finishText(false); }
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.finishText(true); }
    });
    for (const button of [done, cancel]) button.addEventListener('pointerdown', event => event.preventDefault());
    done.addEventListener('click', () => this.finishText(true));
    cancel.addEventListener('click', () => this.finishText(false));
    this.canvas.parentElement.append(panel);
    if (typeof ResizeObserver !== 'undefined') {
      this.textEditorObserver = new ResizeObserver(() => this.positionTextEditor());
      this.textEditorObserver.observe(panel);
    }
    this.positionTextEditor();
    this.render();
    field.focus();
    field.select();
    this.onChange('在圖片上輸入文字，Enter 完成、Shift+Enter 換行；完成後可拖曳移動，點文字可再編輯');
  }
  positionTextEditor() {
    if (!this.textEditing) return;
    const { panel, item, field } = this.textEditing;
    const box = this.canvas.getBoundingClientRect();
    const parent = this.canvas.parentElement.getBoundingClientRect();
    const scale = box.width / this.canvas.width;
    const viewport = this.canvas.parentElement.parentElement?.getBoundingClientRect() || box;
    const width = Math.min(300, Math.max(0, viewport.width - 16));
    panel.style.width = `${width}px`;
    field.style.maxHeight = `${Math.max(60, Math.min(200, viewport.height - 80))}px`;
    const height = panel.getBoundingClientRect().height || 140;
    const left = Math.max(viewport.left + 8, Math.min(viewport.right - width - 8, box.left + item.start.x * scale));
    const top = Math.max(viewport.top + 8, Math.min(viewport.bottom - height - 8, box.top + item.start.y * scale));
    Object.assign(panel.style, { left: `${left - parent.left}px`, top: `${top - parent.top}px` });
  }
  finishText(save) {
    if (!this.textEditing) return;
    const { item, index, panel, field } = this.textEditing;
    this.textEditing = null;
    this.textEditorObserver?.disconnect();
    this.textEditorObserver = null;
    panel.remove();
    const text = field.value.trim();
    if (save && index >= 0) {
      if (text !== this.items[index].text) this.replace(index, text ? { ...item, text } : null);
    } else if (save && text) this.commit({ ...item, text });
    this.render(); this.onChange();
  }
  cancel() {
    if (this.pointerId != null && this.canvas.hasPointerCapture(this.pointerId)) this.canvas.releasePointerCapture(this.pointerId);
    this.draft = null;
    this.moving = null;
    this.selectedItem = null;
    this.finishText(false);
    this.render();
    this.onChange();
  }
  undo() {
    if (this.disabled) return;
    this.finishText(true);
    if (!this.canUndo) return;
    this.cancel();
    if (this.undoStack.length) { const previous=this.historySnapshot(),next=this.undoStack.at(-1); this.documentHistory?.restore(next.document); this.undoStack.pop(); this.redoItems.push(previous); this.items = next.items; }
    this.render(); this.onChange();
  }
  redo() {
    if (this.disabled) return;
    this.finishText(true);
    if (!this.canRedo) return;
    this.cancel();
    if (this.redoItems.length) { const previous=this.historySnapshot(),next=this.redoItems.at(-1); this.documentHistory?.restore(next.document); this.redoItems.pop(); this.undoStack.push(previous); this.items = next.items; }
    this.render(); this.onChange();
  }
  destroy() {
    this.cancel(); this.resizeObserver?.disconnect(); this.selectionBox?.remove(); this.brushCursor?.destroy();
    for (const [name, listener] of Object.entries(this.pointerEvents)) this.canvas.removeEventListener?.(name, listener);
  }
  render() {
    const context = this.canvas.getContext('2d');
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.save();
    for(const mask of this.cropMasks)clipCropMask(context,mask);
    context.drawImage(this.source, 0, 0);
    for (let index = 0; index < this.items.length; index++) {
      if (this.textEditing?.index === index) continue;
      drawAnnotation(context, this.moving?.index === index ? this.moving.item : this.items[index]);
    }
    if (this.draft) drawAnnotation(context, this.draft);
    if (this.textEditing?.item.text) drawAnnotation(context, this.textEditing.item);
    context.restore();
    this.positionSelection();
    this.brushCursor?.refresh();
  }
}
