# 拆分驗證（2026-11-16）

> 本文件保留各階段當時的驗證與未發布狀態；最新 Git／商店狀態以發行 PR 與商店後台為準。私人交接與校驗回條另存，不納入公開套件。

## 1.12.2 朗讀圖示與共用設定浮層（2026-11-23）

- 先依使用者指示記錄docs/UI_INVENTORY.md，再將原文／譯文下方文字朗讀鈕改為區塊右上喇叭SVG與齒輪，語言／語速共用同一個原生Popover表單，保持daisyUI與可存取名稱／播放狀態。沒有變更語音服務、來源、權限或剪貼簿。
- speech-settings.js管理兩個入口、定位與視窗邊界、aria-expanded、Enter／Space、Esc焦點還原、點外部／Tab收起、scroll／resize與清理。ocr.js在浮層開啟時不讓Escape取消圖片文字草稿。
- npm test **158/158**、npm run check、git diff --check通過；沒有build／monitor scripts。
- 隔離Edge **44項朗讀／UI＋48項並行＋32項複製＝124項**通過，無應用程式例外。包含真實Audio與固定測試句Hello PageKit之Google TTS、真正封裝Tesseract；SpeechSynthesis／Chrome APIs／翻譯／剪貼簿是受控替身，不宣稱人工聽驗所有語言、日常Chrome或真實OS剪貼簿。
- 新UI核對喇叭純SVG、右上且不遮字、title／aria、共享設定值、焦點、鍵盤、外部收起、Esc保留草稿、320px浮層上下左右均留在視窗、深淺色。已目視畫面；原播放／停止／備援／長文／語速／改字／失效／關閉回歸通過。
- QA在output/playwright/ocr-speech-1.12.2.mjs、ocr-parallel-1.12.2.mjs、copy-shortcut-1.12.2.mjs與同名results.json／PNG，皆忽略檔。外部點擊測試改點未被浮層遮住的區域，沒有用force代替原生點擊。
- 版本1.12.2與README／AGENTS／注入版本／資源檢查同步。未commit／push／商店發布或日常Chrome重新載入，全部前輪修改與stash保留。交接紀錄已另存並讀回確認。

## 1.12.1 縮放工具列80%試版（2026-11-23）

- 依使用者圖中指定縮放群組整體縮小20%，只改.zoom-controls變換比例與原點；字體／按鈕／間距／外框一起變80%，底部置中及16px底距保持，沒有改圖片或其他編輯器UI。規格先記錄docs/UI_INVENTORY.md。
- npm test **158/158**、npm run check、git diff --check通過。隔離Edge **42項**縮放／手掌／深淺色／650與320px回歸通過。使用未變換的版面尺寸對照實際顯示矩形，253.734×50→202.988×40px，寬高比均80%；底部位置、按鈕點擊／文字完整、Ctrl滾輪錨點、手掌／握拳正常。
- 已目視縮小後深淺色；QA output/playwright/zoom-compact-1.12.1.mjs及同名資料夾results.json／PNG。Chrome APIs／OCR／剪貼簿為替身，沒有日常Chrome或真實OS剪貼簿驗收。本輪純CSS小調整，不寫鏡像單元測試，不重跑未改的完整模型／朗讀矩陣。
- 版本1.12.1、README changelog及注入識別同步；保留全部前輪修改，未commit／push／發布或日常Chrome重新載入。交接紀錄已另存並讀回確認。

## 1.12.0 圖片區Ctrl+C／Cmd+C（2026-11-23）

- 使用者明確指定焦點／選取物件優先；先記錄docs/UI_INVENTORY.md，再新增image-copy-shortcut.js。僅圖片可視區hover且無文字選取、其他控制項焦點、選中／編輯／操作中的物件或dialog／popover時，接手Ctrl+C／Cmd+C；不改版面，不新增權限或依賴。
- 共用原copyImage／imageBlob／clipboardWrites；原尺寸PNG包含已完成標註，縮放不改尺寸，OCR後到結果不能覆蓋手動圖片。原複製按鈕行為保留，pagehide解除快捷鍵監聽。
- npm test **158/158**、npm run check、git diff --check通過。隔離Edge **32項新複製操作＋48項並行回歸＝80項**；圖片用原生Control+C及真實PNG編解碼核對原尺寸／筆畫／文字／編號，優先權案例以可取消合成keydown核對保留預設行為，沒有真的複製OS文字。控制項確實聚焦後才測試；dialog關閉等待close事件後再測試下一個焦點。
- 驗證區域外、原生文字選取／輸入框／contenteditable／按鈕／連結／summary、選中編號／文字、文字草稿、繪圖中、特殊修飾鍵／repeat／IME／defaultPrevented、Mac分支、OCR手動圖片優先、複製失敗與恢復、原按鈕正常。沒有應用程式例外；並行回歸含真正封裝Tesseract。Chrome API／OCR時序／剪貼簿為受控替身，不宣稱已驗收日常Chrome、OS剪貼簿或Mac實機。
- QA：output/playwright/copy-shortcut-1.12.0.mjs、ocr-parallel-1.12.0.mjs、同名結果資料夾與unit-1.12.0.log；皆為本機忽略檔。不額外執行不存在的build／monitor，也不重測未改模型品質。
- 本機工作檔1.12.0，保留前輪全部未提交修改，未commit／push／商店發布／日常Chrome重新載入。交接紀錄已另存並讀回確認。

## 1.11.0 縮放工具與暫時手掌（2026-11-23）

- 依使用者截圖與兩次後續指示，先記錄docs/UI_INVENTORY.md，再移至canvas-stage底部中央固定縮放列；Ctrl＋滾輪只在圖片區作用、10%–400%、游標錨點，一般滾輪仍捲動。深淺色延續daisyUI，未新增權限／依賴／圖片傳送。
- 修正brushCursor覆蓋viewer導覽指標：空白鍵保持grab、左鍵grabbing、放左鍵grab、放空白鍵回原工具；滑鼠回圖片區時工具按鈕焦點不阻止Space，文字欄位仍輸入空格。
- npm test **158/158**、npm run check、git diff --check通過。隔離Edge **41項新操作檢查＋48項並行回歸＝89項**，含原生滑鼠／鍵盤／wheel、原圖錨點、一般／區域外滾輪、限制、四種工具指標循環、來源／歷史／OCR／剪貼簿不變、底部定位、深淺色650／320px與按鈕文字完整。並行回歸含真正封裝Tesseract。
- 已目視深淺色畫面；320px浮層shrink-to-fit壓縮文字已修正為max-content及不壓縮按鈕，錨點測試等待實際Canvas新尺寸生效後比對（誤差小於1原圖像素）。沒有以增加延遲改正式互動，縮放仍立即。
- QA在output/playwright/zoom-controls-1.11.0.mjs、ocr-parallel-1.11.0.mjs及同名目錄results.json／PNG；Chrome APIs／傳輸／OCR時序／剪貼簿是受控替身，不宣稱已重新載入日常Chrome或重測全部模型。未另外重跑不受影響的完整朗讀／長圖拼接矩陣。
- 版本1.11.0；保留所有前輪未提交修改，沒有commit／push／商店發布或日常Chrome重新載入。交接紀錄已另存並讀回確認。

## 1.10.0 視窗／整頁截圖與按需分區 OCR（2026-11-23）

- 需求先記錄於 docs/CAPTURE_MODES.md；Obsidian 靈感／規範／Skills 已掃過，GitHub 三個方案比較、使用者指定 Explain and Send 官方資料已查核。保留既定 daisyUI／暖黃、前輪未提交修改與舊 stash／備份。
- 右鍵新增視窗與整頁，沿用 activeTab／scripting、不新增權限；全擴充擷取節流550ms、同視窗排他。主網頁捲動拼接、DPR／最後段／重疊所有權、固定／sticky可見元素去重、Esc及finally/watchdog還原；切頁／導航／尺寸／位置變動與超限停止。64MP／32760px／128MiB／160區／3分鐘界限明示，不自動縮小或截斷。
- 新截圖只以背景記憶體Blob與一次性限定編輯頁Port分塊交接，session僅metadata，不寫磁碟或遠端。data URL本機解碼，不 fetch(data:) 或放寬CSP。讀取／斷線／逾時釋放；MV3背景重啟可能失效需重截。交接中鎖住匯入及文字框，避免換圖競爭。
- 10–400%縮放與手掌／空白鍵、原尺寸匯出；整頁不自動辨識，可框選ROI或全頁約2MP分段，共用Tesseract/Paddle Worker；停止只保留完成段落且不自動複製。維持標註與匯出並行、手動圖片剪貼簿優先、翻譯與朗讀生命週期。範圍分界、複雜版面及圖文品質仍須核對，沒有承諾OCR耗時不變或量測峰值RAM。
- npm test **158/158**、npm run check、git diff --check 通過。新增原尺寸界限／座標／覆蓋、傳輸授權／一次性／逾時、超限／改視窗／切頁還原、Paddle同worker兩圖只驗證初始化一次、手掌不寫歷史等測試。無 build／monitor script，未額外執行build。套件 allowlist 補齊根模組，未新增依賴或模型。
- 隔離 Headless Edge **29項長圖檢查**：實際渲染視窗PNG拼接1600×20000（32MP、DPR2）、頂底像素、固定元素不重複、sticky重疊不被後圖擦掉、取消／還原；可見截圖不框選／不捲動，新視窗截圖經分塊交接後會自動OCR／複製，整頁監聽器重注入會清理舊工作。1920×20000（38.4MP）生成來源真實Canvas載入、原尺寸PNG下載讀回、縮放／pan／Space與文字輸入、ROI不裁切、整頁單worker逐段、合法重複文字、剪貼簿與停止部分結果。大圖交接中匯入鎖定、深淺色／650px無全頁水平溢位，無應用程式例外。已目視畫面。
- 另跑 **48項並行回歸**（含真正封裝Tesseract）、**33項朗讀回歸**（含真正Audio與固定公開測試句Google TTS），共110項瀏覽器檢查。Chrome APIs／傳輸／OCR時序／剪貼簿／SpeechSynthesis依各腳本使用受控替身；沒有把它們當作日常Chrome或真實原生右鍵／activeTab授權的完整驗收，未重測加強／去背模型品質、人工聽驗或所有網站。沒有峰值RAM／60fps效能基準，不宣稱無限長圖或無接縫。
- QA可重跑：output/playwright/capture-1.10.0.mjs、ocr-parallel-1.10.0.mjs、ocr-speech-1.10.0.mjs；同名目錄 results.json／PNG，均為忽略檔、不在套件。測試素材、mock及本機伺服器編碼／焦點問題已修正後完整重跑，沒有放寬正式CSP。
- 本機版號1.10.0，未提交／推送／商店發布，日常Chrome未重新載入；遠端已提交狀態仍須與本機工作檔分開。

## 1.9.0 OCR 原文／譯文朗讀（2026-11-23）

