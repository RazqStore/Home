/* =========================================================
   لوحة تحكم المالك — تعديل المتجر ونشره على GitHub
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, esc, LS, icons, toast, uid, FONTS, DISCORD_SVG } = App;
  const DATA_PATH = 'data/store.json';

  let D = null;          // نسخة التعديل
  let sha = null;        // نسخة الملف على GitHub
  let tab = LS.get('admin_tab', 'overview');
  let dirty = false;
  const openItems = new Set();

  const TABS = [
    ['overview', 'نظرة عامة', 'layout-dashboard'],
    ['products', 'المنتجات', 'package'],
    ['categories', 'التصنيفات', 'folder'],
    ['coupons', 'الكوبونات', 'ticket-percent'],
    ['reviews', 'التقييمات', 'star'],
    ['settings', 'إعدادات المتجر', 'settings'],
    ['payment', 'الدفع والديسكورد', 'credit-card'],
    ['currencies', 'العملات', 'coins'],
    ['publish', 'النشر والربط', 'rocket'],
  ];

  const TPL = {
    product: () => ({ id: uid(8), name: 'منتج جديد', label: '', category: (D.categories[0] || {}).id || '', price: 0, image: '', icon: 'package', description: '', note: '', fields: [], options: [], active: true }),
    option: () => ({ name: '', price: 0 }),
    field: () => ({ label: 'الإيميل', placeholder: '', type: 'email', required: true }),
    category: () => ({ id: uid(6), name: 'تصنيف جديد', image: '', icon: 'folder' }),
    coupon: () => ({ code: '', type: 'percent', value: 10, active: true }),
    review: () => ({ name: '', rating: 5, text: '' }),
    currency: () => ({ code: '', name: '', symbol: '', flag: '', rate: 1, decimals: 2 }),
    feature: () => ({ icon: 'star', title: '', text: '' }),
  };

  /* ---------- أدوات المسارات ---------- */
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  function setPath(o, p, v) {
    const ks = p.split('.');
    let t = o;
    for (let i = 0; i < ks.length - 1; i++) { if (t[ks[i]] == null) t[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; t = t[ks[i]]; }
    t[ks[ks.length - 1]] = v;
  }
  const parentOf = (p) => { const ks = p.split('.'); const idx = +ks.pop(); return { arr: getPath(D, ks.join('.')), idx }; };

  /* ---------- عناصر النماذج ---------- */
  function inp(path, label, o = {}) {
    const v = getPath(D, path);
    const val = o.list ? (v || []).join(o.lines ? '\n' : '، ') : v == null ? '' : v;
    const attrs = `data-bind="${path}" ${o.num ? 'data-num' : ''} ${o.list ? `data-list="${o.lines ? 'lines' : 'comma'}"` : ''} placeholder="${esc(o.ph || '')}" ${o.dir ? `dir="${o.dir}"` : ''}`;
    const ctl = o.area || o.lines
      ? `<textarea class="input" rows="${o.rows || 3}" ${attrs}>${esc(val)}</textarea>`
      : `<input class="input" type="${o.type || (o.num ? 'number' : 'text')}" ${o.num ? 'step="any"' : ''} value="${esc(val)}" ${attrs}>`;
    return `<div class="field">${label ? `<label>${label}</label>` : ''}${ctl}${o.hint ? `<small class="hint">${o.hint}</small>` : ''}</div>`;
  }
  function sel(path, label, opts, o = {}) {
    const v = getPath(D, path);
    return `<div class="field">${label ? `<label>${label}</label>` : ''}<select class="input" data-bind="${path}" ${o.num ? 'data-num' : ''}>${opts.map(([val, txt]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(txt)}</option>`).join('')}</select>${o.hint ? `<small class="hint">${o.hint}</small>` : ''}</div>`;
  }
  const chk = (path, label) => `<label class="check"><input type="checkbox" data-bind="${path}" data-bool ${getPath(D, path) !== false ? 'checked' : ''}> ${label}</label>`;
  function imgField(path, label, hint) {
    const v = getPath(D, path) || '';
    return `<div class="field"><label>${label}</label><div class="img-field">
      ${v ? `<img class="img-prev" src="${esc(v)}" alt="">` : '<span class="img-prev"></span>'}
      <input class="input" value="${esc(v)}" data-bind="${path}" placeholder="رابط صورة أو ارفع صورة" dir="ltr">
      <button class="btn btn-ghost" data-a="upload" data-path="${path}"><i data-lucide="upload"></i> رفع</button>
    </div>${hint ? `<small class="hint">${hint}</small>` : ''}</div>`;
  }
  const miniBtns = (path, total) => {
    const i = +path.split('.').pop();
    return `<div class="mini-btns">
      <button class="mini" data-a="move" data-path="${path}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="أعلى"><i data-lucide="arrow-up"></i></button>
      <button class="mini" data-a="move" data-path="${path}" data-dir="1" ${i >= total - 1 ? 'disabled' : ''} title="أسفل"><i data-lucide="arrow-down"></i></button>
      <button class="mini del" data-a="del" data-path="${path}" title="حذف"><i data-lucide="trash-2"></i></button></div>`;
  };
  const baseCur = () => (D.currencies || []).find((c) => c.code === D.settings.baseCurrency) || { name: 'ريال سعودي', symbol: 'ر.س' };

  /* ---------- GitHub ---------- */
  function ghCfg() {
    const c = { branch: 'main' };
    const add = (o) => Object.entries(o || {}).forEach(([k, v]) => { if (v) c[k] = v; });
    add(App.CFG.github);
    add(LS.get('gh_cfg', {}));
    if ((!c.owner || !c.repo) && location.hostname.endsWith('github.io')) {
      c.owner = c.owner || location.hostname.split('.')[0];
      const seg = location.pathname.split('/').filter(Boolean)[0];
      c.repo = c.repo || (seg && !seg.endsWith('.html') ? seg : location.hostname);
    }
    return c;
  }
  async function gh(method, path, body) {
    const c = ghCfg();
    const url = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}` + (method === 'GET' ? `?ref=${encodeURIComponent(c.branch)}` : '');
    const r = await fetch(url, { method, cache: 'no-store', headers: { Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json' }, body: body ? JSON.stringify(body) : undefined });
    if (method === 'GET' && r.status === 404) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'HTTP ' + r.status);
    return j;
  }
  const ghPut = (path, content, message, s) => gh('PUT', path, Object.assign({ message, content, branch: ghCfg().branch }, s ? { sha: s } : {}));
  function b64enc(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const b64dec = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), (ch) => ch.charCodeAt(0)));
  const ghReady = () => { const c = ghCfg(); return !!(c.token && c.owner && c.repo); };

  async function pullLatest(silent) {
    if (!ghReady()) return false;
    try {
      const f = await gh('GET', DATA_PATH);
      if (f && f.content) { D = JSON.parse(b64dec(f.content)); sha = f.sha; dirty = false; if (!silent) toast('تم جلب آخر نسخة من GitHub', 'success'); return true; }
    } catch (e) { if (!silent) toast('تعذّر الاتصال بـ GitHub: ' + e.message, 'error'); }
    return false;
  }

  async function publish(btn) {
    if (!ghReady()) { tab = 'publish'; render(); toast('أكمل بيانات الربط مع GitHub أولاً', 'error'); return; }
    const err = validate();
    if (err) { toast(err, 'error'); return; }
    if (btn) btn.classList.add('loading');
    try {
      const content = b64enc(JSON.stringify(D, null, 2) + '\n');
      if (!sha) { const f = await gh('GET', DATA_PATH); sha = f && f.sha; }
      let res;
      try { res = await ghPut(DATA_PATH, content, 'تحديث المتجر من لوحة التحكم', sha); }
      catch (e) {
        if (!/sha|match|conflict/i.test(e.message)) throw e;
        const f = await gh('GET', DATA_PATH); sha = f && f.sha;
        res = await ghPut(DATA_PATH, content, 'تحديث المتجر من لوحة التحكم', sha);
      }
      sha = res.content.sha;
      dirty = false;
      LS.set('store_fresh', { t: Date.now(), data: D });
      toast('تم النشر ✓ يظهر التحديث في الموقع خلال دقيقة تقريباً', 'success');
    } catch (e) {
      toast('فشل النشر: ' + e.message, 'error');
    }
    render();
  }

  function validate() {
    const ids = new Set();
    for (const p of D.products) { if (!p.name) return 'يوجد منتج بدون اسم'; if (ids.has(p.id)) return 'يوجد منتجان بنفس المعرّف'; ids.add(p.id); }
    for (const c of D.coupons) if (!c.code) return 'يوجد كوبون بدون كود';
    for (const c of D.currencies) if (!c.code || !(+c.rate > 0)) return 'تحقق من بيانات العملات (الكود وسعر التحويل)';
    return null;
  }

  function pickFile(accept) {
    return new Promise((res) => {
      const i = document.createElement('input');
      i.type = 'file'; i.accept = accept;
      i.onchange = () => res(i.files[0] || null);
      i.click();
    });
  }
  const fileB64 = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });

  async function upload(path, btn) {
    if (!ghReady()) { toast('لرفع الصور أضف GitHub Token في تبويب "النشر والربط"، أو الصق رابط صورة مباشر', 'error'); return; }
    const f = await pickFile('image/*');
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { toast('حجم الصورة كبير (الحد 3MB)', 'error'); return; }
    btn.classList.add('loading');
    try {
      const name = `assets/uploads/${Date.now()}-${f.name.replace(/[^\w.\-]/g, '_')}`;
      await ghPut(name, await fileB64(f), `رفع صورة ${f.name}`);
      setPath(D, path, name);
      markDirty();
      toast('تم رفع الصورة — اضغط "نشر التغييرات" لحفظها', 'success');
    } catch (e) { toast('فشل رفع الصورة: ' + e.message, 'error'); }
    render();
  }

  /* ---------- التبويبات ---------- */
  function tabOverview() {
    const c = ghCfg();
    const s = D.settings;
    const checks = [
      [!!App.CFG.discordClientId, 'Discord Client ID مضبوط في config.js'],
      [(App.CFG.ownerDiscordIds || []).filter(Boolean).length > 0, 'آيدي المالك مضبوط في config.js'],
      [!!(s.discordInvite && s.discordInvite.replace(/\/+$/, '') !== 'https://discord.gg'), 'رابط سيرفر الديسكورد (لتوجيه الدفع)'],
      [!!s.discordWebhook, 'Webhook لاستقبال الطلبات في روم ديسكورد'],
      [ghReady(), `الربط مع GitHub${c.repo ? ` (${c.owner}/${c.repo})` : ''}`],
    ];
    return `
      <div class="stats">
        <div class="stat"><small>المنتجات</small><b>${D.products.length}</b></div>
        <div class="stat"><small>التصنيفات</small><b>${D.categories.length}</b></div>
        <div class="stat"><small>الكوبونات الفعالة</small><b>${D.coupons.filter((x) => x.active !== false).length}</b></div>
        <div class="stat"><small>التقييمات</small><b>${D.reviews.length}</b></div>
      </div>
      <div class="card"><div class="card-title">جاهزية المتجر</div><ul class="checklist">${checks.map(([ok, t]) => `<li><i data-lucide="${ok ? 'circle-check' : 'circle-x'}" class="${ok ? 'ok' : 'no'}"></i>${esc(t)}</li>`).join('')}</ul></div>
      <div class="note-box"><b>كيف تعمل اللوحة؟</b><br>عدّل ما تريد في التبويبات، ثم اضغط <b>«نشر التغييرات»</b> بالأعلى. اللوحة تحفظ الملف <code>data/store.json</code> مباشرة في مستودعك على GitHub، ويتحدّث الموقع تلقائياً خلال دقيقة.<br>الطلبات تصلك في روم الديسكورد عبر الـ Webhook، والعميل يتوجّه للسيرفر لفتح تذكرة والدفع.</div>`;
  }

  function tabProducts() {
    const cats = [['', '— بدون تصنيف —'], ...D.categories.map((c) => [c.id, c.name])];
    const bc = baseCur();
    return `
      <div class="a-actions" style="margin-bottom:14px"><button class="btn btn-primary" data-a="push" data-path="products" data-tpl="product" data-open-new><i data-lucide="plus"></i> إضافة منتج</button></div>
      ${D.products.map((p, i) => {
        const P = `products.${i}`;
        const catName = (D.categories.find((c) => c.id === p.category) || {}).name || 'بدون تصنيف';
        return `
        <details class="a-item" data-item="${esc(p.id)}" ${openItems.has(p.id) ? 'open' : ''}>
          <summary>${App.thumb(p)}<div class="a-sum-main"><b>${esc(p.name)}</b><small>${esc(catName)} · ${esc(p.options && p.options.length ? 'يبدأ من ' + Math.min(...p.options.map((o) => +o.price || 0)) : p.price)} ${esc(bc.symbol)}</small></div>
          <span class="tag ${p.active !== false ? 'on' : 'off'}">${p.active !== false ? 'ظاهر' : 'مخفي'}</span>${miniBtns(P, D.products.length)}</summary>
          <div class="a-body">
            <div class="row2">${inp(P + '.name', 'اسم المنتج')}${inp(P + '.label', 'النص على الصورة', { hint: 'يظهر داخل الصورة الافتراضية فقط (إذا لم ترفع صورة)' })}</div>
            <div class="row2">${sel(P + '.category', 'التصنيف', cats)}${inp(P + '.price', `السعر الأساسي (${esc(bc.name)})`, { num: true })}</div>
            <div class="row2">${imgField(P + '.image', 'صورة المنتج', 'يُفضّل صورة مربعة 1000×1000')}${inp(P + '.icon', 'أيقونة الصورة الافتراضية', { dir: 'ltr', hint: 'اسم أيقونة من <a href="https://lucide.dev/icons" target="_blank" style="color:var(--primary)">lucide.dev</a> مثل: tv, rocket, gift' })}</div>
            ${inp(P + '.description', 'الوصف', { area: true, rows: 4 })}
            ${inp(P + '.note', 'تعليمات للعميل في السلة', { ph: 'مثال: برجاء كتابة الإيميل المراد تفعيل الاشتراك فيه' })}

            <div class="field"><label>الباقات / الخيارات</label><small class="hint">إذا أضفت باقات، يُستخدم سعر الباقة بدل السعر الأساسي.</small></div>
            <div class="sub-list">${(p.options || []).map((o, j) => `<div class="sub-row">
              <input class="input" data-bind="${P}.options.${j}.name" value="${esc(o.name)}" placeholder="اسم الباقة (مثال: شهر)">
              <input class="input" style="max-width:140px" type="number" step="any" data-num data-bind="${P}.options.${j}.price" value="${esc(o.price)}" placeholder="السعر">
              <button class="mini del" data-a="del" data-path="${P}.options.${j}"><i data-lucide="x"></i></button></div>`).join('')}</div>
            <button class="btn btn-soft btn-sm" data-a="push" data-path="${P}.options" data-tpl="option" style="margin-bottom:18px"><i data-lucide="plus"></i> إضافة باقة</button>

            <div class="field"><label>حقول يكتبها العميل في السلة</label><small class="hint">مثل: الإيميل، رابط السيرفر، يوزر الحساب...</small></div>
            <div class="sub-list">${(p.fields || []).map((f, j) => `<div class="sub-row">
              <input class="input" data-bind="${P}.fields.${j}.label" value="${esc(f.label)}" placeholder="اسم الحقل">
              <input class="input" data-bind="${P}.fields.${j}.placeholder" value="${esc(f.placeholder)}" placeholder="نص توضيحي">
              <select class="input" style="max-width:110px" data-bind="${P}.fields.${j}.type">${[['text', 'نص'], ['email', 'إيميل'], ['url', 'رابط']].map(([v, t]) => `<option value="${v}" ${f.type === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
              <label class="check" style="white-space:nowrap;font-size:12px"><input type="checkbox" data-bool data-bind="${P}.fields.${j}.required" ${f.required !== false ? 'checked' : ''}>إلزامي</label>
              <button class="mini del" data-a="del" data-path="${P}.fields.${j}"><i data-lucide="x"></i></button></div>`).join('')}</div>
            <button class="btn btn-soft btn-sm" data-a="push" data-path="${P}.fields" data-tpl="field" style="margin-bottom:18px"><i data-lucide="plus"></i> إضافة حقل</button>

            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">${chk(P + '.active', 'إظهار المنتج في المتجر')}<small class="muted" dir="ltr">ID: ${esc(p.id)}</small></div>
          </div>
        </details>`;
      }).join('') || '<p class="empty">لا توجد منتجات بعد</p>'}`;
  }

  function tabCategories() {
    return `
      <div class="a-actions" style="margin-bottom:14px"><button class="btn btn-primary" data-a="push" data-path="categories" data-tpl="category"><i data-lucide="plus"></i> إضافة تصنيف</button></div>
      ${D.categories.map((c, i) => {
        const P = `categories.${i}`;
        const n = D.products.filter((p) => p.category === c.id).length;
        return `<div class="card" style="padding:16px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">${App.thumb({ name: c.name, image: c.image, icon: c.icon || 'folder' })}<div class="a-sum-main"><b>${esc(c.name)}</b><small>${n} منتج</small></div>${miniBtns(P, D.categories.length)}</div>
          <div class="row2">${inp(P + '.name', 'اسم التصنيف')}${inp(P + '.icon', 'الأيقونة', { dir: 'ltr' })}</div>
          ${imgField(P + '.image', 'صورة التصنيف (اختياري)')}
        </div>`;
      }).join('') || '<p class="empty">لا توجد تصنيفات</p>'}`;
  }

  function tabCoupons() {
    return `
      <div class="a-actions" style="margin-bottom:14px"><button class="btn btn-primary" data-a="push" data-path="coupons" data-tpl="coupon"><i data-lucide="plus"></i> إضافة كوبون</button></div>
      ${D.coupons.length ? `<div class="card"><div class="tbl-head hide-m"><span style="flex:1">الكود</span><span style="width:140px">النوع</span><span style="width:110px">القيمة</span><span style="width:150px"></span></div>
      <div class="sub-list">${D.coupons.map((c, i) => `<div class="sub-row" style="flex-wrap:wrap">
        <input class="input" style="flex:1;min-width:140px" data-bind="coupons.${i}.code" value="${esc(c.code)}" placeholder="مثال: SALE20" dir="ltr">
        <select class="input" style="width:140px" data-bind="coupons.${i}.type"><option value="percent" ${c.type !== 'fixed' ? 'selected' : ''}>نسبة %</option><option value="fixed" ${c.type === 'fixed' ? 'selected' : ''}>مبلغ ثابت (${esc(baseCur().symbol)})</option></select>
        <input class="input" style="width:110px" type="number" step="any" data-num data-bind="coupons.${i}.value" value="${esc(c.value)}">
        <label class="check"><input type="checkbox" data-bool data-bind="coupons.${i}.active" ${c.active !== false ? 'checked' : ''}>مفعّل</label>
        <button class="mini del" data-a="del" data-path="coupons.${i}"><i data-lucide="trash-2"></i></button></div>`).join('')}</div></div>` : '<p class="empty">لا توجد كوبونات</p>'}`;
  }

  function tabReviews() {
    return `
      <div class="note-box">عندما يرسل عميل تقييماً من المتجر يصلك في روم الديسكورد (عبر الـ Webhook). انسخه هنا لنشره في الموقع.</div>
      <div class="a-actions" style="margin-bottom:14px"><button class="btn btn-primary" data-a="push" data-path="reviews" data-tpl="review"><i data-lucide="plus"></i> إضافة تقييم</button></div>
      ${D.reviews.map((r, i) => `<div class="card" style="padding:16px">
        <div style="display:flex;gap:12px;align-items:flex-start"><div style="flex:1">
          <div class="row2">${inp(`reviews.${i}.name`, 'اسم العميل')}${sel(`reviews.${i}.rating`, 'التقييم', [5, 4, 3, 2, 1].map((n) => [n, '★'.repeat(n)]), { num: true })}</div>
          ${inp(`reviews.${i}.text`, 'نص التقييم')}
        </div>${miniBtns(`reviews.${i}`, D.reviews.length)}</div></div>`).join('') || '<p class="empty">لا توجد تقييمات بعد</p>'}`;
  }

  function tabSettings() {
    const s = 'settings';
    return `
      <div class="card"><div class="card-title">الهوية</div>
        <div class="row2">${inp(s + '.name', 'اسم المتجر')}${inp(s + '.heroButton', 'نص زر الواجهة')}</div>
        ${inp(s + '.description', 'وصف المتجر', { area: true, rows: 3 })}
        <div class="row2">${imgField(s + '.logo', 'الشعار', 'صورة مربعة، تظهر دائرية')}${inp(s + '.logoIcon', 'أيقونة الشعار الافتراضية', { dir: 'ltr', hint: 'تُستخدم إذا لم ترفع شعاراً' })}</div>
      </div>
      <div class="card"><div class="card-title">المظهر</div>
        <div class="row2">${sel(s + '.font', 'الخط', Object.keys(FONTS).map((f) => [f, f]))}
        <div class="field"><label>اللون الأساسي</label><div class="img-field"><input type="color" data-bind="${s}.primaryColor" value="${esc(D.settings.primaryColor || '#3b82f6')}" style="width:52px;height:44px;border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:4px"><input class="input" data-bind="${s}.primaryColor" value="${esc(D.settings.primaryColor || '#3b82f6')}" dir="ltr"></div></div></div>
      </div>
      <div class="card"><div class="card-title">مميزات «لماذا تختارنا»</div>
        ${(D.settings.features || []).map((f, i) => `<div class="sub-row" style="margin-bottom:8px;flex-wrap:wrap">
          <input class="input" style="width:130px" dir="ltr" data-bind="${s}.features.${i}.icon" value="${esc(f.icon)}" placeholder="icon">
          <input class="input" style="flex:1;min-width:120px" data-bind="${s}.features.${i}.title" value="${esc(f.title)}" placeholder="العنوان">
          <input class="input" style="flex:2;min-width:160px" data-bind="${s}.features.${i}.text" value="${esc(f.text)}" placeholder="الوصف">
          <button class="mini del" data-a="del" data-path="${s}.features.${i}"><i data-lucide="x"></i></button></div>`).join('')}
        <button class="btn btn-soft btn-sm" data-a="push" data-path="${s}.features" data-tpl="feature"><i data-lucide="plus"></i> إضافة ميزة</button>
      </div>
      <div class="card"><div class="card-title">التواصل (الفوتر)</div>
        <div class="row3">${inp(s + '.telegram', 'رابط تيليجرام', { dir: 'ltr', ph: 'https://t.me/...' })}${inp(s + '.whatsapp', 'رقم واتساب', { dir: 'ltr', ph: '9665xxxxxxxx' })}${inp(s + '.phone', 'رقم الجوال', { dir: 'ltr' })}</div>
      </div>`;
  }

  function tabPayment() {
    const s = 'settings';
    return `
      <div class="note-box">عند الضغط على «إتمام الشراء» يُطلب من العميل الدخول بالديسكورد، ثم يُنشأ رقم طلب ويُرسل بتفاصيله إلى روم الطلبات عبر الـ Webhook، ويُوجَّه العميل لسيرفرك لفتح تذكرة وإتمام الدفع.</div>
      <div class="card"><div class="card-title">ديسكورد</div>
        ${inp(s + '.discordInvite', 'رابط دعوة السيرفر', { dir: 'ltr', ph: 'https://discord.gg/xxxx', hint: 'يُوجَّه العميل إليه بعد الطلب. اجعله رابطاً دائماً (Never expire).' })}
        <div class="field"><label>Webhook روم الطلبات</label><div class="img-field"><input class="input" type="password" data-bind="${s}.discordWebhook" value="${esc(D.settings.discordWebhook || '')}" dir="ltr" placeholder="https://discord.com/api/webhooks/..."><button class="btn btn-ghost" data-a="test-webhook">اختبار</button></div>
        <small class="hint">إعدادات الروم ← Integrations ← Webhooks ← New Webhook ← Copy URL. ⚠️ يُحفظ داخل ملف الموقع ويمكن لأي شخص تقني رؤيته، لذلك خصّص له روماً للطلبات فقط.</small></div>
        ${inp(s + '.orderPing', 'منشن مع كل طلب (اختياري)', { dir: 'ltr', ph: '<@&ROLE_ID> أو @here', hint: 'لتنبيه فريق المبيعات عند وصول طلب' })}
      </div>
      <div class="card"><div class="card-title">ما يظهر للعميل بعد الطلب</div>
        ${inp(s + '.checkoutSteps', 'الخطوات (كل خطوة في سطر)', { list: true, lines: true, rows: 4 })}
        ${inp(s + '.paymentMethods', 'طرق الدفع الظاهرة في الفوتر (افصل بفاصلة)', { list: true })}
      </div>`;
  }

  function tabCurrencies() {
    const bc = D.settings.baseCurrency;
    return `
      <div class="note-box">أسعار المنتجات تُكتب بعملة الأساس <b>${esc(baseCur().name)}</b>. سعر التحويل = كم تساوي 1 ${esc(baseCur().name)} بالعملة الأخرى (مثال: الدينار الكويتي ≈ 0.082).</div>
      <div class="card"><div class="row2">${sel('settings.defaultCurrency', 'العملة الافتراضية للزوار', D.currencies.map((c) => [c.code, `${c.name} (${c.code})`]))}${sel('settings.baseCurrency', 'عملة الأساس (أسعار المنتجات)', D.currencies.map((c) => [c.code, `${c.name} (${c.code})`]))}</div></div>
      <div class="card"><div class="tbl-head hide-m"><span style="width:80px">الكود</span><span style="flex:1">الاسم</span><span style="width:70px">الرمز</span><span style="width:64px">العلم</span><span style="width:100px">سعر التحويل</span><span style="width:70px">الكسور</span><span style="width:32px"></span></div>
      <div class="sub-list">${D.currencies.map((c, i) => `<div class="sub-row" style="flex-wrap:wrap">
        <input class="input" style="width:80px" dir="ltr" data-bind="currencies.${i}.code" value="${esc(c.code)}" placeholder="USD">
        <input class="input" style="flex:1;min-width:110px" data-bind="currencies.${i}.name" value="${esc(c.name)}" placeholder="الاسم">
        <input class="input" style="width:70px" data-bind="currencies.${i}.symbol" value="${esc(c.symbol)}" placeholder="$">
        <input class="input" style="width:64px" dir="ltr" data-bind="currencies.${i}.flag" value="${esc(c.flag)}" placeholder="us">
        <input class="input" style="width:100px" type="number" step="any" data-num data-bind="currencies.${i}.rate" value="${esc(c.rate)}" ${c.code === bc ? 'disabled' : ''}>
        <input class="input" style="width:70px" type="number" min="0" max="3" data-num data-bind="currencies.${i}.decimals" value="${esc(c.decimals == null ? 2 : c.decimals)}">
        <button class="mini del" data-a="del" data-path="currencies.${i}" ${c.code === bc ? 'disabled' : ''}><i data-lucide="trash-2"></i></button></div>`).join('')}</div>
      <button class="btn btn-soft btn-sm" data-a="push" data-path="currencies" data-tpl="currency"><i data-lucide="plus"></i> إضافة عملة</button>
      <small class="hint" style="display:block;margin-top:10px">العلم: رمز الدولة من حرفين (sa, kw, ae, us...)</small></div>`;
  }

  function tabPublish() {
    const c = ghCfg();
    const saved = LS.get('gh_cfg', {});
    return `
      <div class="card"><div class="card-title">الربط مع GitHub</div>
        <div class="note-box">لكي تحفظ اللوحة التعديلات تحتاج <b>Fine-grained token</b>:<br>
        GitHub ← Settings ← Developer settings ← Personal access tokens ← <b>Fine-grained tokens</b> ← Generate new token<br>
        • Repository access: <b>Only select repositories</b> ← اختر مستودع المتجر<br>
        • Permissions ← Repository ← <b>Contents: Read and write</b><br>
        التوكن يُحفظ في متصفحك هذا فقط ولا يُرفع للموقع.</div>
        <div class="row3">
          <div class="field"><label>اسم المستخدم (owner)</label><input class="input" data-gh="owner" dir="ltr" value="${esc(saved.owner || '')}" placeholder="${esc(c.owner || 'username')}"></div>
          <div class="field"><label>اسم المستودع (repo)</label><input class="input" data-gh="repo" dir="ltr" value="${esc(saved.repo || '')}" placeholder="${esc(c.repo || 'my-store')}"></div>
          <div class="field"><label>الفرع (branch)</label><input class="input" data-gh="branch" dir="ltr" value="${esc(saved.branch || '')}" placeholder="${esc(c.branch || 'main')}"></div>
        </div>
        <div class="field"><label>Token</label><input class="input" type="password" data-gh="token" dir="ltr" value="${esc(saved.token || '')}" placeholder="github_pat_..."></div>
        <div class="a-actions"><button class="btn btn-primary" data-a="save-gh"><i data-lucide="save"></i> حفظ واختبار الاتصال</button><button class="btn btn-ghost" data-a="pull"><i data-lucide="refresh-cw"></i> جلب آخر نسخة</button></div>
      </div>
      <div class="card"><div class="card-title">نسخ احتياطي</div>
        <p class="muted" style="font-size:13px;margin-bottom:12px">بدون توكن يمكنك تنزيل الملف ورفعه يدوياً مكان <code dir="ltr">data/store.json</code> في المستودع.</p>
        <div class="a-actions"><button class="btn btn-ghost" data-a="download"><i data-lucide="download"></i> تنزيل store.json</button><button class="btn btn-ghost" data-a="import"><i data-lucide="file-up"></i> استيراد ملف</button></div>
      </div>`;
  }

  const VIEWS = { overview: tabOverview, products: tabProducts, categories: tabCategories, coupons: tabCoupons, reviews: tabReviews, settings: tabSettings, payment: tabPayment, currencies: tabCurrencies, publish: tabPublish };

  /* ---------- الرسم ---------- */
  function render() {
    const u = App.user;
    const t = TABS.find((x) => x[0] === tab) || TABS[0];
    tab = t[0];
    $('#app').innerHTML = `
    <div class="container admin">
      <aside class="a-side">
        <div class="a-user"><img src="${esc(App.avatar(u))}" alt=""><div><b>${esc(u.name)}</b><small>مالك المتجر</small></div></div>
        ${TABS.map(([k, n, ic]) => `<button class="a-tab ${k === tab ? 'active' : ''}" data-a="tab" data-tab="${k}"><i data-lucide="${ic}"></i>${n}</button>`).join('')}
        <a class="a-tab" href="index.html" target="_blank"><i data-lucide="external-link"></i>عرض المتجر</a>
      </aside>
      <section>
        <div class="a-top"><h2>${t[1]}</h2>
          <div class="a-actions"><span class="dirty ${dirty ? 'show' : ''}" id="dirty"><i data-lucide="circle-dot" style="width:14px;height:14px"></i> تغييرات غير منشورة</span>
          <button class="btn btn-primary" data-a="publish"><i data-lucide="rocket"></i> نشر التغييرات</button></div>
        </div>
        ${VIEWS[tab]()}
      </section>
    </div>`;
    icons();
  }
  function markDirty() { dirty = true; const d = $('#dirty'); if (d) d.classList.add('show'); }

  /* ---------- الأحداث ---------- */
  function onInput(e) {
    const el = e.target;
    if (el.dataset.gh !== undefined) return;
    const path = el.dataset.bind;
    if (!path) return;
    let v;
    if (el.hasAttribute('data-bool')) v = el.checked;
    else if (el.hasAttribute('data-num')) v = el.value === '' ? 0 : parseFloat(el.value);
    else if (el.dataset.list) v = el.value.split(el.dataset.list === 'lines' ? /\n/ : /[,،]/).map((x) => x.trim()).filter(Boolean);
    else v = el.value;
    setPath(D, path, v);
    $$(`[data-bind="${path}"]`).forEach((o) => { if (o !== el && o.type !== 'checkbox') o.value = el.value; });
    markDirty();
    if (el.tagName === 'SELECT' || el.type === 'checkbox') { if (/^settings\.(baseCurrency)$|\.category$|\.active$/.test(path)) render(); }
  }

  async function onClick(e) {
    const b = e.target.closest('[data-a]');
    if (!b || !$('#app').contains(b)) return;
    const a = b.dataset.a;
    const path = b.dataset.path;
    if (b.closest('summary') && ['move', 'del'].includes(a)) e.preventDefault();

    if (a === 'tab') { tab = b.dataset.tab; LS.set('admin_tab', tab); render(); window.scrollTo({ top: 0 }); }
    else if (a === 'push') {
      const arr = getPath(D, path) || [];
      const item = TPL[b.dataset.tpl]();
      arr.push(item); setPath(D, path, arr);
      if (b.hasAttribute('data-open-new')) openItems.add(item.id);
      markDirty(); render();
      if (b.hasAttribute('data-open-new')) { const el = $(`[data-item="${CSS.escape(item.id)}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
    else if (a === 'del') {
      const { arr, idx } = parentOf(path);
      const name = (arr[idx] && (arr[idx].name || arr[idx].code || arr[idx].label || arr[idx].title)) || '';
      if (!confirm(`حذف ${name ? '«' + name + '»' : 'هذا العنصر'}؟`)) return;
      arr.splice(idx, 1); markDirty(); render();
    }
    else if (a === 'move') {
      const { arr, idx } = parentOf(path);
      const j = idx + +b.dataset.dir;
      if (j < 0 || j >= arr.length) return;
      [arr[idx], arr[j]] = [arr[j], arr[idx]]; markDirty(); render();
    }
    else if (a === 'upload') upload(path, b);
    else if (a === 'publish') publish(b);
    else if (a === 'test-webhook') {
      if (!D.settings.discordWebhook) { toast('أدخل رابط الـ Webhook أولاً', 'error'); return; }
      const old = App.data.settings.discordWebhook;
      App.data.settings.discordWebhook = D.settings.discordWebhook;
      const ok = await App.sendWebhook({ username: D.settings.name, embeds: [{ title: '✅ تم ربط المتجر بنجاح', description: 'ستصل الطلبات الجديدة إلى هذا الروم.', color: 0x22c55e }] });
      App.data.settings.discordWebhook = old;
      toast(ok ? 'وصلت رسالة الاختبار للروم ✓' : 'فشل الإرسال، تأكد من الرابط', ok ? 'success' : 'error');
    }
    else if (a === 'save-gh') {
      const cfg = {};
      $$('[data-gh]').forEach((i) => { cfg[i.dataset.gh] = i.value.trim(); });
      LS.set('gh_cfg', cfg);
      if (!ghReady()) { toast('أكمل البيانات (المستخدم، المستودع، التوكن)', 'error'); return; }
      b.classList.add('loading');
      try {
        const f = await gh('GET', DATA_PATH);
        if (!f) throw new Error('لم يُعثر على data/store.json في المستودع');
        sha = f.sha;
        toast('تم الاتصال بالمستودع بنجاح ✓', 'success');
      } catch (err) { toast('فشل الاتصال: ' + err.message, 'error'); }
      render();
    }
    else if (a === 'pull') {
      if (dirty && !confirm('سيتم استبدال تعديلاتك غير المنشورة، متابعة؟')) return;
      b.classList.add('loading'); await pullLatest(false); render();
    }
    else if (a === 'download') {
      const blob = new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' });
      const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'store.json'; l.click();
      setTimeout(() => URL.revokeObjectURL(l.href), 1000);
    }
    else if (a === 'import') {
      const f = await pickFile('application/json,.json');
      if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        if (!j.settings || !Array.isArray(j.products)) throw new Error('الملف لا يبدو ملف متجر');
        D = normalize(j); markDirty(); render(); toast('تم الاستيراد — اضغط نشر لحفظه', 'success');
      } catch (err) { toast('ملف غير صالح: ' + err.message, 'error'); }
    }
  }

  function onToggle(e) {
    const d = e.target;
    if (!d.matches || !d.matches('details[data-item]')) return;
    if (d.open) openItems.add(d.dataset.item); else openItems.delete(d.dataset.item);
  }

  function normalize(j) {
    j.settings = j.settings || {};
    ['products', 'categories', 'coupons', 'reviews', 'currencies'].forEach((k) => { if (!Array.isArray(j[k])) j[k] = []; });
    if (!Array.isArray(j.settings.features)) j.settings.features = [];
    return j;
  }

  let bound = false;
  function bind() {
    if (bound) return;
    bound = true;
    const app = $('#app');
    app.addEventListener('input', onInput);
    app.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') onInput(e); });
    app.addEventListener('click', onClick);
    app.addEventListener('toggle', onToggle, true);
    window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  }

  /* ---------- البوابة ---------- */
  App.Pages.admin = async function () {
    const app = $('#app');
    const u = App.user;
    if (!u) {
      app.innerHTML = `<div class="gate"><div class="card"><div class="m-avatar"><i data-lucide="lock"></i></div><h3 style="margin-bottom:6px">لوحة تحكم المالك</h3><p class="muted" style="margin-bottom:22px">سجّل دخولك بحساب الديسكورد المسجّل كمالك للمتجر</p><button class="btn btn-discord btn-block btn-lg" data-action="login">${DISCORD_SVG} الدخول عبر Discord</button></div></div>`;
      return;
    }
    if (!App.isOwner()) {
      app.innerHTML = `<div class="gate"><div class="card"><div class="m-avatar" style="color:var(--danger)"><i data-lucide="shield-x"></i></div><h3 style="margin-bottom:6px">غير مصرّح لك</h3>
        <p class="muted" style="font-size:14px">هذا الحساب ليس مالك المتجر. إذا كنت المالك، أضف الآيدي التالي في ملف <code dir="ltr">config.js</code> داخل <code dir="ltr">ownerDiscordIds</code>:</p>
        <div class="id-box"><span id="my-id">${esc(u.id)}</span><button class="mini" id="copy-id" title="نسخ"><i data-lucide="copy"></i></button></div>
        <button class="btn btn-ghost btn-block" data-action="logout"><i data-lucide="log-out"></i> تسجيل الخروج</button></div></div>`;
      icons();
      $('#copy-id').onclick = async () => { try { await navigator.clipboard.writeText(u.id); toast('تم نسخ الآيدي', 'success'); } catch (e) {} };
      return;
    }
    if (!D) {
      D = normalize(JSON.parse(JSON.stringify(App.data)));
      await pullLatest(true);
      D = normalize(D);
    }
    bind();
    render();
  };
})();
