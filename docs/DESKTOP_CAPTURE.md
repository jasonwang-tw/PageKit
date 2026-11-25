# 桌面與應用程式截圖（1.16.0；2026-11-25）

## 1.17.0 兩組獨立快捷鍵（使用者指定；2026-11-25）

- 網頁框選保留原capture-region指令及使用者Alt＋S綁定，固定執行網頁框選。桌面新增capture-desktop指令，global:true、不預設按鍵，交由使用者在Chrome原生快捷鍵管理指定第二組；兩者不共用模式、不讀取舊pagekitShortcutCaptureMode偏好，也不改寫既有按鍵。
- 設定管理改成分別顯示「網頁框選／桌面截圖」目前按鍵與「設定兩組快捷鍵」入口，移除模式切換選單。使用commands.getAll讀取實際狀態，回到視窗時更新，未綁定顯示未設定；不在自製輸入框攔截一般按鍵。
- 依[Chrome Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands)，省略suggested_key為未綁定；可用原生管理自訂，全域指令需保持Chrome運作（ChromeOS不支援全域）。無新權限或依賴，沿用daisyUI與前輪桌面直接取圖規則。
- 本節取代下方共用快捷鍵與模式切換歷史規格。舊local偏好不再讀寫，不需要刪除使用者其他資料；原桌面右鍵／立即擷取入口、權限管理、單窗、OCR及複製行為維持。

## 1.16.4 分享後立即取圖（使用者指定修正；2026-11-25）