- 使用者確認六項規則後，先記錄 `docs/UI_INVENTORY.md`：原文與譯文均為手動朗讀／停止、Google TTS 失敗改瀏覽器語音、自動／手動語言、0.5–2 倍語速、各框下方小按鈕與預設收合設定。沿用 daisyUI、暖黃、既有 Lucide／Feather 喇叭 SVG；版號同步 1.9.0，README／PRIVACY／模型與服務文字已更新。
- 新增 speech-session／speech-audio／speech-controls 模組，沿用既有背景 TTS_FETCH，只送文字／語言；不新增模型、權限或來源。最多 30,000 字、逐段最多 180 Unicode 字元、單一工作依序取得與播放；改字、重辨、換圖、譯文失效、停止或關閉會停止播放器並拒絕遲到音訊。已送出的當段網路請求可能完成，不再送後續段落。Google 失敗後，剩餘段落沿用瀏覽器語音，缺聲音時明確提示；朗讀不寫剪貼簿、不鎖標註。
- `npm test` **147／147** 通過，新增 8 項語音驗證／分段／時序／取消／備援／錯誤恢復測試；`npm run check`、`git diff --check` 通過。未新增 build 或 monitor。
- 隔離 Headless Edge／localhost **33 項朗讀操作檢查通過**：手動與鍵盤播放／停止、沒有自動朗讀、修改後全文／手動語言與語速、原譯文切換、停止後音訊來源與 Blob URL 釋放、遲到回覆、長文依序播放、Google 失敗備援、缺語音、譯文失效、重辨／關閉中止、剪貼簿不變、標註仍可操作、過期錯誤清除、深淺色及 320px 無水平溢出。已目視最終畫面，沒有應用程式例外。
- Chrome API／翻譯／剪貼簿與 SpeechSynthesis 使用受控替身；Google 播放採真正 HTMLAudioElement，語速與 preservesPitch 讀回正確。另以固定公開測試句 `Hello PageKit`、英文，真正呼叫既有 Google TTS 並完成 Audio 播放；未傳送使用者圖片或辨識結果。這驗證服務與播放事件，不宣稱已人工聽驗所有語言／型號發音或裝置實際音量。系統安裝的各語言語音品質未實測，瀏覽器備援未必離線。
- 另外在目前 1.9.0 程式重新執行 **48 項既有 OCR／標註並行回歸**，包含真正封裝 Tesseract Worker 辨識及標註保留，全部通過。未重測加強 OCR 或去背模型品質。
- QA 與證據：`output/playwright/ocr-speech-1.9.0.mjs`、`output/playwright/ocr-speech-1.9.0/results.json`、同資料夾的 light／dark／320px 與結果面板 PNG；並行回歸在 `output/playwright/ocr-parallel-1.9.0/`。測試產物皆為本機忽略檔案，不納入套件或當成日常安裝。
- 本輪沒有操作日常 Chrome 重新載入、提交、推送或商店發布。包含前輪未提交 1.8.4 修正；遠端版本與本機工作檔須分開看待。舊 1.8.3 草稿 stash／備份保留。需要關閉舊編輯彈窗並重新載入擴充功能，再確認實際 v1.9.0。

## 1.8.4 OCR 與標註並行（2026-11-23）

- 使用者確認五項行為後先寫入 `docs/UI_INVENTORY.md`：全部標註／樣式／一般復原重做／圖片匯出並行；手動複製圖片優先於該次 OCR 自動文字；換圖、裁切、去背與色票仍依序處理。
- 分開 OCR 與編輯器鎖定，辨識初始化、結果等待與剪貼簿處理時均可標註。重辨不再提交或取消文字／筆畫；辨識狀態、進度與操作回饋分開。來源維持乾淨工作圖，裁切歷史邊界由 editor 的 historyAllowed 保護，按鈕與鍵盤共用限制。
- 新增序列化剪貼簿寫入：手動圖片請求遞增版本，同輪遲到文字不覆蓋；已開始的自動寫入也排在後來手動圖片之前。複製失敗不阻塞後續請求，取消／關閉後的排隊結果不寫入；OCR 自動複製失敗不搶走文字標註焦點。
- `npm test` **139／139** 通過；新增 6 項有狀態／時序的回歸測試，覆蓋裁切歷史邊界、來源鎖定與剪貼簿競爭、失敗恢復、取消後不寫入。`npm run check`、`git diff --check` 通過，版號位置同步 1.8.4；沒有新增依賴、權限、模型或網路來源。
- 隔離 Headless Edge／localhost **48 項檢查通過**，實際載入現行 HTML／CSS／模組，以延遲 OCR 初始化／回傳驗證工具啟用、全部繪圖種類、文字草稿與焦點、編號刪除、樣式、一般歷史、PNG 匯出、來源像素隔離、剪貼簿保留、狀態回饋、跨裁切尺寸的歷史保護，以及成功／錯誤恢復。另以真正封裝的 Tesseract Worker 辨識出 `Parallel OCR`，並行新增編號在完成後保留。沒有應用程式例外。
- 瀏覽器測試中的 chrome API 與剪貼簿為隔離替身；不讀取日常設定檔或系統剪貼簿。沒有重測加強 OCR 模型、真實系統剪貼簿、日常 Chrome 重新載入或商店審核；不得把本機 1.8.4 工作檔當作已發布版本。
- 證據與可重跑 QA：`output/playwright/ocr-parallel-1.8.4.mjs`，報告及畫面位於 `output/playwright/ocr-parallel-1.8.4/`。初次 Edge 在沙箱內子程序啟動失敗，改以核准的隔離測試執行環境完成；測試伺服器漏提供圖示及測試 selector 寫錯均已修正並完整重跑，與正式程式無關。已目視最終工作區，沿用原外觀，未重新設計或追加修改輪次。
- 本輪未提交／推送／發布；原 1.8.3 本機草稿的備份與 stash 未變動。1.8.4 需在擴充功能管理頁重新載入並關閉舊編輯彈窗後使用。

## 1.8.3 自願贊助入口（2026-11-20）

- 使用者選定編輯器頁尾及擴充功能圖示右鍵入口，文字「請我喝杯咖啡」、顯示 US$3／杯；希望 US$1、平台不提供則保留 US$3。實際 Buy Me a Coffee 後台只列 US$3／US$5／US$10，已取消價格編輯，維持 US$3。
- `npm test`：133／133 通過；含贊助右鍵僅開固定官方頁、不注入網頁、不截圖、不清除目前 session 圖片工作的驗證。原安裝選單測試同步為 6 個項目。
- `npm run check` 與 `git diff --check` 通過；manifest／package／內容腳本同步 1.8.3，權限、CSP、OCR／去背模型與快取未改。Lucide coffee 授權另存並納入套件。
- 內建瀏覽器以現行 HTML／CSS 去除執行腳本的靜態預覽，檢視桌面與 320px 深色版；320px scrollWidth=innerWidth=320，入口與價格可讀。Enter 及滑鼠點擊均另開至 Buy Me a Coffee 官方支持頁，原預覽保留。目標 `_blank`、`noopener noreferrer` 讀回正確。此為版面及原生連結驗證，未宣稱已在日常安裝的擴充功能重測 OCR／去背／畫布或 Chrome 原生右鍵選單。
- 贊助沒有遠端 widget、付款 API、預先請求或付款資料處理；不附加網頁／圖片／OCR 內容。支持頁付款仍需訪客確認，未進行實際付款。
- 輸出套件依既有 `scripts/package-extension.ps1` allowlist，用本機 Python ZIP 封裝（此 Mac 無 pwsh），排除開發檔與選用模型，逐檔 SHA-256 比對來源；詳見 output/packages/package-report-1.8.3-support.json。
- 證據：output/support-release/tests.log、check.log、editor-desktop.jpg、editor-320px.jpg；價格選項 output/store-video-a/qc/coffee-price-options.jpg。
- 商店送審完成：已取消舊審查、上傳 1.8.3 並重新提交。後台顯示「等待審核中」「你已完成商品提交程序」；重新載入核對待審查、套件 1.8.3、原介紹影片網址保留。依使用者明確同意勾選「通過審查後自動發布」；尚未公開上架。證據與 ZIP SHA-256 見 output/support-release/submission.json 及 store-submitted.jpg。
- 贊助文字／價格依既有色票計算對比：淺色正文 14.34:1、淺色價格 4.72:1；深色正文 13.62:1、深色價格 7.18:1。深色桌面／320px 已視覺檢視，淺色屬既有色票計算，未宣稱另外完成淺色瀏覽器畫面檢查。


## 1.8.2 Ctrl+V 貼上圖片（2026-11-18）

- 使用者要求在截圖彈窗直接貼上取代圖片；新增 paste 事件，讀取當次 clipboardData 的第一張圖片檔，與檔案選擇共用 `importImage`。解碼與大小驗證完成才替換文件，清除標註／裁切歷史、去背與舊辨識／譯文，自動本機 OCR；不新增 clipboardRead、遠端圖片下載、持久儲存或背景監聽。
- `npm test` **132 項**、`npm run check`、`git diff --check` 通過。隔離 Headless Edge **18 項瀏覽器檢查通過**：用原生剪貼簿寫入 PNG 後按實際 Ctrl+V，確認 trusted paste／Files 事件、空白編輯器載入、640×360 原尺寸／透明 alpha 與真實 OCR。再對已有裁切與編號的文件貼上 300×200 新圖，舊歷史與編號清除、舊 OCR／譯文清空。
- 原生純文字貼上不替換畫布，OCR textarea 的文字貼上正常；圖片在文字框、contenteditable 或模型管理 dialog 貼上時不取代編輯文件。損壞 PNG、SVG、超過 30 MB、HTML 圖片網址用合成 ClipboardEvent 驗證拒絕／保留現有畫布；延遲解碼替身驗證處理中不啟動第二次匯入，恢復原生解碼後完成。主流程不是用合成貼上事件代替 Ctrl+V；沒有應用程式例外，既有 Tesseract 參數／解析度診斷仍可見。
- QA 腳本位於忽略的 `output/crop-evaluation/paste-check.js`。保留既定深淺色與 daisyUI，只增補操作說明；本輪不重跑未修改的模型品質矩陣，未驗證 macOS Cmd+V、日常安裝重新載入或獨立 Chrome。未提交／推送／發布；重新載入並關閉舊編輯視窗後確認 v1.8.2。

## 1.8.1 刪除按鈕警示色（2026-11-18）

- 依使用者截圖與明確指示，僅調整「刪除加強模型」、「刪除去背模型」及工具列「刪除選取」；套用既有 daisyUI `btn-error` 與主題 error 色。模型使用紅色文字／邊框，標註使用紅色 ghost；滑過／按下顯示紅色淡底，停用沿用既有不可操作／透明度。沒有改動模型管理或刪除事件。
- `npm test` 132 項、`npm run check`、`git diff --check` 通過。隔離 Headless Edge 的 21 項檢查通過：深淺色三個刪除按鈕的語意樣式與文字顏色、兩個模型按鈕邊框／文字對比至少 4.5、hover 淡紅底與停用狀態；實際編號選取、刪除及復原保持正常。模型按鈕採已安裝視覺 fixture，未安裝或刪除任何模型；未重新測試未修改的模型刪除服務。
- 深色／淺色畫面已目視，證據 `pagekit-delete-buttons-{dark,light}.png` 位於既有 visualizations 目錄；QA 腳本為忽略的 `output/crop-evaluation/delete-button-check.js`。本輪未新增鏡像單元測試，沒有 build／monitor script。日常安裝尚未重新載入，未提交／推送／發布；重新載入並關閉舊編輯視窗後確認 v1.8.1。

