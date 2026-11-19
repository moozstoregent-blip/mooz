// =========================================================================
//  MOOZ - cok saticili pazaryeri (MVP cekirdek)
//  Sifir dis bagimlilik: sadece Node yerlesik modulleri.
// =========================================================================

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const qs = require('node:querystring');

const config = require('./config');
const db = require('./db');
const H = require('./helpers');
const payment = require('./payment');
const shipping = require('./shipping');
const i18n = require('./i18n');
const mailer = require('./mailer');
const legal = require('./legal');
const { pages } = require('./views');

// --- Mini router ---------------------------------------------------------
const routes = [];
function add(method, pattern, handler) {
  const keys = [];
  const rx = '^' + pattern.replace(/:[^/]+/g, m => { keys.push(m.slice(1)); return '([^/]+)'; }) + '/?$';
  routes.push({ method, rx: new RegExp(rx), keys, handler });
}

const allCategories = () => db.prepare('SELECT * FROM categories ORDER BY id').all();

// Host basligindan magaza slug'i cikar: <slug>.localhost  veya  <slug>.mooz.store
function storeSlugFromHost(host) {
  if (!host) return null;
  const h = host.split(':')[0].toLowerCase();
  const m = h.match(/^([a-z0-9-]+)\.localhost$/) || h.match(/^([a-z0-9-]+)\.mooz\.store$/);
  if (!m) return null;
  if (m[1] === 'www') return null;
  return m[1];
}

// --- Oturum / baglamyardimcilari ----------------------------------------
// Sitenin dis URL'i (saglayici yonlendirme/webhook icin). Render HTTPS verir.
function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['host'];
  return proto + '://' + host;
}

// Tarayici dilini (Accept-Language) desteklenen dillerden birine esle
function detectLang(header) {
  if (!header) return null;
  // Orn: "nl-BE,nl;q=0.9,fr;q=0.8,en;q=0.7"
  const tags = header.split(',')
    .map(part => {
      const [tag, q] = part.trim().split(';q=');
      return { lang: (tag || '').trim().toLowerCase().split('-')[0], q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const t of tags) {
    if (config.languages.includes(t.lang)) return t.lang;
  }
  return null;
}

// Guvenlik basliklari (her yanitta). CSP inline stil/script'e izin verir (uygulama inline yogun).
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-inline'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
};

// --- Basit rate limit (bellek ici): kaba kuvvet / spam korumasi ---
const rlHits = new Map(); // key -> [timestamps]
function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || (req.socket && req.socket.remoteAddress) || 'unknown';
}
function rateOk(key, max, windowMs) {
  const now = Date.now();
  const arr = (rlHits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  rlHits.set(key, arr);
  return arr.length <= max; // true = izinli
}
// periyodik temizlik (bellek sismesin)
const _rlTimer = setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of rlHits) {
    const keep = arr.filter(t => now - t < 3600000);
    if (keep.length) rlHits.set(k, keep); else rlHits.delete(k);
  }
}, 600000);
if (_rlTimer.unref) _rlTimer.unref();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function buildCtx(req, res) {
  const cookies = H.parseCookies(req.headers.cookie);
  // HTTPS arkasindaysak (Render) oturum cerezine Secure ekle
  const isHttps = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  let user = null, myStore = null;
  const uid = H.unsign(cookies.mooz_uid);
  if (uid) {
    user = db.prepare('SELECT id,name,email,role,permissions FROM users WHERE id = ?').get(uid) || null;
    if (user && user.role === 'seller')
      myStore = db.prepare('SELECT * FROM stores WHERE user_id = ?').get(user.id) || null;
  }
  const flash = cookies.mooz_flash || null;
  const outCookies = [];
  if (flash) outCookies.push('mooz_flash=; Path=/; Max-Age=0');
  const couponCode = cookies.mooz_coupon || '';

  const cartCount = user
    ? db.prepare('SELECT COALESCE(SUM(qty),0) AS n FROM cart_items WHERE user_id = ?').get(user.id).n
    : 0;

  // Kullanicinin favori urun id'leri (kalp dolu/bos icin)
  const favSet = user
    ? new Set(db.prepare('SELECT product_id FROM favorites WHERE user_id = ?').all(user.id).map(r => r.product_id))
    : new Set();

  // Satici icin okunmamis (yeni) siparis sayisi
  const newOrders = (user && user.role === 'seller' && myStore)
    ? db.prepare("SELECT COUNT(*) AS n FROM seller_orders WHERE store_id = ? AND seen = 0").get(myStore.id).n
    : 0;

  // Dil: cerez varsa manuel secim, yoksa tarayici dili (Accept-Language), o da yoksa varsayilan
  const lang = config.languages.includes(cookies.mooz_lang)
    ? cookies.mooz_lang
    : (detectLang(req.headers['accept-language']) || config.defaultLang);
  const displayCur = config.currencies.includes(cookies.mooz_cur) ? cookies.mooz_cur : config.defaultCurrency;

  // Magaza alt alan adi mi? (<slug>.localhost / <slug>.mooz.store)
  const hostSlug = storeSlugFromHost(req.headers.host);
  let storeSite = null, mainSiteUrl = '/';
  if (hostSlug) {
    storeSite = db.prepare("SELECT * FROM stores WHERE slug = ? AND status = 'active'").get(hostSlug) || null;
    const host = (req.headers.host || '');
    mainSiteUrl = '//' + host.replace(hostSlug + '.', '');
  }

  return {
    req, res, user, myStore, flash, cartCount,
    lang, displayCur, storeSite, mainSiteUrl,
    t: (key) => i18n.t(lang, key),
    price: (cents, cur) => H.money(H.convert(cents, cur || config.defaultCurrency, displayCur), displayCur),
    categories: allCategories(),
    favSet,
    favCount: favSet.size,
    newOrders,
    couponCode,
    hasPerm: (key) => hasPerm(user, key),
    params: {}, query: {}, body: {},
    path: req.url.split('?')[0],
    _cookies: outCookies,
    setCookie(c) { this._cookies.push(c); },
    login(id) { this.setCookie('mooz_uid=' + H.sign(String(id)) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000' + (isHttps ? '; Secure' : '')); },
    logout() { this.setCookie('mooz_uid=; Path=/; Max-Age=0'); },
    flashMsg(m) { this.setCookie('mooz_flash=' + encodeURIComponent(m) + '; Path=/; Max-Age=30'); },
    send(html, status) {
      const h = Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, SEC_HEADERS);
      if (this._cookies.length) h['Set-Cookie'] = this._cookies;
      res.writeHead(status || 200, h); res.end(html);
    },
    redirect(loc) {
      const h = Object.assign({ Location: loc }, SEC_HEADERS);
      if (this._cookies.length) h['Set-Cookie'] = this._cookies;
      res.writeHead(302, h); res.end();
    },
  };
}

function requireRole(ctx, role) {
  if (!ctx.user) { ctx.redirect('/login'); return false; }
  if (role && ctx.user.role !== role) { ctx.send('Yetkiniz yok.', 403); return false; }
  return true;
}

// Yetki anahtarlari ve Turkce etiketleri (personel rolleri)
const PERMS = [
  ['sellers',   'Satici Yonetimi'],
  ['finance',   'Finans / Muhasebe'],
  ['support',   'Destek (Helpdesk)'],
  ['marketing', 'Pazarlama / Reklam'],
  ['staff',     'Personel Yonetimi'],
];
const PERM_KEYS = PERMS.map(p => p[0]);

// Bir kullanicinin belirli bir yetkisi var mi? (sadece admin rolu)
function hasPerm(user, key) {
  if (!user || user.role !== 'admin') return false;
  if (user.permissions === '*') return true;
  return (',' + (user.permissions || '') + ',').includes(',' + key + ',');
}

function requirePerm(ctx, key) {
  if (!ctx.user) { ctx.redirect('/login'); return false; }
  if (!hasPerm(ctx.user, key)) {
    ctx.send('Bu bolum icin yetkiniz yok. Gerekli yetki: ' + key, 403);
    return false;
  }
  return true;
}

// Gecerli (aktif) kupon dondur, yoksa null
function getCoupon(code) {
  if (!code) return null;
  return db.prepare("SELECT * FROM coupons WHERE code = ? AND active = 1").get(String(code).trim().toUpperCase()) || null;
}

function requireLogin(ctx) {
  if (!ctx.user) { ctx.flashMsg(ctx.t('fl_login_required')); ctx.redirect('/login'); return false; }
  return true;
}

// Sepet satirlari (urun + satici bilgisiyle)
function cartRows(userId) {
  return db.prepare(`SELECT ci.qty, p.id, p.name, p.price_cents, p.currency, p.emoji, p.stock, p.image_url,
    s.id AS store_id, s.name AS store_name, s.slug AS store_slug, s.status AS store_status
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    JOIN stores s ON s.id = p.store_id
    WHERE ci.user_id = ? ORDER BY s.name, p.name`).all(userId);
}

// =========================================================================
//  ROTALAR
// =========================================================================

// --- Vitrin ---
add('GET', '/', (ctx) => {
  const activeCat = ctx.query.cat || '';
  const q = (ctx.query.q || '').trim();
  ctx.activeCat = activeCat; ctx.q = q;

  // Magaza alt alan adindaysak: sadece o magazanin kendi vitrini
  if (ctx.storeSite) {
    let s2 = `SELECT p.*, c.slug AS cat_slug,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS rating_count,
      (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE product_id = p.id) AS rating_avg
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id WHERE p.store_id = ?`;
    const a2 = [ctx.storeSite.id];
    if (activeCat) { s2 += ' AND c.slug = ?'; a2.push(activeCat); }
    if (q) { s2 += ' AND p.name LIKE ?'; a2.push('%' + q + '%'); }
    s2 += ' ORDER BY p.created_at DESC';
    const prods = db.prepare(s2).all(...a2);
    ctx.title = ctx.storeSite.name;
    return ctx.send(pages.storeHome(ctx, { store: ctx.storeSite, products: prods, activeCat, q }));
  }

  // Filtre parametreleri
  const sort = ['new', 'price_asc', 'price_desc', 'rating', 'name'].includes(ctx.query.sort) ? ctx.query.sort : 'new';
  const instock = ctx.query.instock === '1';
  const minRaw = parseFloat(String(ctx.query.min || '').replace(',', '.'));
  const maxRaw = parseFloat(String(ctx.query.max || '').replace(',', '.'));
  const minV = isFinite(minRaw) && minRaw > 0 ? minRaw : null;
  const maxV = isFinite(maxRaw) && maxRaw > 0 ? maxRaw : null;

  let sql = `SELECT p.*, s.name AS store_name, s.slug AS store_slug, c.slug AS cat_slug,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS rating_count,
    (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE product_id = p.id) AS rating_avg
    FROM products p JOIN stores s ON s.id = p.store_id AND s.status='active'
    LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1`;
  const args = [];
  if (activeCat) { sql += ' AND c.slug = ?'; args.push(activeCat); }
  if (q) { sql += ' AND (p.name LIKE ? OR s.name LIKE ?)'; args.push('%' + q + '%', '%' + q + '%'); }
  if (instock) { sql += ' AND p.stock > 0'; }
  let products = db.prepare(sql).all(...args);

  // Fiyati gosterim para birimine cevir (dogru filtre/siralama icin)
  products = products.map(p => ({ ...p, _disp: H.convert(p.price_cents, p.currency, ctx.displayCur) }));
  if (minV !== null) products = products.filter(p => p._disp >= Math.round(minV * 100));
  if (maxV !== null) products = products.filter(p => p._disp <= Math.round(maxV * 100));

  const sorters = {
    new: (a, b) => b.id - a.id,
    price_asc: (a, b) => a._disp - b._disp,
    price_desc: (a, b) => b._disp - a._disp,
    rating: (a, b) => (b.rating_avg - a.rating_avg) || (b.rating_count - a.rating_count),
    name: (a, b) => a.name.localeCompare(b.name, 'tr'),
  };
  products.sort(sorters[sort]);

  // Ana sayfada title bos birakilir -> "Mooz · <slogan>" (SEO dostu)
  ctx.send(pages.home(ctx, { products, activeCat, q, sort, instock, min: ctx.query.min || '', max: ctx.query.max || '' }));
});

add('GET', '/product/:id', (ctx) => {
  const p = db.prepare(`SELECT p.*, s.name AS store_name, s.slug AS store_slug, c.name AS cat_name
    FROM products p JOIN stores s ON s.id = p.store_id
    LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`).get(ctx.params.id);
  if (!p) { ctx.title = 'Bulunamadi'; return ctx.send(pages.notFound(ctx), 404); }
  const agg = db.prepare('SELECT COUNT(*) AS n, COALESCE(AVG(rating),0) AS avg FROM reviews WHERE product_id = ?').get(p.id);
  const reviews = db.prepare(`SELECT r.rating, r.comment, r.created_at, u.name AS user_name
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ? ORDER BY r.created_at DESC`).all(p.id);
  const myReview = ctx.user
    ? db.prepare('SELECT rating, comment FROM reviews WHERE product_id = ? AND user_id = ?').get(p.id, ctx.user.id)
    : null;
  ctx.title = p.name;
  ctx.metaDesc = (p.description || p.name).replace(/\s+/g, ' ').trim().slice(0, 160);
  ctx.send(pages.product(ctx, { p, agg, reviews, myReview }));
});

// Yorum / puan ekle (giris yapan herkes, urun basina 1 yorum)
add('POST', '/product/:id/review', (ctx) => {
  if (!requireLogin(ctx)) return;
  const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(ctx.params.id);
  if (!prod) { ctx.flashMsg(ctx.t('fl_product_notfound')); return ctx.redirect('/'); }
  let rating = parseInt(ctx.body.rating, 10);
  if (!(rating >= 1 && rating <= 5)) { ctx.flashMsg(ctx.t('fl_rating_range')); return ctx.redirect('/product/' + prod.id); }
  const comment = (ctx.body.comment || '').trim().slice(0, 1000);
  db.prepare(`INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?,?,?,?)
    ON CONFLICT(product_id, user_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = datetime('now')`)
    .run(prod.id, ctx.user.id, rating, comment);
  ctx.flashMsg(ctx.t('fl_review_thanks'));
  ctx.redirect('/product/' + prod.id);
});

// --- Favoriler / istek listesi ---
add('POST', '/favorites/toggle', (ctx) => {
  if (!requireLogin(ctx)) return;
  const pid = parseInt(ctx.body.product_id, 10);
  const back = (ctx.body.back && ctx.body.back.startsWith('/')) ? ctx.body.back : '/';
  const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(pid);
  if (!prod) { ctx.flashMsg(ctx.t('fl_product_notfound')); return ctx.redirect(back); }
  const exists = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(ctx.user.id, pid);
  if (exists) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(exists.id);
    ctx.flashMsg(ctx.t('fl_fav_removed'));
  } else {
    db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?,?)').run(ctx.user.id, pid);
    ctx.flashMsg(ctx.t('fl_fav_added'));
  }
  ctx.redirect(back);
});

