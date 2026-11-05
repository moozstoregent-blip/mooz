// =========================================================================
//  Odeme katmani (seam) - su an SIMULASYON.
//  Gercek entegrasyon buraya baglanacak:
//   - Mollie  : Bancontact (BE), iDEAL (NL) + AB karti  -> mollie.payments.create(...)
//   - Stripe  : global kart / Stripe Connect split payout
//   - iyzico  : Turkiye karti / pazaryeri (alt uye isyeri)
//  Gercekte: charge() saglayici API'sini cagirir, kullaniciyi odeme
//  sayfasina yonlendirir ve webhook ile sonucu dogrular. Simdilik basarili
//  donuyoruz ki akis uctan uca calissin.
// =========================================================================

const METHODS = {
  bancontact: 'Bancontact',
  ideal: 'iDEAL',
  card: 'Kredi / Banka Karti',
  transfer: 'Havale / EFT',
};

function methodLabel(m) { return METHODS[m] || m; }

function isValidMethod(m) { return Object.prototype.hasOwnProperty.call(METHODS, m); }

// Odemeyi "al". Gercekte burada saglayici API cagrilacak.
function charge({ amountCents, currency, method }) {
  if (!isValidMethod(method)) method = 'card';
  // TODO: gercek saglayici cagrisi + webhook dogrulamasi (Mollie/Stripe/iyzico)
  return {
    ok: true,
    method,
    ref: 'SIM-' + Date.now().toString(36).toUpperCase(),
    simulated: true,
  };
}

module.exports = { METHODS, methodLabel, isValidMethod, charge };
