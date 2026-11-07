// =========================================================================
//  HTML sablonlari - dis sablon motoru yok, duz template literal.
// =========================================================================

const config = require('./config');
const { esc, money, convert } = require('./helpers');
const payment = require('./payment');
const shipping = require('./shipping');
const i18n = require('./i18n');
const CSS = require('./styles');
const B = config.brand;

function layout(ctx, body) {
  const { user, categories = [], activeCat = '', q = '', flash = null, path = '/' } = ctx;
  const t = ctx.t || ((k) => k);
  const catNav = categories.length ? `
    <nav class="cats">
      <a href="/" class="${(!activeCat && path === '/') ? 'active' : ''}">${esc(t('all'))}</a>
      ${categories.map(c => `<a href="/?cat=${esc(c.slug)}" class="${activeCat === c.slug ? 'active' : ''}">${esc(c.name)}</a>`).join('')}
    </nav>` : '';

  const prefs = `
    <form action="/prefs" method="post" class="prefs">
      <select name="lang" onchange="this.form.submit()">
        ${config.languages.map(l => `<option value="${l}"${ctx.lang === l ? ' selected' : ''}>${esc(i18n.LANGS[l] || l)}</option>`).join('')}
      </select>
      <select name="currency" onchange="this.form.submit()">
        ${config.currencies.map(c => `<option value="${c}"${ctx.displayCur === c ? ' selected' : ''}>${c}</option>`).join('')}
      </select>
    </form>`;

  let right;
  if (user) {
    right = `
      <a class="btn btn-ghost" href="/orders">${esc(t('orders'))}</a>
      <a class="btn btn-brand" href="/cart">${esc(t('cart'))}${ctx.cartCount ? ' (' + ctx.cartCount + ')' : ''}</a>
      ${user.role === 'seller' ? `<a class="btn btn-ghost" href="/seller">${esc(t('seller_panel'))}</a>` : ''}
      ${user.role === 'admin' ? `<a class="btn btn-ghost" href="/admin">${esc(t('admin'))}</a>` : ''}
      <span class="hi">${esc(user.name)}</span>
      <form action="/logout" method="post" style="display:inline"><button class="btn btn-ghost" type="submit">${esc(t('logout'))}</button></form>`;
  } else {
    right = `<a class="btn btn-ghost" href="/login">${esc(t('login'))}</a><a class="btn btn-brand" href="/register">${esc(t('register'))}</a>`;
  }

  return `<!DOCTYPE html>
<html lang="tr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(ctx.title ? ctx.title + ' · ' + B.name : B.name)}</title>
<style>${CSS}</style>
<style>:root{ --brand:${B.color}; --brand-dark:${B.colorDark}; }</style>
</head><body>
<header class="site-header">
  <div class="hwrap">
    <a class="logo" href="/"><span class="mark">${B.emoji}</span>${ctx.storeSite ? esc(ctx.storeSite.name) : esc(B.name)}</a>
    ${ctx.storeSite ? `<a class="powered" href="${esc(ctx.mainSiteUrl)}">${B.emoji} Mooz</a>` : ''}
    <form class="search" action="/" method="get">
      <input name="q" value="${esc(q)}" placeholder="${esc(t('search_ph'))}">
      <button type="submit">${esc(t('search'))}</button>
    </form>
    <nav class="hactions">${prefs}${right}</nav>
  </div>
  ${catNav}
</header>
${flash ? `<div class="flash">${esc(flash)}</div>` : ''}
<main class="wrap">${body}</main>
<footer class="site-footer"><div class="fwrap">
  <div><div class="logo" style="font-size:18px">${B.emoji} ${esc(B.name)}</div>
  <p class="muted">${esc(t('tagline'))}</p></div>
  <div class="muted small"><p>${esc(t('mvp_note'))}</p>
  ${ctx.storeSite ? `<p><a href="${esc(ctx.mainSiteUrl)}">${B.emoji} Mooz pazaryeri &rarr;</a></p>` : ''}
  <p>&copy; ${new Date().getFullYear()} ${esc(B.name)}</p></div>
</div></footer>
</body></html>`;
}