add('GET', '/favorites', (ctx) => {
  if (!requireLogin(ctx)) return;
  const products = db.prepare(`SELECT p.*, s.name AS store_name, s.slug AS store_slug,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS rating_count,
    (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE product_id = p.id) AS rating_avg
    FROM favorites f
    JOIN products p ON p.id = f.product_id
    JOIN stores s ON s.id = p.store_id AND s.status='active'
    WHERE f.user_id = ? ORDER BY f.created_at DESC`).all(ctx.user.id);
  ctx.title = 'Favorilerim';
  ctx.send(pages.favorites(ctx, { products }));
});

add('GET', '/store/:slug', (ctx) => {
  const store = db.prepare("SELECT * FROM stores WHERE slug = ? AND status='active'").get(ctx.params.slug);
  if (!store) { ctx.title = 'Magaza bulunamadi'; return ctx.send(pages.notFound(ctx), 404); }
  const products = db.prepare(`SELECT p.*,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS rating_count,
    (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE product_id = p.id) AS rating_avg
    FROM products p WHERE p.store_id = ? ORDER BY p.created_at DESC`).all(store.id);
  ctx.title = store.name;
  ctx.send(pages.store(ctx, { store, products }));
});

// --- Uyelik ---
add('GET', '/register', (ctx) => { ctx.title = 'Kayit ol'; ctx.send(pages.register(ctx)); });
add('GET', '/login', (ctx) => { ctx.title = 'Giris yap'; ctx.send(pages.login(ctx)); });

add('POST', '/register', (ctx) => {
  if (!rateOk('reg:' + clientIp(ctx.req), 10, 3600000)) { ctx.flashMsg(ctx.t('fl_too_many')); return ctx.redirect('/register'); }
  const name = (ctx.body.name || '').trim();
  const email = (ctx.body.email || '').trim().toLowerCase();
  const password = ctx.body.password || '';
  const role = ctx.body.role;
  if (!name || !email || !password) { ctx.flashMsg(ctx.t('fl_fill_all')); return ctx.redirect('/register'); }
  if (!EMAIL_RE.test(email) || email.length > 160) { ctx.flashMsg(ctx.t('fl_email_invalid')); return ctx.redirect('/register'); }
  if (password.length < 6) { ctx.flashMsg(ctx.t('fl_pw_short')); return ctx.redirect('/register'); }
  if (name.length > 80) { ctx.flashMsg(ctx.t('fl_fill_all')); return ctx.redirect('/register'); }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    ctx.flashMsg(ctx.t('fl_email_exists')); return ctx.redirect('/register');
  }
  const accountRole = role === 'seller' ? 'seller' : 'buyer';
  const info = db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run(name, email, H.hashPassword(password), accountRole);
  const userId = Number(info.lastInsertRowid);
  if (accountRole === 'seller') {
    let base = H.slugify(name) || 'magaza', slug = base, i = 1;
    while (db.prepare('SELECT id FROM stores WHERE slug = ?').get(slug)) slug = base + '-' + (++i);
    db.prepare("INSERT INTO stores (user_id,name,slug,status) VALUES (?,?,?,'pending')").run(userId, name, slug);
  }
  ctx.login(userId);
  ctx.flashMsg(accountRole === 'seller' ? ctx.t('fl_welcome_seller') : ctx.t('fl_welcome'));
  ctx.redirect(accountRole === 'seller' ? '/seller' : '/');
});