## 1.8.0 樣式子選單與本機裁切（2026-11-18）

- 依使用者確認的兩組五項問答，沿用 daisyUI 5.8.1、暖黃及深淺色。顏色／粗細／字級收進同一「樣式」原生 Popover，入口顯示目前值；依工具顯示有效設定，切工具不自動展開。裁切同頁 dialog 使用本機 Cropper.js 2.3.1／MIT，新增比例、矩形／圓角／正圓及七平台的 29 個固定尺寸預設；官方建議與常用範本分開標示。原始檔不覆寫，圖片不外傳，未納入 AI 擴圖或 AI App 傳送。
- `npm test` **132 項通過**，含六項裁切幾何／比例／形狀／向量轉換／遮罩及平台資料驗證；`npm run check` 與 `git diff --check` 通過。沒有 build／monitor script，不增加額外建置。
- 隔離 Headless Edge 實際載入 v1.8.0，**90 項瀏覽器檢查通過**：樣式操作 21、完整裁切操作 35、真實 Canvas 文件／歷史 13、一般動效與重開生命週期 21。樣式驗證拉桿與顏色即時摘要、分組值、字級、編號設定、點外部／Esc／Tab、Enter／Space 開啟；深淺色與 320px 浮層沒有水平溢出。一般動畫下連續八次鍵盤開關通過。
- 實際拖曳／方向鍵操作裁切框；七平台尺寸正確載入，圓形 400×400、圓角 1500×500 的透明角落與中心像素正確。真實 PNG 剪貼簿寫入與下載保持尺寸及透明度；小圖顯示放大倍率和清晰度提示。YouTube 安全框可見且不寫入匯出；非正方形圓形輸出與超過像素上限會阻擋套用。320px dialog 無水平溢出，取消不改文件、關閉返回入口，快捷鍵不操作背後畫布。
- 裁切後文字可再編輯，文字修改與裁切可各自復原；裁切復原的 PNG 與原圖／原標註完全相同，重做還原形狀與尺寸。獨立真實 Canvas 檢查多步裁切、向量縮放、後續標註遵守遮罩、無效裁切不改文件、歷史共用配方；去背以合成透明來源驗證同座標裁切與還原，未重新執行去背模型。新匯入清除舊裁切與歷史。內建 OCR 在裁切及復原後完成，未重跑未修改的加強 OCR／Google 翻譯品質矩陣。
- 測試發現快取圖片的 `$ready()` 可能早於 Cropper 自身載入／初始置中，且比例設定會於下一個 tick 重設選區；已依載入繪製順序初始化並在比例回呼後限制選區。最終程式連續重開十二次、載入中快速關閉四次沒有越界或應用例外。樣式預量測不暫時套用繼承的 visibility:hidden，避免焦點落在尚不可見的控制項；動效只過渡 opacity。完整流程於移除測試追蹤後重跑通過，既有 Tesseract 參數／解析度診斷仍可見，未觀察到新應用例外或 CSP 錯誤。
- 已目視 `pagekit-style-{light,dark,narrow}.png`、`pagekit-crop-{circle,dark,narrow}.png`，證據位於 `本機驗收截圖目錄（未納入 repository）/`；QA 腳本在忽略的 `output/crop-evaluation/`。封裝逐檔 SHA-256 與來源核對，報告為 `output/packages/package-report.json`，排除測試 profile／評估模型與選用模型權重。
- 未驗證日常安裝重新載入、獨立 Chrome／實體觸控筆或商店審核；未提交／推送／發布。重新載入 PageKit 並關閉舊編輯視窗後確認 v1.8.0，既有模型可沿用。

## 1.7.1 水平／垂直／45° 直線（2026-11-18）

- 依使用者明確指定新增「直線」，於畫筆旁沿用 daisyUI btn 與既定 Lucide 線段 SVG，不重設品牌／配色／動效；先更新 `docs/UI_INVENTORY.md` 規格。新增純幾何模組 `ocr/line-geometry.js`，端點投影到最近 45° 倍數，支援正反八方向。沿吸附方向限縮於原圖邊界，保持角度；不影響其他工具角度。直線共用一般線寬／顏色，不顯示畫筆圓圈；只點一下不畫圓點，Esc／pointercancel 取消。
- `npm test` **126 項通過**（新增 5 項八方向、邊界、原圖座標、取消、復原／重做與無箭頭繪製測試）；`npm run check`、`git diff --check` 通過。無 build／monitor script，未額外建置；沒有新增權限、依賴或網路服務。
- 隔離 Headless Edge 正式編輯器 **49 項檢查通過**：實際鼠標拖曳八方向，canvas 紅色像素包圍盒符合水平／垂直／45°；預覽與放開 PNG 完全一致，每筆一次復原可回原圖。Esc／原地點擊無新增筆畫、重做與線寬變更保留舊筆畫。真實剪貼簿 PNG 與目前 canvas 完全一致、保持 1600×900；PNG 下載成功；色票仍使用原圖，不含直線。兩個近邊界例含圓頭裁切容差，精確端點角度另由單元測試核對。
- 既有六工具可切換，直線粗細拉桿 Home／End 達 1／30px；深色桌面與 320px 窄視窗已目視，新增第七工具後無水平溢出。真實內建 OCR 成功；未重測本輪未改動的加強 OCR／去背模型、Google 翻譯、日常瀏覽器重新載入或獨立 Chrome／實體觸控筆。未觀察應用例外／新增 CSP 錯誤，原有 Tesseract 模型參數診斷與測試用 Canvas readback 提示仍可見。
- QA 腳本在忽略的 `output/line-evaluation/ui-check.js`；畫面 `本機驗收截圖目錄（未納入 repository）/pagekit-line-{dark,narrow}.png`。上架包逐檔 SHA-256／大小見 `output/packages/package-report.json`，未提交／推送／發布。重新載入 PageKit 並關閉舊編輯彈窗後確認 v1.7.1。

## 1.7.0 本機色票分析與粗細拉桿（2026-11-18）

- 使用者確認的五項色票設定、5 色預設／3／5／8／12 切換，以及兩組粗細範圍先寫入 `docs/PALETTE_ANALYSIS.md`。沿用既定 daisyUI 5.8.1 與暖黃／深淺色，補官方 range CSS；本機封裝固定 Color Thief 3.5.0 browser module、MIT 授權、tarball integrity 與 SHA-256，不加權限、CDN、模型或一般安裝 build。
- 色票只讀乾淨的 `image` canvas；取樣上限 65,536 pixels，以 Worker 分析、alpha 加權歸類占比，包含黑白灰。完全透明圖顯示空結果；近似色合併／空群組省略，結果可能不足選定數量。切色數、關閉、換圖與 pagehide 中止工作，延遲回覆以 generation 忽略。只有點色塊才寫 HEX，不讀取剪貼簿。
- 粗細改原生 input[type=range] 搭配官方 daisyUI range：一般 1–30px（3）、螢光筆 8–60px（20）、step 1；本次值分組保存，匯入後仍保留，文字／編號隱藏拉桿。已完成筆畫與原圖不受新值影響，指標與繪製共用螢光筆寬度。
- **68 項隔離 Headless Edge 瀏覽器檢查通過**（55 項完整操作／筆畫／版面＋13 項離線／失敗／取消）：真實模組 Worker 擷取已知五色，取樣占比與 30／25／20／15／10% 符合 0.5 百分點容差；含紅色標註後色票仍完全一致。另一張 12 色圖在離線下保留全部 12 色，所有色數模式無 HTTP 請求。深淺色與 320px／12 色垂直捲動無水平溢出、Tab／Shift+Tab 循環與 Esc 返回入口、modal 快捷鍵不操作背後標註。
- 原始 canvas 像素量測畫筆 1／3／30px、螢光筆 8／20／60px，換算畫面後筆畫厚度與指標一致（抗鋸齒容差 1.4px）；每次復原回原圖。真實滑鼠拖拉、Home／End／ArrowRight、工具切換分組值、換圖保留、文字／編號隱藏控制均通過。含標註的 PNG 真實剪貼簿寫入及下載皆成功、保持 1600×900 原尺寸。真實內建 OCR 完成、模型管理可開，OCR 翻譯與設定控制項仍保留。
- Worker 失敗、延遲回覆及剪貼簿拒絕以 API stub 模擬；確認關閉會 terminate 並忽略舊回覆、錯誤不顯示舊結果、恢復原生 Worker 可重試、複製失敗仍可手動選 HEX。分析與成功複製使用原生 API。未操作使用者日常瀏覽器、未重測本輪未修改的加強 OCR／去背模型與 Google 翻譯品質矩陣，也未宣稱 Chrome 實機、實體觸控筆或跨螢幕 DPI 已驗證。
- `npm test` **121 項通過**（新增 9 項色票／透明度／占比／取樣／筆寬測試），`npm run check` 與 `git diff --check` 通過；沒有 monitor／build script，未額外建置。未觀察到應用例外或新增 CSP 錯誤；原有 Tesseract `Parameter not found`／`Estimating resolution` 診斷與測試用 Canvas readback 提示仍可見。
- 測試設定使用隔離持久 profile，避免 CLI 預設 context 封鎖擴充功能頁。早期 QA 對取樣占比要求零誤差、對聚類色數要求湊滿，以及未等待原生 close／Worker 啟動事件，已修正測試預期與等待條件；55 項完整流程於最終程式碼重跑通過。未掩蓋應用錯誤。
- 腳本在忽略的 `output/palette-evaluation/`；畫面為 `本機驗收截圖目錄（未納入 repository）/pagekit-palette-{light,dark,narrow}.png` 及 `pagekit-width-slider.png`，已目視確認。封裝排除開發模型／profile／測試，逐檔 SHA-256 與大小見 `output/packages/package-report.json`。未提交／推送／發布；請重新載入擴充功能並關閉舊編輯視窗後確認 v1.7.0。

## 1.6.2 畫筆／螢光筆空心圓指標（2026-11-18）

