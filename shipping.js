// =========================================================================
//  Kargo katmani (seam) - su an elle takip no girisi.
//  Gercek entegrasyon buraya baglanacak:
//   - AB: bpost (BE), PostNL (NL), DPD, DHL  -> etiket olusturma + takip API
//   - TR: Aras, Yurtici, MNG                 -> entegrator (Geliver/Navlungo)
//  Gercekte: createLabel() firma API'sini cagirir, takip no'yu otomatik alir.
//  Simdilik satici takip no'yu elle girer.
// =========================================================================

const CARRIERS = {
  bpost: { label: 'bpost', region: 'AB' },
  postnl: { label: 'PostNL', region: 'AB' },
  dpd: { label: 'DPD', region: 'AB' },
  dhl: { label: 'DHL', region: 'AB' },
  aras: { label: 'Aras Kargo', region: 'TR' },
  yurtici: { label: 'Yurtici Kargo', region: 'TR' },
  mng: { label: 'MNG Kargo', region: 'TR' },
};

function carrierLabel(c) { return (CARRIERS[c] || {}).label || c || '-'; }
function isValidCarrier(c) { return Object.prototype.hasOwnProperty.call(CARRIERS, c); }

module.exports = { CARRIERS, carrierLabel, isValidCarrier };