add('POST', '/login', (ctx) => {
  const ip = clientIp(ctx.req);
  const email = (ctx.body.email || '').trim().toLowerCase();
  // IP + e-posta bazli: 10 dk icinde 8 basarisiz denemeden sonra kilitle
  if (!rateOk('login:' + ip, 20, 600000) || !rateOk('login:' + ip + ':' + email, 8, 600000)) {
    ctx.flashMsg(ctx.t('fl_too_many')); return ctx.redirect('/login');
  }
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!u || !H.verifyPassword(ctx.body.password || '', u.password_hash)) {
    ctx.flashMsg(ctx.t('fl_login_fail')); return ctx.redirect('/login');
  }
  ctx.login(u.id);
  ctx.redirect(u.role === 'admin' ? '/admin' : u.role === 'seller' ? '/seller' : '/');
});

add('POST', '/logout', (ctx) => { ctx.logout(); ctx.redirect('/'); });

// --- Sifre sifirlama ---
add('GET', '/forgot', (ctx) => { ctx.title = 'Sifremi unuttum'; ctx.send(pages.forgot(ctx)); });

add('POST', '/forgot', (ctx) => {
  if (!rateOk('forgot:' + clientIp(ctx.req), 5, 900000)) { ctx.flashMsg(ctx.t('fl_too_many')); return ctx.redirect('/forgot'); }
  const email = (ctx.body.email || '').trim().toLowerCase();
  const u = email ? db.prepare('SELECT id,email FROM users WHERE email = ?').get(email) : null;
  if (u) {
    const token = H.resetToken();
    db.prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?, datetime('now','+1 hour'))").run(u.id, token);
    const link = baseUrl(ctx.req) + '/reset?token=' + token;
    const body = '<p>Je hebt een wachtwoordreset aangevraagd voor ' + config.brand.name + '.</p>' +
      '<p><a href="' + link + '">Klik hier om een nieuw wachtwoord in te stellen</a> (1 uur geldig).</p>' +
      '<p style="color:#71717a;font-size:13px">Niet aangevraagd? Negeer deze e-mail.</p>';
    mailer.send({
      to: u.email,
      subject: config.brand.name + ' — Wachtwoord opnieuw instellen',
      html: mailer.layout('Wachtwoord opnieuw instellen', body),
      text: 'Wachtwoord resetten voor ' + config.brand.name + ': ' + link + ' (1 uur geldig).',
    }).catch(() => {});
  }
  // Her durumda ayni mesaj (e-posta var mi sizdirma)
  ctx.flashMsg(ctx.t('fl_fw_sent'));
  ctx.redirect('/login');
});

function validReset(token) {
  if (!token) return null;
  return db.prepare("SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > datetime('now')").get(token) || null;
}

add('GET', '/reset', (ctx) => {
  const pr = validReset(ctx.query.token);
  if (!pr) { ctx.flashMsg(ctx.t('fl_rp_invalid')); return ctx.redirect('/forgot'); }
  ctx.title = 'Yeni sifre';
  ctx.send(pages.resetPassword(ctx, { token: ctx.query.token }));
});

add('POST', '/reset', (ctx) => {
  if (!rateOk('reset:' + clientIp(ctx.req), 10, 900000)) { ctx.flashMsg(ctx.t('fl_too_many')); return ctx.redirect('/forgot'); }
  const pr = validReset(ctx.body.token);
  if (!pr) { ctx.flashMsg(ctx.t('fl_rp_invalid')); return ctx.redirect('/forgot'); }
  const pw = ctx.body.password || '';
  if (pw.length < 6) { ctx.flashMsg(ctx.t('fl_pw_short')); return ctx.redirect('/reset?token=' + encodeURIComponent(ctx.body.token)); }
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(H.hashPassword(pw), pr.user_id);
  db.prepare('UPDATE password_resets SET used=1 WHERE id=?').run(pr.id);
  // Bu kullanicinin diger bekleyen token'larini da gecersiz kil
  db.prepare('UPDATE password_resets SET used=1 WHERE user_id=? AND used=0').run(pr.user_id);
  ctx.flashMsg(ctx.t('fl_rp_done'));
  ctx.redirect('/login');
});

// Dil / para birimi tercihi
add('POST', '/prefs', (ctx) => {
  if (config.languages.includes(ctx.body.lang))
    ctx.setCookie('mooz_lang=' + ctx.body.lang + '; Path=/; Max-Age=31536000');
  if (config.currencies.includes(ctx.body.currency))
    ctx.setCookie('mooz_cur=' + ctx.body.currency + '; Path=/; Max-Age=31536000');
  const ref = ctx.req.headers.referer || '';
  ctx.redirect(ref.startsWith('http') ? ref : '/');
});

// --- Satici ---
add('GET', '/seller', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  const store = ctx.myStore;
  const productCount = store ? db.prepare('SELECT COUNT(*) AS n FROM products WHERE store_id = ?').get(store.id).n : 0;
  let earnings = null;
  if (store) {
    earnings = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN so.payout_status='pending' AND so.return_status!='refunded' THEN so.subtotal_cents - so.commission_cents ELSE 0 END),0) AS pending,
        COALESCE(SUM(CASE WHEN so.payout_status='paid'    THEN so.subtotal_cents - so.commission_cents ELSE 0 END),0) AS paid
      FROM seller_orders so
      WHERE so.store_id=? AND so.order_id IN (SELECT id FROM orders WHERE status='odendi')`).get(store.id);
  }
  ctx.title = 'Satici Paneli';
  ctx.send(pages.sellerDashboard(ctx, { store, productCount, earnings }));
});

add('GET', '/seller/products', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  const products = db.prepare(`SELECT p.*, c.name AS cat_name FROM products p
    LEFT JOIN categories c ON c.id = p.category_id WHERE store_id = ? ORDER BY p.created_at DESC`).all(ctx.myStore.id);
  ctx.title = 'Urunlerim';
  ctx.send(pages.sellerProducts(ctx, { products }));
});

add('GET', '/seller/products/new', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  ctx.title = 'Yeni Urun';
  ctx.send(pages.newProduct(ctx, { cats: allCategories() }));
});

add('POST', '/seller/products', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  const b = ctx.body;
  if (!b.name || !b.price) { ctx.flashMsg(ctx.t('fl_product_req')); return ctx.redirect('/seller/products/new'); }
  const cents = Math.round(parseFloat(String(b.price).replace(',', '.')) * 100) || 0;
  // Dosya yuklendiyse onu kullan (data URI), yoksa URL alanini kabul et
  const uploaded = b.file_image_file || '';
  const imageUrl = uploaded.startsWith('data:image/') ? uploaded
    : (/^https?:\/\//i.test((b.image_url || '').trim()) ? b.image_url.trim() : '');
  db.prepare(`INSERT INTO products (store_id,category_id,name,description,price_cents,currency,emoji,stock,image_url)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    ctx.myStore.id, b.category_id || null, b.name, b.description || '', cents,
    config.currencies.includes(b.currency) ? b.currency : config.defaultCurrency,
    b.emoji || '\u{1F4E6}', parseInt(b.stock) || 0, imageUrl);
  ctx.flashMsg(ctx.t('fl_product_added'));
  ctx.redirect('/seller/products');
});

add('POST', '/seller/store', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  db.prepare('UPDATE stores SET description = ? WHERE id = ?')
    .run((ctx.body.description || '').slice(0, 300), ctx.myStore.id);
  ctx.flashMsg(ctx.t('fl_store_updated'));
  ctx.redirect('/seller');
});

add('POST', '/seller/products/:id/delete', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  db.prepare('DELETE FROM products WHERE id = ? AND store_id = ?').run(ctx.params.id, ctx.myStore.id);
  ctx.flashMsg(ctx.t('fl_product_deleted'));
  ctx.redirect('/seller/products');
});

// --- Admin ---
add('GET', '/admin', (ctx) => {
  if (!requireRole(ctx, 'admin')) return;
  // Satici yonetimi yetkisi olana magaza listesi
  const stores = ctx.hasPerm('sellers')
    ? db.prepare(`SELECT s.*, u.email AS owner_email,
        (SELECT COUNT(*) FROM products WHERE store_id = s.id) AS product_count
        FROM stores s JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC`).all()
    : null;
  const stats = {
    stores: db.prepare('SELECT COUNT(*) AS n FROM stores').get().n,
    sellers: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='seller'").get().n,
    buyers: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='buyer'").get().n,
    products: db.prepare('SELECT COUNT(*) AS n FROM products').get().n,
    orders: db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,
    commission: db.prepare('SELECT COALESCE(SUM(commission_cents),0) AS n FROM seller_orders').get().n,
  };
  // Finans yetkisi olana ciro ozeti
  let finance = null;
  if (ctx.hasPerm('finance')) {
    finance = {
      sales: db.prepare('SELECT COALESCE(SUM(total_cents),0) AS n FROM orders').get().n,
      commission: stats.commission,
      payout: db.prepare("SELECT COALESCE(SUM(subtotal_cents - commission_cents),0) AS n FROM seller_orders WHERE return_status!='refunded'").get().n,
    };
  }
  ctx.title = 'Admin';
  ctx.send(pages.adminDashboard(ctx, { stores, stats, finance }));
});