// Urun gorseli: link varsa resim, yoksa emoji
function thumb(p) {
  return (p.image_url && /^https?:\/\//i.test(p.image_url))
    ? `<img class="pimg" src="${esc(p.image_url)}" alt="${esc(p.name)}">`
    : (p.emoji || '');
}

function productCard(ctx, p, showSeller) {
  return `<div class="card">
    <a href="/product/${p.id}" class="thumb">${thumb(p)}${showSeller ? `<span class="seller-tag">\u{1F3EA} ${esc(p.store_name)}</span>` : ''}</a>
    <div class="cbody">
      <h3><a href="/product/${p.id}">${esc(p.name)}</a></h3>
      ${showSeller ? `<a class="store-link" href="/store/${esc(p.store_slug)}">${esc(p.store_name)}</a>` : ''}
      <div class="price">${ctx.price(p.price_cents, p.currency)}</div>
      ${p.stock > 0
        ? `<form action="/cart/add" method="post"><input type="hidden" name="product_id" value="${p.id}"><button class="addbtn" type="submit">${esc(ctx.t('add_to_cart'))}</button></form>`
        : `<button class="addbtn" disabled>${esc(ctx.t('soldout'))}</button>`}
    </div></div>`;
}

function soBadge(t, st) {
  if (st === 'teslim') return `<span class="badge ok">${esc(t('st_teslim'))}</span>`;
  if (st === 'kargoda') return `<span class="badge info">${esc(t('st_kargoda'))}</span>`;
  return `<span class="badge warn">${esc(t('st_hazirlaniyor'))}</span>`;
}

// Sepet toplamini gosterim para birimine cevirip topla
function totalsLine(ctx, rows) {
  const cents = rows.reduce((s, r) => s + convert(r.price_cents * r.qty, r.currency, ctx.displayCur), 0);
  return money(cents, ctx.displayCur);
}

const pages = {
  home(ctx, { products, activeCat, q }) {
    const t = ctx.t;
    const hero = (!q && !activeCat) ? `
      <section class="hero">
        <div><h1>${esc(t('hero1'))}<br>${esc(t('hero2'))}</h1>
        <p>${esc(t('tagline'))}</p>
        <a class="hero-cta" href="/register">${esc(t('hero_cta'))} &rarr;</a></div>
        <div class="hero-badge"><span class="n">${products.length}</span><span>${esc(t('active_products'))}</span></div>
      </section>` : '';
    const heading = q ? `"${esc(q)}" ${esc(t('results'))}`
      : (activeCat ? esc((ctx.categories.find(c => c.slug === activeCat) || {}).name || '') : esc(t('all_products')));
    const grid = products.length
      ? `<div class="grid">${products.map(p => productCard(ctx, p, true)).join('')}</div>`
      : `<p class="empty">${esc(t('empty_products'))}</p>`;
    return layout(ctx, `${hero}
      <div class="sect-h"><h2>${heading}</h2><span class="muted">${products.length} ${esc(t('n_products'))}</span></div>
      ${grid}`);
  },

  product(ctx, { p }) {
    const t = ctx.t;
    return layout(ctx, `
      <a class="back" href="/">&larr; ${esc(t('back_store'))}</a>
      <div class="product-detail">
        <div class="pd-thumb">${thumb(p)}</div>
        <div class="pd-info">
          ${p.cat_name ? `<span class="chip">${esc(p.cat_name)}</span>` : ''}
          <h1>${esc(p.name)}</h1>
          <a class="store-link" href="/store/${esc(p.store_slug)}">\u{1F3EA} ${esc(p.store_name)}</a>
          <div class="pd-price">${ctx.price(p.price_cents, p.currency)}</div>
          <p class="pd-desc">${p.description ? esc(p.description) : esc(t('no_desc'))}</p>
          <p class="muted small">${esc(t('stock'))}: ${p.stock}</p>
          ${p.stock > 0
            ? `<form action="/cart/add" method="post"><input type="hidden" name="product_id" value="${p.id}"><button class="btn btn-brand big" type="submit">${esc(t('add_to_cart'))}</button></form>`
            : `<button class="btn btn-brand big" disabled>${esc(t('soldout'))}</button>`}
        </div>
      </div>`);
  },

  store(ctx, { store, products }) {
    const t = ctx.t;
    const grid = products.length
      ? `<div class="grid">${products.map(p => productCard(ctx, p, false)).join('')}</div>`
      : `<p class="empty">${esc(t('empty_store'))}</p>`;
    return layout(ctx, `
      <section class="store-banner">
        <div class="store-logo">\u{1F3EA}</div>
        <div><h1>${esc(store.name)}</h1>
        <p class="muted">${esc(store.description || (B.name + ' - satici'))}</p>
        <span class="chip">${esc(t('own_store'))}</span></div>
      </section>
      <div class="sect-h"><h2>${esc(t('products'))}</h2><span class="muted">${products.length} ${esc(t('n_products'))}</span></div>
      ${grid}
      <p class="muted small" style="margin-top:20px">${esc(store.slug)}.mooz.store</p>`);
  },

  // Saticinin kendi markali ana sayfasi (alt alan adi: <slug>.mooz.store)
  storeHome(ctx, { store, products, activeCat, q }) {
    const t = ctx.t;
    const heading = q ? `"${esc(q)}" ${esc(t('results'))}`
      : (activeCat ? esc((ctx.categories.find(c => c.slug === activeCat) || {}).name || '') : esc(t('products')));
    const grid = products.length
      ? `<div class="grid">${products.map(p => productCard(ctx, p, false)).join('')}</div>`
      : `<p class="empty">${esc(t('empty_store'))}</p>`;
    return layout(ctx, `
      <section class="store-banner">
        <div class="store-logo">\u{1F3EA}</div>
        <div><h1>${esc(store.name)}</h1>
        <p class="muted">${esc(store.description || '')}</p></div>
      </section>
      <div class="sect-h"><h2>${heading}</h2><span class="muted">${products.length} ${esc(t('n_products'))}</span></div>
      ${grid}`);
  },

  login(ctx) {
    const t = ctx.t;
    return layout(ctx, `
      <div class="auth-card">
        <h1>${esc(t('login'))}</h1>
        <form action="/login" method="post">
          <label>${esc(t('email'))}</label><input type="email" name="email" required>
          <label>${esc(t('password'))}</label><input type="password" name="password" required>
          <button class="btn btn-brand big" type="submit">${esc(t('login'))}</button>
        </form>
        <p class="muted small">${esc(t('no_account'))} <a href="/register">${esc(t('register'))}</a></p>
        <div class="demo-box"><strong>${esc(t('demo_logins'))}</strong>
          <ul><li>Admin: admin@mooz.store / admin123</li>
          <li>Satici: moda@mooz.store / satici123</li></ul>
        </div>
      </div>`);
  },

  register(ctx) {
    const t = ctx.t;
    return layout(ctx, `
      <div class="auth-card">
        <h1>${esc(t('register'))}</h1>
        <form action="/register" method="post">
          <label>${esc(t('name_store'))}</label><input type="text" name="name" required>
          <label>${esc(t('email'))}</label><input type="email" name="email" required>
          <label>${esc(t('password'))}</label><input type="password" name="password" required>
          <label>${esc(t('account_type'))}</label>
          <div class="radio-row">
            <label class="radio"><input type="radio" name="role" value="buyer" checked> ${esc(t('buyer_opt'))}</label>
            <label class="radio"><input type="radio" name="role" value="seller"> ${esc(t('seller_opt'))}</label>
          </div>
          <button class="btn btn-brand big" type="submit">${esc(t('register'))}</button>
        </form>
        <p class="muted small">${esc(t('have_account'))} <a href="/login">${esc(t('login'))}</a></p>
      </div>`);
  },

  sellerDashboard(ctx, { store, productCount }) {
    let notice = '';
    if (!store) notice = '<p class="empty">Magaza kaydin bulunamadi.</p>';
    else if (store.status === 'pending') notice = '<div class="notice warn">Magazan <strong>admin onayi</strong> bekliyor. Onaylanana kadar urunlerin vitrinde gorunmez, ama simdiden ekleyebilirsin.</div>';
    else if (store.status === 'suspended') notice = '<div class="notice warn">Magazan askiya alinmis.</div>';
    else notice = `<div class="notice ok">Magazan <strong>aktif</strong>. Vitrinin: <a href="/store/${esc(store.slug)}">/store/${esc(store.slug)}</a></div>`;
    const statusTxt = store ? (store.status === 'active' ? 'Aktif' : store.status === 'pending' ? 'Onayda' : 'Askida') : '-';
    return layout(ctx, `
      <div class="panel-head seller">
        <div><h1>Satici Paneli</h1><p class="muted">Merhaba ${esc(ctx.user.name)} &middot; magazani buradan yonet.</p></div>
        <a class="btn btn-brand" href="/seller/products/new">+ Yeni Urun</a>
      </div>
      ${notice}
      ${store ? `<div class="stat-row">
        <div class="stat"><div class="n">${productCount}</div><div class="l">Urunum</div></div>
        <div class="stat"><div class="n">${statusTxt}</div><div class="l">Durum</div></div>
        <div class="stat"><div class="n">${esc(store.slug)}</div><div class="l">Magaza adresi</div></div>
      </div>
      <div class="panel-links">
        <a class="btn btn-ghost" href="/seller/products">Urunlerimi yonet</a>
        <a class="btn btn-ghost" href="/seller/orders">Gelen Siparisler</a>
        ${store.status === 'active' ? `<a class="btn btn-ghost" href="/store/${esc(store.slug)}">Vitrinimi gor</a>` : ''}
      </div>
      ${store.status === 'active' ? `
      <div class="auth-card" style="max-width:none;margin:18px 0 0">
        <h3>\u{1F3EA} Magaza Sitem</h3>
        <p class="muted small">Kendi markali vitrinin. Hem market icinde hem de kendi alt alan adinda yayinlanir (Shopist'teki gibi).</p>
        <ul class="store-urls">
          <li><strong>Alt alan adi (canli):</strong> <code>${esc(store.slug)}.mooz.store</code> <span class="muted small">— site yayina alininca</span></li>
          <li><strong>Simdi test et:</strong> <a href="http://${esc(store.slug)}.localhost:3000" target="_blank">${esc(store.slug)}.localhost:3000</a></li>
          <li><strong>Market vitrini:</strong> <a href="/store/${esc(store.slug)}">/store/${esc(store.slug)}</a></li>
        </ul>
        <form action="/seller/store" method="post">
          <label>Magaza aciklamasi (vitrininde gorunur)</label>
          <textarea name="description" rows="2" placeholder="Orn: Kaliteli mobilya, hizli teslimat">${esc(store.description || '')}</textarea>
          <button class="btn btn-brand" type="submit" style="margin-top:10px">Kaydet</button>
        </form>
      </div>` : ''}` : ''}`);
  },

  sellerProducts(ctx, { products }) {
    const rows = products.map(p => `<tr>
      <td><span class="pemoji">${p.emoji || ''}</span> ${esc(p.name)}</td>
      <td>${esc(p.cat_name || '-')}</td>
      <td><strong>${money(p.price_cents, p.currency)}</strong></td>
      <td>${p.stock}</td>
      <td><form action="/seller/products/${p.id}/delete" method="post" onsubmit="return confirm('Bu urunu sil?')"><button class="link-danger" type="submit">Sil</button></form></td>
    </tr>`).join('');
    return layout(ctx, `
      <div class="panel-head seller">
        <div><h1>Urunlerim</h1><p class="muted">${products.length} urun</p></div>
        <a class="btn btn-brand" href="/seller/products/new">+ Yeni Urun</a>
      </div>
      ${products.length ? `<div class="table-wrap"><table class="ptable">
        <thead><tr><th>Urun</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`
        : '<p class="empty">Henuz urunun yok. <a href="/seller/products/new">Ilk urununu ekle &rarr;</a></p>'}`);
  },

  newProduct(ctx, { cats }) {
    return layout(ctx, `
      <a class="back" href="/seller/products">&larr; Urunlerim</a>
      <div class="auth-card wide">
        <h1>Yeni Urun Ekle</h1>
        <form action="/seller/products" method="post">
          <label>Urun adi *</label><input type="text" name="name" required placeholder="Orn: Pamuklu Tisort">
          <label>Kategori</label>
          <select name="category_id"><option value="">Secin...</option>
            ${cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
          </select>
          <div class="form-row">
            <div><label>Fiyat *</label><input type="text" name="price" required placeholder="19,99"></div>
            <div><label>Para birimi</label><select name="currency"><option value="EUR">EUR (&euro;)</option><option value="TRY">TRY (&#8378;)</option></select></div>
            <div><label>Stok</label><input type="number" name="stock" value="1" min="0"></div>
          </div>
          <label>Gorsel linki (URL) - istege bagli</label>
          <input type="url" name="image_url" placeholder="https://.../resim.jpg">
          <p class="muted small" style="margin:4px 0 0">Resim linki verirsen urun fotografi gorunur; vermezsen asagidaki emoji kullanilir.</p>
          <label>Gorsel (emoji - link yoksa)</label>
          <input type="text" name="emoji" value="&#x1F4E6;" maxlength="4" style="width:90px;text-align:center;font-size:20px">
          <label>Aciklama</label><textarea name="description" rows="3" placeholder="Kisa urun aciklamasi"></textarea>
          <button class="btn btn-brand big" type="submit">Urunu Yayinla</button>
        </form>
      </div>`);
  },

  adminDashboard(ctx, { stores, stats, finance }) {
    // Yetkiye gore bolum erisim linkleri
    const navLinks = [];
    if (ctx.hasPerm('staff')) navLinks.push('<a class="btn btn-light" href="/admin/staff">Personel yonetimi</a>');
    const navBar = navLinks.length ? `<div class="admin-nav">${navLinks.join('')}</div>` : '';

    // Finans ozeti (sadece finance yetkisi)
    const financeBox = finance ? `
      <div class="sect-h"><h2>Finans ozeti</h2></div>
      <div class="stat-row">
        <div class="stat"><div class="n">${money(finance.sales, 'EUR')}</div><div class="l">Toplam ciro</div></div>
        <div class="stat"><div class="n">${money(finance.commission, 'EUR')}</div><div class="l">Komisyon geliri</div></div>
        <div class="stat"><div class="n">${money(finance.payout, 'EUR')}</div><div class="l">Saticilara odenecek</div></div>
      </div>` : '';

    // Magazalar (sadece sellers yetkisi)
    let storeBox = '';
    if (stores) {
      const rows = stores.map(s => {
        const badge = s.status === 'active' ? '<span class="badge ok">Aktif</span>'
          : s.status === 'pending' ? '<span class="badge warn">Onayda</span>'
          : '<span class="badge off">Askida</span>';
        const actions = `${s.status !== 'active' ? `<form action="/admin/stores/${s.id}/approve" method="post"><button class="link-ok" type="submit">Onayla</button></form>` : ''}${s.status === 'active' ? `<form action="/admin/stores/${s.id}/suspend" method="post"><button class="link-danger" type="submit">Askiya al</button></form>` : ''}`;
        return `<tr>
          <td><strong>${esc(s.name)}</strong><br><span class="muted small">/store/${esc(s.slug)}</span></td>
          <td class="small">${esc(s.owner_email)}</td>
          <td>${s.product_count}</td>
          <td>${badge}</td>
          <td class="actions">${actions}</td></tr>`;
      }).join('');
      storeBox = `
        <div class="sect-h"><h2>Magazalar</h2></div>
        <div class="table-wrap"><table class="ptable">
          <thead><tr><th>Magaza</th><th>Sahip</th><th>Urun</th><th>Durum</th><th>Islem</th></tr></thead>
          <tbody>${rows}</tbody></table></div>`;
    }

    return layout(ctx, `
      <div class="panel-head admin"><div><h1>Admin Paneli</h1><p class="muted">Platformu buradan yonet.</p></div></div>
      ${navBar}
      <div class="stat-row">
        <div class="stat"><div class="n">${stats.stores}</div><div class="l">Magaza</div></div>
        <div class="stat"><div class="n">${stats.sellers}</div><div class="l">Satici</div></div>
        <div class="stat"><div class="n">${stats.buyers}</div><div class="l">Alici</div></div>
        <div class="stat"><div class="n">${stats.products}</div><div class="l">Urun</div></div>
        <div class="stat"><div class="n">${stats.orders}</div><div class="l">Siparis</div></div>
        <div class="stat"><div class="n">${money(stats.commission, 'EUR')}</div><div class="l">Komisyon geliri</div></div>
      </div>
      ${financeBox}
      ${storeBox}`);
  },

  adminStaff(ctx, { staff, perms }) {
    const checkboxes = (prefix, current) => perms.map(([key, label]) => {
      const on = current === '*' || (',' + (current || '') + ',').includes(',' + key + ',');
      const dis = current === '*' ? ' disabled' : '';
      return `<label class="perm-chk"><input type="checkbox" name="${prefix}${key}"${on ? ' checked' : ''}${dis}> ${esc(label)}</label>`;
    }).join('');

    const rows = staff.map(u => {
      const owner = u.email === 'admin@mooz.store';
      const permText = u.permissions === '*' ? '<span class="badge ok">Tum yetkiler (sahip)</span>'
        : (u.permissions ? u.permissions.split(',').filter(Boolean).map(k => {
            const p = perms.find(x => x[0] === k); return p ? esc(p[1]) : esc(k);
          }).join(', ') : '<span class="muted">yetki yok</span>');
      const editForm = owner ? '<span class="muted small">Ana sahip — degistirilemez</span>' : `
        <form action="/admin/staff/${u.id}/perms" method="post" class="perm-form">
          <div class="perm-grid">${checkboxes('perm_', u.permissions)}</div>
          <button class="btn btn-light small" type="submit">Kaydet</button>
        </form>
        <form action="/admin/staff/${u.id}/delete" method="post" onsubmit="return confirm('Bu personel silinsin mi?')">
          <button class="link-danger" type="submit">Sil</button>
        </form>`;
      return `<tr>
        <td><strong>${esc(u.name)}</strong><br><span class="muted small">${esc(u.email)}</span></td>
        <td>${permText}</td>
        <td class="actions">${editForm}</td></tr>`;
    }).join('');

    return layout(ctx, `
      <div class="panel-head admin"><div><h1>Personel Yonetimi</h1><p class="muted">Ekibine sinirli yetkili admin hesaplari ac.</p></div>
        <a class="btn btn-light" href="/admin">&larr; Admin paneli</a></div>

      <div class="sect-h"><h2>Yeni personel ekle</h2></div>
      <form action="/admin/staff" method="post" class="form-card">
        <label>Ad Soyad<input name="name" required></label>
        <label>E-posta<input name="email" type="email" required></label>
        <label>Sifre (en az 6 karakter)<input name="password" type="password" minlength="6" required></label>
        <div class="field"><span class="flabel">Yetkiler</span><div class="perm-grid">${checkboxes('perm_', '')}</div></div>
        <button class="btn btn-brand" type="submit">Personel ekle</button>
      </form>

      <div class="sect-h"><h2>Personel listesi</h2></div>
      <div class="table-wrap"><table class="ptable">
        <thead><tr><th>Kisi</th><th>Yetkiler</th><th>Duzenle</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`);
  },

  cart(ctx, { rows }) {
    const t = ctx.t;
    if (!rows.length) return layout(ctx, `
      <h1>${esc(t('cart_title'))}</h1>
      <p class="empty">${esc(t('cart_empty'))} <a href="/">${esc(t('start_shopping'))} &rarr;</a></p>`);
    // Satici bazinda grupla
    const byStore = {};
    rows.forEach(r => { (byStore[r.store_id] = byStore[r.store_id] || { name: r.store_name, slug: r.store_slug, items: [] }).items.push(r); });
    const groups = Object.keys(byStore).map(sid => {
      const g = byStore[sid];
      const items = g.items.map(r => `
        <div class="cart-row">
          <div class="cr-thumb">${thumb(r)}</div>
          <div class="cr-main">
            <a href="/product/${r.id}"><strong>${esc(r.name)}</strong></a>
            <div class="muted small">${ctx.price(r.price_cents, r.currency)} / ${esc(t('per_unit'))}</div>
            <form action="/cart/update" method="post" class="qty-form">
              <input type="hidden" name="product_id" value="${r.id}">
              <input type="number" name="qty" value="${r.qty}" min="0" style="width:64px">
              <button class="link-ok" type="submit">${esc(t('update'))}</button>
            </form>
          </div>
          <div class="cr-right">
            <div class="price">${ctx.price(r.price_cents * r.qty, r.currency)}</div>
            <form action="/cart/remove" method="post"><input type="hidden" name="product_id" value="${r.id}"><button class="link-danger" type="submit">${esc(t('remove'))}</button></form>
          </div>
        </div>`).join('');
      return `<div class="cart-group"><h3>\u{1F3EA} ${esc(g.name)}</h3>${items}</div>`;
    }).join('');
    return layout(ctx, `
      <h1>${esc(t('cart_title'))}</h1>
      <div class="cart-list">${groups}</div>
      <div class="cart-summary">
        <div class="totrow big"><span>${esc(t('total'))}</span><span>${totalsLine(ctx, rows)}</span></div>
        <a class="btn btn-brand big" href="/checkout">${esc(t('to_checkout'))} &rarr;</a>
      </div>`);
  },

  checkout(ctx, { rows }) {
    const t = ctx.t;
    const byStore = {};
    rows.forEach(r => { (byStore[r.store_id] = byStore[r.store_id] || { name: r.store_name, items: [] }).items.push(r); });
    const summary = Object.keys(byStore).map(sid => {
      const g = byStore[sid];
      const lines = g.items.map(r => `<div class="sum-line"><span>${esc(r.name)} × ${r.qty}</span><span>${ctx.price(r.price_cents * r.qty, r.currency)}</span></div>`).join('');
      return `<div class="sum-group"><div class="muted small">\u{1F3EA} ${esc(g.name)}</div>${lines}</div>`;
    }).join('');
    return layout(ctx, `
      <a class="back" href="/cart">&larr; ${esc(t('back_cart'))}</a>
      <h1>${esc(t('checkout_title'))}</h1>
      <div class="checkout-grid">
        <form action="/checkout" method="post" class="auth-card" style="margin:0">
          <h3>${esc(t('delivery'))}</h3>
          <label>${esc(t('f_name'))}</label><input name="name" required>
          <label>${esc(t('f_address'))}</label><input name="address" required>
          <div class="form-row">
            <div><label>${esc(t('f_zip'))}</label><input name="zip"></div>
            <div><label>${esc(t('f_city'))}</label><input name="city"></div>
          </div>
          <label>${esc(t('f_country'))}</label>
          <select name="country"><option>Belcika</option><option>Hollanda</option><option>Turkiye</option></select>
          <label>${esc(t('pay_method'))}</label>
          <div class="radio-row">
            ${Object.keys(payment.METHODS).map((m, i) => `<label class="radio"><input type="radio" name="method" value="${m}"${i === 0 ? ' checked' : ''}> ${esc(payment.METHODS[m])}</label>`).join('')}
          </div>
          <button class="btn btn-brand big" type="submit">${esc(t('confirm_order'))}</button>
          <p class="muted small" style="margin-top:8px">${esc(t('sim_note'))}</p>
        </form>
        <div class="auth-card" style="margin:0">
          <h3>${esc(t('summary'))}</h3>
          ${summary}
          <div class="totrow big" style="margin-top:12px"><span>${esc(t('total'))}</span><span>${totalsLine(ctx, rows)}</span></div>
        </div>
      </div>`);
  },

  orders(ctx, { orders }) {
    const t = ctx.t;
    if (!orders.length) return layout(ctx, `<h1>${esc(t('orders'))}</h1><p class="empty">${esc(t('orders_empty'))} <a href="/">${esc(t('start_shopping'))} &rarr;</a></p>`);
    const rows = orders.map(o => `<tr>
      <td><a href="/orders/${o.id}"><strong>#${o.id}</strong></a></td>
      <td class="small">${esc((o.created_at || '').slice(0, 16))}</td>
      <td><strong>${ctx.price(o.total_cents, o.currency)}</strong></td>
      <td><span class="badge ok">${esc(t('paid'))}</span></td>
      <td><a class="link-ok" href="/orders/${o.id}">${esc(t('detail'))}</a></td>
    </tr>`).join('');
    return layout(ctx, `<h1>${esc(t('orders'))}</h1>
      <div class="table-wrap"><table class="ptable">
      <thead><tr><th>${esc(t('order'))}</th><th>${esc(t('date'))}</th><th>${esc(t('amount'))}</th><th>${esc(t('status'))}</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`);
  },

  orderDetail(ctx, { order, sellerOrders }) {
    const t = ctx.t;
    const groups = sellerOrders.map(so => {
      const items = so.items.map(it => `<div class="sum-line"><span>${esc(it.name)} × ${it.qty}</span><span>${ctx.price(it.price_cents * it.qty, it.currency)}</span></div>`).join('');
      const ship = so.tracking_no
        ? `<div class="sum-line"><span>${esc(t('cargo'))}</span><span>${esc(shipping.carrierLabel(so.carrier))} &middot; ${esc(so.tracking_no)}</span></div>`
        : '';
      return `<div class="order-seller">
        <div class="os-head"><a href="/store/${esc(so.store_slug)}">\u{1F3EA} ${esc(so.store_name)}</a> ${soBadge(t, so.status)}</div>
        ${items}
        ${ship}
        <div class="sum-line muted"><span>${esc(t('subtotal'))}</span><span>${ctx.price(so.subtotal_cents, so.currency)}</span></div>
      </div>`;
    }).join('');
    return layout(ctx, `
      <a class="back" href="/orders">&larr; ${esc(t('orders'))}</a>
      <h1>${esc(t('order'))} #${order.id}</h1>
      <p class="muted small">${esc((order.created_at || '').slice(0, 16))} &middot; ${esc(order.address || '')}</p>
      <div class="notice ok">${esc(t('paid'))} — ${esc(payment.methodLabel(order.payment_method || 'card'))}${order.payment_ref ? ' (' + esc(order.payment_ref) + ')' : ''} &middot; ${esc(t('split_note'))}</div>
      ${groups}
      <div class="cart-summary"><div class="totrow big"><span>${esc(t('grand_total'))}</span><span>${ctx.price(order.total_cents, order.currency)}</span></div></div>`);
  },

  sellerOrders(ctx, { sellerOrders }) {
    if (!sellerOrders.length) return layout(ctx, `
      <div class="panel-head seller"><div><h1>Gelen Siparisler</h1><p class="muted">Henuz siparis yok.</p></div></div>
      <p class="empty">Magazana siparis geldiginde burada gorunecek.</p>`);
    const cards = sellerOrders.map(so => {
      const items = so.items.map(it => `<div class="sum-line"><span>${esc(it.name)} × ${it.qty}</span><span>${money(it.price_cents * it.qty, it.currency)}</span></div>`).join('');
      const net = so.subtotal_cents - so.commission_cents;
      const btn = (val, label) => `<form action="/seller/orders/${so.id}/status" method="post" style="display:inline"><input type="hidden" name="status" value="${val}"><button class="btn btn-ghost" type="submit"${so.status === val ? ' disabled' : ''}>${label}</button></form>`;
      return `<div class="order-seller">
        <div class="os-head"><strong>Siparis #${so.order_id}</strong> ${soBadge(ctx.t, so.status)} <span class="muted small">${esc((so.order_date || '').slice(0, 16))} &middot; ${esc(so.buyer_name)}</span></div>
        <div class="muted small">Teslimat: ${esc(so.address || '-')}</div>
        ${items}
        <div class="sum-line"><span>Ara toplam</span><span>${money(so.subtotal_cents, so.currency)}</span></div>
        <div class="sum-line muted"><span>Komisyon (${Math.round((so.commission_cents / (so.subtotal_cents || 1)) * 100)}%)</span><span>- ${money(so.commission_cents, so.currency)}</span></div>
        <div class="sum-line"><strong>Senin kazancin</strong><strong>${money(net, so.currency)}</strong></div>
        <div class="os-actions">Durum: ${btn('hazirlaniyor', 'Hazirlaniyor')} ${btn('teslim', 'Teslim edildi')}</div>
        <form action="/seller/orders/${so.id}/status" method="post" class="ship-form">
          <input type="hidden" name="status" value="kargoda">
          <select name="carrier"><option value="">Kargo firmasi...</option>${Object.keys(shipping.CARRIERS).map(c => `<option value="${c}"${so.carrier === c ? ' selected' : ''}>${esc(shipping.CARRIERS[c].label)} (${shipping.CARRIERS[c].region})</option>`).join('')}</select>
          <input name="tracking_no" placeholder="Takip no" value="${esc(so.tracking_no || '')}">
          <button class="btn btn-ghost" type="submit">Kargoya ver</button>
        </form>
        ${so.tracking_no ? `<div class="muted small">\u{1F4E6} ${esc(shipping.carrierLabel(so.carrier))} &middot; Takip: ${esc(so.tracking_no)}</div>` : ''}
      </div>`;
    }).join('');
    return layout(ctx, `
      <div class="panel-head seller"><div><h1>Gelen Siparisler</h1><p class="muted">${sellerOrders.length} siparis</p></div></div>
      ${cards}`);
  },

  notFound(ctx) {
    const t = ctx.t;
    return layout(ctx, `<div class="empty big"><h1>404</h1><p>${esc(t('nf_text'))}</p><a class="btn btn-brand" href="/">${esc(t('home_btn'))}</a></div>`);
  },
};

module.exports = { layout, pages };
