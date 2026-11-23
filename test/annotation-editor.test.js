import test from 'node:test';
import assert from 'node:assert/strict';
import { AnnotationEditor, drawAnnotation } from '../ocr/annotation-editor.js';
import { snappedLineEnd } from '../ocr/line-geometry.js';

function setup() {
  const context = new Proxy({ measureText: text => ({ width: text.length * 12 }) }, { get: (object, key) => object[key] ?? (() => {}) });
  const canvas = {
    style: {}, getContext: () => context, addEventListener() {},
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 500, height: 250 }),
    setPointerCapture() {}, releasePointerCapture() {}, hasPointerCapture: () => false
  };
  const editor = new AnnotationEditor(canvas, { width: 1000, height: 500 }, () => {});
  const pointer = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, button: 0, preventDefault() {} });
  return { editor, pointer };
}

test('手掌及暫時空白鍵拖曳不建立標註或歷史', () => {
  const { editor, pointer } = setup();
  editor.tool = 'pan'; editor.begin(pointer(150, 100)); editor.move(pointer(250, 150)); editor.end(pointer(250, 150));
  assert.equal(editor.items.length, 0); assert.equal(editor.undoStack.length, 0);
  editor.tool = 'pen'; editor.navigationOverride = true; editor.begin(pointer(150, 100));
  assert.equal(editor.draft, null);
});

test('辨識期間一般標註可復原重做，但原圖裁切歷史必須等辨識完成', () => {
  const { editor } = setup();
  const beforeCrop = { steps: [] }, cropped = { steps: [{}] };
  let documentState = beforeCrop, recognizing = false;
  editor.documentHistory = { capture: () => documentState, restore: next => { documentState = next; } };
  editor.historyAllowed = snapshot => !recognizing || snapshot.document.steps === documentState.steps;
  editor.record([], cropped);
  recognizing = true;
  assert.equal(editor.canUndo, false);
  editor.undo();
  assert.equal(documentState, cropped);
  assert.equal(editor.undoStack.length, 1);
  const item = { tool: 'number', color: 'red', start: { x: 50, y: 50 }, radius: 16, fontSize: 18, number: 1 };
  editor.commit(item);
  assert.equal(editor.canUndo, true);
  editor.undo();
  assert.deepEqual(editor.items, []);
  assert.equal(editor.canRedo, true);
  editor.redo();
  assert.deepEqual(editor.items, [item]);
  recognizing = false;
  editor.undo();
  editor.undo();
  assert.equal(documentState, beforeCrop);
  recognizing = true;
  assert.equal(editor.canRedo, false);
  editor.redo();
  assert.equal(documentState, beforeCrop);
  recognizing = false;
  editor.redo();
  assert.equal(documentState, cropped);
});

test('匯入或去背鎖定期間不修改復原重做歷史', () => {
  const { editor } = setup();
  editor.commit({ tool: 'number', start: { x: 50, y: 50 }, radius: 16, fontSize: 18, number: 1 });
  editor.disabled = true;
  assert.equal(editor.canUndo, false);
  editor.undo();
  assert.equal(editor.items.length, 1);
  editor.disabled = false;
  editor.undo();
  editor.disabled = true;
  assert.equal(editor.canRedo, false);
  editor.redo();
  assert.equal(editor.items.length, 0);
});

test('直線吸附八個方向，水平180度、垂直90度與45度反向皆正確', () => {
  const start = {x:100,y:100};
  for (const [dx,dy,ex,ey] of [[80,10,80,0],[80,70,75,75],[10,80,0,80],[-80,70,-75,75],[-80,10,-80,0],[-80,-70,-75,-75],[10,-80,0,-80],[80,-70,75,-75]]) {
    assert.deepEqual(snappedLineEnd(start,{x:100+dx,y:100+dy},200,200),{x:100+ex,y:100+ey});
  }
});
test('直線靠邊界沿原方向縮短，仍保留精確45度與合法座標', () => {
  assert.deepEqual(snappedLineEnd({x:90,y:20},{x:100,y:35},100,100),{x:100,y:30});
  assert.deepEqual(snappedLineEnd({x:4,y:98},{x:0,y:100},100,100),{x:2,y:100});
  for (const start of [{x:1,y:1},{x:99,y:99},{x:50,y:50}]) for (const x of [0,20,100]) for (const y of [0,30,100]) {
    const end=snappedLineEnd(start,{x,y},100,100),dx=Math.abs(end.x-start.x),dy=Math.abs(end.y-start.y);
    assert.ok(end.x>=0&&end.x<=100&&end.y>=0&&end.y<=100);
    assert.ok(dx===0||dy===0||Math.abs(dx-dy)<1e-9);
  }
});
test('直線預覽與放開使用相同原圖座標，保留色寬且可復原重做', () => {
  const {editor,pointer}=setup(), source=editor.source;
  editor.tool='line';editor.width=12;editor.color='#123456';
  editor.begin(pointer(200,150));editor.move(pointer(450,170));
  assert.deepEqual(editor.draft.start,{x:200,y:200});assert.deepEqual(editor.draft.end,{x:700,y:200});
  editor.end(pointer(450,170));const line=editor.items[0];
  assert.equal(line.tool,'line');assert.equal(line.width,24);assert.equal(line.color,'#123456');
  assert.deepEqual(line.end,{x:700,y:200});assert.equal(editor.source,source);
  editor.undo();assert.equal(editor.items.length,0);editor.redo();assert.equal(editor.items[0],line);
});
test('直線取消及原地點擊不新增筆畫或破壞復原歷史', () => {
  const {editor,pointer}=setup();editor.tool='line';
  editor.begin(pointer(200,150));editor.end(pointer(200,150));assert.equal(editor.items.length,0);assert.equal(editor.undoStack.length,0);
  editor.begin(pointer(200,150));editor.move(pointer(300,200));editor.cancel();assert.equal(editor.draft,null);assert.equal(editor.items.length,0);
});
test('直線匯出只畫單一線段，沒有箭頭或額外筆畫', () => {
  const calls=[];const context=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args])});
  drawAnnotation(context,{tool:'line',start:{x:10,y:20},end:{x:80,y:20},width:4,color:'#ff0000'});
  assert.deepEqual(calls.filter(x=>['moveTo','lineTo','stroke'].includes(x[0])),[['moveTo',10,20],['lineTo',80,20],['stroke']]);
});