add('POST', '/admin/stores/:id/:action', (ctx) => {
  if (!requirePerm(ctx, 'sellers')) return;
  const map = { approve: 'active', suspend: 'suspended', pend: 'pending' };
  if (map[ctx.params.action]) db.prepare('UPDATE stores SET status = ? WHERE id = ?').run(map[ctx.params.action], ctx.params.id);
  ctx.redirect('/admin');
});

// --- Personel yonetimi (staff yetkisi) ---
add('GET', '/admin/staff', (ctx) => {
  if (!requirePerm(ctx, 'staff')) return;
  const staff = db.prepare("SELECT id,name,email,permissions FROM users WHERE role='admin' ORDER BY id").all();
  ctx.title = 'Personel';
  ctx.send(pages.adminStaff(ctx, { staff, perms: PERMS }));
});

add('POST', '/admin/staff', (ctx) => {
  if (!requirePerm(ctx, 'staff')) return;
  const name = (ctx.body.name || '').trim();
  const email = (ctx.body.email || '').trim().toLowerCase();
  const pass = ctx.body.password || '';
  if (!name || !email || pass.length < 6) {
    ctx.flashMsg(ctx.t('fl_staff_req'));
    return ctx.redirect('/admin/staff');
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    ctx.flashMsg(ctx.t('fl_email_exists'));
    return ctx.redirect('/admin/staff');
  }
  const chosen = PERM_KEYS.filter(k => ctx.body['perm_' + k]).join(',');
  db.prepare("INSERT INTO users (name,email,password_hash,role,permissions) VALUES (?,?,?,'admin',?)")
    .run(name, email, H.hashPassword(pass), chosen);
  ctx.flashMsg(ctx.t('fl_staff_added') + ': ' + email);
  ctx.redirect('/admin/staff');
});

add('POST', '/admin/staff/:id/perms', (ctx) => {
  if (!requirePerm(ctx, 'staff')) return;
  const target = db.prepare("SELECT id,email,permissions FROM users WHERE id=? AND role='admin'").get(ctx.params.id);
  if (!target) { ctx.flashMsg(ctx.t('fl_staff_notfound')); return ctx.redirect('/admin/staff'); }
  if (target.email === 'admin@mooz.store') { ctx.flashMsg(ctx.t('fl_owner_perms_locked')); return ctx.redirect('/admin/staff'); }
  const chosen = PERM_KEYS.filter(k => ctx.body['perm_' + k]).join(',');
  db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(chosen, target.id);
  ctx.flashMsg(ctx.t('fl_perms_updated') + ': ' + target.email);
  ctx.redirect('/admin/staff');
});

// --- Kupon yonetimi (marketing yetkisi) ---
add('GET', '/admin/coupons', (ctx) => {
  if (!requirePerm(ctx, 'marketing')) return;
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
  ctx.title = 'Kuponlar';
  ctx.send(pages.adminCoupons(ctx, { coupons }));
});

add('POST', '/admin/coupons', (ctx) => {
  if (!requirePerm(ctx, 'marketing')) return;
  const code = String(ctx.body.code || '').trim().toUpperCase().replace(/\s+/g, '');
  const percent = parseInt(ctx.body.percent, 10);
  if (!/^[A-Z0-9]{3,20}$/.test(code)) { ctx.flashMsg(ctx.t('fl_coupon_code_invalid')); return ctx.redirect('/admin/coupons'); }
  if (!(percent >= 1 && percent <= 90)) { ctx.flashMsg(ctx.t('fl_coupon_pct_invalid')); return ctx.redirect('/admin/coupons'); }
  if (db.prepare('SELECT id FROM coupons WHERE code = ?').get(code)) { ctx.flashMsg(ctx.t('fl_coupon_exists')); return ctx.redirect('/admin/coupons'); }
  db.prepare('INSERT INTO coupons (code,percent,active) VALUES (?,?,1)').run(code, percent);
  ctx.flashMsg(ctx.t('fl_coupon_created') + ': ' + code + ' (%' + percent + ')');
  ctx.redirect('/admin/coupons');
});

add('POST', '/admin/coupons/:id/toggle', (ctx) => {
  if (!requirePerm(ctx, 'marketing')) return;
  const c = db.prepare('SELECT * FROM coupons WHERE id = ?').get(ctx.params.id);
  if (c) db.prepare('UPDATE coupons SET active = ? WHERE id = ?').run(c.active ? 0 : 1, c.id);
  ctx.redirect('/admin/coupons');
});

add('POST', '/admin/coupons/:id/delete', (ctx) => {
  if (!requirePerm(ctx, 'marketing')) return;
  db.prepare('DELETE FROM coupons WHERE id = ?').run(ctx.params.id);
  ctx.flashMsg(ctx.t('fl_coupon_deleted'));
  ctx.redirect('/admin/coupons');
});

// --- Odeme ayarlari (finance yetkisi) ---
add('GET', '/admin/payments', (ctx) => {
  if (!requirePerm(ctx, 'finance')) return;
  ctx.title = 'Odeme Ayarlari';
  ctx.send(pages.adminPayments(ctx, { configs: payment.availableConfigs(), providers: payment.PROVIDERS }));
});

add('POST', '/admin/payments/:provider/save', (ctx) => {
  if (!requirePerm(ctx, 'finance')) return;
  const p = ctx.params.provider;
  if (!payment.PROVIDER_KEYS.includes(p)) { ctx.flashMsg(ctx.t('fl_product_notfound')); return ctx.redirect('/admin/payments'); }
  const cur = payment.getConfig(p) || {};
  const mode = ctx.body.mode === 'live' ? 'live' : 'test';
  // Bos birakilan anahtar alani mevcut degeri korur (gizli secret tekrar girilmesin)
  const apiKey = (ctx.body.api_key || '').trim() || cur.api_key || '';
  const apiSecret = (ctx.body.api_secret || '').trim() || cur.api_secret || '';
  db.prepare("UPDATE payment_providers SET mode=?, api_key=?, api_secret=?, updated_at=datetime('now') WHERE provider=?")
    .run(mode, apiKey, apiSecret, p);
  ctx.flashMsg(ctx.t('fl_pay_saved') + ' ' + payment.PROVIDERS[p].label);
  ctx.redirect('/admin/payments');
});

add('POST', '/admin/payments/:provider/toggle', (ctx) => {
  if (!requirePerm(ctx, 'finance')) return;
  const p = ctx.params.provider;
  if (!payment.PROVIDER_KEYS.includes(p)) { ctx.flashMsg(ctx.t('fl_product_notfound')); return ctx.redirect('/admin/payments'); }
  const cur = payment.getConfig(p);
  const turningOn = !(cur && cur.active);
  if (turningOn && !payment.isConfigured(cur)) {
    ctx.flashMsg(ctx.t('fl_pay_need_keys'));
    return ctx.redirect('/admin/payments');
  }
  if (turningOn) {
    // AB saglayicilarindan (mollie/stripe) ayni anda sadece biri aktif olabilir
    const euPair = ['mollie', 'stripe'];
    if (euPair.includes(p)) {
      const other = euPair.find(x => x !== p);
      db.prepare('UPDATE payment_providers SET active=0 WHERE provider=?').run(other);
    }
    db.prepare('UPDATE payment_providers SET active=1 WHERE provider=?').run(p);
    ctx.flashMsg(ctx.t('fl_pay_activated') + ' ' + payment.PROVIDERS[p].label);
  } else {
    db.prepare('UPDATE payment_providers SET active=0 WHERE provider=?').run(p);
    ctx.flashMsg(ctx.t('fl_pay_deactivated') + ' ' + payment.PROVIDERS[p].label);
  }
  ctx.redirect('/admin/payments');
});

// --- Satici odemeleri / payout (finance yetkisi) ---
// Hak edis = odenmis siparislerde (status 'odendi') subtotal - komisyon.
add('GET', '/admin/payouts', (ctx) => {
  if (!requirePerm(ctx, 'finance')) return;
  const stores = db.prepare(`
    SELECT s.id, s.name, s.slug, u.email AS owner_email,
      COALESCE(SUM(CASE WHEN so.payout_status='pending' AND so.return_status!='refunded' THEN so.subtotal_cents - so.commission_cents ELSE 0 END),0) AS pending_net,
      COUNT(CASE WHEN so.payout_status='pending' AND so.return_status!='refunded' THEN 1 END) AS pending_orders,
      COALESCE(SUM(CASE WHEN so.payout_status='paid'    THEN so.subtotal_cents - so.commission_cents ELSE 0 END),0) AS paid_net
    FROM stores s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN seller_orders so ON so.store_id = s.id AND so.order_id IN (SELECT id FROM orders WHERE status='odendi')
    GROUP BY s.id
    ORDER BY pending_net DESC, s.name`).all();
  const history = db.prepare(`
    SELECT p.*, s.name AS store_name FROM payouts p JOIN stores s ON s.id = p.store_id
    ORDER BY p.created_at DESC LIMIT 50`).all();
  ctx.title = 'Satici Odemeleri';
  ctx.send(pages.adminPayouts(ctx, { stores, history }));
});

