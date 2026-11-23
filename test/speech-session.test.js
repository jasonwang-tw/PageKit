import test from 'node:test';
import assert from 'node:assert/strict';
import { speechChunks, speechLanguage, speechSession } from '../ocr/speech-session.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

test('朗讀驗證空白、字數、無效 Unicode 與語言；自動與手動語言分開', () => {
  for (const text of ['', '   ', 'a'.repeat(30001), '\ud800', null]) assert.throws(() => speechChunks(text));
  assert.equal(speechLanguage('LW2204 SC-2203'), 'en');
  assert.equal(speechLanguage('LA2204（已完成）'), 'zh-TW');
  assert.equal(speechLanguage('型號 LW2204', 'en'), 'en');
  assert.equal(speechLanguage('テスト'), 'ja'); assert.equal(speechLanguage('한국어'), 'ko');
  assert.throws(() => speechLanguage('hello', 'auto-script'));
});

test('長文分段完整保留文字及 Unicode，單段最多180字元並盡量保留詞句', () => {
  for (const text of ['  '+('產品 LW2204 😀 test.\n').repeat(1000)+'\n', 'word '+(' '.repeat(700))+' ending', '漢'.repeat(30000)]) {
    const chunks = speechChunks(text);
    assert.equal(chunks.join(''), text);
    assert.ok(chunks.every(chunk => Array.from(chunk).length <= 180));
    assert.ok(chunks.every(chunk => !/[\uD800-\uDBFF]$/.test(chunk)));
  }
  assert.match(speechChunks('word '.repeat(100))[0], /\s$/);
});

test('不自動發聲；手動啟動後一次只取得並播放一段，語速沿用選值', async () => {
  const requests = [], playback = [], states = [];
  const session = speechSession({ requestAudio: async (text, language) => { requests.push({ text, language }); return text; },
    playAudio: (audio, options) => { const d = deferred(); playback.push({ audio, options, d }); return d.promise; },
    speakSystem: () => assert.fail('不該切到備援'), changed: state => states.push(state) });
  assert.equal(requests.length, 0);
  const run = session.start({ key: 'original', text: 'abc '.repeat(60), language: 'en', rate: 1.25 });
  await tick(); assert.equal(requests.length, 1); assert.equal(playback[0].options.rate, 1.25);
  playback[0].d.resolve(); await tick(); assert.equal(requests.length, 2);
  playback[1].d.resolve(); await run;
  assert.equal(requests.map(x => x.text).join(''), 'abc '.repeat(60));
  assert.equal(session.state.message, '朗讀完成'); assert.equal(session.state.phase, 'idle');
});

test('停止尚未回覆的 Google 請求後，遲到音訊不播放、不發下一段', async () => {
  const reply = deferred(); let requests = 0, played = 0;
  const session = speechSession({ requestAudio: () => { requests++; return reply.promise; }, playAudio: () => played++, speakSystem: () => played++ });
  const run = session.start({ key: 'original', text: 'x'.repeat(400) });
  await tick(); session.stop(); await run; reply.resolve('late audio'); await tick();
  assert.equal(requests, 1); assert.equal(played, 0); assert.equal(session.state.message, '已停止朗讀');
});

test('切換譯文會中止原播放，舊完成事件不清除新工作', async () => {
  const plays = [];
  const session = speechSession({ requestAudio: async text => text, playAudio: (text, options) => { const d = deferred(); plays.push({ text, ...options, d }); return d.promise; }, speakSystem: () => assert.fail() });
  const original = session.start({ key: 'original', text: 'original' }); await tick();
  const translated = session.start({ key: 'translated', text: '譯文', language: 'zh-TW' }); await tick();
  assert.equal(plays[0].signal.aborted, true); plays[0].d.resolve(); await original;
  assert.equal(session.state.key, 'translated'); assert.equal(session.state.phase, 'playing');
  plays[1].d.resolve(); await translated; assert.equal(session.state.message, '朗讀完成');
});

test('Google 失敗後改用瀏覽器讀目前及其餘段落，不反覆送出失敗請求', async () => {
  let requests = 0; const spoken = [];
  const session = speechSession({ requestAudio: async () => { requests++; throw Error('offline'); }, playAudio: () => assert.fail(),
    speakSystem: async (text, options) => spoken.push({ text, ...options }) });
  await session.start({ key: 'original', text: 'English '.repeat(80), language: 'en', rate: .75 });
  assert.equal(requests, 1); assert.equal(spoken.map(x => x.text).join(''), 'English '.repeat(80));
  assert.ok(spoken.every(x => x.language === 'en' && x.rate === .75));
  assert.equal(session.state.error, false);
});

test('音訊無法解碼可備援，缺聲音顯示錯誤；之後仍可重新朗讀', async () => {
  let unavailable = true;
  const session = speechSession({ requestAudio: async () => 'bad audio', playAudio: async () => { throw Error('decode'); },
    speakSystem: async () => { if (unavailable) throw Error('沒有可用聲音'); } });
  await session.start({ key: 'original', text: 'hello' }); assert.equal(session.state.message, '沒有可用聲音'); assert.equal(session.state.error, true);
  unavailable = false; await session.start({ key: 'original', text: 'hello' }); assert.equal(session.state.message, '朗讀完成');
});

test('關閉及無效語速不繼續送出內容，狀態回呼也不再寫入已關閉介面', async () => {
  const reply = deferred(); let requests = 0, updates = 0;
  const session = speechSession({ requestAudio: () => { requests++; return reply.promise; }, playAudio: () => assert.fail(), speakSystem: () => assert.fail(), changed: () => updates++ });
  await session.start({ key: 'original', text: 'hello', rate: 8 }); assert.equal(requests, 0); assert.equal(session.state.error, true);
  const run = session.start({ key: 'original', text: 'hello' }); await tick(); session.destroy(); const before = updates;
  reply.resolve('late'); await run; await session.start({ key: 'original', text: 'again' });
  assert.equal(updates, before); assert.equal(requests, 1);
});
