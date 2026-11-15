// =========================================================================
//  MOOZ - Merkezi ayarlar
//  Marka adini, rengini, komisyonu burdan degistir. Tek yerden tum siteye
//  yansir. Ileride "Mooz" yerine baska bir isim istersen sadece burayi
//  degistirmen yeterli.
// =========================================================================

module.exports = {
  brand: {
    name: 'Mooz',
    tagline: 'Her satici kendi dukkanini acar, sen istedigini satarsin.',
    emoji: '\u{1F6CD}️',        // alisveris cantasi
    color: '#ff5a1f',               // ana marka rengi
    colorDark: '#e04a12',
  },

  // Sunucu
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'mooz-dev-secret-degistir',

  // Global ayarlar
  //  NOT: Turkiye simdilik askida. Dil secenekleri NL/FR/EN; para birimi EUR.
  //  (Ileride TR acilirsa 'tr' ve 'TRY' buraya eklenir, iyzico otomatik gorunur.)
  defaultCurrency: 'EUR',
  currencies: ['EUR'],
  defaultLang: 'nl',                // tarayici dili eslesmezse varsayilan
  languages: ['nl', 'fr', 'en'],
  // Yaklasik kur (gercekte canli kur servisinden alinacak). EUR baz.
  rates: { EUR: 1, TRY: 35 },

  // Pazaryeri
  commissionRate: 0.10,   // platform komisyonu (%10) - ileride kategori/satici bazli olacak

  // BTW / KDV (Belcika standart oran %21). Fiyatlar KDV DAHIL gosterilir.
  btwRate: 0.21,

  // =======================================================================
  //  Sirket / yasal kimlik bilgileri (web sitesinde gosterim yasal zorunluluk)
  //  >>> LUTFEN KONTROL ET: e-posta ve BTW numarasini dogrula. <<<
  // =======================================================================
  company: {
    legalName: 'MOOZ STORE BV',
    address: 'Voormuide 60',
    postalCity: '9000 Gent',
    country: 'België',
    kbo: '0759976093',               // Ondernemingsnummer (KBO)
    vat: 'BE 0759.976.093',          // BTW-nummer (KONTROL ET)
    email: 'support@mooz.store',     // iletisim e-postasi (DEGISTIR/KONTROL ET)
  },
};