add('POST', '/admin/payouts/:storeId/pay', (ctx) => {
  if (!requirePerm(ctx, 'finance')) return;
  const storeId = ctx.params.storeId;
  const store = db.prepare('SELECT id,name FROM stores WHERE id=?').get(storeId);
  if (!store) { ctx.flashMsg(ctx.t('fl_store_notfound')); return ctx.redirect('/admin/payouts'); }
  const row = db.prepare(`
    SELECT COALESCE(SUM(so.subtotal_cents - so.commission_cents),0) AS net, COUNT(*) AS n
    FROM seller_orders so
    WHERE so.store_id=? AND so.payout_status='pending' AND so.return_status!='refunded'
      AND so.order_id IN (SELECT id FROM orders WHERE status='odendi')`).get(storeId);
  if (!row.n || row.net <= 0) { ctx.flashMsg(ctx.t('fl_payout_none')); return ctx.redirect('/admin/payouts'); }
  db.prepare(`UPDATE seller_orders SET payout_status='paid'
    WHERE store_id=? AND payout_status='pending' AND return_status!='refunded'
      AND order_id IN (SELECT id FROM orders WHERE status='odendi')`).run(storeId);
  const note = (ctx.body.note || '').toString().slice(0, 200);
  db.prepare('INSERT INTO payouts (store_id, amount_cents, currency, note) VALUES (?,?,?,?)')
    .run(storeId, row.net, 'EUR', note);
  ctx.flashMsg(ctx.t('fl_payout_done') + ' ' + store.name + ' — ' + H.money(row.net, 'EUR'));
  ctx.redirect('/admin/payouts');
});

// --- Iadeler / geri odeme (finance yetkisi) ---
add('GET', '/admin/returns', (ctx) => {
  if (!requirePerm(ctx, 'finance')) return;
  const rows = db.prepare(`
    SELECT r.*, s.name AS store_name, u.email AS buyer_email,
      o.payment_method, o.payment_ref, so.subtotal_cents, so.currency AS so_currency
    FROM returns r
    JOIN stores s ON s.id = r.store_id
    JOIN users u ON u.id = r.buyer_id
    JOIN orders o ON o.id = r.order_id
    JOIN seller_orders so ON so.id = r.seller_order_id
    ORDER BY CASE r.status WHEN 'requested' THEN 0 ELSE 1 END, r.created_at DESC`).all();
  ctx.title = 'Iadeler';
  ctx.send(pages.adminReturns(ctx, { rows }));
});

// Geri odeme: gercek saglayici varsa API ile; simulasyon/desteklenmiyorsa manuel isaretle
add('POST', '/admin/returns/:id/refund', async (ctx) => {
  if (!requirePerm(ctx, 'finance')) return;
  const r = db.prepare('SELECT * FROM returns WHERE id=?').get(ctx.params.id);
  if (!r || r.status !== 'requested') { ctx.flashMsg(ctx.t('fl_ret_notfound')); return ctx.redirect('/admin/returns'); }
  const so = db.prepare('SELECT * FROM seller_orders WHERE id=?').get(r.seller_order_id);
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(r.order_id);
  const amount = so.subtotal_cents;
  let refundRef = 'manual';
  if (order.payment_ref && (order.payment_method === 'mollie' || order.payment_method === 'stripe')) {
    const res = await payment.refund({ provider: order.payment_method, ref: order.payment_ref, amountCents: amount, currency: so.currency });
    if (res.ok) { refundRef = res.refundRef || 'ok'; }
    else if (!res.unsupported) { ctx.flashMsg(ctx.t('fl_ret_refund_fail') + (res.error ? ' (' + res.error + ')' : '')); return ctx.redirect('/admin/returns'); }
  }
  db.prepare("UPDATE returns SET status='refunded', refund_cents=?, refund_ref=?, admin_note=?, updated_at=datetime('now') WHERE id=?")
    .run(amount, refundRef, (ctx.body.note || '').toString().slice(0, 200), r.id);
  db.prepare("UPDATE seller_orders SET return_status='refunded' WHERE id=?").run(r.seller_order_id);
  // Stok iade
  const inc = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
  db.prepare('SELECT product_id, qty FROM order_items WHERE seller_order_id=?').all(r.seller_order_id)
    .forEach(it => { if (it.product_id) inc.run(it.qty, it.product_id); });
  sendRefundEmail(r.id, amount, so.currency);
  ctx.flashMsg(ctx.t('fl_ret_refunded') + ' ' + H.money(amount, so.currency) + (refundRef === 'manual' ? ' (' + ctx.t('fl_ret_manual') + ')' : ''));
  ctx.redirect('/admin/returns');
});

add('POST', '/admin/returns/:id/reject', (ctx) => {
  if (!requirePerm(ctx, 'finance')) return;
  const r = db.prepare('SELECT * FROM returns WHERE id=?').get(ctx.params.id);
  if (!r || r.status !== 'requested') { ctx.flashMsg(ctx.t('fl_ret_notfound')); return ctx.redirect('/admin/returns'); }
  db.prepare("UPDATE returns SET status='rejected', admin_note=?, updated_at=datetime('now') WHERE id=?")
    .run((ctx.body.note || '').toString().slice(0, 200), r.id);
  db.prepare("UPDATE seller_orders SET return_status='rejected' WHERE id=?").run(r.seller_order_id);
  ctx.flashMsg(ctx.t('fl_ret_rejected'));
  ctx.redirect('/admin/returns');
});

// --- Admin siparis yonetimi (support yetkisi) ---
add('GET', '/admin/orders', (ctx) => {
  if (!requirePerm(ctx, 'support')) return;
  const status = ['odendi', 'pending', 'iptal'].includes(ctx.query.status) ? ctx.query.status : '';
  const q = (ctx.query.q || '').trim();
  let sql = `SELECT o.*, u.email AS buyer_email, u.name AS buyer_name,
      (SELECT COUNT(*) FROM seller_orders so WHERE so.order_id=o.id) AS seller_count
    FROM orders o JOIN users u ON u.id=o.buyer_id WHERE 1=1`;
  const args = [];
  if (status) { sql += ' AND o.status=?'; args.push(status); }
  if (q) { sql += ' AND (u.email LIKE ? OR u.name LIKE ? OR o.id=?)'; args.push('%' + q + '%', '%' + q + '%', /^\d+$/.test(q) ? Number(q) : -1); }
  sql += ' ORDER BY o.created_at DESC LIMIT 200';
  const orders = db.prepare(sql).all(...args);
  const counts = {
    all: db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,
    odendi: db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status='odendi'").get().n,
    pending: db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status='pending'").get().n,
    iptal: db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status='iptal'").get().n,
  };
  ctx.title = 'Siparisler';
  ctx.send(pages.adminOrders(ctx, { orders, status, q, counts }));
});

// Siparisleri CSV olarak indir (muhasebe). Excel icin UTF-8 BOM.
add('GET', '/admin/orders.csv', (ctx) => {
  if (!requirePerm(ctx, 'support')) return;
  const rows = db.prepare(`SELECT o.id, o.created_at, o.status, o.payment_method, o.payment_ref,
      o.total_cents, o.discount_cents, o.currency, u.email, u.name
    FROM orders o JOIN users u ON u.id=o.buyer_id ORDER BY o.created_at DESC LIMIT 5000`).all();
  const cell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lines = [['id', 'datum', 'status', 'betaalmethode', 'referentie', 'totaal', 'korting', 'valuta', 'email', 'naam'].join(',')];
  rows.forEach(r => lines.push([
    r.id, (r.created_at || '').slice(0, 16), r.status, r.payment_method, r.payment_ref,
    (r.total_cents / 100).toFixed(2), ((r.discount_cents || 0) / 100).toFixed(2), r.currency, r.email, r.name,
  ].map(cell).join(',')));
  const csv = '﻿' + lines.join('\r\n');
  ctx.res.writeHead(200, Object.assign({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="mooz-bestellingen.csv"',
  }, SEC_HEADERS));
  ctx.res.end(csv);
});

add('POST', '/admin/staff/:id/delete', (ctx) => {
  if (!requirePerm(ctx, 'staff')) return;
  const target = db.prepare("SELECT id,email FROM users WHERE id=? AND role='admin'").get(ctx.params.id);
  if (!target) { ctx.flashMsg(ctx.t('fl_staff_notfound')); return ctx.redirect('/admin/staff'); }
  if (target.email === 'admin@mooz.store') { ctx.flashMsg(ctx.t('fl_owner_del_locked')); return ctx.redirect('/admin/staff'); }
  if (target.id === ctx.user.id) { ctx.flashMsg(ctx.t('fl_self_del')); return ctx.redirect('/admin/staff'); }
  db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
  ctx.flashMsg(ctx.t('fl_staff_deleted') + ': ' + target.email);
  ctx.redirect('/admin/staff');
});