- 依使用者明確指示，只改畫筆與螢光筆指標；事前設定見 `docs/UI_INVENTORY.md`。共用 `strokeWidth` 保留既有畫筆 2／3／6 CSS px、螢光筆固定 20 CSS px 的繪圖規則。空心黑白細輪廓 SVG 放於 canvas 外，以原圖 draft 筆寬及當下顯示比例對應圓徑；其他工具維持十字、文字／移動指標。
- 指標無填色、無跟隨動畫，原生滑鼠箭頭僅在圓圈顯示時隱藏；離開畫布、觸控、停用、失焦、被 dialog 遮住時隱藏。觀察 canvas resize、捲動及焦點以更新位置。換圖與關閉清理 SVG／事件；同時移除舊 AnnotationEditor 指標事件，避免多次匯入後舊繪圖 listener 殘留。
- 隔離 Headless Edge 的正式編輯器 **30 項操作檢查通過**：26 項尺寸／繪圖／生命週期＋4 項深色／窄視窗。畫筆 2／3／6px 的圓徑、圓心與 cursor:none 正確；在原始 canvas 中量測實際畫筆／螢光筆筆畫厚度，換算回畫面後與 6／20px 指標相符（含抗鋸齒容差）。
- 繪製途中調整視窗，圓徑隨目前 draft 原圖筆寬與新顯示比例更新；放開後恢復下一筆設定的大小。不移動滑鼠時改線寬也能更新。其他四工具指標保留；管理開啟、觸控、失焦、OCR 忙碌時隱藏，完成後恢復。連續匯入只留一個指標覆層，畫一筆後一次復原即回到未標註圖片。
- 白色與深色圖上移動指標前後 canvas.toDataURL 完全相同，SVG 兩圈 fill=none；指標不屬圖片像素，不會被既有 PNG／剪貼簿 canvas 匯出或原圖 OCR 讀入。390／320px 視窗沒有水平溢出，螢光筆圓圈仍為實際 20px。已目視 `pagekit-cursor-pen.png`／`pagekit-cursor-highlight.png` 的原比例筆畫與空心圓對比，以及 `pagekit-cursor-dark.png`。
- 早期測試以輪詢等待非常短的 OCR 進度可見，錯過狀態而逾時；已改用 MutationObserver 記錄真實忙碌期間的隱藏狀態，完整重跑 26 項通過。沒有隱藏應用例外；既有 Tesseract 模型參數警告及測試用 Canvas readback 提示仍可見。
- `npm test` 112 項、`npm run check`、`git diff --check` 通過。新增一個本機幾何指標模組，沒有新權限、模型、外部程式或 build／monitor script。套件與逐檔雜湊詳見 `output/packages/package-report.json`，可選模型／測試仍排除。
- 畫面證據位於 `本機驗收截圖目錄（未納入 repository）/`，QA 腳本於忽略的 `output/brush-cursor-evaluation/`。觸控與 blur 使用事件模擬；未驗證實體觸控筆、不同 OS 游標設定／跨螢幕 DPI、獨立 Chrome 或日常安裝重新載入。未重跑未修改的翻譯／去背模型品質矩陣，既有測試保留；未提交／推送／發布。請重新載入並關閉舊編輯視窗後確認 v1.6.2。

## 1.6.1 集中模型與服務管理（2026-11-18）

- 依使用者確認的集中方案實作；設計與行為已先寫入 `docs/UI_INVENTORY.md`。頁首單一「模型與服務管理」開啟同頁原生 dialog／daisyUI modal，四張卡片分別為內建 OCR、加強 OCR、去背模型、Google 線上翻譯。原左右管理折疊移除，下載／取消／刪除的原 DOM ID 與事件保留，不改快取鍵、模型檔、雜湊、來源權限或背景下載服務。
- daisyUI 維持 5.8.1，只追加固定官方 modal 預編譯 CSS，更新來源與 SHA-256；沒有遠端 UI 程式、UI JS 套件或 build。缺模型時導向對應下載；關閉管理不停止下載，頁首提示下載中，可重新開啟查看進度／取消。關閉整個編輯視窗維持既有中止規則。
- 隔離 Headless Edge 實際載入 v1.6.1，**42 項瀏覽器檢查通過**：27 項管理介面／流程＋15 項真實模型回歸。確認單一入口、四種分類、內建／線上服務沒有安裝刪除按鈕、正確大小、兩種缺模型導引、深淺色、390／320px 邊界及鍵盤／關閉行為。
- 發現 daisyUI 的可見性過渡會讓開啟焦點停留背景，且原生 Tab 在邊界可移到瀏覽器工具列；已限定管理容器的可見性與 opacity 過渡、於首個開啟 layout 設焦點、補齊 Tab 首尾循環與關閉後返回焦點。完整 27 項重跑通過。Esc／關閉鈕／點背景可關閉，Delete／Ctrl+Z／Esc 不會改背後標註或取消選取。
- 下載 UI 採 permission／Port 服務替身測拒絕、等待同意時取消、遲到同意不啟動、進度、取消、失敗可重試與完成後狀態。實際關閉管理時 Port 未斷線，重開進度保持，頁首下載提示正確；替身只驗證 UI 狀態／連線生命週期，不宣稱重新下載了實際模型或通過原生允許提示。既有服務層取消／大小／SHA-256／跨視窗鎖定測試保留。
- 真實模型以原格式種入獨立測試設定檔：加強 OCR 與去背都可直接讀取既有資料，不需轉換或遷移。內建／加強 OCR 均辨識出 `Need help?`，Google 手動翻譯成功；開關管理保留畫布、原文與譯文。正式去背 Worker 仍產生透明 alpha 並保留編號，還原後 canvas 完全相同；處理中管理的刪除／下載按鈕維持鎖定。
- 統一入口真實刪除驗證：先刪去背，IndexedDB 狀態為 OCR=true／去背=false；恢復去背測試快取後刪 OCR，狀態為 OCR=false／去背=true，且引擎切回 standard、自動重辨與標註仍正常。操作只影響隔離設定檔，未碰日常使用者模型。
- `npm test` **112 項**、`npm run check`、`git diff --check` 通過；本輪新增介面以瀏覽器實測，未增加鏡像元件測試。無 monitor／build script，不執行額外 build。ZIP **74 檔、17.51 MiB**，每項 SHA-256 與來源一致，含管理模組／官方 CSS／授權，排除 output 與可選模型；見 `output/packages/package-report.json`。
- 已目視管理視窗與工作區，證據在 `本機驗收截圖目錄（未納入 repository）/pagekit-model-services-installed-{light,dark}.png`、`pagekit-model-services-narrow.png`、`pagekit-model-services-workspace.png`。QA 腳本在忽略的 `output/model-services-evaluation/`。既有 Tesseract 模型參數診斷仍可見；沒有觀察到新應用例外或 CSP 錯誤。
- 本輪未重新驗證真實模型網路下載、原生首次來源允許提示、日常瀏覽器重新載入、獨立 Chrome 或商店審核；不改既有已測下載實作。未提交／推送／發布。請重新載入擴充功能、關閉舊編輯彈窗後確認 v1.6.1；現有模型可沿用。

## 1.6.0 OCR 結果手動翻譯（2026-11-18）

- 五項使用者回答及規格在 `docs/OCR_TRANSLATION.md`：手動翻譯完整結果框（含修改）、預設繁中／更多語言、原文下方譯文、明確按鈕複製、沿用 Google。實作十五種白名單語言，沿用 daisyUI／配色，不另開視窗或頁籤，不改既有 OCR、去背模型與選取翻譯方向。
- 新專用 Port 僅接受自己編輯頁；背景固定 Google 端點、來源自動偵測、選定目標、不帶 Cookie。上限 30,000 UTF-16 字元；以 URL 編碼長度分段、保留 surrogate pair、空白及換行，全部成功後才提交。每段 15 秒、整體 90 秒。原文／語言變更、重辨、匯入與關閉時取消；無新權限、外部依賴或 build。
- `npm test` **112 項**、`npm run check`、`git diff --check` 通過。新增七項測試覆蓋非法內容／語言／長度／Unicode、完整分段、目標與來源、失敗／取消不回部分結果、Port 來源隔離、重複啟動／斷線及終態；原有網頁選取翻譯與 TTS 測試保留。
- 隔離 Headless Edge 真實 MV3 v1.6.0 **24 項操作檢查通過**：16 項實際服務與 UI＋8 項過期請求／長文／重辨。合成圖片經真正 Tesseract 自動取得 `Need help?` 與 `Get in touch with our experts.`，OCR 完成後 Google 翻譯請求數為 0；手動點擊才呼叫真實 Google 翻譯為繁中。手動將原文改為兩行英文後選日文，傳出的完整文字、sl=auto、tl=ja、credentials=omit 均核對，得到真實日文結果。
- 真實翻譯沒有呼叫 clipboard.writeText；明確點「複製譯文」才以本次譯文寫入。測試只記錄本次寫入參數並呼叫真正寫入 API，沒有讀剪貼簿。翻譯前後原圖 canvas 完全相同；斷網保留原文／剪貼簿並可重試。譯文位於原文下方，淺／深色、390／320px 沒有水平溢出，新增 btn／select／textarea 均用 daisyUI。
- 延遲服務替身驗證編輯原文／切換語言會透過 Port 斷線實際觸發背景 fetch 的 AbortSignal，遲到結果不顯示；不會自動重翻。長文服務替身分五段回傳，完整保留中文、英文、emoji、空白與換行；沒有再寫剪貼簿。超過上限不發請求、不截斷。長文測試檢查分段／重組，不代表大篇幅真實服務的品質或吞吐驗證。
- 重新 OCR 正確清除舊譯文，內建自動辨識與複製原文保留。測試中初次沒有展開辨識設定、以及未等待 300ms 重辨排程造成等待／斷言失敗，已改用真實展開操作並等譯文失效及辨識結束，再完整重跑八項通過；不是隱藏產品錯誤。
- 套件 **73 檔、17.51 MiB**，ZIP 每項 SHA-256 與來源一致，含兩個新 OCR 翻譯模組；排除測試、output 及可選模型。套件報告 `output/packages/package-report.json`；瀏覽器 QA 腳本於忽略的 `output/translation-evaluation/`。本專案沒有 monitor 或 build script，未新增假檢查。
- 已目視實際畫面：`本機驗收截圖目錄（未納入 repository）/pagekit-ocr-translation-{light,dark,narrow}.png`。既有 Tesseract 模型參數診斷仍可見，未觀察到應用例外或 CSP 錯誤。
- 未實測其餘十三種語言的真實翻譯品質、獨立 Chrome、Google 服務長期可用性或日常瀏覽器重新載入。沒有重跑去背品質／模型下載全矩陣（相關程式未改）；沒有提交／推送／發布。使用者須重新載入擴充功能並關閉舊編輯彈窗，才會看到 v1.6.0。

## 1.5.0 本機去背與圖片匯入（2026-11-18）

