# 專案規範

- 本專案名稱為「頁匣 PageKit」，套件名稱 `pagekit`；repository 為 `jasonwang-tw/PageKit`，本地安裝目錄沿用 `EasyBrowserTools`。獨立於 Open Chat Hub 維護；預設開發分支為 `main`，目前版本 1.12.2。
- 顯示名稱與新資源使用 PageKit。舊分頁使用的 `__easy*` 狀態與圖片座標通道屬相容識別，更名時保留以避免重複監聽或跨框架中斷。
- 修改前先讀 README.md 與本檔。Git commit 訊息使用繁體中文。
- 提交、推送、建立遠端分支及發布只能使用 GitHub App connector；不可使用 git add／commit／push 或 gh 作為替代。
- 任何額外專案初始化或另建 repository，須先詢問使用者並建立 README.md／AGENTS.md。
- 除非使用者明確要求建立分支，直接提交預設 main；Git commit 訊息使用繁體中文。
- 維持 Manifest V3、純 JavaScript 與本機封裝程式碼；目前沒有 npm 安裝依賴或 build 步驟。
- 選取及浮窗在 content script；第三方網路請求僅由背景服務執行。UI 接收的文字必須 escape，並保持 Shadow DOM 隔離。
- 現有內嵌 CSS／SVG 隨抽出程式保留；新圖示延續 Lucide 風格，禁止以 emoji 代替。
- 彈窗採用 `vendor/ui/` 的 daisyUI 固定版本官方預編譯 CSS；本機封裝並保留授權／雜湊，維護用 `scripts/vendor-ui.mjs`。不引入遠端 Tailwind 執行器或 CDN。介面客製在既有 `ocr/ocr.css`；不增加一般安裝 build。預覽縮放僅改 CSS，不可變更標註或 OCR 的原始像素座標。
- UI 設定與盤點以 `docs/UI_INVENTORY.md` 為準；沿用使用者已選定的 daisyUI、暖黃色及既有標誌。共用主題只改 `ocr/ui-theme.css`，網頁內浮窗樣式在 `content/ui-components.css`；透過背景固定資源載入器傳入 Shadow DOM，不公開擴充功能資源。新增動態輸入框、浮窗、工具按鈕也須使用對應元件與可讀主題色。新設計方向先釐清需求、比較選項並更新文件，再修改介面，不自行填補未確認的 TA／風格偏好。
- 不引入聊天、AI Key、單字簿或雲端同步依賴；新增權限時須說明實際用途。
- OCR 不上傳圖片、不載入遠端 JS／WASM；Tesseract 只用 LSTM OEM 1。可選 PP-OCRv6 Small 固定模型由背景服務於使用者同意後下載，核對大小／SHA-256，兩檔原子存入獨立 IndexedDB。不得自動下載或把 output 評估模型納入上架包。維持 OCR 頁 self 連線 CSP、不加 unsafe-eval；背景只增列固定模型來源的選用權限。舊框選截圖以 storage.session 短暫交接，新視窗／整頁截圖依 docs/CAPTURE_MODES.md 採記憶體 Blob 與一次性分塊傳輸，讀取後移除。變更資源須更新 vendor/ocr/sources.json 或 vendor/paddle/sources.json 並核對授權及雜湊；第三方封裝重建用 scripts/vendor-paddle.mjs 的固定版本與修補。
- 完成變更執行 `npm test`、`npm run check`；瀏覽器／第三方服務未實測時，須明確說明驗證範圍。
- connector 提交後驗證遠端 SHA；本地同步前核對所有內容與未追蹤檔案，避免覆蓋使用者變更。完成條件包含本地 HEAD 與 origin/main 一致、工作區乾淨；不能用 reset --hard 或刪除本地變更。
- 新增版本時同步 manifest.json、package.json、README 與內容腳本的注入版本識別。
- 本機去背依 `docs/BACKGROUND_REMOVAL.md` 的使用者問答、資料分離與驗收規格實作；不得上傳圖片或自動下載模型，不改 OCR 原圖及模型快取。沿用既定 UI，不新增手動遮罩工具。
- OCR 翻譯依 `docs/OCR_TRANSLATION.md`；僅手動觸發，翻譯目前結果框全部文字、預設繁中。譯文放原文下方，僅明確複製譯文才寫剪貼簿；來源變更須取消並清除過期譯文。不要改動原有選取翻譯方向或本機 OCR／去背隱私邊界。
- 模型安裝／取消／刪除統一放在「模型與服務管理」同頁 dialog；分類與焦點／下載行為依 `docs/UI_INVENTORY.md` 的 1.6.1 規格。不得新增分散的管理區或將 Google 線上翻譯稱為本機模型；不改現有快取鍵與模型資源。
- 畫筆與螢光筆使用實際筆寬的空心圓指標；計算與顯示依 `docs/UI_INVENTORY.md` 的 1.6.2 規格，覆層不可寫入圖片或改動原有筆寬規則。
- 1.7.0 使用者確認以 `docs/PALETTE_ANALYSIS.md` 的範圍拉桿取代線寬選單與螢光筆固定寬度；兩組本次選值獨立。色票分析只讀原始截圖／匯入圖片，手動啟動、本機處理、同頁 dialog，沿用既定 daisyUI 與主題。
- 1.8.0 裁切依 `docs/CROPPING.md`：保留可編輯向量、配方歷史與形狀透明度，不壓平標註；OCR／色票只讀裁切後乾淨工作圖。社群項目須區分官方建議與 PageKit 範本，記錄來源／核對日期，不把顯示尺寸或舊版尺寸當成強制規範。AI 擴圖與送至 AI App 尚屬評估，不能自動傳圖或安裝模型。
- 共用「樣式 ▾」依 `docs/UI_INVENTORY.md` 的 1.8.0 問答；顏色／粗細／字級全收合，摘要保留色塊與目前值。沿用原生非模態 Popover，不自動展開、不以 menu role 裝載表單，處理 Escape／Tab／焦點與視窗邊界。
- 1.8.4 OCR 與標註並行依 `docs/UI_INVENTORY.md`：OCR 不鎖標註／樣式／圖片匯出，不取消草稿；裁切與換圖、去背、色票仍依序處理，會改變原圖的歷史步驟須等待。手動複製圖片優先於同一輪自動文字複製，排隊寫入也須檢查已取消／過期工作。
- 1.9.0 OCR 原文與譯文朗讀依 `docs/UI_INVENTORY.md` 的確認紀錄：僅手動播放、共用預設收合的語言／語速設定，沿用 Google TTS 與瀏覽器語音備援，不傳圖片、不新增模型。長文逐段播放、單一工作；停止／改字／重辨／換圖／譯文失效／關閉時停止音訊並拒絕過期回覆，不操作剪貼簿或鎖標註。

- 1.10.0 新截圖方式、原尺寸邊界、短暫交接、手掌／空白鍵、縮放與按需／分段 OCR 依 `docs/CAPTURE_MODES.md`；不得以預覽縮小代替原始像素、默默截斷長圖或新增桌面擷取權限。

- 1.11.0 縮放工具底部置中與 Ctrl＋滾輪依 docs/UI_INVENTORY.md；事件限定圖片可視區域且 non-passive，攔截整頁縮放但保留一般捲動，不能改原圖或匯出像素。

- 1.12.0 圖片Ctrl+C／Cmd+C依docs/UI_INVENTORY.md，僅在圖片為隱含目標時使用同一copyImage／clipboardWrites管線；文字選取、選中物件、控制項焦點與操作中狀態優先，不得覆蓋原生文字複製或OCR期間的手動圖片優先權。

- 1.12.2 朗讀圖示與共用齒輪Popover依docs/UI_INVENTORY.md，取代舊下方文字按鈕／details；維持可存取名稱、停止狀態、焦點與共享語言語速，不改音訊服務或剪貼簿。