// --- Hukuki sayfalar (Sartlar / Gizlilik / Cerez) ---
add('GET', '/legal/:slug', (ctx) => {
  const doc = legal.page(ctx.params.slug, ctx.lang);
  if (!doc) { ctx.title = 'Bulunamadi'; return ctx.send(pages.notFound(ctx), 404); }
  ctx.title = doc.title;
  ctx.send(pages.legalPage(ctx, { doc }));
});

// --- SEO: robots.txt + sitemap.xml ---
add('GET', '/robots.txt', (ctx) => {
  const base = baseUrl(ctx.req);
  ctx.res.writeHead(200, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, SEC_HEADERS));
  ctx.res.end('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /seller\nDisallow: /cart\nDisallow: /checkout\nDisallow: /orders\nSitemap: ' + base + '/sitemap.xml\n');
});

add('GET', '/sitemap.xml', (ctx) => {
  const base = baseUrl(ctx.req);
  const urls = ['/', '/legal/terms', '/legal/privacy', '/legal/cookies'];
  db.prepare("SELECT p.id FROM products p JOIN stores s ON s.id=p.store_id AND s.status='active'").all().forEach(p => urls.push('/product/' + p.id));
  db.prepare("SELECT slug FROM stores WHERE status='active'").all().forEach(s => urls.push('/store/' + s.slug));
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '  <url><loc>' + H.esc(base + u) + '</loc></url>').join('\n') + '\n</urlset>\n';
  ctx.res.writeHead(200, Object.assign({ 'Content-Type': 'application/xml; charset=utf-8' }, SEC_HEADERS));
  ctx.res.end(xml);
});

// =========================================================================
//  SEPET & SIPARIS
// =========================================================================
add('POST', '/cart/add', (ctx) => {
  if (!requireLogin(ctx)) return;
  const pid = ctx.body.product_id;
  const prod = db.prepare("SELECT p.id, p.stock FROM products p JOIN stores s ON s.id=p.store_id AND s.status='active' WHERE p.id=?").get(pid);
  if (!prod) { ctx.flashMsg(ctx.t('fl_product_notfound')); return ctx.redirect('/'); }
  if (prod.stock <= 0) { ctx.flashMsg(ctx.t('fl_out_of_stock')); return ctx.redirect('/product/' + pid); }
  db.prepare(`INSERT INTO cart_items (user_id, product_id, qty) VALUES (?,?,1)
    ON CONFLICT(user_id, product_id) DO UPDATE SET qty = qty + 1`).run(ctx.user.id, pid);
  ctx.flashMsg(ctx.t('fl_cart_added'));
  ctx.redirect('/cart');
});

add('GET', '/cart', (ctx) => {
  if (!requireLogin(ctx)) return;
  ctx.title = 'Sepetim';
  ctx.send(pages.cart(ctx, { rows: cartRows(ctx.user.id), coupon: getCoupon(ctx.couponCode) }));
});

add('POST', '/cart/update', (ctx) => {
  if (!requireLogin(ctx)) return;
  const qty = parseInt(ctx.body.qty) || 0;
  if (qty <= 0) db.prepare('DELETE FROM cart_items WHERE user_id=? AND product_id=?').run(ctx.user.id, ctx.body.product_id);
  else db.prepare('UPDATE cart_items SET qty=? WHERE user_id=? AND product_id=?').run(qty, ctx.user.id, ctx.body.product_id);
  ctx.redirect('/cart');
});

add('POST', '/cart/remove', (ctx) => {
  if (!requireLogin(ctx)) return;
  db.prepare('DELETE FROM cart_items WHERE user_id=? AND product_id=?').run(ctx.user.id, ctx.body.product_id);
  ctx.redirect('/cart');
});

add('POST', '/cart/coupon', (ctx) => {
  if (!requireLogin(ctx)) return;
  const code = String(ctx.body.code || '').trim().toUpperCase();
  const c = getCoupon(code);
  if (!c) { ctx.flashMsg(ctx.t('fl_coupon_invalid')); ctx.setCookie('mooz_coupon=; Path=/; Max-Age=0'); }
  else { ctx.setCookie('mooz_coupon=' + encodeURIComponent(code) + '; Path=/; Max-Age=86400'); ctx.flashMsg(ctx.t('fl_coupon_applied') + ' %' + c.percent + ' ' + ctx.t('cp_off')); }
  ctx.redirect('/cart');
});

add('POST', '/cart/coupon/remove', (ctx) => {
  if (!requireLogin(ctx)) return;
  ctx.setCookie('mooz_coupon=; Path=/; Max-Age=0');
  ctx.flashMsg(ctx.t('fl_coupon_removed'));
  ctx.redirect('/cart');
});

add('GET', '/checkout', (ctx) => {
  if (!requireLogin(ctx)) return;
  const rows = cartRows(ctx.user.id);
  if (!rows.length) { ctx.flashMsg(ctx.t('fl_cart_empty')); return ctx.redirect('/cart'); }
  ctx.title = 'Odeme';
  ctx.send(pages.checkout(ctx, { rows, coupon: getCoupon(ctx.couponCode) }));
});

// Siparisi "rezerve et": satici siparisleri + kalemler olustur, stok dus,
// kupon say, sepeti temizle. (Siparis satiri onceden olusturulmus olmali.)
function fulfillOrder(orderId, { usable, percent, coupon, userId }) {
  const byStore = {};
  usable.forEach(r => { (byStore[r.store_id] = byStore[r.store_id] || []).push(r); });
  const insSO = db.prepare('INSERT INTO seller_orders (order_id,store_id,subtotal_cents,commission_cents,currency,status) VALUES (?,?,?,?,?,?)');
  const insOI = db.prepare('INSERT INTO order_items (seller_order_id,product_id,name,price_cents,currency,qty) VALUES (?,?,?,?,?,?)');
  const decStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
  Object.keys(byStore).forEach(storeId => {
    const items = byStore[storeId];
    const gross = items.reduce((s, it) => s + it.price_cents * it.qty, 0);
    const subtotal = Math.round(gross * (100 - percent) / 100);
    const commission = Math.round(subtotal * config.commissionRate);
    const soId = Number(insSO.run(orderId, storeId, subtotal, commission, items[0].currency, 'hazirlaniyor').lastInsertRowid);
    items.forEach(it => { insOI.run(soId, it.id, it.name, it.price_cents, it.currency, it.qty); decStock.run(it.qty, it.id); });
  });
  if (coupon) db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(coupon.id);
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
}

// Siparis odendiginde alici + saticilara e-posta gonder (fire-and-forget).
// Anahtar yoksa log modunda calisir; her ihtimalde siparis akisini bozmaz.
function sendOrderEmails(orderId) {
  try {
    const o = db.prepare('SELECT o.*, u.email AS buyer_email, u.name AS buyer_name FROM orders o JOIN users u ON u.id = o.buyer_id WHERE o.id = ?').get(orderId);
    if (!o) return;
    const sos = db.prepare(
      'SELECT so.*, s.name AS store_name, u.email AS seller_email FROM seller_orders so ' +
      'JOIN stores s ON s.id = so.store_id JOIN users u ON u.id = s.user_id WHERE so.order_id = ?'
    ).all(orderId);

    const row = (it) => '<tr><td style="padding:4px 0">' + H.esc(it.name) + ' &times; ' + it.qty +
      '</td><td style="padding:4px 0;text-align:right">' + H.money(it.price_cents * it.qty, it.currency) + '</td></tr>';
    const addr = H.esc(o.address || '-');

    // 1) Alici onay e-postasi (tum siparis)
    const allItems = [];
    sos.forEach(so => { db.prepare('SELECT * FROM order_items WHERE seller_order_id = ?').all(so.id).forEach(it => allItems.push(it)); });
    const buyerBody =
      '<p>Bedankt voor je bestelling bij ' + config.brand.name + '!</p>' +
      '<p><b>Bestelling #' + o.id + '</b></p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' + allItems.map(row).join('') + '</table>' +
      '<hr style="border:none;border-top:1px solid #e4e4e7;margin:12px 0">' +
      '<p style="text-align:right"><b>Totaal: ' + H.money(o.total_cents, o.currency) + '</b></p>' +
      '<p style="color:#71717a;font-size:13px">Leveradres: ' + addr + '</p>';
    mailer.send({
      to: o.buyer_email,
      subject: config.brand.name + ' — Bevestiging bestelling #' + o.id,
      html: mailer.layout('Bestelling #' + o.id + ' bevestigd', buyerBody),
      text: 'Bedankt voor je bestelling #' + o.id + ' bij ' + config.brand.name + '. Totaal: ' + H.money(o.total_cents, o.currency) + '.',
    }).catch(() => {});

    // 2) Satici bildirimi (her magaza kendi kalemleri)
    sos.forEach(so => {
      const items = db.prepare('SELECT * FROM order_items WHERE seller_order_id = ?').all(so.id);
      const sellerBody =
        '<p>Je hebt een nieuwe bestelling ontvangen voor <b>' + H.esc(so.store_name) + '</b>.</p>' +
        '<p><b>Bestelling #' + o.id + '</b></p>' +
        '<table style="width:100%;border-collapse:collapse;font-size:14px">' + items.map(row).join('') + '</table>' +
        '<hr style="border:none;border-top:1px solid #e4e4e7;margin:12px 0">' +
        '<p style="text-align:right"><b>Subtotaal: ' + H.money(so.subtotal_cents, so.currency) + '</b></p>' +
        '<p style="color:#71717a;font-size:13px">Leveradres: ' + addr + '</p>' +
        '<p style="color:#71717a;font-size:13px">Log in op je verkooppaneel om de bestelling te verwerken.</p>';
      mailer.send({
        to: so.seller_email,
        subject: config.brand.name + ' — Nieuwe bestelling #' + o.id,
        html: mailer.layout('Nieuwe bestelling #' + o.id, sellerBody),
        text: 'Nieuwe bestelling #' + o.id + ' voor ' + so.store_name + '. Subtotaal: ' + H.money(so.subtotal_cents, so.currency) + '.',
      }).catch(() => {});
    });
  } catch (e) {
    console.log('[MAIL] sendOrderEmails hata:', e && e.message);
  }
}