- 使用者實機回報：按「分享」後編輯器最小化並停在共用提示，需重新叫回視窗才完成。本版取消所有自動最小化／還原大小動作，分享後直接擷取所選來源完整畫面，不進入二次框選、不必再按快捷鍵；成功後僅聚焦編輯窗，不改其大小／最大化狀態。
- 優先使用 ImageCapture.grabFrame 從已授權的 video track 取得一幀，不等待 requestVideoFrameCallback 或動畫幀。沒有此API或來源不支援時，備援等待 video 的 decoded data（loadeddata／readyState），同樣不等待繪製回呼或 play() Promise 才完成。取幀失敗／逾時明確停止分享並保留舊工作，不等使用者再次啟動。
- 擷取後立即 stop 全部 tracks，再產生 PNG／載入編輯器；取消／逾時後遲到的 ImageBitmap 也須 close。Chrome 共用提示可能在短暫擷取期間出現，取幀後自動結束，不隱藏或繞過瀏覽器安全提示。
- 本節取代下方1.16.0歷史規格中「monitor來源暫時最小化」；整個螢幕仍是當下可見畫面，包含未遮蔽的編輯器；應用程式來源只擷取被選中的視窗。其餘選用權限、原尺寸、手動OCR、單窗及剪貼簿規則維持。
- 依據：[Chrome ImageCapture](https://developer.chrome.com/blog/imagecapture)、[W3C grabFrame](https://www.w3.org/TR/image-capture/#dom-imagecapture-grabframe)、[rVFC繪製回呼語意](https://web.dev/articles/requestvideoframecallback-rvfc)。不引入polyfill或新權限；三庫沿用PageKit既定規範及chrome-extension-dev／test-chrome，靈感筆記無此桌面擷取修復定案。
- 驗證：201項單元與資源／版本／差異檢查通過；29項桌面編輯流程檢查及10項實際MV3背景取圖檢查通過。後者停用測試框架的強制焦點模擬，確實在document.visibilityState=hidden下，以原生ImageCapture／video解碼及生成的Canvas MediaStream完成一次取圖、停止全部tracks、載入圖片且不改視窗state；video的play Promise被刻意懸置、rVFC被禁止，仍能完成。使用自己啟動的隔離Edge，沒有批准原生分享權限或擷取實體桌面；原生選擇器／實體來源仍待使用者重新載入1.16.4後確認。取圖失敗／逾時、遲到串流／bitmap及取消清理另由單元測試覆蓋。

## 使用者確認

| 項目 | 已確認選擇 |
| --- | --- |
| 快捷鍵 | 沿用既有 capture-region 指令與使用者 Alt＋S；預設仍網頁框選，設定可切換桌面模式 |
| 來源 | Chrome 原生選擇器提供整個螢幕與應用程式視窗，不擷取音訊 |
| 圖片 | 保留完整畫面，進入同一編輯器後可裁切 |
| OCR | 桌面截圖先編輯，手動框選文字／辨識整張；不自動掃描大圖 |
| 複製／視窗 | 沿用既有自動複製原圖 PNG 及單一編輯視窗設定；OCR 仍只手動複製文字 |

## 介面與權限

- 沿用 daisyUI、Lucide、暖黃、深淺色、既有設定 dialog，不改標註版面。在「設定管理 → 截圖設定」增加快捷鍵模式、權限啟用／移除與立即擷取按鈕；工具列圖示右鍵也有桌面入口。
- 僅新增 optional_permissions: desktopCapture。未啟用時不請求、不擷取；直接點擊啟用／桌面模式／立即擷取才可請求權限。快捷鍵沒有權限時開啟管理畫面請使用者操作，不在載入時自動要求權限。拒絕／撤銷後仍可用網頁截圖。
- 來源每次由 Chrome 選擇器挑選，不記住畫面授權、不錄音或持續錄影；只取一幀，立即停止全部 tracks，再編碼 PNG。取消、逾時、錯誤、換頁／關閉都取消 picker／停止串流，遲到的 getUserMedia 也須釋放。
- Chrome 的「全域」作用範圍由使用者在快捷鍵管理頁設定；不操作受保護頁、也不改寫使用者 Alt＋S。保留原 suggested_key，沒有偷偷改成其他按鍵。Chrome 需持續運作，系統或其他擴充的衝突需實機核對。
- 既有單一視窗可直接執行擷取；新視窗用 desktop=1 啟動。成功解碼並驗證前不清除舊圖、標註或結果；取消保留舊工作。OCR／換圖／去背等來源操作仍互斥。
- 整個螢幕來源可在取幀前暫時最小化本編輯器、取幀後還原；應用程式視窗來源不最小化，避免影響選中的 PageKit 自身視窗。不保證 OS／DRM 保護內容可擷取。
- 截圖只在編輯器記憶體處理，不上傳、不存 local／session／IDB，不傳 streamId 至一般網頁；local 僅保存快捷鍵模式。安全上限沿用 64MP／單邊 32,760px，超限拒絕且保留舊圖，不默默縮小。
- 快捷鍵預設與網頁右鍵框選彼此獨立，改桌面模式不改網頁的右鍵功能。切換模式本身不擷取、不複製、不改目前文件。

## 技術依據與既有規範

- 第二大腦：兩份靈感筆記沒有 PageKit 桌面模式定案；專案入口沿用 1.15.0 的單一視窗、複製及本機處理；Skills 清單有 chrome-extension-dev／test-chrome，另沿用 update-app／obsidian。
- 沿用 [daisyUI](https://github.com/saadeghi/daisyui)（MIT）與本機封裝，優點為既有主題／元件一致、無新增依賴；框架不提供螢幕擷取，擷取流程用原生 API，不換 UI Kit。動畫只沿用 120ms 狀態回饋與 reduced-motion，不延遲擷取。
- 參考 [GoogleChrome 官方範例](https://github.com/GoogleChrome/chrome-extensions-samples)（Apache-2.0），優點為 MV3 API 參考，限制是錄影範例不是本案的一幀擷取；不整包引入或新增錄影依賴。
- [desktopCapture](https://developer.chrome.com/docs/extensions/reference/api/desktopCapture)、[選用權限](https://developer.chrome.com/docs/extensions/reference/api/permissions)、[全域快捷鍵](https://developer.chrome.com/docs/extensions/reference/api/commands#scope)。Service Worker 不帶 targetTab 呼叫 desktopCapture 會失敗，因此在自己編輯頁請求／消耗串流，不新增 tabs 或 offscreen 權限。
- 對標：Chrome 原生畫面選擇器的明確授權／取消、PageKit 既有設定保存／錯誤還原及單一視窗；驗收權限拒絕／撤回、空白畫面、取幀失敗、重複觸發、關閉及遲到回覆、原圖保留、按需 OCR、自動複製與深淺色／窄視窗／鍵盤。

本文件為使用者新確認的桌面能力規格；取代舊 CAPTURE_MODES／AGENTS 中僅限網頁、不新增桌面權限的範圍。既有網頁擷取、CSP、本機模型與隱私限制維持。

## 驗證與階段交接（2026-11-25）

- `npm test`：199／199 通過；新增資源清理、取消／遲到回覆、逾時、無效尺寸、授權拒絕／撤回、快捷鍵模式與視窗重用測試。
- `npm run check`、`git diff --check` 通過；沒有新增 build 或執行相依。
- 真實 Chrome 編輯頁 29 項檢查通過：自行產生的 MediaStream 取幀、手動 OCR、完整尺寸／17MP 圖、複製優先、取消保留編號、深淺色與 320／480／768／1280px、Tab／Esc／焦點。影像及剪貼簿 API 均為隔離測試資料。
- 隔離 Edge 載入實際 MV3 擴充，7 項檢查通過：真實來源／CSP、optional 權限宣告、未授權引導、背景訊息重用、真實 windows 最小化／還原與本機生成串流的 PNG 像素校驗。
- **仍待實機驗證**：Chrome 原生授權與畫面選擇器、實體螢幕／應用程式及全域 Alt＋S。未自動接受桌面分享權限、未擷取使用者桌面、未碰日常瀏覽器設定檔或系統剪貼簿。重新載入後請自行啟用選用權限，依螢幕／視窗各擷取一次並確認裁切、手動 OCR 及複製。Windows Computer Use 的 [guidance.md](C:/Users/jason.wang/.codex/plugins/cache/openai-bundled/computer-use/26.1120.50957/docs/guidance.md) 明定「Do not act on security or privacy permission requests.」，因此原生授權步驟由使用者操作。
- 可接手來源、規範、QA 腳本與預覽備份至 pCloud `PCloud 靈感資料庫/專案專區/個人/PageKit/PageKit-1.16.0-desktop-source-20261125-r2.zip`；未提交／推送，GitHub 仍為 1.15.0。從其他裝置接手應先看同夾的 1.16.0 階段筆記與校驗，不以舊 main 覆蓋此備份。