- 依六項使用者回答實作商品／人物、截圖／圖片右鍵／本機匯入、全程本機、模型按需下載可刪、透明 PNG 複製／下載、自動預覽／還原。問答及比較在 `docs/BACKGROUND_REMOVAL.md`；維持 daisyUI 與既定暖黃風格，不引入新 UI Kit。
- 使用 MIT 的 BiRefNet Lite Web 512，固定 revision `f01535dcce4c28a8688ee631ca15719b779b3f86`、101,066,931 bytes、SHA-256 `20e3fb3e7bbb75e0b4f152759413a6ab19a599a1c2e1db7ce7741792eaf639fb`。模型來自 Hugging Face，自選下載後獨立存於 `pagekit-cutout-models`；只增加 Hugging Face 與固定 CDN 的選用來源權限。ONNX Runtime 1.31.1 的 53KB WASM JS 入口本機封裝，重用既有 OCR WASM；沒有遠端程式或新 build。
- 正式 `downloadCutout` 下載函式實際對固定模型網址發出 HTTPS GET，完整取得檔案且通過雜湊，約 10.4 秒；此測試在 Node，驗證保存前的資料與進度，不代表原生權限允許已驗收。下載證據：`output/bg-evaluation/download-check.json`。測試模型僅保留於忽略的 output／隔離瀏覽器，沒有安裝至日常設定檔。
- 隔離 Headless Edge 實際 MV3 頁面與 Dedicated Worker／WASM，在 `connect-src 'self'` 下完成去背。合成圖初測背景 alpha 0、主體 alpha 255，約 12.2 秒。商品與人物使用 rembg 專案的 `examples/car-1.jpg`、`girl-1.jpg` 作評估，不重新分發或納入 ZIP，不代表普遍品質保證。
- **36 項瀏覽器檢查通過**（13 商品／匯出＋9 人物／邊界＋10 OCR／模型回歸＋4 最終控制）：商品照片 480×360 與人物 600×399 均移除背景、保留前景及原尺寸；人物身體取樣 alpha 255、背景 0。兩者斷網可去背，商品推論期間外部 HTTP 請求為 0。已目視去背邊緣、淺色／深色及 390／320px 窄視窗，沒有水平溢出。
- 實際 `navigator.clipboard.write` 寫入 image/png；只檢查本次寫入的 Blob、不讀剪貼簿，alpha 及尺寸保持。實際下載 PNG 並重新解碼，背景 alpha 仍為 0、480×360；棋盤不在匯出圖片。取消推論不改畫布；去背／還原保留既有編號，還原後可復原標註。匯入透明 PNG 保留 alpha，壞掉的 PNG 不覆蓋目前圖片。
- 截圖 job 使用與圖片右鍵相同的 session／target 結構種入合成圖，正確裁為 600×400；內建及加強 OCR 均取得 `ORIGINAL OCR`。去背保留 OCR 結果，程式繼續從原始 image canvas 重辨，未把去背底圖或標註送入 OCR。刪除去背模型後 OCR 模型仍存在且可正常辨識；沒有混用資料庫或清除兩種模型。
- 缺模型導引、刪除、拒絕來源權限、等待權限期間取消且遲到同意不啟動下載、OCR 下載期間跨工具鎖定／取消後解鎖通過。拒絕與等待同意使用測試頁內的 permission API 替身，沒有自動允許原生提示。服務層下載大小／雜湊／取消／失敗、獨立路由／權限與刪除隔離有 Node 測試；原生允許提示與下載成功的完整 UI→權限→背景→保存流程仍未完整實測。
- `npm test` **105 項**、`npm run check`、`git diff --check` 通過；無 monitor／build script。1.5.0 ZIP **71 檔、17.50 MiB**，所有 ZIP 項目 SHA-256 與來源一致，排除 output、測試、可選 OCR／去背權重。詳見 `output/packages/package-report.json`。
- 最終畫面證據在 `本機驗收截圖目錄（未納入 repository）/pagekit-cutout-product.png`、`pagekit-cutout-portrait-dark.png`、`pagekit-cutout-narrow.png`。既有 Tesseract 模型參數診斷與測試用 Canvas readback 提示仍可見；沒有觀察到新去背 CSP 或應用例外。
- 未重新操作日常瀏覽器、原生圖片右鍵選單、首次下載允許提示、獨立 Chrome 或商店審核；入口有既有背景測試，工具列匯入入口新增 Node 檢查。細髮、玻璃、多主體及低對比圖片仍須核對，沒有手動遮罩筆刷。未提交、推送、發布；更新需重新載入擴充功能與網頁，新模型需使用者自行選擇下載。

## 1.4.1 全介面盤點與補齊（2026-11-18）

- 前輪主要驗證截圖編輯頁，沒有完整涵蓋文字浮窗及網頁內工具。這次逐一盤點所有自訂 UI，補齊文字編輯 card／textarea、翻譯 card／badge／btn、選字 join／alert、框選提示 card／btn，抽出共用 `ocr/ui-theme.css`。背景只讀固定本機 CSS，不增加權限或 web_accessible_resources；載入失敗保留備援樣式、後續可重試。
- 完整設計設定、介面清單與原生介面例外見 `docs/UI_INVENTORY.md`，AGENTS.md 只記硬限制與文件入口。沿用使用者選定的 daisyUI／暖黃色與既有字體，不推定未回答的 TA 或品牌偏好。
- 隔離 Headless Edge 載入實際 MV3 1.4.1、新建測試設定檔，共 **50 項**通過：28 項編輯器＋22 項網頁工具。編輯器含六種標註、編號刪除／復原／重做、文字完成／取消／換行／IME／Esc、14px 可讀主題文字、單一焦點框、白色標註設定、深淺色、320／390px 邊界、表單元件與 details 鍵盤操作。標註後 OCR 結果不變。
- 網頁工具用刻意污染 button／textarea 的合成測試頁，驗證 Shadow DOM 樣式隔離、選字工具 ArrowDown 焦點、Google Translate 真實成功回覆、原文複製成功回饋、朗讀開始／再次點擊停止狀態、深淺色與 reduced-motion、320px 翻譯卡片邊界、斷網錯誤及關閉恢復。未驗證喇叭聲音品質。發現並修正選字觸發鈕點擊未聚焦、keyup 排程重建工具導致焦點遺失。
- 框選使用正式 content／背景流程，將合成截圖種入獨立測試 session；取消按鈕／Esc、範圍太小、交接失效錯誤、成功裁切並開啟真實編輯彈窗均通過，裁切為 440×250。未操作日常瀏覽器右鍵或讀取使用者頁面圖片。
- `npm test` **98 項**、`npm run check`、`git diff --check` 通過。沒有 monitor 或 build script，不另執行不存在的指令。套件 **61 檔、17.47 MiB**，逐項 SHA-256 與來源相符，包含共用主題／背景載入器／授權，排除測試及可選模型；報告見 `output/packages/package-report.json`。
- 已目視新版文字浮窗、翻譯浮窗與框選提示。截圖在 `本機驗收截圖目錄（未納入 repository）/pagekit-text-editor-{dark,light}.png`、`pagekit-translation-{dark,light}.png`、`pagekit-selection-tool.png`、`pagekit-capture-tool.png`。測試頁 favicon 404 與 Tesseract 原有診斷不屬應用錯誤。
- 原生權限／另存視窗、色盤、右鍵選單外觀與快捷鍵設定頁由瀏覽器提供，不能套用 daisyUI。模型下載進度／取消／錯誤沿用 Node 回歸及前輪紀錄，本輪未重新下載模型，也未重測加強 OCR 準確率、首次授權允許、所有網站或獨立 Chrome。沒有提交／推送／發布，日常安裝尚需重新載入 1.4.1 並重新整理網頁。

## 1.4.0 daisyUI 截圖編輯彈窗（2026-11-18）

- 本機封裝 daisyUI 5.8.1 官方預編譯 CSS，保留 MIT 授權、npm SHA-512 與產出 SHA-256；`npm run check` 核對 UI 資源且拒絕外部 CSS 匯入。未加入 Tailwind 瀏覽器執行器、UI JavaScript、遠端字型、權限或一般安裝 build。
- 新版畫面：頂部品牌／匯出與六種標註工具，左側完整圖片預覽、右側 OCR 結果；辨識設定、模型管理及說明使用可鍵盤操作的原生 details 預設收合。缺少加強模型時自動展開模型管理並聚焦下載。原有 OCR 原圖輸入及標註資料結構未改。
- 測試環境：Browser plugin not available，依 Playwright skill 使用隔離 Headless Edge、獨立測試設定檔，直接載入 `chrome-extension://cnghcoibgjldffcaaabhinindhdekpok/ocr/ocr.html`。桌面 1440×900／1200×820，另測 768×900、390×844、320×780；同時檢查系統深淺色與 reduced-motion。設計概念及最新實作截圖皆以 view_image 目視比對；保留既有品牌圖示，概念圖的未實作快捷鍵未引入產品。
- 39 項主要瀏覽器檢查通過：頁面身份／非空畫面、六種標註、任意位置文字輸入與拖曳、編號新增／Delete／復原／重做、原圖 OCR 隔離、PNG 下載、實際剪貼簿 image/png 與文字寫入、手動修改／複製、設定重辨、加強 OCR 斷網自動辨識與複製、引擎切換保留標註、低可信度候選開關、模型刪除／缺少模型導引／拒絕授權、空白與錯誤狀態、響應式及深色模式。UI 與 OCR 驗證期間沒有外部 HTTP 請求。
- 額外檢查直式 600×1100 圖片：完整預覽、390px 窄視窗邊緣文字輸入及 Enter 收合設定通過；從實際下載串流讀取 PNG 簽章／IHDR，匯出仍為 600×1100，未被顯示縮放改變。文字與圖片剪貼簿測試只攔截記錄寫入參數並呼叫真正寫入 API，沒有讀取剪貼簿。
- `npm test` 95 項、`npm run check`、`git diff --check` 通過；只新增兩項圖片顯示比例／無效尺寸測試。套件 58 檔、約 17.47 MiB，ZIP 每一項 SHA-256 與來源一致，包含 UI CSS／授權，不包含評估模型或 npm 依賴。報告見 `output/packages/package-report.json`。
- 沒有應用程式例外、框架錯誤遮罩或 CSP 錯誤；Tesseract 原有模型的 `Parameter not found` 警告及 `Estimating resolution` 診斷仍輸出到 stderr，已與應用錯誤區分，辨識成功。三份最新外觀證據位於 `本機驗收截圖目錄（未納入 repository）/pagekit-ui-{desktop,narrow,dark}.png`。
- 工作以 storage.session 種入測試截圖，模型快取只寫入隔離設定檔，未變更日常安裝。首次下載來源授權的拒絕使用模擬回覆，原生允許提示、日常右鍵／快捷鍵、獨立 Chrome、商店審核及使用者日常瀏覽器重新載入未驗證；相關背景入口維持既有 Node 測試。未提交、推送或發布。

## 1.3.1 圖示誤辨低可信度短字（2026-11-18）

