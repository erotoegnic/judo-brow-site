# 橘豆Judo｜半永久美學

純 HTML、CSS、JavaScript 單頁預約網站，無後端、前端無套件依賴。直接開啟 `index.html` 即可使用。Google Fonts 與 Google 地圖需網路，離線時使用系統字型。正式網址設定為 https://erotoegnic.github.io/judo-brow-site/；本次只修改本機檔案，未部署。

## 本機預覽與測試

在此目錄執行其中一種預覽方式：

```sh
python -m http.server 8080
```

開啟 `http://localhost:8080`。也可使用 `npx serve .`，依終端顯示的網址預覽。直接以 `file://` 開啟仍可使用資料、作品與表單，剪貼簿權限依瀏覽器而異。

```sh
node --test tests/booking.test.mjs
```

測試使用 Node 內建 `node:test` 與 VM，不須 npm install。涵蓋訊息格式、LINE URL 編碼、手機、必填、日期、健康複選及閱讀確認驗證。`window.JudoBooking` 公開 `buildBookingMessage(data)`、`buildLineUrl(text)`、`validateBooking(data, services, today)` 等純函式。執行全部測試：`node --test tests/*.test.mjs`。

## 修改資料

服務、案例、影片、FAQ、預約注意事項、健康告知選項、客人回饋與聯絡設定集中於 `js/data.js` 的 `window.SITE_DATA`。修改後先執行 `node tools/build.mjs`，同步靜態 JSON-LD 與字型子集，再重新整理頁面。字串須保留引號，陣列項目以逗號分隔。

- `services`：每筆含 `id`（唯一且穩定）、`name`、`category`、`description`、`price`，另可加 `priceNote`（價格旁的補充說明）。分類可為 `brow`、`lip`、`eye`、`scalp`、`course`。表單選單與服務卡同步更新。
- `price: null` 顯示「價格請洽官方 LINE」。目前唯一已確認價格是修眉：`price: "NT$150", priceNote: "一人一針｜預約制"`。其他項目均維持 `null`，不可用示範價格替代。
- `cases`：修改圖片相對路徑 `image`、標題 `title`、中文替代文字 `alt`、主要 `category`、篩選用 `tags`、IG 貼文 `path`。例如 `path: "p/De6akNViafB"`。連結以 `contact.instagram` 為基底；`tags: ["lip", "brow"]` 同時出現在眉、唇分類。新照片放在 `assets/cases/`。
- `faq`：修改 `question` 和 `answer`，頁面自動生成可鍵盤操作的問答。
- `bookingNotices`：`title`、`intro`、`groups`（每組 `no`、`title`、`items`）及 `outro`。目前逐字使用店主提供的四組原文；程式僅加粗冒號前文字，不改寫內容。呈現在 `#notice`，表單提供來回錨點連結。
- `healthOptions`：健康狀況複選標籤。屬選填，不預先勾選。必填的 `noticeRead` 也不預先勾選。
- `videos`：每筆含 `title`、`path`，例如 `{ title: "暗沉唇選色", path: "video/7697615916762434823" }`。網址以 `contact.tiktok` 為基底，僅提供新分頁文字連結，不嵌入影片。設為 `[]` 或移除 `videos` 即隱藏整列。
- `testimonials`：`quote` 與 `attribution`，只使用已取得的真實引言與原始身分註記；不添加姓名、星等或成效承諾。第三則註明「客人的期望」。
- `contact`：維護 LINE ID、加好友 `lineUrl`、官方帳號主頁 `linePage`、Instagram、TikTok、Threads、地址、營業時間、地圖與規則。LINE ID 必須包含開頭的 `@`。預約訊息網址保留字面的 `@`，僅訊息使用 `encodeURIComponent`。Threads 同步加入 JSON-LD `sameAs`。

## 待確認資訊

目前位置為「高雄前金區，大立百貨附近」，地址顯示「詳細地址預約後提供／請洽官方 LINE」，營業時間顯示「請洽官方 LINE」。除修眉 NT$150 外，其餘價格未知。客人回饋只使用店主提供的三則引言，沒有星等、電話、顧客數或經驗年數。

1. 地址／時間：更新 `contact.address`、`contact.hours`。首頁 HTML 的備援文字也應同步。若移店，更新 location、JSON-LD 地址欄位、標題與介紹等相關文案。
2. 訂金／補色：更新 `depositRule`、`touchupRule`；兩者均經商家確認後才將 `rulesPending` 改為 `false`，移除「待確認」標記。
3. 地圖：目前 `contact.mapUrl` 搜尋「高雄大立百貨」，`mapLink` 為可見的「在 Google 地圖開啟」備援連結，兩者 query 都需 URL 編碼。地圖只標示附近地標，非門市精確位置。取得真實地址後同步更新兩個網址、HTML iframe `src`、備援連結與提示文字，保留未確認前的 TODO。
4. Facebook：目前 `facebook: null`，不顯示連結。取得有效官方網址後填入設定，並在 `index.html` 的 `<!-- TODO: FB 粉專網址 -->` 處加入使用 `data-contact="facebook"` 的聯絡圖塊；不要以猜測網址取代。
5. 正式網址：`contact.siteUrl` 是含結尾 `/` 的完整網址。變更網域時也須同步首頁 canonical、og:url、OG/Twitter 圖片絕對網址、robots.txt 與 sitemap.xml。
6. JSON-LD 由 `node tools/build.mjs` 靜態產生於 index.html，包含 BeautySalon／LocalBusiness、FAQPage、WebSite。服務與 FAQ 對應 data.js，僅修眉提供已確認的 TWD 150。沒有 Person、電話、完整街道地址、營業時間或評論／評分資料。

## 預約流程與隱私