// Iade onaylaninca aliciya geri odeme bilgilendirme maili (fire-and-forget)
function sendRefundEmail(returnId, amountCents, currency) {
  try {
    const r = db.prepare(`SELECT r.order_id, u.email AS buyer_email FROM returns r JOIN users u ON u.id=r.buyer_id WHERE r.id=?`).get(returnId);
    if (!r) return;
    const body =
      '<p>Je retour voor bestelling #' + r.order_id + ' is goedgekeurd.</p>' +
      '<p><b>Terugbetaald: ' + H.money(amountCents, currency) + '</b></p>' +
      '<p style="color:#71717a;font-size:13px">De terugbetaling verschijnt binnen enkele dagen op je rekening of kaart.</p>';
    mailer.send({
      to: r.buyer_email,
      subject: config.brand.name + ' — Terugbetaling bestelling #' + r.order_id,
      html: mailer.layout('Terugbetaling verwerkt', body),
      text: 'Je retour voor bestelling #' + r.order_id + ' is goedgekeurd. Terugbetaald: ' + H.money(amountCents, currency) + '.',
    }).catch(() => {});
  } catch (e) { console.log('[MAIL] sendRefundEmail hata:', e && e.message); }
}

add('POST', '/checkout', async (ctx) => {
  if (!requireLogin(ctx)) return;
  const rows = cartRows(ctx.user.id);
  if (!rows.length) { ctx.flashMsg(ctx.t('fl_cart_empty')); return ctx.redirect('/cart'); }
  const b = ctx.body;
  const address = [b.name, b.address, ((b.zip || '') + ' ' + (b.city || '')).trim(), b.country].filter(x => x && x.trim()).join(', ');

  // Stok kontrolu: alinabilecek adet = min(sepet, stok)
  const usable = [];
  rows.forEach(r => {
    const qty = Math.min(r.qty, r.stock);
    if (qty > 0) usable.push({ ...r, qty });
  });
  if (!usable.length) { ctx.flashMsg(ctx.t('fl_cart_sold_out')); return ctx.redirect('/cart'); }

  const orderCurrency = usable[0].currency;
  const grossTotal = usable.reduce((s, it) => s + it.price_cents * it.qty, 0);
  const coupon = getCoupon(ctx.couponCode);
  const percent = coupon ? coupon.percent : 0;
  const orderTotal = Math.round(grossTotal * (100 - percent) / 100);
  const discountCents = grossTotal - orderTotal;

  const prov = payment.activeFor(orderCurrency);

  // --- SIMULASYON (aktif saglayici yok) ---
  if (!prov) {
    const info = db.prepare('INSERT INTO orders (buyer_id,total_cents,currency,status,address,payment_method,payment_ref,discount_cents,coupon_code) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(ctx.user.id, orderTotal, orderCurrency, 'odendi', address, 'simulation', payment.simRef(), discountCents, coupon ? coupon.code : '');
    const orderId = Number(info.lastInsertRowid);
    fulfillOrder(orderId, { usable, percent, coupon, userId: ctx.user.id });
    sendOrderEmails(orderId);
    ctx.setCookie('mooz_coupon=; Path=/; Max-Age=0');
    ctx.flashMsg(ctx.t('fl_order_placed') + ' (' + ctx.t('fl_simulation') + ')');
    return ctx.redirect('/orders/' + orderId);
  }

  // --- GERCEK SAGLAYICI (Mollie/Stripe) ---
  // 1) Once "beklemede" siparis satiri olustur (id lazim), henuz stok dusme
  const info = db.prepare('INSERT INTO orders (buyer_id,total_cents,currency,status,address,payment_method,payment_ref,discount_cents,coupon_code) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(ctx.user.id, orderTotal, orderCurrency, 'pending', address, prov.provider, '', discountCents, coupon ? coupon.code : '');
  const orderId = Number(info.lastInsertRowid);

  // 2) Saglayicida odeme oturumu ac
  const base = baseUrl(ctx.req);
  const r = await payment.createPayment({
    orderId, amountCents: orderTotal, currency: orderCurrency,
    description: config.brand.name + ' #' + orderId,
    returnUrl: base + '/payment/return?order=' + orderId,
    webhookUrl: base + '/payment/webhook/' + prov.provider,
  });

  if (!r.ok || !r.checkoutUrl) {
    db.prepare('DELETE FROM orders WHERE id = ?').run(orderId); // sepet/stok korunur
    ctx.flashMsg(ctx.t('fl_pay_fail') + (r.error ? ' (' + r.error + ')' : ''));
    return ctx.redirect('/checkout');
  }

  // 3) Odeme ok -> rezerve et, referansi kaydet, kullaniciyi odeme sayfasina yonlendir
  db.prepare('UPDATE orders SET payment_ref = ? WHERE id = ?').run(r.providerRef, orderId);
  fulfillOrder(orderId, { usable, percent, coupon, userId: ctx.user.id });
  ctx.setCookie('mooz_coupon=; Path=/; Max-Age=0');
  ctx.redirect(r.checkoutUrl);
});

// Siparisi "odendi" yap (beklemedeyse). Idempotent.
function markOrderPaid(orderId) {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!o || o.status !== 'pending') return false;
  db.prepare("UPDATE orders SET status = 'odendi' WHERE id = ?").run(orderId);
  sendOrderEmails(orderId);
  return true;
}
// Siparisi iptal et + stok iade (beklemedeyse). Idempotent.
function cancelOrder(orderId) {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!o || o.status !== 'pending') return false;
  const items = db.prepare('SELECT oi.product_id, oi.qty FROM order_items oi JOIN seller_orders so ON so.id = oi.seller_order_id WHERE so.order_id = ?').all(orderId);
  const inc = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
  items.forEach(it => { if (it.product_id) inc.run(it.qty, it.product_id); });
  db.prepare("UPDATE orders SET status = 'iptal' WHERE id = ?").run(orderId);
  return true;
}

// Saglayicidan durum sorgulayip siparisi sonlandir -> 'paid'|'failed'|'pending'
async function reconcileOrder(order) {
  if (!order || order.status !== 'pending') return order ? order.status : 'unknown';
  const st = await payment.checkStatus(order.payment_method, order.payment_ref);
  if (st === 'paid') { markOrderPaid(order.id); return 'paid'; }
  if (st === 'failed') { cancelOrder(order.id); return 'failed'; }
  return 'pending';
}

// Odeme donus sayfasi (kullanici saglayicidan geri doner)
add('GET', '/payment/return', async (ctx) => {
  if (!requireLogin(ctx)) return;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(ctx.query.order);
  if (!order || order.buyer_id !== ctx.user.id) { ctx.title = 'Bulunamadi'; return ctx.send(pages.notFound(ctx), 404); }
  const result = await reconcileOrder(order);
  const provLabel = (payment.PROVIDERS[order.payment_method] && payment.PROVIDERS[order.payment_method].label) || order.payment_method;
  if (result === 'paid') ctx.flashMsg(ctx.t('fl_order_placed') + ' ' + provLabel);
  else if (result === 'failed') ctx.flashMsg(ctx.t('fl_pay_fail'));
  ctx.redirect('/orders/' + order.id);
});

