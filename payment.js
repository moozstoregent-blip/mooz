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
const https = require('node:https');

// --- Basit HTTPS yardimcisi (Promise, sifir bagimlilik) ------------------
function httpsRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const opts = {
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: Object.assign({}, headers),
    };
    if (data != null) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        let json = null;
        try { json = buf ? JSON.parse(buf) : null; } catch (_) { /* json degil */ }
        resolve({ status: res.statusCode, body: json, raw: buf });
      });
    });
    req.on('error', reject);
    if (data != null) req.write(data);
    req.end();
  });
}

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

// --- Gercek saglayici cagrilari (node:https) ------------------------------
// Her saglayici icin: createPayment -> {ok, checkoutUrl, providerRef}
//                     fetchStatus  -> 'paid' | 'open' | 'failed' | ...
const REAL = {
  // ----- Mollie (https://docs.mollie.com) -----
  async mollie_create(cfg, p) {
    const res = await httpsRequest('POST', 'https://api.mollie.com/v2/payments',
      { Authorization: 'Bearer ' + cfg.api_key, 'Content-Type': 'application/json' },
      {
        amount: { currency: p.currency, value: (p.amountCents / 100).toFixed(2) },
        description: p.description,
        redirectUrl: p.returnUrl,
        webhookUrl: p.webhookUrl,
        metadata: { order_id: String(p.orderId) },
      });
    const href = res.body && res.body._links && res.body._links.checkout && res.body._links.checkout.href;
    if (res.status >= 200 && res.status < 300 && href) {
      return { ok: true, checkoutUrl: href, providerRef: res.body.id };
    }
    return { ok: false, error: (res.body && res.body.detail) || ('Mollie HTTP ' + res.status) };
  },
  async mollie_status(cfg, ref) {
    const res = await httpsRequest('GET', 'https://api.mollie.com/v2/payments/' + encodeURIComponent(ref),
      { Authorization: 'Bearer ' + cfg.api_key });
    return (res.body && res.body.status) || 'unknown'; // paid|open|pending|failed|canceled|expired
  },

  // ----- Stripe (https://stripe.com/docs) -----
  async stripe_create(cfg, p) {
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', p.returnUrl);
    form.set('cancel_url', p.returnUrl);
    form.set('client_reference_id', String(p.orderId));
    form.set('metadata[order_id]', String(p.orderId));
    ['card', 'bancontact', 'ideal'].forEach((m) => form.append('payment_method_types[]', m));
    form.set('line_items[0][price_data][currency]', p.currency.toLowerCase());
    form.set('line_items[0][price_data][product_data][name]', p.description);
    form.set('line_items[0][price_data][unit_amount]', String(p.amountCents));
    form.set('line_items[0][quantity]', '1');
    const res = await httpsRequest('POST', 'https://api.stripe.com/v1/checkout/sessions',
      { Authorization: 'Bearer ' + cfg.api_secret, 'Content-Type': 'application/x-www-form-urlencoded' },
      form.toString());
    if (res.status >= 200 && res.status < 300 && res.body && res.body.url) {
      return { ok: true, checkoutUrl: res.body.url, providerRef: res.body.id };
    }
    return { ok: false, error: (res.body && res.body.error && res.body.error.message) || ('Stripe HTTP ' + res.status) };
  },
  async stripe_status(cfg, ref) {
    const res = await httpsRequest('GET', 'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(ref),
      { Authorization: 'Bearer ' + cfg.api_secret });
    if (!res.body) return 'unknown';
    if (res.body.payment_status === 'paid') return 'paid';
    if (res.body.status === 'expired') return 'expired';
    return 'open';
  },
};

// Durum normalizasyonu: saglayici durumu -> paid | pending | failed
function normalizeStatus(s) {
  if (s === 'paid') return 'paid';
  if (['failed', 'canceled', 'cancelled', 'expired'].includes(s)) return 'failed';
  return 'pending'; // open, pending, unknown, authorized...
}

// Odeme oturumu baslat (aktif saglayiciya gore). Saglayici yoksa simulasyon.
// p: { orderId, amountCents, currency, description, returnUrl, webhookUrl }
async function createPayment(p) {
  const prov = activeFor(p.currency);
  if (!prov) return { ok: true, simulated: true, provider: 'simulation' };
  try {
    const r = await REAL[prov.provider + '_create'](prov, p);
    return Object.assign({ provider: prov.provider, simulated: false }, r);
  } catch (e) {
    console.error('Odeme olusturma hatasi:', e.message);
    return { ok: false, error: e.message, provider: prov.provider };
  }
}

// Bir odemenin guncel durumunu saglayicidan sorgula -> 'paid'|'pending'|'failed'
async function checkStatus(providerName, providerRef) {
  const cfg = getConfig(providerName);
  if (!cfg || !REAL[providerName + '_status']) return 'pending';
  try {
    const s = await REAL[providerName + '_status'](cfg, providerRef);
    return normalizeStatus(s);
  } catch (e) {
    console.error('Odeme durum hatasi:', e.message);
    return 'pending';
  }
}

// Simulasyon referansi (aktif saglayici yokken)
function simRef() { return 'SIM-' + Date.now().toString(36).toUpperCase(); }

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
  METHODS, methodLabel, isValidMethod,
  createPayment, checkStatus, normalizeStatus, simRef,
  PROVIDERS, PROVIDER_KEYS, getConfig, allConfigs, availableConfigs, isConfigured, activeFor, statusSummary,
};
