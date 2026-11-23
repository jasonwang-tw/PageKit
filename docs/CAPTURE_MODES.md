# 截圖方式、縮放與大圖 OCR

## 2026-11-23 使用者確認（預計 1.10.0）

- 新增「視窗截圖」＝目前分頁可見網頁內容，不含網址列／頁籤，不擷取其他 App。
- 新增「整頁截圖」＝主網頁由頂到底，第一版不選取內層獨立捲動區。
- 兩項放在既有右鍵選單；保留框選快捷鍵與圖示點擊／選取翻譯的原行為。
- 整頁擷取後先開編輯器，不自動對整張圖跑 OCR；可框選文字區辨識，另提供辨識整頁。
- 原始像素保持不變；新增「－／100%／＋／符合寬度」，10%–400%，整頁預設符合寬度。100% 指一個圖片像素對應一個 CSS px；只改顯示比例，不以預覽尺寸取代圖片。
- 新增手掌工具，選取後以滑鼠左鍵拖曳可視區；按住空白鍵可暫時拖曳。文字欄位與設定中的空白鍵保留原生輸入，不與標註畫筆衝突。
- 使用者指定操作參考：[Explain and Send Screenshots](https://chromewebstore.google.com/detail/explain-and-send-screensh/mdddabjhelpilpnpgondfmehhcplpiin)。已讀官方介紹與 changelog（整頁擷取、zoom in/out、長圖工具修正），未取得或宣稱驗證其內部實作／無上限尺寸；只參考操作，不複製其品牌或程式。
- 第一版以 6,400 萬像素、單邊 32,760px 為原尺寸安全上界；實際 canvas 建立或編碼失敗亦須提示。超限不靜默縮小或截掉內容。預覽縮小不代表原圖記憶體減少，也不宣稱可擷取無限捲動頁面。

## 擷取、短暫交接與還原

- 沿用 activeTab／scripting／captureVisibleTab，視窗截圖不要求框選；不新增桌面擷取、debugger、downloads 或 unlimitedStorage 權限。
- 整頁以主頁面捲動、逐可見區擷取及原尺寸拼接；同一視窗序列化並節流到每次至少 550ms，遵守 captureVisibleTab 每秒最多 2 次。
- 逐步等待頁面重繪與可見圖片載入；記錄實際 scroll offset，處理最後一段的夾限與重疊。固定／黏附元素以可見與已擷取狀態處理重複，保留原始 inline style；結束、取消或失敗後還原捲動、暫時樣式與提示層。
- 擷取有進度與 Esc 取消；切換分頁、頁面導航、視窗尺寸／縮放改變、頁面持續增長或超出資源上限時停止並還原，避免擷取其他頁面或無限等待。
- 大圖不塞入既有 8MB data URL／storage.session 交接。採背景記憶體內的短暫 Blob、一次性隨機識別與限定編輯頁的分塊 Port 傳輸；session 只放小型 metadata。讀取／斷線／逾時清除，不存入磁碟、local／sync 或遠端。背景重新啟動可能令尚未領取的工作失效，須清楚提示重截。
- 保留舊框選／圖片右鍵工作流程及短暫 session 相容；新的視窗／整頁工作採原始像素，不沿用載入時全圖縮至 16MP 的流程。既有本機匯入／裁切的安全限制保持明確。

## OCR 與互動效能

- 預覽與辨識分開：縮放／拖曳不改來源、標註 native pixel 座標或匯出尺寸，也不觸發 OCR。
- 整頁預設按需框選；框選只限定 OCR 讀取區，不裁掉圖片或清除標註。一般框選截圖、圖片右鍵與視窗截圖維持自動辨識。
- 整頁／大區域辨識以約 2MP 工作區塊逐次處理，盡量選文字行間空隙分界，保留原始文字尺寸。順序合併結果，不以純文字去重刪掉合法重複內容；分界與圖文複雜區仍須核對辨識品質。
- 同一次辨識共用一個 Tesseract 或 Paddle Worker／模型，不同時開多個大模型。每段完畢釋放工作 canvas／bitmap，更新區塊進度；只在整體完成後沿用自動複製規則。停止時保留已完成段落並標明未完成，不自動複製部分結果。
- 維持 1.8.4 的標註／匯出並行與 1.9.0 朗讀生命週期。大圖仍有原圖及預覽 canvas 的記憶體成本；分段 OCR 主要限制額外工作圖／推論記憶體，不承諾整體零負擔或耗時不變。
- 沿用 daisyUI、Lucide、深淺色、焦點及 reduced-motion；手掌／框選／縮放立即回饋，不加入長動畫。

## 第二大腦與開源比較

已讀靈感儲存區與創作／副業靈感總覽，無整頁／視窗截圖相關；規範以 PageKit 專案入口與 1.9.0 交接為準，保留本機尚未提交的既有修改。技能庫適用 chrome-extension-dev、test-chrome、update-app、obsidian，沒有既定整頁模組。

| 資源 | 授權與查核快照 | 優點 | 限制與本案用途 |
| --- | --- | --- | --- |
| [mrcoles/full-page-screen-capture-chrome-extension](https://github.com/mrcoles/full-page-screen-capture-chrome-extension) | MIT，約 1.5k stars | 捲動／拼接的開源參考 | manifest 仍 MV2，不直接整包引入；僅參考流程 |
| [Niko412 的 MV3 移植](https://github.com/Niko412/full-page-screen-capture-chrome-extension) | MIT，0 stars，2026 移植 | MV3 service worker、完整長圖及超限處理 | 驗證／維護證據有限，要求額外權限；本案沿用自己的權限與原創模組 |
| [html2canvas](https://github.com/niklasvh/html2canvas) | MIT，約 31.9k stars | DOM 客戶端重建 | 並非瀏覽器實際畫面，CSS／跨來源內容有限制；不適用本次真實像素截圖 |

維護日期／stars 僅為本次網頁快照，精確近期提交日期未核實；不以流行程度代替相容性。未複製上述程式或新增 runtime 依賴，既有 UI 授權保持。

來源：[Chrome tabs API／擷取頻率](https://developer.chrome.com/docs/extensions/reference/api/tabs)、[Explain and Send 官方介紹](https://jasonsavard.com/en-GB/Explain-and-Send-Screenshots)、[官方歷史](https://jasonsavard.com/wiki/Explain_and_Send_Screenshots_changelog_archive)、[Tesseract 共用 Worker 建議](https://github.com/naptha/tesseract.js)。

## 驗收與狀態

- [x] 視窗截圖不框選，保留原尺寸且自動 OCR；既有入口相容。
- [x] 整頁拼接覆蓋頂／底、DPR、最後重疊；固定元素不無限重複，取消／失敗能還原。
- [x] 跨 16MP 的原尺寸長圖可顯示／縮放／拖曳／匯出，超限有提示。
- [x] 框選來源與全頁分段流程通過（辨識品質仍須核對）；標註、原圖與剪貼簿隔離，Worker 共用與停止正確。
- [x] 既有 1.8.4 並行及 1.9.0 朗讀回歸、深淺色、窄視窗與鍵盤通過；驗證範圍另記 VALIDATION。
- [x] README、版本、隱私、資源檢查與本機交接更新；詳見 VALIDATION.md。
- [x] 專案交接另行保存；最新發布狀態以發行 PR 與商店回條為準。

本輪未提交／推送／商店發布，日常 Chrome 尚未重新載入。
