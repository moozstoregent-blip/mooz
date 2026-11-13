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
      <a class="btn btn-ghost" href="/favorites">&#x2665; ${esc(t('fav_mine'))}${ctx.favCount ? ' (' + ctx.favCount + ')' : ''}</a>
      <a class="btn btn-ghost" href="/orders">${esc(t('orders'))}</a>
      <a class="btn btn-brand" href="/cart">${esc(t('cart'))}${ctx.cartCount ? ' (' + ctx.cartCount + ')' : ''}</a>
      ${user.role === 'seller' ? `<a class="btn btn-ghost nav-badge-wrap" href="/seller">${esc(t('seller_panel'))}${ctx.newOrders ? `<span class="nav-badge">${ctx.newOrders}</span>` : ''}</a>` : ''}
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
  return (p.image_url && /^(https?:\/\/|data:image\/)/i.test(p.image_url))
    ? `<img class="pimg" src="${esc(p.image_url)}" alt="${esc(p.name)}">`
    : (p.emoji || '');
}

// Yildiz gosterimi (ortalama puan). count verilirse yanina adet yazar.
function stars(ctx, avg, count) {
  const a = Math.round((avg || 0) * 2) / 2; // 0.5 adimli
  let s = '';
  for (let i = 1; i <= 5; i++) {
    if (a >= i) s += '<span class="st full">★</span>';
    else if (a >= i - 0.5) s += '<span class="st half">★</span>';
    else s += '<span class="st">★</span>';
  }
  const label = (count === undefined) ? '' :
    (count > 0 ? `<span class="rcount">${(avg).toFixed(1)} (${count})</span>` : `<span class="rcount muted">${esc(ctx.t('rv_none_short'))}</span>`);
  return `<span class="stars">${s}${label}</span>`;
}

// Kalp (favori) butonu
function favBtn(ctx, pid, cls) {
  const on = ctx.favSet && ctx.favSet.has(pid);
  return `<form action="/favorites/toggle" method="post" class="fav-form ${cls || ''}">
    <input type="hidden" name="product_id" value="${pid}">
    <input type="hidden" name="back" value="${esc(ctx.path)}">
    <button type="submit" class="fav-btn${on ? ' on' : ''}" title="${esc(ctx.t(on ? 'fav_remove' : 'fav_add'))}" aria-label="favori">${on ? '♥' : '♡'}</button>
  </form>`;
}

