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
function buildCtx(req, res) {
  const cookies = H.parseCookies(req.headers.cookie);
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

  const cartCount = user
    ? db.prepare('SELECT COALESCE(SUM(qty),0) AS n FROM cart_items WHERE user_id = ?').get(user.id).n
    : 0;

  const lang = config.languages.includes(cookies.mooz_lang) ? cookies.mooz_lang : config.defaultLang;
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
    hasPerm: (key) => hasPerm(user, key),
    params: {}, query: {}, body: {},
    path: req.url.split('?')[0],
    _cookies: outCookies,
    setCookie(c) { this._cookies.push(c); },
    login(id) { this.setCookie('mooz_uid=' + H.sign(String(id)) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000'); },
    logout() { this.setCookie('mooz_uid=; Path=/; Max-Age=0'); },
    flashMsg(m) { this.setCookie('mooz_flash=' + encodeURIComponent(m) + '; Path=/; Max-Age=30'); },
    send(html, status) {
      const h = { 'Content-Type': 'text/html; charset=utf-8' };
      if (this._cookies.length) h['Set-Cookie'] = this._cookies;
      res.writeHead(status || 200, h); res.end(html);
    },
    redirect(loc) {
      const h = { Location: loc };
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

function requireLogin(ctx) {
  if (!ctx.user) { ctx.flashMsg('Devam etmek icin giris yap.'); ctx.redirect('/login'); return false; }
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
    let s2 = `SELECT p.*, c.slug AS cat_slug FROM products p
      LEFT JOIN categories c ON c.id = p.category_id WHERE p.store_id = ?`;
    const a2 = [ctx.storeSite.id];
    if (activeCat) { s2 += ' AND c.slug = ?'; a2.push(activeCat); }
    if (q) { s2 += ' AND p.name LIKE ?'; a2.push('%' + q + '%'); }
    s2 += ' ORDER BY p.created_at DESC';
    const prods = db.prepare(s2).all(...a2);
    ctx.title = ctx.storeSite.name;
    return ctx.send(pages.storeHome(ctx, { store: ctx.storeSite, products: prods, activeCat, q }));
  }

  let sql = `SELECT p.*, s.name AS store_name, s.slug AS store_slug, c.slug AS cat_slug
    FROM products p JOIN stores s ON s.id = p.store_id AND s.status='active'
    LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1`;
  const args = [];
  if (activeCat) { sql += ' AND c.slug = ?'; args.push(activeCat); }
  if (q) { sql += ' AND (p.name LIKE ? OR s.name LIKE ?)'; args.push('%' + q + '%', '%' + q + '%'); }
  sql += ' ORDER BY p.created_at DESC';
  const products = db.prepare(sql).all(...args);
  ctx.title = config.brand.name;
  ctx.send(pages.home(ctx, { products, activeCat, q }));
});

add('GET', '/product/:id', (ctx) => {
  const p = db.prepare(`SELECT p.*, s.name AS store_name, s.slug AS store_slug, c.name AS cat_name
    FROM products p JOIN stores s ON s.id = p.store_id
    LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`).get(ctx.params.id);
  if (!p) { ctx.title = 'Bulunamadi'; return ctx.send(pages.notFound(ctx), 404); }
  ctx.title = p.name;
  ctx.send(pages.product(ctx, { p }));
});

add('GET', '/store/:slug', (ctx) => {
  const store = db.prepare("SELECT * FROM stores WHERE slug = ? AND status='active'").get(ctx.params.slug);
  if (!store) { ctx.title = 'Magaza bulunamadi'; return ctx.send(pages.notFound(ctx), 404); }
  const products = db.prepare('SELECT * FROM products WHERE store_id = ? ORDER BY created_at DESC').all(store.id);
  ctx.title = store.name;
  ctx.send(pages.store(ctx, { store, products }));
});

// --- Uyelik ---
add('GET', '/register', (ctx) => { ctx.title = 'Kayit ol'; ctx.send(pages.register(ctx)); });
add('GET', '/login', (ctx) => { ctx.title = 'Giris yap'; ctx.send(pages.login(ctx)); });

add('POST', '/register', (ctx) => {
  const { name, email, password, role } = ctx.body;
  if (!name || !email || !password) { ctx.flashMsg('Tum alanlari doldurun.'); return ctx.redirect('/register'); }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    ctx.flashMsg('Bu e-posta zaten kayitli.'); return ctx.redirect('/register');
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
  ctx.flashMsg(accountRole === 'seller' ? 'Hos geldin! Magazan admin onayindan sonra yayinlanacak.' : 'Hos geldin!');
  ctx.redirect(accountRole === 'seller' ? '/seller' : '/');
});

add('POST', '/login', (ctx) => {
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(ctx.body.email || '');
  if (!u || !H.verifyPassword(ctx.body.password || '', u.password_hash)) {
    ctx.flashMsg('E-posta veya sifre hatali.'); return ctx.redirect('/login');
  }
  ctx.login(u.id);
  ctx.redirect(u.role === 'admin' ? '/admin' : u.role === 'seller' ? '/seller' : '/');
});

add('POST', '/logout', (ctx) => { ctx.logout(); ctx.redirect('/'); });

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
  ctx.title = 'Satici Paneli';
  ctx.send(pages.sellerDashboard(ctx, { store, productCount }));
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
  if (!b.name || !b.price) { ctx.flashMsg('Urun adi ve fiyat zorunlu.'); return ctx.redirect('/seller/products/new'); }
  const cents = Math.round(parseFloat(String(b.price).replace(',', '.')) * 100) || 0;
  const imageUrl = /^https?:\/\//i.test((b.image_url || '').trim()) ? b.image_url.trim() : '';
  db.prepare(`INSERT INTO products (store_id,category_id,name,description,price_cents,currency,emoji,stock,image_url)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    ctx.myStore.id, b.category_id || null, b.name, b.description || '', cents,
    config.currencies.includes(b.currency) ? b.currency : config.defaultCurrency,
    b.emoji || '\u{1F4E6}', parseInt(b.stock) || 0, imageUrl);
  ctx.flashMsg('Urun eklendi.');
  ctx.redirect('/seller/products');
});

add('POST', '/seller/store', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  db.prepare('UPDATE stores SET description = ? WHERE id = ?')
    .run((ctx.body.description || '').slice(0, 300), ctx.myStore.id);
  ctx.flashMsg('Magaza bilgisi guncellendi.');
  ctx.redirect('/seller');
});

add('POST', '/seller/products/:id/delete', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  db.prepare('DELETE FROM products WHERE id = ? AND store_id = ?').run(ctx.params.id, ctx.myStore.id);
  ctx.flashMsg('Urun silindi.');
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
      payout: db.prepare('SELECT COALESCE(SUM(subtotal_cents),0) AS n FROM seller_orders').get().n
              - stats.commission,
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
    ctx.flashMsg('Ad, e-posta ve en az 6 karakter sifre gerekli.');
    return ctx.redirect('/admin/staff');
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    ctx.flashMsg('Bu e-posta zaten kayitli.');
    return ctx.redirect('/admin/staff');
  }
  const chosen = PERM_KEYS.filter(k => ctx.body['perm_' + k]).join(',');
  db.prepare("INSERT INTO users (name,email,password_hash,role,permissions) VALUES (?,?,?,'admin',?)")
    .run(name, email, H.hashPassword(pass), chosen);
  ctx.flashMsg('Personel eklendi: ' + email);
  ctx.redirect('/admin/staff');
});

add('POST', '/admin/staff/:id/perms', (ctx) => {
  if (!requirePerm(ctx, 'staff')) return;
  const target = db.prepare("SELECT id,email,permissions FROM users WHERE id=? AND role='admin'").get(ctx.params.id);
  if (!target) { ctx.flashMsg('Personel bulunamadi.'); return ctx.redirect('/admin/staff'); }
  if (target.email === 'admin@mooz.store') { ctx.flashMsg('Ana sahip yetkileri degistirilemez.'); return ctx.redirect('/admin/staff'); }
  const chosen = PERM_KEYS.filter(k => ctx.body['perm_' + k]).join(',');
  db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(chosen, target.id);
  ctx.flashMsg('Yetkiler guncellendi: ' + target.email);
  ctx.redirect('/admin/staff');
});

add('POST', '/admin/staff/:id/delete', (ctx) => {
  if (!requirePerm(ctx, 'staff')) return;
  const target = db.prepare("SELECT id,email FROM users WHERE id=? AND role='admin'").get(ctx.params.id);
  if (!target) { ctx.flashMsg('Personel bulunamadi.'); return ctx.redirect('/admin/staff'); }
  if (target.email === 'admin@mooz.store') { ctx.flashMsg('Ana sahip hesabi silinemez.'); return ctx.redirect('/admin/staff'); }
  if (target.id === ctx.user.id) { ctx.flashMsg('Kendi hesabinizi silemezsiniz.'); return ctx.redirect('/admin/staff'); }
  db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
  ctx.flashMsg('Personel silindi: ' + target.email);
  ctx.redirect('/admin/staff');
});

// =========================================================================
//  SEPET & SIPARIS
// =========================================================================
add('POST', '/cart/add', (ctx) => {
  if (!requireLogin(ctx)) return;
  const pid = ctx.body.product_id;
  const prod = db.prepare("SELECT p.id, p.stock FROM products p JOIN stores s ON s.id=p.store_id AND s.status='active' WHERE p.id=?").get(pid);
  if (!prod) { ctx.flashMsg('Urun bulunamadi.'); return ctx.redirect('/'); }
  if (prod.stock <= 0) { ctx.flashMsg('Bu urun tukendi.'); return ctx.redirect('/product/' + pid); }
  db.prepare(`INSERT INTO cart_items (user_id, product_id, qty) VALUES (?,?,1)
    ON CONFLICT(user_id, product_id) DO UPDATE SET qty = qty + 1`).run(ctx.user.id, pid);
  ctx.flashMsg('Sepete eklendi.');
  ctx.redirect('/cart');
});

add('GET', '/cart', (ctx) => {
  if (!requireLogin(ctx)) return;
  ctx.title = 'Sepetim';
  ctx.send(pages.cart(ctx, { rows: cartRows(ctx.user.id) }));
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

add('GET', '/checkout', (ctx) => {
  if (!requireLogin(ctx)) return;
  const rows = cartRows(ctx.user.id);
  if (!rows.length) { ctx.flashMsg('Sepetin bos.'); return ctx.redirect('/cart'); }
  ctx.title = 'Odeme';
  ctx.send(pages.checkout(ctx, { rows }));
});

add('POST', '/checkout', (ctx) => {
  if (!requireLogin(ctx)) return;
  const rows = cartRows(ctx.user.id);
  if (!rows.length) { ctx.flashMsg('Sepetin bos.'); return ctx.redirect('/cart'); }
  const b = ctx.body;
  const address = [b.name, b.address, ((b.zip || '') + ' ' + (b.city || '')).trim(), b.country].filter(x => x && x.trim()).join(', ');

  // Stok kontrolu: alinabilecek adet = min(sepet, stok)
  const usable = [];
  rows.forEach(r => {
    const qty = Math.min(r.qty, r.stock);
    if (qty > 0) usable.push({ ...r, qty });
  });
  if (!usable.length) { ctx.flashMsg('Sepetindeki urunler tukenmis.'); return ctx.redirect('/cart'); }

  const orderCurrency = usable[0].currency; // MVP: baskin para birimi (demo verisi EUR)
  const orderTotal = usable.reduce((s, it) => s + it.price_cents * it.qty, 0);

  // Odeme (su an simulasyon; gercek saglayici payment.js icinde baglanacak)
  const pay = payment.charge({ amountCents: orderTotal, currency: orderCurrency, method: b.method });
  if (!pay.ok) { ctx.flashMsg('Odeme alinamadi, tekrar deneyin.'); return ctx.redirect('/checkout'); }

  // Satici bazinda grupla (cok saticili sepet -> satici siparisleri)
  const byStore = {};
  usable.forEach(r => { (byStore[r.store_id] = byStore[r.store_id] || []).push(r); });

  const orderInfo = db.prepare('INSERT INTO orders (buyer_id,total_cents,currency,status,address,payment_method,payment_ref) VALUES (?,?,?,?,?,?,?)')
    .run(ctx.user.id, orderTotal, orderCurrency, 'odendi', address, pay.method, pay.ref);
  const orderId = Number(orderInfo.lastInsertRowid);

  const insSO = db.prepare('INSERT INTO seller_orders (order_id,store_id,subtotal_cents,commission_cents,currency,status) VALUES (?,?,?,?,?,?)');
  const insOI = db.prepare('INSERT INTO order_items (seller_order_id,product_id,name,price_cents,currency,qty) VALUES (?,?,?,?,?,?)');
  const decStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

  Object.keys(byStore).forEach(storeId => {
    const items = byStore[storeId];
    const subtotal = items.reduce((s, it) => s + it.price_cents * it.qty, 0);
    const commission = Math.round(subtotal * config.commissionRate);
    const soId = Number(insSO.run(orderId, storeId, subtotal, commission, items[0].currency, 'hazirlaniyor').lastInsertRowid);
    items.forEach(it => { insOI.run(soId, it.id, it.name, it.price_cents, it.currency, it.qty); decStock.run(it.qty, it.id); });
  });

  db.prepare('DELETE FROM cart_items WHERE user_id=?').run(ctx.user.id);
  ctx.flashMsg('Siparisin alindi! Odeme: ' + payment.methodLabel(pay.method) + ' (simulasyon)');
  ctx.redirect('/orders/' + orderId);
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
  sellerOrders.forEach(so => { so.items = db.prepare('SELECT * FROM order_items WHERE seller_order_id=?').all(so.id); });
  ctx.title = 'Siparis #' + order.id;
  ctx.send(pages.orderDetail(ctx, { order, sellerOrders }));
});

add('GET', '/seller/orders', (ctx) => {
  if (!requireRole(ctx, 'seller')) return;
  const sellerOrders = db.prepare(`SELECT so.*, o.address, o.created_at AS order_date, u.name AS buyer_name
    FROM seller_orders so JOIN orders o ON o.id=so.order_id JOIN users u ON u.id=o.buyer_id
    WHERE so.store_id=? ORDER BY so.created_at DESC`).all(ctx.myStore.id);
  sellerOrders.forEach(so => { so.items = db.prepare('SELECT * FROM order_items WHERE seller_order_id=?').all(so.id); });
  ctx.title = 'Gelen Siparisler';
  ctx.send(pages.sellerOrders(ctx, { sellerOrders }));
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

  const run = (body) => {
    const ctx = buildCtx(req, res);
    ctx.query = qs.parse(req.url.split('?')[1] || '');
    ctx.body = body || {};
    if (!match) { ctx.title = 'Bulunamadi'; return ctx.send(pages.notFound(ctx), 404); }
    const m = urlPath.match(match.rx);
    match.keys.forEach((k, i) => { ctx.params[k] = decodeURIComponent(m[i + 1]); });
    try { match.handler(ctx); }
    catch (e) { console.error(e); res.writeHead(500); res.end('Sunucu hatasi'); }
  };

  if (req.method === 'POST') {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => run(qs.parse(data)));
  } else {
    run();
  }
});

server.listen(config.port, () => {
  console.log(`\n  ${config.brand.name} calisiyor -> http://localhost:${config.port}\n`);
});
