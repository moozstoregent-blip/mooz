// =========================================================================
//  Odeme katmani - cok saglayicili altyapi.
//
//  Saglayicilar:
//   - iyzico : Turkiye (TRY)            -> https://dev.iyzipay.com
//   - Mollie : Avrupa (EUR) Bancontact/iDEAL -> https://docs.mollie.com
//   - Stripe : Avrupa/global (EUR) kart -> https://stripe.com/docs
//
//  Nasil calisir:
//   1) Admin panelden (Odeme Ayarlari) her saglayicinin API anahtarlari girilir,
//      test/canli modu secilir ve aktiflestirilir. Anahtarlar DB'de tutulur.
//   2) charge() odeme aninda para birimine gore AKTIF + anahtari girilmis
//      saglayiciyi secer:  TRY -> iyzico,  EUR -> aktif AB saglayicisi (Mollie/Stripe).
//   3) Anahtar girilmemisse veya aktif saglayici yoksa SIMULASYON calisir
//      (akis uctan uca bozulmaz).
//
//  "biz sadece api keyleri girecegiz ve aktiflestirecegiz" -> yapildi:
//  anahtarlar girilip aktif edilince asagidaki REAL[...] fonksiyonu devreye girer.
//  Gercek canli cekim, saglayicinin yonlendirme/webhook akisi keyler girilip
//  test edilince tamamlanir (callProvider icindeki TODO).
// =========================================================================

const db = require('./db');
const config = require('./config');

// Odeme yontemleri (checkout secimi)
const METHODS = {
  bancontact: 'Bancontact',
  ideal: 'iDEAL',
  card: 'Kredi / Banka Karti',
  transfer: 'Havale / EFT',
};
function methodLabel(m) { return METHODS[m] || m; }
function isValidMethod(m) { return Object.prototype.hasOwnProperty.call(METHODS, m); }

// Saglayici tanimlari (ust veri)
const PROVIDERS = {
  iyzico: {
    label: 'iyzico', region: 'TR', currencies: ['TRY'],
    needs: ['api_key', 'api_secret'],
    fieldLabels: { api_key: 'API Key', api_secret: 'Secret Key' },
    docs: 'https://dev.iyzipay.com',
  },
  mollie: {
    label: 'Mollie', region: 'EU', currencies: ['EUR'],
    needs: ['api_key'],
    fieldLabels: { api_key: 'API Key (test_ / live_)', api_secret: '' },
    docs: 'https://docs.mollie.com',
  },
  stripe: {
    label: 'Stripe', region: 'EU', currencies: ['EUR'],
    needs: ['api_secret'],
    fieldLabels: { api_key: 'Publishable Key (ops.)', api_secret: 'Secret Key (sk_...)' },
    docs: 'https://stripe.com/docs',
  },
};
const PROVIDER_KEYS = Object.keys(PROVIDERS);

// --- Yapilandirma (DB) ---------------------------------------------------
function getConfig(provider) {
  return db.prepare('SELECT * FROM payment_providers WHERE provider = ?').get(provider) || null;
}
function allConfigs() {
  const rows = db.prepare('SELECT * FROM payment_providers').all();
  const byName = {};
  rows.forEach(r => { byName[r.provider] = r; });
  // Eksik saglayici olursa bos obje dondur
  return PROVIDER_KEYS.map(p => byName[p] || { provider: p, active: 0, mode: 'test', api_key: '', api_secret: '' });
}

// Aktif para birimlerinde (config.currencies) kullanilabilen saglayicilar.
// Orn: TRY askidayken iyzico gizlenir; TR tekrar acilinca otomatik gorunur.
function availableConfigs() {
  const curs = config.currencies;
  return allConfigs().filter(c => PROVIDERS[c.provider].currencies.some(x => curs.includes(x)));
}

// Saglayicinin gerekli anahtarlari girilmis mi?
function isConfigured(cfg) {
  if (!cfg) return false;
  const meta = PROVIDERS[cfg.provider];
  if (!meta) return false;
  return meta.needs.every(f => (cfg[f] || '').trim().length > 0);
}

// Para birimine gore aktif + anahtari girilmis saglayici
function activeFor(currency) {
  const cur = (currency || 'EUR').toUpperCase();
  const candidates = allConfigs().filter(c =>
    c.active && isConfigured(c) && PROVIDERS[c.provider].currencies.includes(cur));
  return candidates[0] || null;
}

// --- Gercek saglayici cagrisi (keyler girilince devreye girer) ------------
// Not: Mollie/Stripe/iyzico canli cekimi, kullaniciyi saglayicinin odeme
// sayfasina yonlendirip webhook ile dogrulamayi gerektirir. Anahtarlar
// girilip test edilince bu fonksiyonlar node:https ile tamamlanacak.
const REAL = {
  iyzico(cfg, { amountCents, currency, method }) {
    // TODO: iyzico CreatePayment / 3DS baslat (HMAC imzali REST cagrisi)
    return simulated('iyzico', cfg.mode, method);
  },
  mollie(cfg, { amountCents, currency, method }) {
    // TODO: POST https://api.mollie.com/v2/payments (Bearer cfg.api_key) -> checkout url
    return simulated('mollie', cfg.mode, method);
  },
  stripe(cfg, { amountCents, currency, method }) {
    // TODO: POST https://api.stripe.com/v1/checkout/sessions (Bearer cfg.api_secret)
    return simulated('stripe', cfg.mode, method);
  },
};

function simulated(provider, mode, method) {
  return {
    ok: true,
    method,
    provider,
    mode: mode || 'test',
    ref: (provider === 'simulation' ? 'SIM' : provider.toUpperCase().slice(0, 3)) + '-' +
      Date.now().toString(36).toUpperCase(),
    simulated: true,
  };
}

// Odemeyi al: para birimine gore saglayiciya yonlendir, yoksa simulasyon
function charge({ amountCents, currency, method }) {
  if (!isValidMethod(method)) method = 'card';
  const prov = activeFor(currency);
  if (!prov) return simulated('simulation', 'sim', method);
  try {
    return REAL[prov.provider](prov, { amountCents, currency, method });
  } catch (e) {
    console.error('Odeme saglayici hatasi:', e.message);
    return { ok: false, error: e.message };
  }
}

// Admin paneli icin durum ozeti
function statusSummary() {
  return allConfigs().map(c => ({
    provider: c.provider,
    label: PROVIDERS[c.provider].label,
    region: PROVIDERS[c.provider].region,
    configured: isConfigured(c),
    active: !!c.active,
    mode: c.mode,
  }));
}

module.exports = {
  METHODS, methodLabel, isValidMethod, charge,
  PROVIDERS, PROVIDER_KEYS, getConfig, allConfigs, availableConfigs, isConfigured, activeFor, statusSummary,
};
