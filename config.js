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
  defaultCurrency: 'EUR',
  currencies: ['EUR', 'TRY'],
  defaultLang: 'tr',
  languages: ['tr', 'nl', 'fr', 'en'],
  // Yaklasik kur (gercekte canli kur servisinden alinacak). EUR baz.
  rates: { EUR: 1, TRY: 35 },

  // Pazaryeri
  commissionRate: 0.10,   // platform komisyonu (%10) - ileride kategori/satici bazli olacak
};
