// =========================================================================
//  Veritabani - Node'un yerlesik SQLite'i (node:sqlite) ile.
//  Semayi kurar ve bos ise ornek veri (seed) ekler.
// =========================================================================

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const { hashPassword } = require('./helpers');

const db = new DatabaseSync(path.join(__dirname, 'mooz.db'));

// --- Sema ----------------------------------------------------------------
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'buyer',   -- buyer | seller | admin
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stores (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending',    -- pending | active | suspended
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id    INTEGER NOT NULL REFERENCES stores(id),
    category_id INTEGER REFERENCES categories(id),
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0,
    currency    TEXT NOT NULL DEFAULT 'EUR',
    emoji       TEXT DEFAULT '\u{1F4E6}',
    stock       INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty        INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id    INTEGER NOT NULL REFERENCES users(id),
    total_cents INTEGER NOT NULL DEFAULT 0,
    currency    TEXT NOT NULL DEFAULT 'EUR',
    status      TEXT NOT NULL DEFAULT 'odendi',       -- odendi (simulasyon)
    address     TEXT DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS seller_orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id         INTEGER NOT NULL REFERENCES orders(id),
    store_id         INTEGER NOT NULL REFERENCES stores(id),
    subtotal_cents   INTEGER NOT NULL DEFAULT 0,
    commission_cents INTEGER NOT NULL DEFAULT 0,
    currency         TEXT NOT NULL DEFAULT 'EUR',
    status           TEXT NOT NULL DEFAULT 'hazirlaniyor',  -- hazirlaniyor | kargoda | teslim
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_order_id INTEGER NOT NULL REFERENCES seller_orders(id),
    product_id      INTEGER REFERENCES products(id),
    name            TEXT NOT NULL,
    price_cents     INTEGER NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'EUR',
    qty             INTEGER NOT NULL DEFAULT 1
  );
`);

// --- Seed (sadece bos ise) ----------------------------------------------
function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;

  console.log('Seed: ornek veri ekleniyor...');

  // Kategoriler
  const cats = [
    ['Moda', 'moda'], ['Elektronik', 'elektronik'], ['Ev & Yasam', 'ev'],
    ['Kozmetik', 'kozmetik'], ['Spor', 'spor'], ['Market', 'market'],
  ];
  const insCat = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  cats.forEach(c => insCat.run(c[0], c[1]));

  const insUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  const insStore = db.prepare(
    'INSERT INTO stores (user_id, name, slug, description, status) VALUES (?, ?, ?, ?, ?)');
  const insProd = db.prepare(`INSERT INTO products
    (store_id, category_id, name, description, price_cents, currency, emoji, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  const hash = pw => hashPassword(pw);

  // Admin  (giris: admin@mooz.store / admin123)
  insUser.run('Mooz Admin', 'admin@mooz.store', hash('admin123'), 'admin');

  // Ornek satici 1  (giris: moda@mooz.store / satici123)
  const u1 = insUser.run('Moda Evi', 'moda@mooz.store', hash('satici123'), 'seller').lastInsertRowid;
  const s1 = insStore.run(u1, 'Moda Evi', 'moda-evi', 'Kadin ve erkek giyim', 'active').lastInsertRowid;
  insProd.run(s1, 1, 'Pamuklu Oversize Tisort', 'Rahat kesim, %100 pamuk', 1999, 'EUR', '\u{1F455}', 50);
  insProd.run(s1, 1, 'Deri Spor Ayakkabi', 'Gunluk kullanim', 6499, 'EUR', '\u{1F45F}', 20);

  // Ornek satici 2  (giris: tekno@mooz.store / satici123)
  const u2 = insUser.run('Tekno Dunya', 'tekno@mooz.store', hash('satici123'), 'seller').lastInsertRowid;
  const s2 = insStore.run(u2, 'Tekno Dunya', 'tekno-dunya', 'Elektronik ve aksesuar', 'active').lastInsertRowid;
  insProd.run(s2, 2, 'Kablosuz Kulaklik Pro', 'Aktif gurultu engelleme', 8999, 'EUR', '\u{1F3A7}', 35);
  insProd.run(s2, 2, 'Akilli Saat Series 5', 'Nabiz + bildirim', 14999, 'EUR', '\u{231A}', 15);

  // Ornek satici 3 - onay bekliyor  (giris: guzellik@mooz.store / satici123)
  const u3 = insUser.run('Guzellik Market', 'guzellik@mooz.store', hash('satici123'), 'seller').lastInsertRowid;
  insStore.run(u3, 'Guzellik Market', 'guzellik-market', 'Kozmetik ve bakim', 'pending');

  console.log('Seed tamam.');
}

// --- Kucuk gocler (mevcut DB'ye eksik sutun ekle) ------------------------
function ensureColumn(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
ensureColumn('orders', 'payment_method', "TEXT DEFAULT ''");
ensureColumn('orders', 'payment_ref', "TEXT DEFAULT ''");
ensureColumn('seller_orders', 'carrier', "TEXT DEFAULT ''");
ensureColumn('seller_orders', 'tracking_no', "TEXT DEFAULT ''");
ensureColumn('products', 'image_url', "TEXT DEFAULT ''");
ensureColumn('users', 'permissions', "TEXT DEFAULT ''");

seed();

// Ana sahip admin'e tum yetkiler (*). Personel adminler kendi yetkileriyle kalir.
db.exec("UPDATE users SET permissions='*' WHERE email='admin@mooz.store' AND (permissions IS NULL OR permissions='')");

module.exports = db;