test('編號依點選順序新增，縮放後座標仍對應圖片位置', () => {
  const { editor, pointer } = setup();
  editor.tool = 'number';
  editor.begin(pointer(200, 150));
  editor.begin(pointer(400, 200));
  assert.deepEqual(editor.items.map(item => item.number), [1, 2]);
  assert.deepEqual(editor.items[0].start, { x: 200, y: 200 });
  assert.equal(editor.nextNumber, 3);
  editor.undo();
  assert.equal(editor.nextNumber, 2);
  editor.redo();
  assert.equal(editor.nextNumber, 3);
});

test('拖曳編號保留號碼，復原與重做能還原位置', () => {
  const { editor, pointer } = setup();
  editor.tool = 'number';
  editor.begin(pointer(200, 150));
  editor.begin(pointer(200, 150));
  editor.end(pointer(350, 200));
  assert.equal(editor.items.length, 1);
  assert.equal(editor.items[0].number, 1);
  assert.deepEqual(editor.items[0].start, { x: 500, y: 300 });
  editor.undo();
  assert.deepEqual(editor.items[0].start, { x: 200, y: 200 });
  editor.redo();
  assert.deepEqual(editor.items[0].start, { x: 500, y: 300 });
});

test('文字可拖曳至另一位置，取消拖曳不修改已儲存標註', () => {
  const { editor, pointer } = setup();
  editor.tool = 'text';
  editor.commit({ tool: 'text', color: '#ef4444', start: { x: 200, y: 200 }, fontSize: 24, text: '標註文字' });
  editor.begin(pointer(210, 155));
  editor.move(pointer(300, 200));
  editor.cancel();
  assert.deepEqual(editor.items[0].start, { x: 200, y: 200 });
  editor.begin(pointer(210, 155));
  editor.end(pointer(300, 200));
  assert.deepEqual(editor.items[0].start, { x: 380, y: 290 });
  assert.equal(editor.items[0].text, '標註文字');
  editor.undo();
  assert.deepEqual(editor.items[0].start, { x: 200, y: 200 });
});

test('編號圓點在邊緣仍留在圖片內，新編號會中斷重做歷史', () => {
  const { editor, pointer } = setup();
  editor.tool = 'number';
  editor.begin(pointer(100, 50));
  const first = editor.items[0];
  assert.equal(first.start.x, first.radius);
  assert.equal(first.start.y, first.radius);
  editor.begin(pointer(500, 250));
  editor.undo();
  editor.begin(pointer(300, 150));
  editor.redo();
  assert.deepEqual(editor.items.map(item => item.number), [1, 2]);
  assert.equal(editor.redoItems.length, 0);
});

test('可選取並刪除中間編號，其他編號與位置保持不變，且可復原重做', () => {
  const { editor, pointer } = setup();
  editor.tool = 'number';
  for (const x of [200, 300, 400]) editor.begin(pointer(x, 150));
  const [first, , third] = editor.items;
  editor.begin(pointer(300, 150));
  editor.end(pointer(300, 150));
  assert.equal(editor.selectedItem.number, 2);
  assert.equal(editor.deleteSelected(), true);
  assert.deepEqual(editor.items, [first, third]);
  assert.equal(editor.nextNumber, 4);
  assert.equal(editor.selectedItem, null);
  editor.undo();
  assert.deepEqual(editor.items.map(item => item.number), [1, 2, 3]);
  editor.redo();
  assert.deepEqual(editor.items, [first, third]);
});

test('剛放置的編號可直接刪除，下一個編號正確更新', () => {
  const { editor, pointer } = setup();
  editor.tool = 'number';
  editor.begin(pointer(200, 150));
  editor.begin(pointer(400, 150));
  assert.equal(editor.selectedItem.number, 2);
  editor.deleteSelected();
  assert.equal(editor.nextNumber, 2);
  assert.deepEqual(editor.items.map(item => item.number), [1]);
});

test('未選取、取消選取或編輯停用時不刪除任何標註', () => {
  const { editor, pointer } = setup();
  assert.equal(editor.deleteSelected(), false);
  editor.tool = 'number';
  editor.begin(pointer(200, 150));
  editor.disabled = true;
  assert.equal(editor.deleteSelected(), false);
  editor.disabled = false;
  editor.cancel();
  assert.equal(editor.deleteSelected(), false);
  assert.equal(editor.items.length, 1);
});

test('刪除移動中的選取文字可復原，原圖來源不改變', () => {
  const { editor, pointer } = setup();
  const source = editor.source;
  editor.tool = 'text';
  editor.commit({ tool: 'text', color: '#ef4444', start: { x: 200, y: 200 }, fontSize: 24, text: '待刪除文字' });
  editor.begin(pointer(210, 155));
  editor.move(pointer(300, 200));
  assert.equal(editor.deleteSelected(), true);
  assert.equal(editor.items.length, 0);
  editor.undo();
  assert.equal(editor.items[0].text, '待刪除文字');
  assert.deepEqual(editor.items[0].start, { x: 200, y: 200 });
  assert.equal(editor.source, source);
});