// Saglayici webhook'u (odeme sonucunu dogrular). Kimlik: saglayici API'sinden teyit.
add('POST', '/payment/webhook/:provider', async (ctx) => {
  const provider = ctx.params.provider;
  let ref = '';
  if (provider === 'mollie') {
    ref = (ctx.body && ctx.body.id) || '';
  } else if (provider === 'stripe') {
    try { const ev = JSON.parse(ctx.rawBody || '{}'); ref = ev.data && ev.data.object && ev.data.object.id; } catch (_) { ref = ''; }
  }
  if (ref) {
    const order = db.prepare('SELECT * FROM orders WHERE payment_ref = ? AND payment_method = ?').get(ref, provider);
    if (order) await reconcileOrder(order);
  }
  ctx.res.writeHead(200, { 'Content-Type': 'text/plain' });
  ctx.res.end('ok');
});

add('GET', '/orders', (ctx) => {
  if (!requireLogin(ctx)) return;
  const orders = db.prepare('SELECT * FROM orders WHERE buyer_id=? ORDER BY created_at DESC').all(ctx.user.id);
  ctx.title = 'Siparislerim';
  ctx.send(pages.orders(ctx, { orders }));
});

add('GET', '/orders/:id', (ctx) => {
  if (!requireLogin(ctx)) return;
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(ctx.params.id);
  if (!order || (order.buyer_id !== ctx.user.id && ctx.user.role !== 'admin')) {
    ctx.title = 'Bulunamadi'; return ctx.send(pages.notFound(ctx), 404);
  }
  const sellerOrders = db.prepare(`SELECT so.*, s.name AS store_name, s.slug AS store_slug
    FROM seller_orders so JOIN stores s ON s.id=so.store_id WHERE so.order_id=?`).all(order.id);
  sellerOrders.forEach(so => {
    so.items = db.prepare('SELECT * FROM order_items WHERE seller_order_id=?').all(so.id);
    so.canReturn = returnEligible(order, so);
  });
  ctx.title = 'Siparis #' + order.id;
  ctx.send(pages.orderDetail(ctx, { order, sellerOrders }));
});

// Iade politikasi: alinmis (odendi) + 14 gun icinde + daha once talep edilmemis
const RETURN_DAYS = 14;
function returnEligible(order, so) {
  if (!order || order.status !== 'odendi') return false;
  if (!so || (so.return_status && so.return_status !== 'none')) return false;
  const ms = new Date(String(order.created_at || '').replace(' ', 'T') + 'Z').getTime();
  if (!ms) return true;
  return (Date.now() - ms) / 86400000 <= RETURN_DAYS;
}

// Alici: bir satici-siparisi icin iade talebi olustur
add('POST', '/returns', (ctx) => {
  if (!requireLogin(ctx)) return;
  const so = db.prepare(`SELECT so.*, o.buyer_id, o.status AS order_status, o.created_at AS order_date
    FROM seller_orders so JOIN orders o ON o.id = so.order_id WHERE so.id = ?`).get(ctx.body.seller_order_id);
  if (!so || so.buyer_id !== ctx.user.id) { ctx.flashMsg(ctx.t('fl_order_notfound')); return ctx.redirect('/orders'); }
  const order = { status: so.order_status, created_at: so.order_date };
  if (!returnEligible(order, so)) { ctx.flashMsg(ctx.t('fl_ret_ineligible')); return ctx.redirect('/orders/' + so.order_id); }
  const reason = (ctx.body.reason || '').toString().slice(0, 500);
  db.prepare("INSERT INTO returns (seller_order_id,order_id,buyer_id,store_id,reason,status) VALUES (?,?,?,?,?,'requested')")
    .run(so.id, so.order_id, ctx.user.id, so.store_id, reason);
  db.prepare("UPDATE seller_orders SET return_status='requested' WHERE id=?").run(so.id);
  ctx.flashMsg(ctx.t('fl_ret_created'));
  ctx.redirect('/orders/' + so.order_id);
});

add('GET', '/seller/orders', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  const sellerOrders = db.prepare(`SELECT so.*, o.address, o.created_at AS order_date, u.name AS buyer_name
    FROM seller_orders so JOIN orders o ON o.id=so.order_id JOIN users u ON u.id=o.buyer_id
    WHERE so.store_id=? ORDER BY so.created_at DESC`).all(ctx.myStore.id);
  sellerOrders.forEach(so => { so.items = db.prepare('SELECT * FROM order_items WHERE seller_order_id=?').all(so.id); });
  const newCount = ctx.newOrders;
  // Goruldu olarak isaretle (bu sayfayi acinca bildirim sifirlanir)
  db.prepare("UPDATE seller_orders SET seen = 1 WHERE store_id = ? AND seen = 0").run(ctx.myStore.id);
  ctx.title = 'Gelen Siparisler';
  ctx.send(pages.sellerOrders(ctx, { sellerOrders, newCount }));
});

add('POST', '/seller/orders/:id/status', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  const valid = ['hazirlaniyor', 'kargoda', 'teslim'];
  const st = ctx.body.status;
  if (valid.includes(st)) {
    if (st === 'kargoda') {
      const carrier = shipping.isValidCarrier(ctx.body.carrier) ? ctx.body.carrier : '';
      const tracking = (ctx.body.tracking_no || '').trim();
      db.prepare('UPDATE seller_orders SET status=?, carrier=?, tracking_no=? WHERE id=? AND store_id=?')
        .run(st, carrier, tracking, ctx.params.id, ctx.myStore.id);
    } else {
      db.prepare('UPDATE seller_orders SET status=? WHERE id=? AND store_id=?').run(st, ctx.params.id, ctx.myStore.id);
    }
  }
  ctx.redirect('/seller/orders');
});

// =========================================================================
//  HTTP sunucusu
// =========================================================================
const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // Statik dosyalar (public/)
  if (urlPath.startsWith('/css/') || urlPath === '/favicon.ico') {
    const file = path.join(__dirname, 'public', urlPath.replace(/\.\./g, ''));
    return fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  }

  const match = routes.find(r => r.method === req.method && r.rx.test(urlPath));

  const run = (body, raw) => {
    const ctx = buildCtx(req, res);
    ctx.query = qs.parse(req.url.split('?')[1] || '');
    ctx.body = body || {};
    ctx.rawBody = raw || '';
    if (!match) { ctx.title = 'Bulunamadi'; return ctx.send(pages.notFound(ctx), 404); }
    const m = urlPath.match(match.rx);
    match.keys.forEach((k, i) => { ctx.params[k] = decodeURIComponent(m[i + 1]); });
    // Handler sync veya async olabilir; her iki durumda da hatayi yakala
    Promise.resolve().then(() => match.handler(ctx)).catch((e) => {
      console.error(e);
      if (!res.headersSent) { res.writeHead(500); res.end('Sunucu hatasi'); }
    });
  };

  if (req.method === 'POST') {
    const ctype = req.headers['content-type'] || '';
    const chunks = [];
    let size = 0;
    const limit = 4 * 1024 * 1024; // 4 MB (base64 gorsel icin)
    req.on('data', c => { size += c.length; if (size > limit) { req.destroy(); return; } chunks.push(c); });
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const raw = buf.toString('utf8');
      if (ctype.startsWith('multipart/form-data')) {
        const m = ctype.match(/boundary=(?:"([^"]+)"|([^;]+))/);
        const boundary = m ? (m[1] || m[2]).trim() : '';
        run(parseMultipart(buf, boundary), raw);
      } else {
        run(qs.parse(raw), raw);
      }
    });
  } else {
    run();
  }
});

// Basit multipart/form-data cozucu (sifir bagimlilik).
// Metin alanlarini body'ye koyar; dosya alanini image_<name> = data URI yapar.
function parseMultipart(buf, boundary) {
  const out = {};
  if (!boundary) return out;
  const delim = Buffer.from('--' + boundary);
  let start = buf.indexOf(delim);
  if (start < 0) return out;
  start += delim.length;
  while (start < buf.length) {
    if (buf[start] === 0x2d && buf[start + 1] === 0x2d) break; // kapanis "--"
    start += 2; // \r\n
    const headerEnd = buf.indexOf(Buffer.from('\r\n\r\n'), start);
    if (headerEnd < 0) break;
    const header = buf.slice(start, headerEnd).toString('utf8');
    const bodyStart = headerEnd + 4;
    const nextDelim = buf.indexOf(delim, bodyStart);
    if (nextDelim < 0) break;
    const content = buf.slice(bodyStart, nextDelim - 2); // sondaki \r\n'i at
    const nameM = header.match(/name="([^"]*)"/i);
    const fileM = header.match(/filename="([^"]*)"/i);
    const typeM = header.match(/Content-Type:\s*([^\r\n]+)/i);
    if (nameM) {
      const name = nameM[1];
      if (fileM && fileM[1]) {
        // Dosya: sadece gorselleri kabul et, data URI'ye cevir
        const mime = (typeM ? typeM[1].trim() : '').toLowerCase();
        if (/^image\/(png|jpe?g|webp|gif)$/.test(mime) && content.length > 0) {
          out['file_' + name] = 'data:' + mime + ';base64,' + content.toString('base64');
        }
      } else {
        out[name] = content.toString('utf8');
      }
    }
    start = nextDelim + delim.length;
  }
  return out;
}

server.listen(config.port, () => {
  console.log(`\n  ${config.brand.name} calisiyor -> http://localhost:${config.port}\n`);
});
