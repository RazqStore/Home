/* =========================================================
   المتجر — السكربت الرئيسي (واجهة + سلة + دخول ديسكورد)
   ========================================================= */
(function () {
  'use strict';

  const CFG = window.STORE_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };
  const ALPHA = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const uid = (n = 8) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHA[b % ALPHA.length]).join('');

  const FONTS = {
    'IBM Plex Sans Arabic': '400;500;600;700',
    'Rubik': '400;500;600;700;800',
    'Tajawal': '400;500;700;800',
    'Cairo': '400;500;600;700;800',
    'Readex Pro': '400;500;600;700',
    'Almarai': '400;700;800',
    'Noto Kufi Arabic': '400;500;600;700;800',
    'Alexandria': '400;500;600;700;800',
  };

  const DISCORD_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>';

  const Pages = {};
  const App = (window.App = {
    data: null, user: LS.get('discord_user', null), page: null,
    CFG, $, $$, esc, LS, qs, icons, uid, FONTS, DISCORD_SVG, Pages,
  });

  /* ---------------- بيانات المتجر ---------------- */
  const S = () => App.data.settings || {};
  const allProducts = () => App.data.products || [];
  const products = () => allProducts().filter((p) => p.active !== false);
  const product = (id) => allProducts().find((p) => p.id === id);
  const categories = () => App.data.categories || [];

  function cur() {
    const list = App.data.currencies || [];
    const code = LS.get('currency', null) || S().defaultCurrency || (list[0] && list[0].code);
    return list.find((c) => c.code === code) || list[0] || { code: 'SAR', symbol: 'ر.س', rate: 1 };
  }
  function fmt(v) {
    const c = cur();
    const n = (Number(v) || 0) * (Number(c.rate) || 1);
    return `${n.toFixed(c.decimals == null ? 2 : c.decimals)} ${c.symbol || c.code}`;
  }
  const minPrice = (p) => (p.options && p.options.length ? Math.min(...p.options.map((o) => +o.price || 0)) : +p.price || 0);
  const priceLabel = (p) => (p.options && p.options.length > 1 ? `<span class="from">يبدأ من</span> ${fmt(minPrice(p))}` : fmt(minPrice(p)));
  const flagImg = (c) => (c && c.flag ? `<img class="flag" src="https://flagcdn.com/w40/${esc(c.flag)}.png" alt="" loading="lazy">` : '');

  function media(p, pill = true) {
    if (p.image) return `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`;
    return `<div class="ph"><i data-lucide="${esc(p.icon || 'package')}"></i>${pill && p.label ? `<span class="p-pill">${esc(p.label)}</span>` : ''}</div>`;
  }
  const thumb = (p) => `<span class="thumb">${media(p, false)}</span>`;

  /* ---------------- المظهر ---------------- */
  function applySettings() {
    const s = S();
    const root = document.documentElement;
    const font = FONTS[s.font] ? s.font : 'IBM Plex Sans Arabic';
    const href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@${FONTS[font]}&display=swap`;
    const link = $('#font-link');
    if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);
    root.style.setProperty('--font', `'${font}'`);
    if (s.primaryColor) root.style.setProperty('--primary', s.primaryColor);
    const t = document.body.dataset.title;
    document.title = t ? `${t} | ${s.name}` : s.name || 'المتجر';
    if (s.logo) {
      let fav = $('link[rel="icon"]');
      if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
      fav.href = s.logo;
    }
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    LS.set('theme', t);
    const b = $('#theme-btn');
    if (b) { b.innerHTML = `<i data-lucide="${t === 'dark' ? 'sun' : 'moon'}"></i>`; icons(); }
  }
  const logoHTML = () => (S().logo ? `<img src="${esc(S().logo)}" alt="${esc(S().name)}">` : `<i data-lucide="${esc(S().logoIcon || 'sparkles')}"></i>`);

  /* ---------------- الهيدر والفوتر ---------------- */
  function renderHeader() {
    const c = cur();
    const u = App.user;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $('#site-header').innerHTML = `
    <div class="container header-inner">
      <div class="h-group">
        <button class="icon-btn" data-open="menu" aria-label="القائمة"><span class="burger"><span></span><span></span></span></button>
        <div class="cur-wrap">
          <button class="cur-btn" data-open="currency" aria-label="العملة">${flagImg(c)}<span>${esc(c.code)}</span><i data-lucide="chevron-down"></i></button>
          <div class="cur-menu" id="cur-menu">${(App.data.currencies || []).map((x) => `
            <button class="cur-item ${x.code === c.code ? 'active' : ''}" data-cur="${esc(x.code)}">${flagImg(x)}<span class="cur-name">${esc(x.name)}</span><span class="cur-code">${esc(x.code)}</span></button>`).join('')}
          </div>
        </div>
        <button class="icon-btn" id="theme-btn" data-action="theme" aria-label="الوضع الليلي"><i data-lucide="${dark ? 'sun' : 'moon'}"></i></button>
      </div>
      <a href="index.html" class="logo" aria-label="${esc(S().name)}">${logoHTML()}</a>
      <div class="h-group end">
        <button class="icon-btn" data-open="search" aria-label="بحث"><i data-lucide="search"></i></button>
        <button class="icon-btn" data-open="account" aria-label="حسابي">${u ? `<img class="h-avatar" src="${esc(avatar(u))}" alt="">` : '<i data-lucide="user"></i>'}</button>
        <a class="icon-btn" href="cart.html" aria-label="السلة"><i data-lucide="shopping-bag"></i><span class="badge" data-badge hidden>0</span></a>
      </div>
    </div>`;
  }

  function renderFooter() {
    const s = S();
    const contacts = [];
    if (s.telegram) contacts.push(['Telegram', s.telegram, 'send']);
    if (s.discordInvite && s.discordInvite.replace(/\/+$/, '') !== 'https://discord.gg') contacts.push(['Discord', s.discordInvite, 'discord']);
    if (s.whatsapp) contacts.push(['Whatsapp', 'https://wa.me/' + String(s.whatsapp).replace(/\D/g, ''), 'message-circle']);
    if (s.phone) contacts.push([s.phone, 'tel:' + String(s.phone).replace(/\s/g, ''), 'phone']);
    $('#site-footer').innerHTML = `
    <div class="footer">
      <div class="container">
        <button class="to-top" data-action="top"><i data-lucide="arrow-up"></i> العودة إلى الأعلى</button>
        <div class="f-grid">
          <div class="f-about"><a href="index.html" class="logo logo-lg">${logoHTML()}</a><p>${esc(s.description)}</p></div>
          <div><h4>روابط سريعة</h4><ul class="f-links">
            <li><a href="index.html">الرئيسية</a></li>
            ${categories().map((c) => `<li><a href="index.html?cat=${esc(c.id)}#products">${esc(c.name)}</a></li>`).join('')}
            <li><a href="cart.html">سلة التسوق</a></li>
          </ul></div>
          ${contacts.length ? `<div><h4>تواصل معنا</h4><ul class="f-contact">${contacts.map(([l, h, ic]) => `
            <li><a href="${esc(h)}" ${ic === 'phone' ? '' : 'target="_blank" rel="noopener"'}><span class="f-ic">${ic === 'discord' ? DISCORD_SVG : `<i data-lucide="${ic}"></i>`}</span><span dir="ltr">${esc(l)}</span></a></li>`).join('')}
          </ul></div>` : ''}
        </div>
      </div>
      <div class="f-bottom"><div class="container f-bottom-inner">
        <div class="pay">${(s.paymentMethods || []).length ? '<span>طرق الدفع</span>' : ''}${(s.paymentMethods || []).map((m) => `<span class="pay-chip">${esc(m)}</span>`).join('')}</div>
        <div class="copy">${esc(s.name)} ${new Date().getFullYear()} ©</div>
      </div></div>
    </div>`;
  }

  function renderBottomNav() {
    let nav = $('#bnav');
    if (!nav) { nav = document.createElement('nav'); nav.id = 'bnav'; nav.className = 'bnav'; document.body.appendChild(nav); }
    const p = App.page;
    nav.innerHTML = `
      <a href="index.html" class="${p === 'home' ? 'active' : ''}"><i data-lucide="house"></i>الرئيسية</a>
      <button data-open="menu"><i data-lucide="layout-grid"></i>التصنيفات</button>
      <a href="cart.html" class="${p === 'cart' ? 'active' : ''}"><i data-lucide="shopping-bag"></i>السلة<span class="badge" data-badge hidden>0</span></a>
      <button data-open="account"><i data-lucide="user"></i>حسابي</button>`;
  }

  function renderUI() {
    if ($('#ui-root')) return;
    const root = document.createElement('div');
    root.id = 'ui-root';
    root.innerHTML = `
      <div class="overlay" id="overlay" data-close></div>
      <aside class="drawer" id="drawer" aria-label="القائمة الرئيسية"></aside>
      <div class="modal" id="m-login"><div class="modal-box" id="login-box"></div></div>
      <div class="modal" id="m-account"><div class="modal-box" id="account-box"></div></div>
      <div class="modal modal-top" id="m-search"><div class="modal-box modal-wide">
        <div class="search-row"><i data-lucide="search"></i><input id="search-input" type="search" placeholder="ابحث عن منتج..." autocomplete="off"><button class="sq-btn" data-close aria-label="إغلاق"><i data-lucide="x"></i></button></div>
        <ul class="s-results" id="search-results"></ul>
      </div></div>
      <div class="modal" id="m-generic"><div class="modal-box" id="generic-box"></div></div>
      <div class="toasts" id="toasts"></div>`;
    document.body.appendChild(root);
    $('#search-input').addEventListener('input', (e) => renderSearch(e.target.value));
  }

  function renderShell() {
    renderHeader();
    renderFooter();
    renderBottomNav();
    renderUI();
    updateBadge();
  }

  /* ---------------- النوافذ ---------------- */
  function closeAll() {
    $$('.modal.open,.drawer.open,.overlay.open,.cur-menu.open').forEach((el) => el.classList.remove('open'));
    document.body.classList.remove('lock');
  }
  function showModal(id) {
    closeAll();
    $('#' + id).classList.add('open');
    document.body.classList.add('lock');
    icons();
  }
  function openGeneric(html) {
    $('#generic-box').innerHTML = `<button class="modal-close" data-close aria-label="إغلاق"><i data-lucide="x"></i></button>${html}`;
    showModal('m-generic');
    return $('#generic-box');
  }

  function open(name) {
    if (name === 'currency') { const m = $('#cur-menu'); const was = m.classList.contains('open'); closeAll(); if (!was) m.classList.add('open'); return; }
    if (name === 'menu') {
      $('#drawer').innerHTML = `
        <div class="drawer-head"><span>القائمة الرئيسية</span><button class="sq-btn" data-close aria-label="إغلاق"><i data-lucide="x"></i></button></div>
        <ul class="drawer-list">
          <li><a href="index.html"><span class="d-ic"><i data-lucide="house"></i></span>الرئيسية</a></li>
          ${categories().map((c) => `<li><a href="index.html?cat=${esc(c.id)}#products" data-close-nav>${thumb({ name: c.name, image: c.image, icon: c.icon || 'folder' })}${esc(c.name)}</a></li>`).join('')}
          <li><a href="cart.html"><span class="d-ic"><i data-lucide="shopping-bag"></i></span>سلة التسوق</a></li>
          ${App.isOwner() ? `<li><a href="admin.html"><span class="d-ic"><i data-lucide="layout-dashboard"></i></span>لوحة التحكم</a></li>` : ''}
        </ul>`;
      closeAll();
      $('#drawer').classList.add('open');
      $('#overlay').classList.add('open');
      document.body.classList.add('lock');
      icons();
      return;
    }
    if (name === 'search') { showModal('m-search'); renderSearch($('#search-input').value); setTimeout(() => $('#search-input').focus(), 50); return; }
    if (name === 'account' && App.user) { renderAccount(); showModal('m-account'); return; }
    // login
    $('#login-box').innerHTML = `
      <button class="modal-close" data-close aria-label="إغلاق"><i data-lucide="x"></i></button>
      <div class="m-head"><div class="m-avatar"><i data-lucide="user"></i></div><h3>تسجيل الدخول</h3>
      <p class="muted">سجّل دخولك بحساب الديسكورد لإتمام طلباتك ومتابعتها</p></div>
      <button class="btn btn-discord btn-block btn-lg" data-action="login">${DISCORD_SVG} الدخول عبر Discord</button>
      <div class="sep"><span>آمن وسريع</span></div>
      <p class="tiny">نستخدم اسمك وصورتك في ديسكورد فقط للتعرّف على طلبك، ولا نطّلع على كلمة المرور.</p>`;
    showModal('m-login');
  }

  function renderSearch(q) {
    const box = $('#search-results');
    q = (q || '').trim().toLowerCase();
    const list = products().filter((p) => !q || (p.name + ' ' + (p.description || '') + ' ' + (p.label || '')).toLowerCase().includes(q)).slice(0, 12);
    box.innerHTML = list.length
      ? list.map((p) => `<li><a href="product.html?id=${esc(p.id)}">${thumb(p)}<div><div class="s-name">${esc(p.name)}</div><div class="s-price">${priceLabel(p)}</div></div></a></li>`).join('')
      : '<li class="empty">لا توجد نتائج</li>';
    icons();
  }

  function renderAccount() {
    const u = App.user;
    const orders = LS.get('orders', []);
    $('#account-box').innerHTML = `
      <button class="modal-close" data-close aria-label="إغلاق"><i data-lucide="x"></i></button>
      <div class="m-head"><div class="m-avatar"><img src="${esc(avatar(u))}" alt=""></div><h3>${esc(u.name)}</h3><p class="muted" dir="ltr">@${esc(u.username)}</p></div>
      ${App.isOwner() ? `<a class="btn btn-primary btn-block" href="admin.html" style="margin-bottom:16px"><i data-lucide="layout-dashboard"></i> لوحة التحكم</a>` : ''}
      <div class="sec-label">طلباتي الأخيرة</div>
      ${orders.length ? `<ul class="acc-orders">${orders.slice(0, 10).map((o) => `<li><span><b>#${esc(o.id)}</b> · ${new Date(o.date).toLocaleDateString('ar')}</span><span>${esc(o.totalText || '')}</span></li>`).join('')}</ul>` : '<p class="muted" style="font-size:13px;margin:8px 0 18px">لا توجد طلبات بعد</p>'}
      ${S().discordInvite ? `<a class="btn btn-discord btn-block" href="${esc(S().discordInvite)}" target="_blank" rel="noopener" style="margin-bottom:10px">${DISCORD_SVG} سيرفر الديسكورد</a>` : ''}
      <button class="btn btn-ghost btn-block" data-action="logout"><i data-lucide="log-out"></i> تسجيل الخروج</button>`;
  }

  function toast(msg, type = 'info') {
    const box = $('#toasts');
    if (!box) { alert(msg); return; }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<i data-lucide="${type === 'error' ? 'circle-alert' : type === 'success' ? 'circle-check' : 'info'}"></i><span>${esc(msg)}</span>`;
    box.appendChild(el);
    icons();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3400);
  }

  /* ---------------- تسجيل الدخول عبر ديسكورد ---------------- */
  function avatar(u) {
    if (u.avatar) return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`;
    let i = 0;
    try { i = Number((BigInt(u.id) >> 22n) % 6n); } catch (e) {}
    return `https://cdn.discordapp.com/embed/avatars/${i}.png`;
  }
  const redirectUri = () => new URL('auth.html', location.href).href.split('#')[0].split('?')[0];
  function login() {
    if (!CFG.discordClientId) { toast('لم يتم ضبط Discord Client ID في ملف config.js', 'error'); return; }
    const state = uid(16);
    LS.set('oauth_state', state);
    if (App.page !== 'auth') LS.set('return_to', location.href);
    const p = new URLSearchParams({ client_id: CFG.discordClientId, response_type: 'token', redirect_uri: redirectUri(), scope: 'identify email', state, prompt: 'none' });
    location.href = 'https://discord.com/oauth2/authorize?' + p.toString();
  }
  function logout() {
    LS.del('discord_user');
    App.user = null;
    closeAll();
    toast('تم تسجيل الخروج');
    App.render();
  }
  App.isOwner = () => !!App.user && (CFG.ownerDiscordIds || []).map(String).filter(Boolean).includes(String(App.user.id));

  /* ---------------- السلة ---------------- */
  const Cart = (App.Cart = {
    raw() { return LS.get('cart', []); },
    items() { return this.raw().filter((i) => { const p = product(i.pid); return p && p.active !== false; }); },
    save(c) { LS.set('cart', c); updateBadge(true); },
    add(pid, opt = null, qty = 1) {
      const c = this.raw();
      const key = `${pid}:${opt == null ? '' : opt}`;
      const f = c.find((i) => i.key === key);
      if (f) f.qty += qty; else c.push({ key, pid, opt, qty, fields: {} });
      this.save(c);
    },
    setQty(key, q) { const c = this.raw(); const f = c.find((i) => i.key === key); if (f) { f.qty = Math.max(1, Math.min(99, q)); this.save(c); } },
    remove(key) { this.save(this.raw().filter((i) => i.key !== key)); },
    setField(key, label, val) { const c = this.raw(); const f = c.find((i) => i.key === key); if (f) { f.fields = f.fields || {}; f.fields[label] = val; LS.set('cart', c); } },
    clear() { this.save([]); },
    count() { return this.items().reduce((a, i) => a + i.qty, 0); },
    unit(i) { const p = product(i.pid); if (!p) return 0; if (i.opt != null && p.options && p.options[i.opt]) return +p.options[i.opt].price || 0; return +p.price || 0; },
    subtotal() { return this.items().reduce((a, i) => a + this.unit(i) * i.qty, 0); },
    coupon() { const code = LS.get('coupon', null); if (!code) return null; return (App.data.coupons || []).find((c) => c.active !== false && c.code && c.code.toLowerCase() === String(code).toLowerCase()) || null; },
    discount() { const c = this.coupon(); if (!c) return 0; const s = this.subtotal(); const d = c.type === 'fixed' ? +c.value : (s * (+c.value || 0)) / 100; return Math.min(s, Math.max(0, d)); },
    total() { return this.subtotal() - this.discount(); },
  });
  function updateBadge(bump) {
    const n = App.data ? Cart.count() : 0;
    $$('[data-badge]').forEach((b) => { b.textContent = n > 99 ? '99+' : n; b.hidden = !n; if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } });
  }
  function quickAdd(id) {
    const p = product(id);
    if (!p) return;
    if (p.options && p.options.length > 1) { location.href = `product.html?id=${encodeURIComponent(id)}`; return; }
    Cart.add(id, p.options && p.options.length === 1 ? 0 : null);
    toast('تمت الإضافة إلى السلة', 'success');
  }
  function toggleFav(id, btn) {
    let f = LS.get('favs', []);
    const on = !f.includes(id);
    f = on ? [...f, id] : f.filter((x) => x !== id);
    LS.set('favs', f);
    $$(`[data-fav="${CSS.escape(id)}"]`).forEach((b) => b.classList.toggle('on', on));
    toast(on ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة');
  }

  /* ---------------- الأحداث العامة ---------------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-open],[data-close],[data-action],[data-cur],[data-fav],[data-add]');
    if (!e.target.closest('.cur-wrap')) { const m = $('#cur-menu'); if (m) m.classList.remove('open'); }
    if (!el) { if (e.target.classList && e.target.classList.contains('modal')) closeAll(); return; }
    if (el.hasAttribute('data-close')) { closeAll(); return; }
    if (el.dataset.open) { e.preventDefault(); open(el.dataset.open); return; }
    if (el.dataset.cur) { LS.set('currency', el.dataset.cur); closeAll(); App.render(); return; }
    if (el.dataset.fav) { e.preventDefault(); toggleFav(el.dataset.fav, el); return; }
    if (el.dataset.add) { e.preventDefault(); quickAdd(el.dataset.add); return; }
    const a = el.dataset.action;
    if (a === 'theme') setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    else if (a === 'login') login();
    else if (a === 'logout') logout();
    else if (a === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (a === 'review') openReview();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  /* ---------------- مكونات مشتركة ---------------- */
  function productCard(p) {
    const fav = LS.get('favs', []).includes(p.id);
    return `
    <article class="p-card">
      <a class="p-media" href="product.html?id=${esc(p.id)}">${media(p)}</a>
      <button class="fav-btn ${fav ? 'on' : ''}" data-fav="${esc(p.id)}" aria-label="المفضلة"><i data-lucide="heart"></i></button>
      <div class="p-body">
        <a class="p-name" href="product.html?id=${esc(p.id)}">${esc(p.name)}</a>
        <div class="p-price">${priceLabel(p)}</div>
        <button class="btn btn-primary btn-block" data-add="${esc(p.id)}">أضف للسلة</button>
      </div>
    </article>`;
  }
  function related(p) {
    let list = products().filter((x) => !p || x.id !== p.id);
    if (p) list.sort((a, b) => (b.category === p.category) - (a.category === p.category));
    list = list.slice(0, 4);
    if (!list.length) return '';
    return `<section class="section"><h2 class="section-title">قد يعجبك أيضاً</h2><div class="grid">${list.map(productCard).join('')}</div></section>`;
  }
  function featuresHTML() {
    const f = S().features || [];
    if (!f.length) return '';
    return `<section class="section container"><h2 class="section-title">لماذا تختارنا</h2><div class="features">${f.map((x) => `
      <div class="feature"><div class="f-icon"><i data-lucide="${esc(x.icon || 'star')}"></i></div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join('')}</div></section>`;
  }
  const stars = (n) => '★'.repeat(Math.max(1, Math.min(5, +n || 5))) + '☆'.repeat(5 - Math.max(1, Math.min(5, +n || 5)));
  function reviewsHTML() {
    const r = App.data.reviews || [];
    return `<section class="section container"><h2 class="section-title">آراء العملاء</h2>
      <div class="rv-head">
        <div class="rv-meta"><span>${r.length} تقييم</span><button class="chip" data-action="review"><i data-lucide="pen-line" style="width:14px;height:14px"></i> أضف تقييمك</button></div>
        ${r.length > 3 ? `<div class="rv-arrows"><button class="round-btn" data-rv="1" aria-label="السابق"><i data-lucide="chevron-right"></i></button><button class="round-btn" data-rv="-1" aria-label="التالي"><i data-lucide="chevron-left"></i></button></div>` : ''}
      </div>
      ${r.length ? `<div class="rv-track" id="rv-track">${r.map((x) => `
        <div class="rv-card"><div class="rv-top"><span class="rv-letter">${esc((x.name || '?').trim().charAt(0))}</span><div><div class="rv-name">${esc(x.name)}</div><div class="stars">${stars(x.rating)}</div></div></div><p class="rv-text">${esc(x.text)}</p></div>`).join('')}</div>`
        : '<p class="empty">كن أول من يقيّم المتجر ✨</p>'}
    </section>`;
  }
  function bindReviews() {
    const tr = $('#rv-track');
    if (!tr) return;
    $$('[data-rv]').forEach((b) => { b.onclick = () => { const c = tr.querySelector('.rv-card'); const w = c ? c.offsetWidth + 16 : 260; tr.scrollBy({ left: Number(b.dataset.rv) * w, behavior: 'smooth' }); }; });
  }

  async function sendWebhook(payload) {
    const url = S().discordWebhook;
    if (!url) return false;
    try {
      const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'wait=true', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return r.ok;
    } catch (e) { return false; }
  }
  App.sendWebhook = sendWebhook;
  const colorInt = () => parseInt(String(S().primaryColor || '#3b82f6').replace('#', ''), 16) || 0x3b82f6;

  function openReview() {
    if (!App.user) { open('login'); toast('سجّل دخولك لإضافة تقييم'); return; }
    if (!S().discordWebhook) { toast('التقييمات غير مفعّلة حالياً', 'error'); return; }
    let rating = 5;
    const box = openGeneric(`
      <div class="m-head"><div class="m-avatar"><i data-lucide="star"></i></div><h3>قيّم تجربتك</h3><p class="muted">سيظهر تقييمك بعد مراجعته من الإدارة</p></div>
      <div class="star-pick">${[1, 2, 3, 4, 5].map((i) => `<button data-star="${i}" class="on" aria-label="${i}">★</button>`).join('')}</div>
      <textarea class="input" id="rv-text" rows="3" maxlength="300" placeholder="اكتب رأيك..."></textarea>
      <button class="btn btn-primary btn-block btn-lg" id="rv-send" style="margin-top:14px">إرسال التقييم</button>`);
    $$('[data-star]', box).forEach((b) => (b.onclick = () => { rating = +b.dataset.star; $$('[data-star]', box).forEach((x) => x.classList.toggle('on', +x.dataset.star <= rating)); }));
    $('#rv-send', box).onclick = async (ev) => {
      const text = $('#rv-text', box).value.trim();
      if (text.length < 2) { $('#rv-text', box).classList.add('error'); return; }
      ev.currentTarget.classList.add('loading');
      const ok = await sendWebhook({ username: S().name, allowed_mentions: { parse: [] }, embeds: [{ title: '⭐ تقييم جديد بانتظار الموافقة', color: colorInt(), fields: [{ name: 'العميل', value: `<@${App.user.id}> — ${App.user.name}` }, { name: 'التقييم', value: '★'.repeat(rating) + ` (${rating}/5)` }, { name: 'النص', value: text.slice(0, 1000) }], footer: { text: 'أضِفه من لوحة التحكم ← التقييمات' }, timestamp: new Date().toISOString() }] });
      closeAll();
      toast(ok ? 'شكراً لك! وصل تقييمك ✨' : 'تعذّر إرسال التقييم، حاول لاحقاً', ok ? 'success' : 'error');
    };
  }

  /* ---------------- الصفحات ---------------- */
  Pages.home = function () {
    const s = S();
    const cat = qs('cat');
    const catObj = categories().find((c) => c.id === cat);
    let list = products();
    if (catObj) list = list.filter((p) => p.category === cat);
    $('#app').innerHTML = `
      <section class="hero container">
        <h1>${esc(s.name)}</h1>
        <p>${esc(s.description)}</p>
        <a href="#products" class="btn btn-primary btn-hero">${esc(s.heroButton || 'تسوق الآن')}</a>
      </section>
      <section id="products" class="section container" style="scroll-margin-top:90px">
        <h2 class="section-title">${catObj ? esc(catObj.name) : 'منتجاتنا'}</h2>
        ${catObj ? '<div class="center mb"><a href="index.html#products" class="chip">عرض كل المنتجات</a></div>' : ''}
        ${list.length ? `<div class="grid">${list.map(productCard).join('')}</div>` : '<p class="empty">لا توجد منتجات حالياً</p>'}
      </section>
      ${!catObj && categories().length ? `<section class="section container"><h2 class="section-title">التصنيفات</h2><div class="cat-grid">${categories().map((c) => `
        <a class="cat-card" href="index.html?cat=${esc(c.id)}#products">${thumb({ name: c.name, image: c.image, icon: c.icon || 'folder' })}<span>${esc(c.name)}</span></a>`).join('')}</div></section>` : ''}
      ${featuresHTML()}
      ${reviewsHTML()}`;
    bindReviews();
  };

  Pages.product = function () {
    const p = product(qs('id'));
    if (!p || p.active === false) {
      $('#app').innerHTML = `<div class="container page"><div class="card empty-cart"><div class="e-ic"><i data-lucide="package-x"></i></div><h3>المنتج غير موجود</h3><p>ربما تم حذفه أو تغيير رابطه</p><a class="btn btn-primary" href="index.html">العودة للمتجر</a></div></div>`;
      return;
    }
    document.title = `${p.name} | ${S().name}`;
    const cat = categories().find((c) => c.id === p.category);
    const hasOpts = p.options && p.options.length;
    let opt = hasOpts ? 0 : null;
    let qty = 1;
    const draw = () => {
      const price = opt != null ? +p.options[opt].price : +p.price;
      $('#app').innerHTML = `
      <div class="container page">
        <nav class="crumbs"><a href="index.html">الرئيسية</a><span>/</span>${cat ? `<a href="index.html?cat=${esc(cat.id)}#products">${esc(cat.name)}</a><span>/</span>` : ''}<b>${esc(p.name)}</b></nav>
        <div class="pd">
          <div class="pd-media">${media(p)}</div>
          <div class="pd-info">
            <h1>${esc(p.name)}</h1>
            <div class="pd-price">${fmt(price)}</div>
            ${hasOpts ? `<div class="pd-block"><div class="pd-label">اختر الباقة</div><div class="opts">${p.options.map((o, i) => `<button class="opt ${i === opt ? 'active' : ''}" data-opt="${i}"><span>${esc(o.name)}</span><small>${fmt(o.price)}</small></button>`).join('')}</div></div>` : ''}
            ${p.description ? `<div class="pd-desc">${esc(p.description).replace(/\n/g, '<br>')}</div>` : ''}
            <div class="pd-buy">
              <div class="qty qty-lg"><button data-q="1" aria-label="زيادة">+</button><span>${qty}</span><button data-q="-1" aria-label="نقص">-</button></div>
              <button class="btn btn-primary btn-lg grow" id="pd-add"><i data-lucide="shopping-bag"></i> أضف للسلة</button>
            </div>
            <button class="btn btn-soft btn-block btn-lg" id="pd-buy">اشترِ الآن</button>
            <ul class="pd-perks">
              <li><i data-lucide="zap"></i> تسليم سريع بعد تأكيد الدفع</li>
              <li><i data-lucide="message-circle"></i> الدفع والاستلام عبر تذكرة في سيرفر الديسكورد</li>
              <li><i data-lucide="shield-check"></i> بياناتك محمية بالكامل</li>
            </ul>
          </div>
        </div>
        ${related(p)}
      </div>`;
      $$('[data-opt]').forEach((b) => (b.onclick = () => { opt = +b.dataset.opt; draw(); icons(); }));
      $$('[data-q]').forEach((b) => (b.onclick = () => { qty = Math.max(1, Math.min(99, qty + +b.dataset.q)); $('.pd-buy .qty span').textContent = qty; }));
      $('#pd-add').onclick = () => { Cart.add(p.id, opt, qty); toast('تمت الإضافة إلى السلة', 'success'); };
      $('#pd-buy').onclick = () => { Cart.add(p.id, opt, qty); location.href = 'cart.html'; };
    };
    draw();
  };

  Pages.cart = function () {
    const items = Cart.items();
    const app = $('#app');
    const head = `<nav class="crumbs"><a href="index.html">الرئيسية</a><span>/</span><b>سلة التسوق</b></nav><h1 class="page-title">سلة التسوق</h1>`;
    if (!items.length) {
      app.innerHTML = `<div class="container narrow page">${head}
        <div class="card empty-cart"><div class="e-ic"><i data-lucide="shopping-bag"></i></div><h3>سلتك فارغة</h3><p>تصفّح منتجاتنا وأضف ما يعجبك</p><a class="btn btn-primary" href="index.html#products">متابعة التسوق</a></div>
        ${related(null)}</div>`;
      return;
    }
    const coupon = Cart.coupon();
    const user = App.user;
    app.innerHTML = `
    <div class="container narrow page">${head}
      <div class="card">${items.map((i) => {
        const p = product(i.pid);
        const o = i.opt != null && p.options && p.options[i.opt];
        const unit = Cart.unit(i);
        return `
        <div class="cart-item" data-key="${esc(i.key)}">
          <a class="ci-img" href="product.html?id=${esc(p.id)}">${media(p, false)}</a>
          <div class="ci-info">
            <a class="ci-name" href="product.html?id=${esc(p.id)}">${esc(p.name)}</a>
            ${o ? `<div class="ci-opt">الباقة: ${esc(o.name)}</div>` : ''}
            ${p.note ? `<div class="ci-note">${esc(p.note)}</div>` : ''}
            ${(p.fields || []).map((f) => {
              let v = (i.fields || {})[f.label];
              if (v == null && f.type === 'email' && user && user.email) v = user.email;
              return `<input class="input input-sm" data-field="${esc(f.label)}" data-type="${esc(f.type || 'text')}" ${f.required !== false ? 'data-req' : ''} type="${f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'}" placeholder="${esc(f.placeholder || f.label)}" value="${esc(v || '')}" dir="auto">`;
            }).join('')}
            <div class="ci-unit">${fmt(unit)}</div>
            <div class="ci-actions">
              <div class="qty"><button data-qty="1" aria-label="زيادة">+</button><span>${i.qty}</span><button data-qty="-1" aria-label="نقص">-</button></div>
              <button class="link-danger" data-remove>حذف</button>
            </div>
          </div>
          <div class="ci-total">${fmt(unit * i.qty)}</div>
        </div>`;
      }).join('')}</div>

      <div class="card">
        <div class="card-title">كوبون الخصم</div>
        ${coupon ? `<div class="coupon-on"><span><i data-lucide="ticket-percent" style="width:16px;height:16px;vertical-align:-3px"></i> <b dir="ltr">${esc(coupon.code)}</b> — خصم ${coupon.type === 'fixed' ? fmt(coupon.value) : esc(coupon.value) + '%'}</span><button class="link-danger" id="cp-remove">إزالة</button></div>`
        : `<div class="coupon-row"><input class="input" id="cp-input" placeholder="أدخل كود الخصم" dir="auto"><button class="btn btn-primary" id="cp-apply" disabled>تطبيق</button></div>`}
      </div>

      <div class="card">
        <div class="sum-row"><span class="muted">المجموع الفرعي</span><b>${fmt(Cart.subtotal())}</b></div>
        ${Cart.discount() ? `<div class="sum-row disc"><span>الخصم</span><b>- ${fmt(Cart.discount())}</b></div>` : ''}
        <div class="sum-total"><span>المجموع</span><b>${fmt(Cart.total())}</b></div>
        <button class="btn btn-primary btn-block btn-lg" id="checkout">إتمام الشراء</button>
        <div class="sum-hint">${DISCORD_SVG}<span>${user ? `مسجّل باسم ${esc(user.name)} — ` : ''}يتم الدفع عبر تذكرة في سيرفر الديسكورد</span></div>
        <a class="cont-link" href="index.html#products">متابعة التسوق</a>
      </div>
      ${related(null)}
    </div>`;

    $$('.cart-item').forEach((row) => {
      const key = row.dataset.key;
      $$('[data-qty]', row).forEach((b) => (b.onclick = () => { const it = Cart.raw().find((x) => x.key === key); Cart.setQty(key, (it ? it.qty : 1) + +b.dataset.qty); App.render(); }));
      $('[data-remove]', row).onclick = () => { Cart.remove(key); App.render(); };
      $$('[data-field]', row).forEach((inp) => {
        Cart.setField(key, inp.dataset.field, inp.value);
        inp.oninput = () => { inp.classList.remove('error'); Cart.setField(key, inp.dataset.field, inp.value.trim()); };
      });
    });
    const ci = $('#cp-input');
    if (ci) {
      ci.oninput = () => { $('#cp-apply').disabled = !ci.value.trim(); };
      const apply = () => {
        const code = ci.value.trim();
        const c = (App.data.coupons || []).find((x) => x.active !== false && x.code && x.code.toLowerCase() === code.toLowerCase());
        if (!c) { ci.classList.add('error'); toast('كود الخصم غير صحيح', 'error'); return; }
        LS.set('coupon', c.code); toast('تم تطبيق الكوبون', 'success'); App.render();
      };
      $('#cp-apply').onclick = apply;
      ci.onkeydown = (e) => { if (e.key === 'Enter') apply(); };
    }
    const cr = $('#cp-remove');
    if (cr) cr.onclick = () => { LS.del('coupon'); App.render(); };
    $('#checkout').onclick = checkout;
  };

  /* ---------------- إتمام الطلب → ديسكورد ---------------- */
  function orderText(o) {
    const lines = [`🧾 طلب رقم #${o.id}`, `👤 العميل: ${o.user.name} (@${o.user.username}) — ${o.user.id}`, '', 'المنتجات:'];
    o.items.forEach((it) => {
      lines.push(`• ${it.name}${it.option ? ' — ' + it.option : ''} × ${it.qty} = ${it.lineText}`);
      Object.entries(it.fields || {}).forEach(([k, v]) => { if (v) lines.push(`   ↳ ${k}: ${v}`); });
    });
    lines.push('');
    if (o.discount) lines.push(`🏷️ الخصم (${o.coupon}): - ${o.discountText}`);
    lines.push(`💰 الإجمالي: ${o.totalText}`);
    return lines.join('\n');
  }

  async function checkout(ev) {
    const items = Cart.items();
    if (!items.length) return;
    let bad = null;
    $$('[data-field]').forEach((inp) => {
      const v = inp.value.trim();
      const wrong = (inp.hasAttribute('data-req') && !v) || (v && inp.dataset.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
      inp.classList.toggle('error', !!wrong);
      if (wrong && !bad) bad = inp;
    });
    if (bad) { bad.focus(); toast('أكمل البيانات المطلوبة للمنتجات', 'error'); return; }
    if (!App.user) { open('login'); toast('سجّل دخولك عبر ديسكورد لإتمام الطلب'); return; }

    const btn = ev.currentTarget;
    btn.classList.add('loading');
    btn.textContent = 'جارٍ إنشاء الطلب...';
    const c = cur();
    const o = {
      id: (Date.now().toString(36).slice(-4) + uid(3)).toUpperCase(),
      date: new Date().toISOString(),
      currency: c.code,
      user: { id: App.user.id, username: App.user.username, name: App.user.name },
      items: items.map((i) => { const p = product(i.pid); const op = i.opt != null && p.options && p.options[i.opt]; const u = Cart.unit(i); return { name: p.name, option: op ? op.name : '', qty: i.qty, unit: u, lineText: fmt(u * i.qty), fields: i.fields || {} }; }),
      subtotal: Cart.subtotal(), discount: Cart.discount(), discountText: fmt(Cart.discount()),
      coupon: (Cart.coupon() || {}).code || '', total: Cart.total(), totalText: fmt(Cart.total()),
    };
    const text = orderText(o);
    const itemsText = o.items.map((it) => `• **${it.name}**${it.option ? ' — ' + it.option : ''} × ${it.qty} = ${it.lineText}` + Object.entries(it.fields).filter(([, v]) => v).map(([k, v]) => `\n  ↳ ${k}: \`${String(v).replace(/`/g, '')}\``).join('')).join('\n');
    const fields = [
      { name: 'العميل', value: `<@${o.user.id}>\n${o.user.name} (@${o.user.username})`, inline: true },
      { name: 'الإجمالي', value: o.totalText, inline: true },
    ];
    if (o.discount) fields.push({ name: 'الكوبون', value: `${o.coupon} (- ${o.discountText})`, inline: true });
    const sent = await sendWebhook({
      username: S().name, content: S().orderPing || '', allowed_mentions: { parse: ['roles', 'everyone'] },
      embeds: [{ title: `🛒 طلب جديد #${o.id}`, color: colorInt(), description: itemsText.slice(0, 3900), fields, footer: { text: 'بانتظار فتح تذكرة وإتمام الدفع' }, timestamp: o.date }],
    });
    try { await navigator.clipboard.writeText(text); } catch (e) {}
    const orders = LS.get('orders', []);
    orders.unshift({ id: o.id, date: o.date, totalText: o.totalText, sent });
    LS.set('orders', orders.slice(0, 30));
    Cart.clear();
    LS.del('coupon');
    App.render();

    const s = S();
    const invite = s.discordInvite && s.discordInvite.replace(/\/+$/, '') !== 'https://discord.gg' ? s.discordInvite : '';
    const box = openGeneric(`
      <div class="m-head"><div class="m-avatar success"><i data-lucide="check"></i></div><h3>تم إنشاء طلبك 🎉</h3><p class="muted">رقم الطلب</p><div class="order-id" dir="ltr">#${esc(o.id)}</div></div>
      <ol class="steps">${(s.checkoutSteps || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <div class="stack">
        ${invite ? `<a class="btn btn-discord btn-block btn-lg" href="${esc(invite)}" target="_blank" rel="noopener">${DISCORD_SVG} التوجه إلى الديسكورد</a>` : ''}
        <button class="btn btn-ghost btn-block" id="copy-order"><i data-lucide="copy"></i> نسخ تفاصيل الطلب</button>
      </div>
      <p class="tiny" style="margin-top:14px">${sent ? 'وصلت تفاصيل طلبك للإدارة تلقائياً ✓' : 'انسخ تفاصيل الطلب وأرسلها في التذكرة'}</p>`);
    $('#copy-order', box).onclick = async () => { try { await navigator.clipboard.writeText(text); toast('تم النسخ', 'success'); } catch (e) { prompt('انسخ النص:', text); } };
  }

  Pages.auth = async function () {
    const app = $('#app');
    const fail = (msg) => {
      app.innerHTML = `<div class="gate"><div class="card"><div class="m-avatar" style="color:var(--danger)"><i data-lucide="circle-alert"></i></div><h3 style="margin-bottom:8px">تعذّر تسجيل الدخول</h3><p class="muted" style="margin-bottom:20px">${esc(msg)}</p><div class="stack"><button class="btn btn-discord btn-lg" data-action="login">${DISCORD_SVG} حاول مرة أخرى</button><a class="btn btn-ghost" href="index.html">العودة للمتجر</a></div></div></div>`;
      icons();
    };
    app.innerHTML = '<div class="page-loader"><span class="spinner"></span></div>';
    const h = new URLSearchParams(location.hash.slice(1));
    const q = new URLSearchParams(location.search);
    const err = h.get('error') || q.get('error');
    if (err) return fail(err === 'access_denied' ? 'تم إلغاء تسجيل الدخول' : (h.get('error_description') || q.get('error_description') || err));
    const token = h.get('access_token');
    if (!token) return fail('لم يتم استلام بيانات الدخول من ديسكورد');
    if (h.get('state') !== LS.get('oauth_state', null)) return fail('انتهت صلاحية الجلسة، حاول مرة أخرى');
    try {
      const r = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const u = await r.json();
      const user = { id: u.id, username: u.username, name: u.global_name || u.username, avatar: u.avatar || '', email: u.email || '' };
      LS.set('discord_user', user);
      LS.del('oauth_state');
      App.user = user;
      history.replaceState(null, '', location.pathname);
      let back = LS.get('return_to', 'index.html');
      LS.del('return_to');
      if (/auth\.html/.test(back)) back = 'index.html';
      location.replace(back);
    } catch (e) {
      fail('تعذّر جلب بيانات الحساب: ' + e.message);
    }
  };

  /* ---------------- التشغيل ---------------- */
  App.render = function () {
    renderShell();
    const fn = Pages[App.page];
    if (fn) fn();
    icons();
  };
  async function loadStoreData() {
    // 1) نسخة المالك بعد النشر مباشرة (صالحة 10 دقائق)
    const fresh = LS.get('store_fresh', null);
    if (fresh && Date.now() - fresh.t < 10 * 60 * 1000) return fresh.data;
    // 2) من GitHub مباشرة (بدون انتظار بناء الموقع)
    const g = Object.assign({}, CFG.github || {});
    g.branch = g.branch || 'main';
    if ((!g.owner || !g.repo) && location.hostname.endsWith('github.io')) {
      g.owner = g.owner || location.hostname.split('.')[0];
      const seg = location.pathname.split('/').filter(Boolean)[0];
      g.repo = g.repo || (seg && !seg.endsWith('.html') ? seg : location.hostname);
    }
    if (g.owner && g.repo) {
      try {
        const r = await fetch(`https://api.github.com/repos/${g.owner}/${g.repo}/contents/data/store.json?ref=${encodeURIComponent(g.branch)}`, { headers: { Accept: 'application/vnd.github.raw+json' } });
        if (r.ok) return await r.json();
      } catch (e) {}
    }
    // 3) الملف المحلي
    const r = await fetch('data/store.json?v=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  App.init = async function (page) {
    App.page = page;
    try {
      App.data = await loadStoreData();
    } catch (e) {
      $('#app').innerHTML = `<div class="gate"><div class="card"><h3>تعذّر تحميل بيانات المتجر</h3><p class="muted" style="margin-top:8px">تأكد من وجود الملف data/store.json وأنك تفتح الموقع عبر رابط (GitHub Pages أو خادم محلي) وليس بفتح الملف مباشرة.</p></div></div>`;
      return;
    }
    applySettings();
    renderShell();
    const fn = Pages[page];
    if (fn) await fn();
    icons();
    if (page === 'home' && location.hash.length > 1) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  };

  Object.assign(App, { S, cur, fmt, product, products, categories, media, thumb, toast, openGeneric, closeAll, open, login, logout, applySettings, avatar, setTheme });
})();