function productCard(ctx, p, showSeller) {
  const rating = (p.rating_count !== undefined)
    ? `<div class="card-rating">${stars(ctx, p.rating_avg || 0, p.rating_count)}</div>` : '';
  return `<div class="card">
    <a href="/product/${p.id}" class="thumb">${thumb(p)}${showSeller ? `<span class="seller-tag">\u{1F3EA} ${esc(p.store_name)}</span>` : ''}</a>
    ${favBtn(ctx, p.id, 'on-card')}
    <div class="cbody">
      <h3><a href="/product/${p.id}">${esc(p.name)}</a></h3>
      ${showSeller ? `<a class="store-link" href="/store/${esc(p.store_slug)}">${esc(p.store_name)}</a>` : ''}
      ${rating}
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

// Siparis odeme durumu rozeti
function orderBadge(t, st) {
  if (st === 'odendi') return `<span class="badge ok">${esc(t('paid'))}</span>`;
  if (st === 'iptal') return `<span class="badge off">${esc(t('ord_cancelled'))}</span>`;
  return `<span class="badge warn">${esc(t('ord_pending'))}</span>`;
}

// Odeme saglayici/yontem etiketi
function payProviderLabel(m) {
  if (payment.PROVIDERS[m]) return payment.PROVIDERS[m].label;
  if (m === 'simulation') return 'Simülasyon';
  return payment.methodLabel(m || 'card');
}

// Sepet toplamini gosterim para birimine cevirip topla
function totalsLine(ctx, rows) {
  const cents = rows.reduce((s, r) => s + convert(r.price_cents * r.qty, r.currency, ctx.displayCur), 0);
  return money(cents, ctx.displayCur);
}

const pages = {
  home(ctx, { products, activeCat, q, sort, instock, min, max }) {
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

    // Filtre & siralama cubugu
    const sortOpt = (v, label) => `<option value="${v}"${sort === v ? ' selected' : ''}>${label}</option>`;
    const filterBar = `
      <form class="filter-bar" method="get" action="/">
        ${q ? `<input type="hidden" name="q" value="${esc(q)}">` : ''}
        ${activeCat ? `<input type="hidden" name="cat" value="${esc(activeCat)}">` : ''}
        <div class="fb-group">
          <label>${esc(t('f_sort'))}</label>
          <select name="sort" onchange="this.form.submit()">
            ${sortOpt('new', esc(t('f_sort_new')))}
            ${sortOpt('price_asc', esc(t('f_sort_price_asc')))}
            ${sortOpt('price_desc', esc(t('f_sort_price_desc')))}
            ${sortOpt('rating', esc(t('f_sort_rating')))}
            ${sortOpt('name', esc(t('f_sort_name')))}
          </select>
        </div>
        <div class="fb-group">
          <label>${esc(t('f_price'))} (${esc(ctx.displayCur)})</label>
          <div class="fb-price">
            <input type="number" name="min" value="${esc(String(min || ''))}" placeholder="min" min="0" step="0.01">
            <span>-</span>
            <input type="number" name="max" value="${esc(String(max || ''))}" placeholder="max" min="0" step="0.01">
          </div>
        </div>
        <label class="fb-check"><input type="checkbox" name="instock" value="1"${instock ? ' checked' : ''} onchange="this.form.submit()"> ${esc(t('f_instock'))}</label>
        <button class="btn btn-brand" type="submit">${esc(t('f_apply'))}</button>
        ${(q || activeCat || instock || min || max || sort !== 'new') ? `<a class="fb-clear" href="/">${esc(t('f_clear'))}</a>` : ''}
      </form>`;

    const grid = products.length
      ? `<div class="grid">${products.map(p => productCard(ctx, p, true)).join('')}</div>`
      : `<p class="empty">${esc(t('f_no_results'))} <a href="/">${esc(t('f_clear_filters'))} &rarr;</a></p>`;
    return layout(ctx, `${hero}
      <div class="sect-h"><h2>${heading}</h2><span class="muted">${products.length} ${esc(t('n_products'))}</span></div>
      ${filterBar}
      ${grid}`);
  },

  favorites(ctx, { products }) {
    const grid = products.length
      ? `<div class="grid">${products.map(p => productCard(ctx, p, true)).join('')}</div>`
      : `<p class="empty">${esc(ctx.t('fav_empty'))} <a href="/">${esc(ctx.t('fav_browse'))} &rarr;</a></p>`;
    return layout(ctx, `
      <div class="sect-h"><h2>♥ ${esc(ctx.t('fav_mine'))}</h2><span class="muted">${products.length} ${esc(ctx.t('n_products'))}</span></div>
      ${grid}`);
  },

  product(ctx, { p, agg, reviews, myReview }) {
    const t = ctx.t;
    const avg = agg ? agg.avg : 0, count = agg ? agg.n : 0;

    // Yorum listesi
    const reviewList = (reviews && reviews.length)
      ? reviews.map(r => `
          <div class="review">
            <div class="rv-head">
              <span class="rv-name">${esc(r.user_name)}</span>
              ${stars(ctx, r.rating)}
              <span class="muted small">${esc((r.created_at || '').slice(0, 10))}</span>
            </div>
            ${r.comment ? `<p class="rv-text">${esc(r.comment)}</p>` : ''}
          </div>`).join('')
      : `<p class="empty">${esc(t('rv_none'))}</p>`;

    // Yorum formu (giris yapmis kullanici)
    let reviewForm;
    if (!ctx.user) {
      reviewForm = `<p class="muted">${esc(t('rv_login_pre'))} <a href="/login">${esc(t('rv_login_link'))}</a>.</p>`;
    } else {
      const cur = myReview ? myReview.rating : 0;
      const radios = [5, 4, 3, 2, 1].map(n =>
        `<input type="radio" id="star${n}" name="rating" value="${n}"${cur === n ? ' checked' : ''}><label for="star${n}" title="${n}">★</label>`
      ).join('');
      reviewForm = `
        <form action="/product/${p.id}/review" method="post" class="review-form">
          <div class="star-input">${radios}</div>
          <textarea name="comment" rows="3" placeholder="${esc(t('rv_ph'))}">${myReview ? esc(myReview.comment) : ''}</textarea>
          <button class="btn btn-brand" type="submit">${myReview ? esc(t('rv_update')) : esc(t('rv_send'))}</button>
        </form>`;
    }

    return layout(ctx, `
      <a class="back" href="/">&larr; ${esc(t('back_store'))}</a>
      <div class="product-detail">
        <div class="pd-thumb">${thumb(p)}</div>
        <div class="pd-info">
          ${p.cat_name ? `<span class="chip">${esc(p.cat_name)}</span>` : ''}
          <h1>${esc(p.name)}</h1>
          <a class="store-link" href="/store/${esc(p.store_slug)}">\u{1F3EA} ${esc(p.store_name)}</a>
          <div class="pd-rating">${stars(ctx, avg, count)} ${favBtn(ctx, p.id, 'inline')}</div>
          <div class="pd-price">${ctx.price(p.price_cents, p.currency)}</div>
          <p class="pd-desc">${p.description ? esc(p.description) : esc(t('no_desc'))}</p>
          <p class="muted small">${esc(t('stock'))}: ${p.stock}</p>
          ${p.stock > 0
            ? `<form action="/cart/add" method="post"><input type="hidden" name="product_id" value="${p.id}"><button class="btn btn-brand big" type="submit">${esc(t('add_to_cart'))}</button></form>`
            : `<button class="btn btn-brand big" disabled>${esc(t('soldout'))}</button>`}
        </div>
      </div>

      <div class="reviews-section">
        <div class="sect-h"><h2>${esc(t('rv_title'))} ${count ? `(${count})` : ''}</h2></div>
        <div class="review-box">${reviewForm}</div>
        <div class="review-list">${reviewList}</div>
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
    const t = ctx.t;
    let notice = '';
    if (!store) notice = `<p class="empty">${esc(t('sp_no_store'))}</p>`;
    else if (store.status === 'pending') notice = `<div class="notice warn">${t('sp_pending')}</div>`;
    else if (store.status === 'suspended') notice = `<div class="notice warn">${t('sp_suspended')}</div>`;
    else notice = `<div class="notice ok">${t('sp_active')} <a href="/store/${esc(store.slug)}">/store/${esc(store.slug)}</a></div>`;
    return layout(ctx, `
      <div class="panel-head seller">
        <div><h1>${esc(t('seller_panel'))}</h1><p class="muted">${esc(t('sp_hello'))} ${esc(ctx.user.name)} &middot; ${esc(t('sp_manage'))}</p></div>
        <a class="btn btn-brand" href="/seller/products/new">+ ${esc(t('sp_new_product'))}</a>
      </div>
      ${notice}
      ${ctx.newOrders ? `<div class="notice neworder">\u{1F514} <strong>${ctx.newOrders} ${esc(t('sp_new_orders'))}</strong> <a href="/seller/orders">${esc(t('sp_see_orders'))} &rarr;</a></div>` : ''}
      ${store ? `<div class="stat-row">
        <div class="stat"><div class="n">${productCount}</div><div class="l">${esc(t('sp_stat_products'))}</div></div>
        <div class="stat${ctx.newOrders ? ' hot' : ''}"><div class="n">${ctx.newOrders}</div><div class="l">${esc(t('sp_stat_neworder'))}</div></div>
        <div class="stat"><div class="n">${esc(store.slug)}</div><div class="l">${esc(t('sp_stat_address'))}</div></div>
      </div>
      <div class="panel-links">
        <a class="btn btn-ghost" href="/seller/products">${esc(t('sp_manage_products'))}</a>
        <a class="btn btn-ghost nav-badge-wrap" href="/seller/orders">${esc(t('sp_incoming'))}${ctx.newOrders ? `<span class="nav-badge">${ctx.newOrders}</span>` : ''}</a>
        ${store.status === 'active' ? `<a class="btn btn-ghost" href="/store/${esc(store.slug)}">${esc(t('sp_view_store'))}</a>` : ''}
      </div>
      ${store.status === 'active' ? `
      <div class="auth-card" style="max-width:none;margin:18px 0 0">
        <h3>\u{1F3EA} ${esc(t('sp_my_site'))}</h3>
        <p class="muted small">${esc(t('sp_my_site_desc'))}</p>
        <ul class="store-urls">
          <li><strong>${esc(t('sp_subdomain'))}</strong> <code>${esc(store.slug)}.mooz.store</code> <span class="muted small">— ${esc(t('sp_when_live'))}</span></li>
          <li><strong>${esc(t('sp_test_now'))}</strong> <a href="http://${esc(store.slug)}.localhost:3000" target="_blank">${esc(store.slug)}.localhost:3000</a></li>
          <li><strong>${esc(t('sp_market_store'))}</strong> <a href="/store/${esc(store.slug)}">/store/${esc(store.slug)}</a></li>
        </ul>
        <form action="/seller/store" method="post">
          <label>${esc(t('sp_store_desc_label'))}</label>
          <textarea name="description" rows="2" placeholder="${esc(t('sp_store_desc_ph'))}">${esc(store.description || '')}</textarea>
          <button class="btn btn-brand" type="submit" style="margin-top:10px">${esc(t('save'))}</button>
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
        <form action="/seller/products" method="post" enctype="multipart/form-data">
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
          <label>Gorsel - bilgisayardan foto yukle (istege bagli)</label>
          <input type="file" name="image_file" accept="image/png,image/jpeg,image/webp,image/gif">
          <p class="muted small" style="margin:4px 0 0">PNG/JPG/WEBP, en fazla ~3 MB. Foto yuklersen o kullanilir.</p>
          <label>veya Gorsel linki (URL)</label>
          <input type="url" name="image_url" placeholder="https://.../resim.jpg">
          <p class="muted small" style="margin:4px 0 0">Ne foto ne link verirsen asagidaki emoji kullanilir.</p>
          <label>Gorsel (emoji - foto/link yoksa)</label>
          <input type="text" name="emoji" value="&#x1F4E6;" maxlength="4" style="width:90px;text-align:center;font-size:20px">
          <label>Aciklama</label><textarea name="description" rows="3" placeholder="Kisa urun aciklamasi"></textarea>
          <button class="btn btn-brand big" type="submit">Urunu Yayinla</button>
        </form>
      </div>`);
  },

  adminDashboard(ctx, { stores, stats, finance }) {
    const t = ctx.t;
    // Yetkiye gore bolum erisim linkleri
    const navLinks = [];
    if (ctx.hasPerm('staff')) navLinks.push(`<a class="btn btn-light" href="/admin/staff">${esc(t('ad_nav_staff'))}</a>`);
    if (ctx.hasPerm('marketing')) navLinks.push(`<a class="btn btn-light" href="/admin/coupons">${esc(t('ad_nav_coupons'))}</a>`);
    if (ctx.hasPerm('finance')) navLinks.push(`<a class="btn btn-light" href="/admin/payments">${esc(t('pay_nav'))}</a>`);
    const navBar = navLinks.length ? `<div class="admin-nav">${navLinks.join('')}</div>` : '';

    // Finans ozeti (sadece finance yetkisi)
    const financeBox = finance ? `
      <div class="sect-h"><h2>${esc(t('ad_finance'))}</h2></div>
      <div class="stat-row">
        <div class="stat"><div class="n">${money(finance.sales, 'EUR')}</div><div class="l">${esc(t('ad_revenue'))}</div></div>
        <div class="stat"><div class="n">${money(finance.commission, 'EUR')}</div><div class="l">${esc(t('ad_commission'))}</div></div>
        <div class="stat"><div class="n">${money(finance.payout, 'EUR')}</div><div class="l">${esc(t('ad_payout'))}</div></div>
      </div>` : '';

    // Magazalar (sadece sellers yetkisi)
    let storeBox = '';
    if (stores) {
      const rows = stores.map(s => {
        const badge = s.status === 'active' ? `<span class="badge ok">${esc(t('b_active'))}</span>`
          : s.status === 'pending' ? `<span class="badge warn">${esc(t('b_pending'))}</span>`
          : `<span class="badge off">${esc(t('b_suspended'))}</span>`;
        const actions = `${s.status !== 'active' ? `<form action="/admin/stores/${s.id}/approve" method="post"><button class="link-ok" type="submit">${esc(t('act_approve'))}</button></form>` : ''}${s.status === 'active' ? `<form action="/admin/stores/${s.id}/suspend" method="post"><button class="link-danger" type="submit">${esc(t('act_suspend'))}</button></form>` : ''}`;
        return `<tr>
          <td><strong>${esc(s.name)}</strong><br><span class="muted small">/store/${esc(s.slug)}</span></td>
          <td class="small">${esc(s.owner_email)}</td>
          <td>${s.product_count}</td>
          <td>${badge}</td>
          <td class="actions">${actions}</td></tr>`;
      }).join('');
      storeBox = `
        <div class="sect-h"><h2>${esc(t('ad_stores'))}</h2></div>
        <div class="table-wrap"><table class="ptable">
          <thead><tr><th>${esc(t('th_store'))}</th><th>${esc(t('th_owner'))}</th><th>${esc(t('th_product'))}</th><th>${esc(t('status'))}</th><th>${esc(t('th_action'))}</th></tr></thead>
          <tbody>${rows}</tbody></table></div>`;
    }

    return layout(ctx, `
      <div class="panel-head admin"><div><h1>${esc(t('ad_title'))}</h1><p class="muted">${esc(t('ad_sub'))}</p></div></div>
      ${navBar}
      <div class="stat-row">
        <div class="stat"><div class="n">${stats.stores}</div><div class="l">${esc(t('ad_stat_stores'))}</div></div>
        <div class="stat"><div class="n">${stats.sellers}</div><div class="l">${esc(t('ad_stat_sellers'))}</div></div>
        <div class="stat"><div class="n">${stats.buyers}</div><div class="l">${esc(t('ad_stat_buyers'))}</div></div>
        <div class="stat"><div class="n">${stats.products}</div><div class="l">${esc(t('ad_stat_products'))}</div></div>
        <div class="stat"><div class="n">${stats.orders}</div><div class="l">${esc(t('ad_stat_orders'))}</div></div>
        <div class="stat"><div class="n">${money(stats.commission, 'EUR')}</div><div class="l">${esc(t('ad_commission'))}</div></div>
      </div>
      ${financeBox}
      ${storeBox}`);
  },

  adminStaff(ctx, { staff, perms }) {
    const t = ctx.t;
    const permLabel = (key) => t('perm_' + key);
    const checkboxes = (prefix, current) => perms.map(([key]) => {
      const on = current === '*' || (',' + (current || '') + ',').includes(',' + key + ',');
      const dis = current === '*' ? ' disabled' : '';
      return `<label class="perm-chk"><input type="checkbox" name="${prefix}${key}"${on ? ' checked' : ''}${dis}> ${esc(permLabel(key))}</label>`;
    }).join('');

    const rows = staff.map(u => {
      const owner = u.email === 'admin@mooz.store';
      const permText = u.permissions === '*' ? `<span class="badge ok">${esc(t('st_all_owner'))}</span>`
        : (u.permissions ? u.permissions.split(',').filter(Boolean).map(k => esc(permLabel(k))).join(', ') : `<span class="muted">${esc(t('st_no_perms'))}</span>`);
      const editForm = owner ? `<span class="muted small">${esc(t('st_owner_locked'))}</span>` : `
        <form action="/admin/staff/${u.id}/perms" method="post" class="perm-form">
          <div class="perm-grid">${checkboxes('perm_', u.permissions)}</div>
          <button class="btn btn-light small" type="submit">${esc(t('save'))}</button>
        </form>
        <form action="/admin/staff/${u.id}/delete" method="post" onsubmit="return confirm('${esc(t('st_confirm_del'))}')">
          <button class="link-danger" type="submit">${esc(t('delete'))}</button>
        </form>`;
      return `<tr>
        <td><strong>${esc(u.name)}</strong><br><span class="muted small">${esc(u.email)}</span></td>
        <td>${permText}</td>
        <td class="actions">${editForm}</td></tr>`;
    }).join('');

    return layout(ctx, `
      <div class="panel-head admin"><div><h1>${esc(t('st_title'))}</h1><p class="muted">${esc(t('st_sub'))}</p></div>
        <a class="btn btn-light" href="/admin">&larr; ${esc(t('st_back'))}</a></div>

      <div class="sect-h"><h2>${esc(t('st_add'))}</h2></div>
      <form action="/admin/staff" method="post" class="form-card">
        <label>${esc(t('st_fullname'))}<input name="name" required></label>
        <label>${esc(t('email'))}<input name="email" type="email" required></label>
        <label>${esc(t('st_password6'))}<input name="password" type="password" minlength="6" required></label>
        <div class="field"><span class="flabel">${esc(t('st_perms'))}</span><div class="perm-grid">${checkboxes('perm_', '')}</div></div>
        <button class="btn btn-brand" type="submit">${esc(t('st_add_btn'))}</button>
      </form>

      <div class="sect-h"><h2>${esc(t('st_list'))}</h2></div>
      <div class="table-wrap"><table class="ptable">
        <thead><tr><th>${esc(t('th_person'))}</th><th>${esc(t('th_perms'))}</th><th>${esc(t('th_edit'))}</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`);
  },

  adminCoupons(ctx, { coupons }) {
    const t = ctx.t;
    const rows = coupons.length ? coupons.map(c => `<tr>
      <td><strong>${esc(c.code)}</strong></td>
      <td>%${c.percent}</td>
      <td>${c.active ? `<span class="badge ok">${esc(t('b_active'))}</span>` : `<span class="badge off">${esc(t('co_inactive'))}</span>`}</td>
      <td>${c.used_count} ${esc(t('co_times'))}</td>
      <td class="actions">
        <form action="/admin/coupons/${c.id}/toggle" method="post"><button class="link-ok" type="submit">${c.active ? esc(t('co_deactivate')) : esc(t('co_activate'))}</button></form>
        <form action="/admin/coupons/${c.id}/delete" method="post" onsubmit="return confirm('${esc(t('co_confirm_del'))}')"><button class="link-danger" type="submit">${esc(t('delete'))}</button></form>
      </td></tr>`).join('')
      : `<tr><td colspan="5" class="muted">${esc(t('co_none'))}</td></tr>`;

    return layout(ctx, `
      <div class="panel-head admin"><div><h1>${esc(t('co_title'))}</h1><p class="muted">${esc(t('co_sub'))}</p></div>
        <a class="btn btn-light" href="/admin">&larr; ${esc(t('st_back'))}</a></div>

      <div class="sect-h"><h2>${esc(t('co_new'))}</h2></div>
      <form action="/admin/coupons" method="post" class="form-card">
        <label>${esc(t('co_code_label'))}<input name="code" placeholder="HOSGELDIN10" required></label>
        <label>${esc(t('co_pct_label'))}<input name="percent" type="number" min="1" max="90" placeholder="10" required></label>
        <button class="btn btn-brand" type="submit">${esc(t('co_create_btn'))}</button>
      </form>

      <div class="sect-h"><h2>${esc(t('co_existing'))}</h2></div>
      <div class="table-wrap"><table class="ptable">
        <thead><tr><th>${esc(t('th_code'))}</th><th>${esc(t('th_discount'))}</th><th>${esc(t('status'))}</th><th>${esc(t('th_usage'))}</th><th>${esc(t('th_action'))}</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`);
  },

  adminPayments(ctx, { configs, providers }) {
    const t = ctx.t;
    const cards = configs.map(c => {
      const meta = providers[c.provider];
      const configured = meta.needs.every(f => (c[f] || '').trim().length > 0);
      const statusBadges = `
        ${configured ? `<span class="badge ok">${esc(t('pay_configured'))}</span>` : `<span class="badge warn">${esc(t('pay_not_configured'))}</span>`}
        ${c.active ? `<span class="badge ok">${esc(t('pay_active'))}</span>` : `<span class="badge off">${esc(t('pay_inactive'))}</span>`}`;
      // Anahtar alanlari (gizli olanlar bos gosterilir; girilmisse "dolu" ipucu)
      const fields = meta.needs.map(f => {
        const filled = (c[f] || '').trim().length > 0;
        const isSecret = f === 'api_secret';
        return `<label>${esc(meta.fieldLabels[f] || f)}${filled ? ` <span class="muted small">(${esc(t('pay_configured'))})</span>` : ''}
          <input type="${isSecret ? 'password' : 'text'}" name="${f}" placeholder="${filled ? '••••••••' : ''}" autocomplete="off"></label>`;
      }).join('');
      const toggleBtn = c.active
        ? `<form action="/admin/payments/${c.provider}/toggle" method="post"><button class="btn btn-light" type="submit">${esc(t('pay_deactivate'))}</button></form>`
        : `<form action="/admin/payments/${c.provider}/toggle" method="post"><button class="btn btn-brand" type="submit"${configured ? '' : ' disabled'}>${esc(t('pay_activate'))}</button></form>`;
      return `<div class="pay-card">
        <div class="pay-head">
          <div><h3>${esc(meta.label)}</h3><span class="muted small">${esc(t('pay_region'))}: ${esc(meta.region)} · ${esc(t('pay_currency'))}: ${esc(meta.currencies.join(', '))}</span></div>
          <div class="pay-badges">${statusBadges}</div>
        </div>
        <form action="/admin/payments/${c.provider}/save" method="post" class="pay-form">
          ${fields}
          <label>${esc(t('pay_mode'))}
            <select name="mode">
              <option value="test"${c.mode !== 'live' ? ' selected' : ''}>${esc(t('pay_mode_test'))}</option>
              <option value="live"${c.mode === 'live' ? ' selected' : ''}>${esc(t('pay_mode_live'))}</option>
            </select>
          </label>
          <div class="pay-actions">
            <button class="btn btn-light" type="submit">${esc(t('pay_save'))}</button>
            ${toggleBtn}
            <a class="muted small" href="${esc(meta.docs)}" target="_blank" rel="noopener">${esc(t('pay_docs'))} ↗</a>
          </div>
        </form>
      </div>`;
    }).join('');

    return layout(ctx, `
      <div class="panel-head admin"><div><h1>${esc(t('pay_title'))}</h1><p class="muted">${esc(t('pay_sub'))}</p></div>
        <a class="btn btn-light" href="/admin">&larr; ${esc(t('st_back'))}</a></div>
      <div class="notice warn">${esc(t('pay_note'))}</div>
      <p class="muted small">${esc(t('pay_secret_note'))}</p>
      <div class="pay-grid">${cards}</div>`);
  },

  cart(ctx, { rows, coupon }) {
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
    const gross = rows.reduce((s, r) => s + convert(r.price_cents * r.qty, r.currency, ctx.displayCur), 0);
    const percent = coupon ? coupon.percent : 0;
    const net = Math.round(gross * (100 - percent) / 100);
    const discount = gross - net;

    const couponBox = coupon ? `
      <div class="coupon-applied">
        <span>\u{1F3F7} <strong>${esc(coupon.code)}</strong> — %${coupon.percent} ${esc(t('cp_off'))}</span>
        <form action="/cart/coupon/remove" method="post"><button class="link-danger" type="submit">${esc(t('cp_remove'))}</button></form>
      </div>` : `
      <form action="/cart/coupon" method="post" class="coupon-form">
        <input type="text" name="code" placeholder="${esc(t('cp_ph'))}" maxlength="20">
        <button class="btn btn-light" type="submit">${esc(t('cp_apply'))}</button>
      </form>`;

    const totalRows = coupon ? `
      <div class="totrow"><span>${esc(t('cp_subtotal'))}</span><span>${money(gross, ctx.displayCur)}</span></div>
      <div class="totrow discount"><span>${esc(t('cp_discount'))} (%${coupon.percent})</span><span>- ${money(discount, ctx.displayCur)}</span></div>
      <div class="totrow big"><span>${esc(t('total'))}</span><span>${money(net, ctx.displayCur)}</span></div>`
      : `<div class="totrow big"><span>${esc(t('total'))}</span><span>${money(gross, ctx.displayCur)}</span></div>`;

    return layout(ctx, `
      <h1>${esc(t('cart_title'))}</h1>
      <div class="cart-list">${groups}</div>
      <div class="cart-summary">
        ${couponBox}
        ${totalRows}
        <a class="btn btn-brand big" href="/checkout">${esc(t('to_checkout'))} &rarr;</a>
      </div>`);
  },

  checkout(ctx, { rows, coupon }) {
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
          ${(() => {
            const gross = rows.reduce((s, r) => s + convert(r.price_cents * r.qty, r.currency, ctx.displayCur), 0);
            const percent = coupon ? coupon.percent : 0;
            const net = Math.round(gross * (100 - percent) / 100);
            if (!coupon) return `<div class="totrow big" style="margin-top:12px"><span>${esc(t('total'))}</span><span>${money(gross, ctx.displayCur)}</span></div>`;
            return `
              <div class="totrow" style="margin-top:12px"><span>${esc(t('cp_subtotal'))}</span><span>${money(gross, ctx.displayCur)}</span></div>
              <div class="totrow discount"><span>\u{1F3F7} ${esc(coupon.code)} (%${coupon.percent})</span><span>- ${money(gross - net, ctx.displayCur)}</span></div>
              <div class="totrow big"><span>${esc(t('total'))}</span><span>${money(net, ctx.displayCur)}</span></div>`;
          })()}
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
      <td>${orderBadge(t, o.status)}</td>
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
      <div class="notice ${order.status === 'odendi' ? 'ok' : order.status === 'iptal' ? 'warn' : 'warn'}">${orderBadge(t, order.status)} — ${esc(payProviderLabel(order.payment_method))}${order.payment_ref ? ' (' + esc(order.payment_ref) + ')' : ''} &middot; ${esc(t('split_note'))}</div>
      ${groups}
      <div class="cart-summary"><div class="totrow big"><span>${esc(t('grand_total'))}</span><span>${ctx.price(order.total_cents, order.currency)}</span></div></div>`);
  },

  sellerOrders(ctx, { sellerOrders, newCount }) {
    const t = ctx.t;
    if (!sellerOrders.length) return layout(ctx, `
      <div class="panel-head seller"><div><h1>${esc(t('so_title'))}</h1><p class="muted">${esc(t('so_none_head'))}</p></div></div>
      <p class="empty">${esc(t('so_none_body'))}</p>`);
    const cards = sellerOrders.map(so => {
      const items = so.items.map(it => `<div class="sum-line"><span>${esc(it.name)} × ${it.qty}</span><span>${money(it.price_cents * it.qty, it.currency)}</span></div>`).join('');
      const net = so.subtotal_cents - so.commission_cents;
      const btn = (val, label) => `<form action="/seller/orders/${so.id}/status" method="post" style="display:inline"><input type="hidden" name="status" value="${val}"><button class="btn btn-ghost" type="submit"${so.status === val ? ' disabled' : ''}>${label}</button></form>`;
      return `<div class="order-seller${so.seen ? '' : ' is-new'}">
        <div class="os-head"><strong>${esc(t('order'))} #${so.order_id}</strong> ${so.seen ? '' : `<span class="badge new">${esc(t('so_badge_new'))}</span>`} ${soBadge(ctx.t, so.status)} <span class="muted small">${esc((so.order_date || '').slice(0, 16))} &middot; ${esc(so.buyer_name)}</span></div>
        <div class="muted small">${esc(t('so_delivery'))}: ${esc(so.address || '-')}</div>
        ${items}
        <div class="sum-line"><span>${esc(t('cp_subtotal'))}</span><span>${money(so.subtotal_cents, so.currency)}</span></div>
        <div class="sum-line muted"><span>${esc(t('so_commission'))} (${Math.round((so.commission_cents / (so.subtotal_cents || 1)) * 100)}%)</span><span>- ${money(so.commission_cents, so.currency)}</span></div>
        <div class="sum-line"><strong>${esc(t('so_earning'))}</strong><strong>${money(net, so.currency)}</strong></div>
        <div class="os-actions">${esc(t('so_status_label'))} ${btn('hazirlaniyor', esc(t('so_preparing')))} ${btn('teslim', esc(t('so_delivered')))}</div>
        <form action="/seller/orders/${so.id}/status" method="post" class="ship-form">
          <input type="hidden" name="status" value="kargoda">
          <select name="carrier"><option value="">${esc(t('so_carrier_ph'))}</option>${Object.keys(shipping.CARRIERS).map(c => `<option value="${c}"${so.carrier === c ? ' selected' : ''}>${esc(shipping.CARRIERS[c].label)} (${shipping.CARRIERS[c].region})</option>`).join('')}</select>
          <input name="tracking_no" placeholder="${esc(t('so_tracking_ph'))}" value="${esc(so.tracking_no || '')}">
          <button class="btn btn-ghost" type="submit">${esc(t('so_ship_now'))}</button>
        </form>
        ${so.tracking_no ? `<div class="muted small">\u{1F4E6} ${esc(shipping.carrierLabel(so.carrier))} &middot; ${esc(t('so_tracking_ph'))}: ${esc(so.tracking_no)}</div>` : ''}
      </div>`;
    }).join('');
    return layout(ctx, `
      <div class="panel-head seller"><div><h1>${esc(t('so_title'))}</h1><p class="muted">${sellerOrders.length} ${esc(t('so_count'))}${newCount ? ` &middot; ${newCount} ${esc(t('so_new'))}` : ''}</p></div></div>
      ${cards}`);
  },

  notFound(ctx) {
    const t = ctx.t;
    return layout(ctx, `<div class="empty big"><h1>404</h1><p>${esc(t('nf_text'))}</p><a class="btn btn-brand" href="/">${esc(t('home_btn'))}</a></div>`);
  },
};

module.exports = { layout, pages };