- 使用回報附圖的圖片區域重建 761 × 521 輸入並跑正式 Paddle worker；截圖縮放重建後，遙控器圖示被辨為 `l`（0.3657），磁鐵內另出現極小 `1`（0.2820），八行正文均在 0.978 以上。回報畫面顯示 `la`，不能把重建結果視為原始未縮放圖片的完全重現。
- `paddle-result.js` 預設略過有可靠正文背景、孤立且幾何形狀符合圖案的極低分短候選；保留同行短詞／單位、正常大小數字、中文、長詞與可信短字。無足夠正文時不過濾，且不依 `la` 等特定字串判斷。UI 提示數量，提供「顯示低可信度候選」還原，仍可能誤略過真實短字。
- 隔離 Edge 的實際編輯頁驗證：預設僅輸出 Magnetic、Attachment、Dongle Free、Installation、Tilt and Pressure、Sensitivity、Remote、Presentation 八行；勾選後還原 `1`、`l`，取消勾選再移除。三次結果均與送往實際 `clipboard.writeText` 的字串一致，狀態顯示自動複製成功；沒有讀取剪貼簿。
- 原始模型輸出回歸資料：`test/fixtures/paddle-icon-noise.json`；瀏覽器證據：`output/ocr-evaluation/noise-baseline-result.json`、`noise-ui-result.json`。原圖與裁切圖只保留於忽略的 output，不納入套件或提交。
- `npm test` 93 項、`npm run check`、`git diff --check` 通過；六項新增測試包含真實模型結果、不同短字、同行單位／編號、高分與中文保留、缺少正文及還原／雙欄。既有八張模型輸出回放有七張未略過任何候選；海報另外移除圖示上的極小低分 `2`，其餘結果不變，沒有以字典校正內容。回放證據：`output/ocr-evaluation/noise-corpus-check.json`。
- 1.3.1 ZIP 約 17.45 MiB，逐檔雜湊比對通過；未加入新模型、外部依賴、權限或 build。詳見 `output/packages/package-report.json`。
- 版號同步為 1.3.1；加強模型資料／快取識別與執行資源未改，不需重下載模型。日常瀏覽器重新載入、原始未縮放圖、多種網站的普遍準確度及商店審核未驗證；未提交／推送。

## 1.3.0 可選模型下載與加強 OCR（2026-11-17）

- 預設 Tesseract 保留；新增 PP-OCRv6 Small 的進度、取消、SHA-256／大小驗證、兩檔原子保存、引擎偏好與刪除。下載僅為固定模型 GET，不傳送圖片；程式和 WASM 隨套件封裝。OpenCV 四個動態綁定產生器改為靜態閉包，無 unsafe-eval。
- `npm test` 87 項、`npm run check`、`git diff --check` 通過。新增測試涵蓋錯誤雜湊、截斷／超長、第二檔失敗、取消、未授權來源、重複下載、多視窗刪除鎖定、斷線中止、偏好與座標閱讀順序。只重建必要第三方執行資源，未新增一般應用 build。
- 隔離 Edge 載入實際 MV3 v1.3.0，使用封裝程式和 WASM＋本機模型快取，在瀏覽器斷網狀態下對 18 px／12 px 繁中英文、Support 清單、斜體中文共四張圖片，自動辨識且自動複製成功。18 px 保留「開發者」、Jason Wang、PD5520、500 nits、Anti-Glare；12 px 仍有「圖／周」、「傳／傅」等誤字，Support 的 `Setting.product data` 仍需核對，不宣稱所有圖片都更準。
- 實際透過正式 `downloadModels` 函式向兩個官方 HTTPS 網址下載共 31,211,520 bytes，驗證雜湊後成功寫入 IndexedDB。此網路測試使用隔離擴充功能測試頁（不進 ZIP），獨立驗證資料下載及儲存，不代表原生權限提示已驗收。測試產物：`output/ocr-evaluation/download-network-result.json`。
- 編輯頁 UI 以模擬權限回覆驗證拒絕、等待同意期間取消及遲到同意，不開始下載、不切換引擎。正常瀏覽器的首次來源授權提示仍需使用者手動允許，未自動操作或繞過。背景服務的未授權拒絕、核准後進度／完成流程與多視窗狀態另由單元測試驗證。
- 刪除按鈕實際清空模型資料庫、偏好切回 standard；既有圖片仍在，內建引擎接手。離線 UI 證據：`extension-ui-result.json`；worker／CSP：`extension-paddle-result.json`；權限取消：`model-controls-result.json`，均位於 `output/ocr-evaluation/`。測試模型種入只發生在隔離設定檔，不是日常瀏覽器安裝。
- `scripts/package-extension.ps1` 以明確清單打包並逐檔比對 ZIP SHA-256。初次 1.3.0 套件 53 檔、約 17.45 MiB，排除 output、node_modules、Git、測試、未使用圖示及所有可選模型 tar／onnx；約 31.2 MB 模型獨立下載。最終檔名及雜湊見 `output/packages/package-report.json`。
- 未操作日常瀏覽器重新載入、未提交／推送／上架，亦未宣稱通過商店審核。使用者需關閉舊彈窗，在擴充功能管理頁重新載入後確認 v1.3.0；模型為自選下載。

## 1.2.13 網頁清單漏字、圓點與連結底線（2026-11-17）

- 使用最新使用者附件左側可見圖片區域 630 × 698 px，以及由同區域縮至 308 × 341 px 的版本驗證；附件未提供原始 308 × 362 圖檔，未將縮圖宣稱為原始擷取像素。兩者均包含畫面可見的八行文字。
- 原本整頁 PSM 3 會把圓點辨成引號、星號或其他符號，藍色連結底線造成字距／字元錯誤；單一頁面底色處理也無法兼顧白底文字與深色按鈕。
- 新增 `ocr/text-layout.js`。只有找到至少四行、行距明顯、對齊圓點或實色按鈕，且沒有未覆蓋的大型圖片時，才走清單逐行處理；寬行距的一般段落維持整頁辨識。既有雙欄及比較圖仍優先使用原流程。
- 圓點依像素的大小、形狀、位置與間距獨立處理；每行各自判斷底色、放大一次，深色按鈕反相後以 Otsu 分開背景與文字。藍色連結產生保留下降筆畫的去底線候選，只有 OCR 分數改善才採用；不硬編碼 Support、Customizations 等字詞，也不直接將辨識字串中的底線改成空格。
- 隔離 Edge 實際載入 v1.2.13；繁中＋英文預設自動辨識、勾選 2 倍、純英文，均讀出以下完整結果，兩種尺寸測試通過：

```text
Support
• Set up guide
• Setting product data
• Feed generation options
• Customizations
• Feature requests
Troubleshooting info
Open support ticket
```

- 原始 canvas 在辨識前後完全相同；結果與自動複製呼叫內容一致，剪貼簿使用測試替身，未讀寫系統剪貼簿。離線選項切換成功，外部 HTTP/HTTPS 請求為 0；既有模型參數相容警告保留。
- 回歸雙欄圖文標題／說明／細字註腳、斜體中文 `開發者: devenzi`，及比較圖四個主要標籤均通過。新增段落不誤判、清單／照片排除、邊緣直線、圓點與句點區別、底線／下降筆畫、按鈕灰底分離測試。
- `npm test` 79 項通過；`npm run check`、`git diff --check` 通過，無 build 步驟。未操作日常瀏覽器重新載入、未重測原生右鍵入口、未提交或推送。需關閉舊彈窗，重新載入頁匣 PageKit 後再擷取，確認頁首 v1.2.13。不同字型、低解析度與複雜版面仍需核對。

## 1.2.12 頁匣 PageKit 更名（2026-11-17）

- 顯示名稱統一為「頁匣 PageKit」，套件名稱為 `pagekit`，同步 manifest、工具列標題、選取翻譯按鈕提示、截圖編輯彈窗、Console 前綴、PNG 下載檔名、README、AGENTS、隱私說明及圖示設計文件。
- 正式圖示與 SVG 母稿改用 `pagekit-*`／`pagekit.svg` 檔名，更新 manifest、編輯彈窗與重建腳本；重新輸出全部尺寸並通過 PNG 格式／尺寸檢查。原有翻譯／OCR 功能、權限與封裝模型保留。
- 保留本地安裝目錄及 GitHub repository 原網址；舊分頁用的內部狀態與 iframe 座標通道維持相容，翻譯注入版本更新為 `1.2.12-pagekit`。
- 隔離 Edge 真實載入 v1.2.12，讀回 manifest 名稱「頁匣 PageKit」、標題「截圖編輯 · 頁匣 PageKit」、頁首「頁匣 PageKit v1.2.12」，新路徑圖示成功載入。實際點「下載 PNG」，下載檔名為 `pagekit-<時間戳>.png`；390 px 寬度沒有水平溢出。
- 比較圖載入後仍自動辨識到 `Normal panel`、`AG Neovo panel`、`500 nits` 及 `Anti-Glare`。剪貼簿沿用測試替身，未讀寫系統剪貼簿。已檢視新版彈窗截圖，未隱藏既有模型參數相容警告。
- `npm test` 72 項通過；`npm run check`、`git diff --check` 通過。未操作使用者日常瀏覽器重新載入，未提交或推送；需重新載入既有擴充功能並關閉舊彈窗，才會顯示新版名稱。

## 1.2.11 比較圖誤字與圖示小字（2026-11-17）

- 同版圖示調整：SVG 母稿改為四角截圖框與交錯「文／A」，以既有 renderer 重建 16／32／48／128 px 及 1024 px 母圖。已檢視 128 px 與各尺寸在淺／深底上的像素預覽；manifest 工具列與管理頁、編輯彈窗均引用更新後路徑。文字已轉為向量路徑，不需使用者電腦字型。未重新載入日常瀏覽器圖示快取。
- 以使用者最新比較圖的圖片區域 948 × 499 px 重現：原流程將燈具／圖案辨成「人」與引號、波浪符號，並漏掉圓形圖示中的 `500 nits`、`Anti-Glare`。未修改測試圖片或加入這些標籤的詞庫替換。
- 新增淺底大型圖案偵測與「圖示／比較圖」版面。整圖及重疊上下區域各以原尺寸／放大尺寸辨識，要求文字與原圖座標一致、可信度足夠，再依位置合併。保留不同位置的相同文字與緊鄰文字的標點；圖案誤字沒有使用特定字黑名單。單張工作仍共用原本中文校正額度。
- 隔離 Edge 載入正式 v1.2.11；從 session 圖片載入後自動辨識，預設繁中＋英文、自動模式及勾選 2 倍均取得以下結果，沒有上述雜字：

```text
Normal panel
AG Neovo panel

500 nits
Anti-Glare
```

- 切換「圖示／比較圖」及純英文後，同樣取得四個標籤，另外取得照片中實際存在的 `House`；照片手寫裝飾字與極小字並未完整辨識。此版本改善這張圖的主要標籤，不代表整張照片的所有文字都能還原。
- 離線重辨及選項切換通過，外部 HTTP/HTTPS 請求為 0；原圖 canvas 前後完全相同。顯示與自動複製呼叫的內容一致，剪貼簿使用測試替身，未讀寫系統剪貼簿。模型設定相容警告仍可見，未隱藏。
- 回歸先前雙欄圖文，兩側標題、說明與細字註腳完整保留；斜體中文範例仍取得 `開發者: devenzi` 並保留前方英文。
- `npm test` 72 項通過；`npm run check`、`git diff --check` 通過，無 build 步驟。未操作日常瀏覽器重新載入、未重新測試原生右鍵入口、未提交或推送此版本。使用者需重新載入擴充功能並關閉舊彈窗後再截圖。

