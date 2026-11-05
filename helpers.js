// Yardimci fonksiyonlar - sadece Node'un yerlesik modulleri (dis paket yok)

const crypto = require('crypto');
const config = require('./config');

// --- Metin ---------------------------------------------------------------
function slugify(s) {
  return s.toString().toLowerCase().trim()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Para cevir (EUR baz, config.rates'e gore). Cent -> cent.
function convert(cents, from, to) {
  if (!from) from = config.defaultCurrency;
  if (from === to) return cents;
  const r = config.rates || { EUR: 1 };
  const eur = cents / (r[from] || 1);
  return Math.round(eur * (r[to] || 1));
}

// kurus/cent -> yerellestirilmis fiyat
function money(cents, currency) {
  const v = (cents || 0) / 100;
  const loc = currency === 'TRY' ? 'tr-TR' : 'nl-BE';
  try { return new Intl.NumberFormat(loc, { style: 'currency', currency }).format(v); }
  catch (e) { return v.toFixed(2) + ' ' + currency; }
}

// --- Sifre (crypto.scrypt) ----------------------------------------------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return salt + ':' + hash;
}
function verifyPassword(pw, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex'), b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// --- Imzali cerez (basit oturum) ----------------------------------------
function sign(val) {
  const sig = crypto.createHmac('sha256', config.sessionSecret).update(val).digest('base64url');
  return val + '.' + sig;
}
function unsign(signed) {
  if (!signed) return null;
  const i = signed.lastIndexOf('.');
  if (i < 0) return null;
  const val = signed.slice(0, i), sig = signed.slice(i + 1);
  const exp = crypto.createHmac('sha256', config.sessionSecret).update(val).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(exp);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? val : null;
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

module.exports = { slugify, esc, money, convert, hashPassword, verifyPassword, sign, unsign, parseCookies };