表單不連接資料庫，不寫入 localStorage，也不由網站傳送到伺服器。通過驗證後，產生 LINE 訊息並嘗試複製，再嘗試開啟 LINE。使用者需在 LINE 親自傳送，經官方 LINE 確認後才算完成預約。

訊息新增「健康狀況告知」與「已閱讀預約前注意事項」。複選以 `、` 連接，未選填為「無」。網頁必須勾選閱讀確認才能提交。純函式 `buildBookingMessage` 的 `health: string[]`、`noticeRead: boolean` 為可省略的新輸入；舊輸入仍可產生訊息，但未提供 `noticeRead` 時顯示「否」，不誤報已閱讀。`validateBooking` 則要求明確的 `noticeRead: true`。

剪貼簿使用 Clipboard API，失敗時使用 textarea／execCommand 備援。兩者皆失敗時顯示「預約訊息已產生」與手動複製說明，不誤稱複製成功。IG／LINE 內建瀏覽器可能阻擋自動跳轉，確認面板始終提供「開啟 LINE 傳送」、訊息預覽與重複複製按鈕。訊息以 URL 編碼交給 LINE；請勿在備註填寫不必要的敏感資料。

## 部署操作說明（本次未執行）

- **GitHub Pages**：將網站檔案放入自己的 repository，於 Settings → Pages 選擇來源分支與根目錄。無須 build。若使用專案子路徑，設定正確 `siteUrl`；本網站資源採相對路徑。
- **Netlify**：可手動拖曳網站資料夾上傳，或連接 repository。Build command 留空，Publish directory 設 `.`。
- **Cloudflare Pages**：使用 Direct Upload 上傳網站資料夾，或連接 Git。Framework 選 None，無建置指令，輸出目錄設網站根目錄（`.`）。

部署前先補齊已確認資料、正式網址與社群預覽標籤。部署後由實際手機的 IG／LINE 內建瀏覽器測試開啟 LINE、訊息預填、剪貼簿與鍵盤。測試時不必傳送真實預約。本次不部署、不執行 git push。

## 檔案

`index.html`（頁面）／`css/style.css`（樣式）／`js/data.js`（資料）／`js/main.js`（互動與純函式）／`favicon.svg`（TB 圖示）／`tests/booking.test.mjs`（測試）／`DESIGN.md`（品牌設計規範）。九張案例 JPEG 原圖保留於 `assets/cases/` 作為備援與燈箱來源；品牌板與老師原圖改存 `_design/`。

## SEO 與圖片／字型維護

- 執行 `node tools/build.mjs` 產生靜態結構化資料與 Google Fonts 用字子集；無 npm 依賴。修改 HTML、CSS 或 js/data.js、js/main.js 後重跑，測試會檢查子集 URL 與原始內容是否同步。tools/font-subset.mjs 的元素清單對應 style.css 襯線選擇器；新增襯線元件時須一併更新此清單。瀏覽器 QA 依實際 computed style 檢查用字，包括剪貼簿拒絕後的確認標題。
- 內文／表單使用系統 sans，不下載 Noto Sans TC。Noto Serif TC 保留 400（品牌副標、引言、FAQ）與 500（標題），依實際襯線元素分字重收錄；Allura 只含 Taiwan B.Cart。保持 display=swap 與系統備援。
- `node tools/images.cjs` 使用已安裝 Chromium 產生 320px 與原尺寸 WebP（品質 78）。原圖有 360／361／640px 寬，不放大低解析來源；維持原長寬比例與頁面方形裁切。
- `node tools/og/render.cjs` 仍可重製 OG 圖，來源已改為 `_design/teacher-original.jpg`。
- `node --test tests/*.test.mjs` 驗證預約、內容、JSON-LD、FAQ、字型覆蓋與 hero preload。
- `node tools/verify.cjs after` 啟動暫時本機 server、Chromium，保存 390／1280 截圖與 mobile Lighthouse；`node tools/verify.cjs after --qa` 驗證預約與 LINE URL，攔截外部 LINE 開啟，沒有傳送訊息。驗證工具使用本機已確認的 Chromium／Playwright／Lighthouse 絕對路徑，換電腦須調整。

## 發布檔案與本輪移動清單

GitHub Pages 的 Jekyll 排除設定已放在 `_config.yml`。其他靜態上傳方式請只發布 index.html、favicon.svg、robots.txt、sitemap.xml、css/、js/、assets/，不要上傳 _design/、_screens/、tools/、tests/。只移動到 _design 並不能阻止會照單上傳所有檔案的部署工具。

下次部署須刪除舊公開路徑，原檔已保留：

- `assets/ref/brand-board.jpg` → `_design/ref/brand-board.jpg`
- `assets/teacher-original.jpg` → `_design/teacher-original.jpg`

robots.txt 按要求放在專案根目錄；GitHub Pages 專案子路徑的 robots.txt 不會取代網域根目錄 /robots.txt，搜尋引擎以網域根目錄規則為準。sitemap.xml 可直接提交完整網址。

### 字型第二輪（2026-10-28）

- CSS 保持來源 css/style.css，由 build 工具原樣嵌入首頁，移除首頁阻塞 CSS 請求；gzip 約 5.7 KB。
- 實測字型傳輸共 75,070 bytes：Serif 400 為 31,034、Serif 500 為 40,706、Allura 為 3,330；Google Fonts 回應大小可能隨服務更新改變。
- 本機 Lighthouse 98／100／100／100，FCP／LCP 約 1.9 秒；不是線上分數，也不代表 GitHub Pages 已達90。
- 畫面比較：node tools/compare.cjs fonts-before fonts-after；產物 _screens/hero-comparison-fonts-after.json。
- 未執行 git 或部署。部署後仍需以相同線上 mobile Lighthouse 設定驗證。