## 1.2.10 右鍵選單名稱（2026-11-16）

- 依使用者指定，右鍵選單更名為「截圖與標註」及「圖片文字辨識」，同步無截圖時的介面提示與 README；選單 ID 與處理流程維持不變。
- `npm test`：65 項通過；`npm run check`、`git diff --check` 通過，版本識別同步為 1.2.10。本次未操作日常瀏覽器，需手動重新載入擴充功能更新選單；未提交、推送或發布。

## 1.2.9 圖片右鍵定位（2026-11-16）

- 移除圖片右鍵定位失敗時自動退回框選的行為；舊分頁重新注入定位程式後，暫時使用選單來源網址比對唯一 DOM 圖片。圖片 URL 不下載或保存。
- 圖片定位程式改為各 frame 於 document_start 載入，逐層換算圖片、邊框及縮放座標；無法定位、來源不明或旋轉 iframe 會顯示原因。
- 主頁唯一圖片、重複 URL 的確切右鍵節點、重新注入、部分可見圖片、父框架座標及非子框架來源排除均有隔離測試；背景測試確認圖片入口不再送出 REGION_CAPTURE_START。
- 原生右鍵選單的端到端操作驗證未完成。Computer Use 因無法可靠確認 Windows 瀏覽器網址而停止，未繞過該限制。iframe 真實瀏覽器端到端裁切仍待驗證，不能將單元測試視為完整瀏覽器驗收。

## 提交前檔案規則

- 以 .gitattributes 固定文字檔 LF、PNG／GZip 保持二進位，避免 Windows checkout 改變封裝 OCR 資源的 SHA-256。
- output/ 與 .playwright-cli/ 僅存放隔離測試畫面、瀏覽器 profile 與記錄，不納入提交。

## 1.2.8 中文斜體被誤判為英文（2026-11-16）

- 使用使用者提供截圖左側 593 × 463 px 區域重現：預設繁中＋英文將「開發者」辨為 `FE:`／`FRE:`；純中文模型與單純放大也無法穩定改善。局部斜體校正能恢復正確字形，但全圖校正會影響英文，因此未採用全圖變形。
- 新增 `ocr/cjk-recovery.js` 與預設勾選的「斜體中文校正」選項。只挑低 confidence、字框比例合適的 ASCII 誤辨候選，沿用既有中文模型辨識兩種局部傾斜／縮放版本；中文字完全相同且分數改善才依字框的原文位置替換。保留原標點及其他英文，不新增「開發者」或 `FARE` 的詞庫替換。每張圖最多 4 個字框，完成或失敗均恢復原語言／版面。
- 隔離 Edge 載入 manifest／畫面 1.2.8，自動辨識後得到 `開發者: devenzi`，前方完整英文段落保留，包括 `Shorts. No API`。顯示與自動複製一致，原始 canvas 在辨識前後相同。
- 實測關閉校正返回未校正結果、重新開啟後恢復正確中文；純英文模式停用校正，切回繁中＋英文再次讀回正確結果。全程離線辨識，外部 HTTP/HTTPS 請求為 0，模型與 vendor 雜湊未變更。
- 自動截圖／圖片範圍、選項合併、手動編輯複製、離頁清除工作、空白圖與失效工作回歸通過。前一張雙欄圖仍完整讀出兩側標題、說明與細字註腳。瀏覽器 Console 既有模型參數警告未隱藏。
- `npm test`：58 項通過，包含候選排除、候選分歧拒絕、位置替換、英文／關閉模式、額度與失敗還原；`npm run check`、`git diff --check` 通過。剪貼簿使用替身驗證，未讀寫系統剪貼簿。未重新載入日常瀏覽器，未提交、推送或發布。此範例已驗證修正，不代表所有中文字型與斜體皆能正確辨識。

## 1.2.7 擷取後自動辨識（2026-11-16）

- 移除「OCR 辨識文字」按鈕；成功讀取截圖並建立編輯器後直接啟動辨識，截圖與圖片右鍵的 session 工作走相同流程。語言、版面、底色及放大選項變更後延遲 300 毫秒自動重新辨識，合併連續變更；離開頁面清除等待中的 timer。辨識期間結果唯讀，複製文字按鈕與選項停用。
- 隔離 Edge 載入 1.2.7，以合成截圖及帶有圖片裁切座標的 session 工作驗證無按鈕操作即開始、完成後自動複製呼叫；圖片範圍外的「Ignored outside crop」未混入結果。瀏覽器原生右鍵／快捷鍵的完整入口未重新操作，其背景路由沿用既有測試。
- 實測連續切換語言與版面只新增一個 OCR worker；手動編輯文字後可再複製。變更選項後立即離開頁面沒有新增 worker；空白圖片及失效工作均不呼叫複製。
- 上一張使用者雙欄圖在載入後直接完整辨識出橘色標題、雙欄說明與細字註腳，顯示與自動複製內容一致；畫面標示 v1.2.7 且無辨識按鈕。
- `npm test` 53 項通過；`npm run check` 與 `git diff --check` 通過。剪貼簿以測試替身記錄呼叫，未存取系統剪貼簿。未重新載入日常瀏覽器、未提交、推送或發布。

## 1.2.6 彩色標題、雙欄與細字漏辨（2026-11-16）

- 使用使用者最新截圖中 638 × 360 px 的圖文區域重現：PSM 3／6 均漏掉上方橘色標題，並把左右欄接成同一行；最小字註腳亦有遺漏。
- 淺底彩色字使用最小色彩通道強化。自動分區須找到中間寬闊中縫且左右都有內容才拆欄；針對圖文抽取短文字行、補邊與單次放大後以 PSM 7 辨識，無合適文字行時回到整欄。新增固定中線的手動雙欄模式。
- 在隔離 Edge 確認 manifest 與畫面均為 1.2.6。預設自動分區、不勾 2 倍，繁中＋英文與純英文均讀出以下全部內容，無圖案雜字，順序為左欄整欄再右欄：

```text
EXTERNAL PLAYER
(Media Player / Mini PC / IPC)
External player installation with
mounting, power, and AV connection

SDM MODULE
Compatible SDM module installed
inside an SDM-ready display
Compatible SDM module shown for illustration.
```

- 手動雙欄及勾選 2 倍也完成同樣的範例驗證；曾發現重複縮放造成 plaver／註腳漏首字，已改成從原始像素抽文字行後僅放大一次，再次驗證通過。分段辨識進度使用整體進度。
- 白底／深底中英文文件、自動分區與整齊段落，以及 390 px 視窗回歸通過；深底合成中文逗號仍可能被引擎誤認為句號，未宣稱通用的逐字正確率。
- 原始 canvas 在辨識前後完全一致；使用者範例離線辨識外部 HTTP/HTTPS 請求為 0，自動複製呼叫與顯示內容一致。剪貼簿使用替身，未讀寫系統剪貼簿；模型既有參數警告未隱藏。
- `npm test`：53 項通過；`npm run check`、`git diff --check` 通過。未重新載入日常瀏覽器、未提交、推送或發布；需關閉舊彈窗並在擴充功能管理頁手動重新載入，再截圖確認標題顯示 v1.2.6。

## 1.2.5 複雜版面與深色底 OCR（2026-11-16）

- 原本未指定版面，使用 Tesseract.js 的單段模式；改為 PSM 3 自動分區，另提供 PSM 6 整齊段落與 PSM 11 分散文字。底色自動判斷深色像素占比，必要時只對獨立 OCR 工作圖反相灰階；可手動保留原圖或指定深色底。不新增權限、模型或外部服務。
- 使用使用者提供的截圖中 638 × 201 px 海報區域，比較原圖／灰階反相、PSM 3／6／11、繁中英文／英文及二值化。固定 2 倍縮放與繁中英文時，預設單段原圖的引擎 confidence 為 50，自動分區與灰階反相為 70；此數字是引擎內部信心分數，不代表正確率。二值化與分散模式未穩定改善，因此沒有自動套用或拼接多次結果。
- 在隔離 Edge 實際載入 manifest 1.2.5，使用正式封裝 OCR 引擎，實測預設自動分區與切換分散模式／保留原圖。確認辨識期間選項停用、低 confidence 提示出現、顯示文字與自動複製呼叫一致、辨識前後原始 canvas PNG 相同。
- 使用合成白底／深底中英文文件，實測自動分區與整齊段落模式；英文詞組、版本號、中文空格整理與換行保留。深底的中文逗號仍有被誤認為句號的情形，未宣稱完全正確。390 px 視窗無水平溢位。
- 使用者範例仍有圖案誤辨與遮擋文字誤辨，尚未完全解決；畫面已加入遮擋文字無法還原及重新截圖提示。引擎舊模型參數警告仍存在，未隱藏 console 提示。
- `npm test`：49 項通過；`npm run check`、`git diff --check` 通過。複雜圖辨識離線完成，外部 HTTP/HTTPS 請求為 0；剪貼簿以替身記錄呼叫，未存取系統剪貼簿。未重新載入日常瀏覽器，未提交、推送或發布。

## 1.2.4 一般 tools 圖示（2026-11-16）

- 依使用者指定改為暖黃色底與單一深色扳手，使用自行繪製的純色 SVG，重新輸出全部四種尺寸 PNG；工具列、管理頁與編輯彈窗既有路徑均套用新版，版號維持 1.2.4。
- 已檢視 128 px 與 16 px 成品。`npm test` 44 項通過，`npm run check` 與 `git diff --check` 通過；未重新載入日常瀏覽器，未提交或推送。

## 1.2.4 圖示髒斑與游標箭頭修正（2026-11-16）

- 生成圖清理仍有髒斑，最終改用純色 SVG 母稿重繪「文／A」、框選角與米白色游標箭頭；透過 `scripts/render-icons.ps1` 輸出同路徑母圖與四種 PNG，所有現有引用立即使用修正版。
- 已檢視 16／32／128 px 縮圖，三個空白底色位置取樣均為固定 `#F6C445`，外角透明；沒有漸層與陰影。版號維持 1.2.4。
- `npm test`：44 項通過；`npm run check`、`git diff --check` 通過。未重新載入日常瀏覽器，未提交或推送。

## 1.2.4 暖黃色翻譯／框選圖示（2026-11-16）

- 依使用者指定改為暖黃色「文／A」翻譯符號與簡化框選角，使用內建 image_gen 生成並清理；母圖、最終提示與來源保留於 `icons/`。
- 輸出 16／32／48／128 px 透明 PNG，manifest 的一般／工具列圖示與截圖編輯彈窗均已套用黃色版本，版號維持 1.2.4。舊藍色資產保留但未引用。
- `npm test`：44 項通過；`npm run check` 通過，包含 PNG 格式及實際尺寸；`git diff --check` 通過。已檢視 16 px 與 128 px 縮圖。
- 本次完成專案檔案套用，未重新載入日常瀏覽器的既有安裝；需在擴充功能管理頁手動重新載入才能顯示。未提交、推送或發布。

