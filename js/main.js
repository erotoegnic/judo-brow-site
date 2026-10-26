(function (root) {
  'use strict';

  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    return localDate(date) === value ? date : null;
  }

  function normalizePhone(value) {
    return String(value || '').replace(/[\s-]/g, '');
  }

  function buildBookingMessage(data) {
    const date = parseDate(data.date);
    if (!date) throw new RangeError('日期格式不正確');
    const optional = (value, fallback) => String(value || '').trim() || fallback;
    return [
      '【橘豆 預約申請】',
      `姓名：${String(data.name).trim()}`,
      `電話：${normalizePhone(data.phone)}`,
      `LINE ID：${optional(data.lineId, '未提供')}`,
      `服務項目：${data.service}`,
      `希望日期：${data.date.replace(/-/g, '/')}（週${'日一二三四五六'[date.getDay()]}）`,
      `希望時段：${data.time}`,
      `是否做過紋繡：${data.experience}`,
      `健康狀況告知：${Array.isArray(data.health) && data.health.length ? data.health.join('、') : '無'}`,
      `已閱讀預約前注意事項：${data.noticeRead === true ? '是' : '否'}`,
      `備註：${optional(data.notes, '無')}`
    ].join('\n');
  }

  function buildLineUrl(text, lineId = '@184kwhyi') {
    return `https://line.me/R/oaMessage/${lineId}/?${encodeURIComponent(text)}`;
  }

  function validateBooking(data, services, today = localDate()) {
    const errors = {};
    if (!String(data.name || '').trim()) errors.name = '請填寫姓名。';
    if (!/^09\d{8}$/.test(normalizePhone(data.phone))) errors.phone = '請填寫 09 開頭的 10 碼手機號碼，可包含空格或連字號。';
    if (!services.some(service => service.id === data.service)) errors.service = '請選擇服務項目。';
    if (!parseDate(data.date || '')) errors.date = '請選擇有效日期。';
    else if (data.date < today) errors.date = '希望日期不可早於今天，請重新選擇。';
    if (!['上午', '下午', '晚上'].includes(data.time)) errors.time = '請選擇希望時段。';
    if (!['是', '否'].includes(data.experience)) errors.experience = '請選擇是否做過紋繡。';
    if (data.noticeRead !== true) errors.noticeRead = '請先閱讀預約前注意事項，並勾選確認。';
    return errors;
  }

  root.JudoBooking = { buildBookingMessage, buildLineUrl, validateBooking, normalizePhone, localDate };
  if (!root.document) return;

  const document = root.document;
  const data = root.SITE_DATA;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const icons = {
    brow: '<path d="M3 13c5-8 13-8 18-1M4 16c5-5 11-6 16-2M6 11l1-2m3 0 1-2m3 1 1-1"/>',
    lip: '<path d="M2 12c4-1 6-6 10-2 4-4 6 1 10 2-6 9-14 9-20 0Zm0 0c6 2 14 2 20 0"/>',
    eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>',
    scalp: '<path d="M6 21v-4C0 8 7 2 13 3c6 0 8 5 7 10l2 3h-3v4h-5v2M7 8h.01M10 6h.01M13 6h.01M16 8h.01M9 10h.01M13 9h.01"/>',
    course: '<path d="m2 8 10-5 10 5-10 5L2 8Zm4 2v7c4 3 8 3 12 0v-7m4-2v9"/>',
    pin: '<path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0Z"/><circle cx="12" cy="9" r="2.5"/>',
    chat: '<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 11H2v6h4v-6H4Zm16 0h2v6h-4v-6h2ZM6 18c1 3 3 3 6 3m3-6h6v4h-2l-2 2v-2h-2v-4Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 5 3 3 5-5"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
    tiktok: '<path d="M14 3h3c0 3 2 4 4 4v3c-2 0-3-1-4-2v9a5 5 0 1 1-5-5v3a2 2 0 1 0 2 2V3Z"/>',
    threads: '<path d="M20 7c-1-4-4-5-8-5C6 2 3 6 3 12s3 10 9 10c5 0 9-3 9-7 0-3-3-5-7-5-3 0-5 1-5 3 0 3 6 4 7 0 1-4-1-7-4-7-2 0-3 1-4 2"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>',
    flower: '<path d="M12 22V10m0 8c-5 0-7-3-7-5 4 0 7 2 7 5Zm0-3c5 0 7-3 7-5-4 0-7 2-7 5Z"/><path d="M12 10C4 10 5 4 9 5c-1-5 6-5 6 0 4-1 5 5-3 5Z"/>'
  };
  function icon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.brow}</svg>`;
  }
  $$('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
  $$('[data-contact]').forEach(element => { element.href = data.contact[element.dataset.contact]; });
  $$('[data-setting]').forEach(element => { element.textContent = data.contact[element.dataset.setting]; });
  $('#location-map').src = data.contact.mapUrl;
  $('#deposit-rule').textContent = data.contact.depositRule;
  $('#touchup-rule').textContent = data.contact.touchupRule;
  $('#rules-status').hidden = !data.contact.rulesPending;
  $('#year').textContent = new Date().getFullYear();

  const schema = {
    '@context': 'https://schema.org', '@type': 'BeautySalon', name: data.contact.name,
    alternateName: data.contact.englishName,
    address: { '@type': 'PostalAddress', addressLocality: '前金區', addressRegion: '高雄市', addressCountry: 'TW' },
    areaServed: '高雄市前金區', sameAs: [data.contact.instagram, data.contact.tiktok, data.contact.threads]
  };
  if (data.contact.siteUrl) {
    schema.url = data.contact.siteUrl;
    const canonical = document.createElement('link');
    canonical.rel = 'canonical'; canonical.href = data.contact.siteUrl; document.head.append(canonical);
    const ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url'); ogUrl.content = data.contact.siteUrl; document.head.append(ogUrl);
    $('meta[property="og:image"]').content = new URL('assets/cases/case01.jpg', data.contact.siteUrl).href;
  }
  const schemaScript = document.createElement('script');
  schemaScript.type = 'application/ld+json'; schemaScript.textContent = JSON.stringify(schema); document.head.append(schemaScript);

  $('#service-list').innerHTML = data.services.map(service => `<article class="service-card"><span class="service-icon">${icon(service.category)}</span><h3>${escapeHTML(service.name)}</h3><p>${escapeHTML(service.description)}</p><p class="service-price">${escapeHTML(service.price === null ? '價格請洽官方 LINE' : service.price)}</p>${service.priceNote ? `<p class="price-note">${escapeHTML(service.priceNote)}</p>` : ''}<a href="#booking" class="text-link" data-service="${escapeHTML(service.id)}" aria-label="預約這項：${escapeHTML(service.name)}">預約這項 <span aria-hidden="true">↗</span></a></article>`).join('');
  const serviceSelect = $('#service');
  data.services.forEach(service => {
    const option = document.createElement('option'); option.value = service.id; option.textContent = service.name; serviceSelect.append(option);
  });
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    serviceSelect.value = link.dataset.service;
    serviceSelect.removeAttribute('aria-invalid'); $('#service-error').textContent = '';
    if ($('#booking-form').hidden) editBooking();
    serviceSelect.focus({ preventScroll: true });
  }));
  $('#faq-list').innerHTML = data.faq.map(item => `<details><summary>${escapeHTML(item.question)}</summary><p>${escapeHTML(item.answer)}</p></details>`).join('');

  const notices = data.bookingNotices;
  $('#notice-title').innerHTML = notices.title.split('｜').map((part, index) => `<span>${index ? '｜' : ''}${escapeHTML(part)}</span>`).join('');
  $('#notice-intro').textContent = notices.intro;
  $('#notice-outro').textContent = notices.outro;
  function noticeItem(text) {
    const colon = text.indexOf('：');
    return colon < 0 ? escapeHTML(text) : `<strong>${escapeHTML(text.slice(0, colon))}</strong>${escapeHTML(text.slice(colon))}`;
  }
  $('#notice-list').innerHTML = notices.groups.map(group => `<article class="booking-notice-card"><h3>${escapeHTML(group.no)} ${escapeHTML(group.title)}</h3><ul>${group.items.map(item => `<li>${noticeItem(item)}</li>`).join('')}</ul></article>`).join('');
  $('#health-options').innerHTML = data.healthOptions.map((option, index) => `<label for="health-${index}"><input id="health-${index}" type="checkbox" name="health" value="${escapeHTML(option)}"><span>${escapeHTML(option)}</span></label>`).join('');
  const videos = data.videos || [];
  $('#work-videos').hidden = videos.length === 0;
  $('#video-list').innerHTML = videos.map(video => `<a href="${escapeHTML(new URL(video.path, data.contact.tiktok.replace(/\/$/, '') + '/').href)}" target="_blank" rel="noopener">${icon('play')}<span>${escapeHTML(video.title)}</span><span class="video-arrow" aria-hidden="true">↗</span></a>`).join('');
  $('#testimonial-list').innerHTML = data.testimonials.map(item => `<figure class="quote-card"><blockquote><p>「${escapeHTML(item.quote)}」</p></blockquote><figcaption>— ${escapeHTML(item.attribution)}</figcaption></figure>`).join('');

  const menuToggle = $('.menu-toggle');
  const navigation = $('#navigation');
  function closeMenu() { menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', '開啟導覽選單'); navigation.classList.remove('open'); }
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open)); menuToggle.setAttribute('aria-label', open ? '關閉導覽選單' : '開啟導覽選單'); navigation.classList.toggle('open', open);
  });
  navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') { closeMenu(); menuToggle.focus(); } });
  root.matchMedia('(min-width:1024px)').addEventListener('change', closeMenu);

  let visibleCases = data.cases.slice();
  let caseIndex = 0;
  let opener = null;
  const lightbox = $('#lightbox');
  const caseUrl = item => new URL(item.path + '/', data.contact.instagram).href;
  function renderCases() {
    $('#case-list').innerHTML = visibleCases.map(item => `<article class="case-card"><a class="case-photo" href="${escapeHTML(caseUrl(item))}" data-case="${item.id}" aria-label="放大檢視：${escapeHTML(item.title)}" aria-haspopup="dialog"><img src="${item.image}" alt="${escapeHTML(item.alt)}" width="640" height="640" loading="lazy" decoding="async"></a><h3><a href="${escapeHTML(caseUrl(item))}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.title)}</a></h3><small>${item.tags.map(tag => tag === 'brow' ? 'BROW' : 'LIP').join(' · ')}</small></article>`).join('') || '<p>目前沒有此分類的作品。</p>';
    $('#gallery-status').textContent = `顯示 ${visibleCases.length} 件作品`;
  }
  function showCase() {
    const item = visibleCases[caseIndex];
    $('#lightbox-image').src = item.image; $('#lightbox-image').alt = item.alt;
    $('#lightbox-title').textContent = item.title; $('#lightbox-link').href = caseUrl(item);
    $('#lightbox-count').textContent = `${caseIndex + 1} / ${visibleCases.length}`;
  }
  function stepCase(step) { caseIndex = (caseIndex + step + visibleCases.length) % visibleCases.length; showCase(); }
  renderCases();
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    $$('[data-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    visibleCases = data.cases.filter(item => button.dataset.filter === 'all' || item.tags.includes(button.dataset.filter)); renderCases();
  }));
  $('#case-list').addEventListener('click', event => {
    const link = event.target.closest('[data-case]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof lightbox.showModal !== 'function') return;
    event.preventDefault(); opener = link; caseIndex = visibleCases.findIndex(item => item.id === link.dataset.case); showCase(); lightbox.showModal(); document.body.classList.add('modal-open'); $('#lightbox-close').focus();
  });
  $('#lightbox-close').addEventListener('click', () => lightbox.close());
  $('#lightbox-prev').addEventListener('click', () => stepCase(-1));
  $('#lightbox-next').addEventListener('click', () => stepCase(1));
  lightbox.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') { event.preventDefault(); stepCase(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); stepCase(1); } });
  lightbox.addEventListener('close', () => { document.body.classList.remove('modal-open'); if (opener?.isConnected) opener.focus(); });
  lightbox.addEventListener('click', event => { if (event.target === lightbox) { const bounds = lightbox.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) lightbox.close(); } });

  const form = $('#booking-form');
  const dateInput = $('#date');
  dateInput.min = localDate();
  dateInput.addEventListener('focus', () => { dateInput.min = localDate(); });
  let currentMessage = '';
  async function copyText(text) {
    try { if (root.navigator.clipboard?.writeText) { await root.navigator.clipboard.writeText(text); return true; } } catch {}
    const active = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.value = text; textarea.setAttribute('readonly', ''); textarea.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.append(textarea);
    let copied = false;
    try { textarea.focus(); textarea.select(); copied = document.execCommand('copy'); } catch {} finally { textarea.remove(); active?.focus({ preventScroll: true }); }
    return copied;
  }
  function editBooking() {
    $('#booking-confirmation').hidden = true; form.hidden = false; $('#name').focus({ preventScroll: true });
  }
  $('#edit-booking').addEventListener('click', editBooking);
  $('#copy-message').addEventListener('click', async () => {
    const copied = await copyText(currentMessage);
    $('#copy-status').textContent = copied ? '預約訊息已複製。' : '無法自動複製，請長按上方訊息手動複製，或直接點選「開啟 LINE 傳送」。';
    if (copied) $('#confirmation-title').textContent = '預約訊息已複製';
  });
  form.addEventListener('input', event => {
    const name = event.target.name;
    const error = document.getElementById(`${name}-error`);
    if (error) { error.textContent = ''; form.querySelectorAll(`[name="${name}"]`).forEach(field => field.removeAttribute('aria-invalid')); }
    $('#form-status').textContent = '';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    dateInput.min = localDate();
    const formData = new FormData(form);
    const values = { ...Object.fromEntries(formData.entries()), health: formData.getAll('health'), noticeRead: formData.has('noticeRead') };
    const errors = validateBooking(values, data.services);
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    form.querySelectorAll('.error').forEach(error => { error.textContent = ''; });
    Object.entries(errors).forEach(([name, message]) => {
      document.getElementById(`${name}-error`).textContent = message;
      form.querySelectorAll(`[name="${name}"]`).forEach(field => field.setAttribute('aria-invalid', 'true'));
    });
    if (Object.keys(errors).length) { $('#form-status').textContent = '請確認標示的欄位後再送出。'; form.querySelector('[aria-invalid="true"]').focus(); return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    currentMessage = buildBookingMessage({ ...values, service: data.services.find(service => service.id === values.service).name });
    const url = buildLineUrl(currentMessage, data.contact.lineId);
    $('#message-preview').textContent = currentMessage; $('#send-line').href = url;
    const copied = await copyText(currentMessage);
    $('#confirmation-title').textContent = copied ? '預約訊息已複製' : '預約訊息已產生';
    $('#copy-status').textContent = copied ? '' : '瀏覽器未允許複製。請長按預覽文字手動複製，或點選「開啟 LINE 傳送」。';
    form.hidden = true; $('#booking-confirmation').hidden = false; submit.disabled = false;
    $('#confirmation-title').focus();
    try { root.open(url, '_blank', 'noopener,noreferrer'); } catch {}
  });
  form.hidden = false;
})(typeof window !== 'undefined' ? window : globalThis);