## 1.2.4 獨立圖示（2026-11-16）

- 內建 image_gen 生成藍色掃描框／游標圖示，母圖與最終提示保留於 `icons/`，另輸出 16／32／48／128 px 透明 PNG。
- manifest 的一般／工具列圖示與編輯彈窗均改用新圖示，依使用者要求維持 1.2.4。
- `npm test`：44 項通過；`npm run check` 新增 PNG 格式及尺寸核對並通過；`git diff --check` 通過。已檢視 128px 縮圖。
- 嘗試透過 Browser Use 重新載入日常 Chrome 的擴充功能，工具的 URL 安全政策拒絕 `chrome://extensions/`（只允許 HTTP／HTTPS）；未改用其他操作途徑。日常安裝的重新載入與版本確認尚未完成，需使用者手動操作。未提交、推送或發布。

## 1.2.4 中文 OCR 空格整理（2026-11-16）

- `npm test`：44 項通過；`npm run check`、`git diff --check` 通過。新增使用者原句、繁簡中、Unicode 空格、Tab／CRLF／空行、中英混排、英數標點與重複整理測試。
- 使用者提供的 `官網 產品 推 送 已 完成 , 並 通過 逐 語 系 回 讀 驗 證 。` 整理為 `官網產品推送已完成，並通過逐語系回讀驗證。`。
- 隔離 Edge 的正式頁面使用真實本機引擎辨識合成圖片，重現漢字間空格並確認整理後不再出現；`United States`、`1.2.3`、`139` 與換行保留。離線辨識外部 HTTP/HTTPS 請求為 0。
- 確認畫面結果與自動複製呼叫一致；手動編輯的中文空格及英文雙空格再次複製時保留。純英文模式與引擎原始文字（僅去頭尾空白）一致。
- 剪貼簿使用測試替身記錄呼叫，未讀寫系統剪貼簿。本次合成圖的逗號被引擎辨為句點；整理只轉為中文句點，無法校正引擎誤辨的標點。
- 未重新載入日常瀏覽器的既有安裝，未提交、推送或發布。

## 1.2.3 編號與文字刪除（2026-11-16）

- `npm test`：36 項通過；`npm run check`、`git diff --check` 通過。新增中間編號刪除、復原重做、下一個編號、未選取／停用保護與文字刪除測試。
- 隔離 Edge 載入正式編輯頁，以合成截圖實測選取框、Delete／Backspace、「刪除選取」、復原／重做及 Esc 取消選取；用像素驗證只刪除指定編號。
- 實測 OCR 結果欄與圖片內文字輸入欄的 Delete／Backspace 仍只編輯文字；完成圖片文字後可刪除該標註。
- 選取前後 canvas 的 PNG 資料完全一致，確認藍色選取框不進入匯出圖片；未存取系統剪貼簿。未重新載入日常瀏覽器的既有安裝，未提交或推送。

## 1.2.2 移除取消辨識按鈕（2026-11-16）

- 移除按鈕、狀態切換與點擊事件綁定；保留關閉視窗時的工作中止、逾時及 worker 清理。
- `npm test`：32 項通過；`npm run check`、`git diff --check` 通過。本次未重跑瀏覽器 UI 測試，未更新日常瀏覽器的既有安裝。

## 1.2.1 圖片文字與編號（2026-11-16）

- `npm test`：32 項通過；`npm run check` 通過。新增編號順序、縮放座標、文字／編號移動與取消、復原／重做及圖片邊界測試。
- 隔離 Edge 實際載入正式擴充功能頁，用合成圖片驗證點圖直接輸入文字、拖曳、再編輯及 Esc 取消；以實際 canvas 像素比較驗證復原／重做。
- 實測編號 1、2、3、移動既有編號不新增號碼，以及復原後下一個編號一致。
- 實際下載 PNG 並檢視，文字與編號均在指定位置；輸入尚未按完成時直接下載，也會先儲存文字。
- 真實本機 OCR 在已有文字／編號標註下仍只取得乾淨原圖的 `Hello OCR 123`。本次使用剪貼簿測試替身記錄自動複製呼叫，未讀寫系統剪貼簿；不將此項視為本版本真實 OS 貼上驗證。
- 前版 1.2.0 的背景流程有測試覆蓋：快捷鍵路由、框選取消、識別與座標驗證，以及完成框選後建立 popup、截圖不建立一般頁籤。瀏覽器原生快捷鍵／框選到彈窗的完整入口未完成端到端驗證；本次 UI 測試從合成 session 截圖開始。
- 尚未重新載入使用者日常瀏覽器中的既有安裝；未提交、推送或發布。舊編輯彈窗需要關閉，擴充功能重新載入後再截圖，才會使用新版工具。

## 1.1.1 OCR 自動複製（2026-11-16）

- `npm test`：24 項通過；`npm run check` 與 `git diff --check` 通過。版本識別與權限清單同步更新。
- 在新隔離 Edge profile 載入 1.1.1，使用正式 Tesseract OCR 引擎辨識合成圖；圖片範圍工作自動開始，無點擊複製或額外測試用剪貼簿權限。完成後以實際 Ctrl+V 貼上，確認內容等於 `Auto copy OCR 123`。
- 實測編輯後手動複製，等待成功提示再 Ctrl+V，內容等於編輯後結果。
- 空白圖片與取消辨識不覆寫剪貼簿。模擬寫入 API 拒絕時保留辨識文字、顯示未複製與手動複製提示，沒有顯示成功。
- 測試開始前僅為備份原剪貼簿短暫授予讀取權限，開始 OCR 前已撤銷；測試結束還原原剪貼簿。產品只新增 `clipboardWrite`，沒有剪貼簿讀取權限。
- 原生右鍵與截圖入口的端到端驗證範圍仍同下節；本次驗證聚焦實際 OCR 到自動複製／貼上的流程，未提交、推送或發布。

## 1.1.0 本機 OCR（2026-11-16）

- `npm test`：24 項通過，包含既有翻譯／TTS、三組右鍵選單、工具列選取分流、圖片範圍、iframe 備援、分頁切換、截圖／開頁失敗、過期暫存清除、HiDPI 與可見範圍裁切。
- `npm run check`：Manifest V3、權限、CSP、版本、頁面／腳本路徑、自有 JS 語法，以及 12 個封裝 OCR 資源的 SHA-256 完整性通過。無 build 步驟。
- 隔離 Edge profile 實際載入此目錄的未封裝擴充功能，使用正式 runtime、extension storage、CSP 與封裝的 Tesseract.js 7／WASM／語言模型。測試以合成 canvas 圖片建立截圖工作，不使用私人網頁內容。
- 離線實測：整張圖辨識為 `Hello OCR 123` 與「繁體 中 文 測試」；反向拖曳框選僅取得英文行。辨識期間記錄的外部 HTTP/HTTPS 請求為 0；模型請求為本機 `chrome-extension://`，沒有替換 OCR 引擎或模型回覆。
- 圖片座標工作自動裁切後只輸出 `Hello OCR 123`；改選簡中後取得「简体 中 文 测 试」。中文結果保留引擎輸出的空格，未改寫原文。
- 已實測取消（包括載入期間）、編輯、複製與 session 截圖領取後清除。複製以隔離測試瀏覽器的 clipboard-read/write 權限核對；產品 manifest 沒有剪貼簿讀取權限。
- 空白影像顯示未辨識到文字；直接重開無截圖的結果頁顯示操作提示。390px 視窗無水平溢位。
- 新 CSP 下透過正式 runtime 發送 `Hello world` 翻譯請求，背景 Google 服務回傳「你好世界」。
- Tesseract 7 對封裝模型的部分舊參數輸出 `Warning: Parameter not found` 至 console；上述合成圖與辨識流程通過。這些是模型設定相容提示，未以靜音或偽造回覆隱藏。

驗證邊界：原生右鍵選單點選、工具列真實點擊及 `captureVisibleTab` 擷取一般網頁的完整入口尚未端到端實測；背景路由由 Node 測試覆蓋，實際 Edge 驗證從合成截圖的 session 工作開始。未在使用者日常 Chrome／Edge profile 安裝或重新載入，也未進行商店發布。版面複雜、模糊、小字、裁切與不同網站仍需實機核對。

手動驗收：重新載入擴充功能、重新整理一般網頁，測試右鍵「截圖辨識文字（OCR）」、圖片右鍵、無選取文字的工具列入口，以及選取文字時仍走翻譯。確認跨域圖片辨識的是可見畫面，iframe 圖片改為框選，Esc 可取消尚未送出的框選。截圖僅是可見範圍，並非捲動長截圖。

以下保留 1.0.0 拆分來源的歷史驗證。

來源：Open Chat Hub `main`，提交 `6724e5d50c01f8c5a51fde25218949b1ddc9e2dc`。

## 已通過

- `npm test`：15 項服務／背景訊息測試，包含翻譯方向、輸入驗證、服務失敗、朗讀分段、frame 路由、未知訊息與逾時。
- `npm run check`：Manifest V3、版本、權限、manifest 資源路徑、全部 JS 語法與原專案依賴檢查。
- Google 真實服務：`Hello world` 翻譯為「你好世界」；`Hello` 英文 TTS 回傳 6,912 bytes 音訊。
- 隔離 Edge 無頭瀏覽器的內容腳本 UI 測試：選取工具列、翻譯浮窗、譯文複製、Esc、無選取提示、服務錯誤、HTML escape、重複注入與取消晚到結果。這組測試替換 Chrome runtime，並在測試時將 shadow root 改為 open 方便自動操作；產品程式保持 closed。
- 實際將未封裝擴充功能載入隔離 Edge profile：確認 MV3 service worker、正式內容腳本與 closed Shadow DOM；透過背景傳送選取翻譯訊息，呼叫真實 Google 端點，確認浮窗譯文為「你好世界」。此組未替換 Chrome runtime。

拆分版本沒有 build 步驟，可直接載入。

## 驗證邊界與手動確認

- 尚未實際操作瀏覽器原生右鍵選單及工具列圖示；入口及 frame 參數由隔離測試覆蓋。
- 已驗證 TTS 音訊回傳，但尚未以實際喇叭確認朗讀及系統語音備援。
- 尚未進行 Chrome 實機、長文／窄視窗、各網站及商店審查驗證。

手動驗證時停用原 Open Chat Hub，避免兩組選取工具列干擾；在一般網頁測試英中互譯、右鍵、圖示、複製與朗讀。

## 獨立 repository 匯入（2026-11-16）

- 以拆分提交 `2f0ceddc1befb7f0f09984a8a4b43ae745b0eced` 作為來源，匯入 `jasonwang-tw/EasyBrowserTools` 的 main。
- 獨立版本為 1.0.0，更新產品名稱、package、注入版本與維護規範；翻譯服務及主要 UI 行為沿用拆分版本。
- 匯入前重新執行 `npm test` 與 `npm run check`，15 項測試及靜態檢查通過。上列實際 Google／Edge 測試屬於來源拆分版本的驗證，本次沒有重新執行網路或實際載入測試。
