// =========================================================================
//  Cok dil - UI metinleri. t(lang, key) -> cevrilmis metin.
//  Dil yoksa TR'ye, anahtar yoksa anahtarin kendisine duser.
// =========================================================================

const LANGS = { tr: 'Turkce', nl: 'Nederlands', fr: 'Francais', en: 'English' };

const D = {
  // --- Navigasyon ---
  search_ph: { tr: 'Urun veya satici ara...', nl: 'Zoek product of verkoper...', fr: 'Rechercher un produit ou vendeur...', en: 'Search products or sellers...' },
  search: { tr: 'Ara', nl: 'Zoek', fr: 'Rechercher', en: 'Search' },
  login: { tr: 'Giris', nl: 'Inloggen', fr: 'Connexion', en: 'Log in' },
  register: { tr: 'Kayit ol', nl: 'Registreren', fr: "S'inscrire", en: 'Sign up' },
  orders: { tr: 'Siparislerim', nl: 'Mijn bestellingen', fr: 'Mes commandes', en: 'My orders' },
  cart: { tr: 'Sepet', nl: 'Winkelmand', fr: 'Panier', en: 'Cart' },
  logout: { tr: 'Cikis', nl: 'Uitloggen', fr: 'Deconnexion', en: 'Log out' },
  seller_panel: { tr: 'Satici Paneli', nl: 'Verkooppaneel', fr: 'Espace vendeur', en: 'Seller panel' },
  admin: { tr: 'Admin', nl: 'Admin', fr: 'Admin', en: 'Admin' },
  all: { tr: 'Tumu', nl: 'Alles', fr: 'Tout', en: 'All' },

  // --- Ana sayfa ---
  tagline: { tr: 'Her satici kendi dukkanini acar, sen istedigini satarsin.', nl: 'Elke verkoper een eigen winkel, jij verkoopt wat je wilt.', fr: 'Chaque vendeur sa boutique, vous vendez ce que vous voulez.', en: 'Every seller their own shop, you sell what you want.' },
  hero1: { tr: 'Her satici kendi dukkanini acar.', nl: 'Elke verkoper opent zijn eigen winkel.', fr: 'Chaque vendeur ouvre sa propre boutique.', en: 'Every seller opens their own shop.' },
  hero2: { tr: 'Sen istedigini satarsin.', nl: 'Jij verkoopt wat je wilt.', fr: 'Vous vendez ce que vous voulez.', en: 'You sell what you want.' },
  hero_cta: { tr: 'Hemen dukkanini ac', nl: 'Open nu je winkel', fr: 'Ouvrez votre boutique', en: 'Open your shop now' },
  active_products: { tr: 'aktif urun', nl: 'actieve producten', fr: 'produits actifs', en: 'active products' },
  all_products: { tr: 'Tum Urunler', nl: 'Alle producten', fr: 'Tous les produits', en: 'All products' },
  results: { tr: 'sonuclari', nl: 'resultaten', fr: 'resultats', en: 'results' },
  n_products: { tr: 'urun', nl: 'producten', fr: 'produits', en: 'products' },
  empty_products: { tr: 'Urun bulunamadi.', nl: 'Geen producten gevonden.', fr: 'Aucun produit trouve.', en: 'No products found.' },
  add_to_cart: { tr: 'Sepete Ekle', nl: 'Toevoegen', fr: 'Ajouter', en: 'Add to cart' },
  soldout: { tr: 'Tukendi', nl: 'Uitverkocht', fr: 'Epuise', en: 'Sold out' },

  // --- Urun / magaza ---
  back_store: { tr: 'Vitrine don', nl: 'Terug naar winkel', fr: 'Retour a la boutique', en: 'Back to shop' },
  stock: { tr: 'Stok', nl: 'Voorraad', fr: 'Stock', en: 'Stock' },
  no_desc: { tr: 'Aciklama yok.', nl: 'Geen beschrijving.', fr: 'Pas de description.', en: 'No description.' },
  own_store: { tr: 'Bu magazanin kendi vitrini', nl: 'Eigen etalage van deze winkel', fr: 'Vitrine propre de cette boutique', en: "This shop's own storefront" },
  products: { tr: 'Urunler', nl: 'Producten', fr: 'Produits', en: 'Products' },
  empty_store: { tr: 'Bu magazada henuz urun yok.', nl: 'Deze winkel heeft nog geen producten.', fr: "Cette boutique n'a pas encore de produits.", en: 'This shop has no products yet.' },

  // --- Sepet ---
  cart_title: { tr: 'Sepetim', nl: 'Mijn winkelmand', fr: 'Mon panier', en: 'My cart' },
  cart_empty: { tr: 'Sepetin bos.', nl: 'Je winkelmand is leeg.', fr: 'Votre panier est vide.', en: 'Your cart is empty.' },
  start_shopping: { tr: 'Alisverise basla', nl: 'Begin met winkelen', fr: 'Commencer les achats', en: 'Start shopping' },
  update: { tr: 'Guncelle', nl: 'Bijwerken', fr: 'Mettre a jour', en: 'Update' },
  remove: { tr: 'Kaldir', nl: 'Verwijderen', fr: 'Retirer', en: 'Remove' },
  total: { tr: 'Toplam', nl: 'Totaal', fr: 'Total', en: 'Total' },
  to_checkout: { tr: 'Odemeye Gec', nl: 'Afrekenen', fr: 'Payer', en: 'Checkout' },
  per_unit: { tr: 'adet', nl: 'stuk', fr: 'unite', en: 'unit' },

  // --- Odeme ---
  checkout_title: { tr: 'Odeme', nl: 'Afrekenen', fr: 'Paiement', en: 'Checkout' },
  back_cart: { tr: 'Sepete don', nl: 'Terug naar winkelmand', fr: 'Retour au panier', en: 'Back to cart' },
  delivery: { tr: 'Teslimat bilgileri', nl: 'Bezorggegevens', fr: 'Livraison', en: 'Delivery details' },
  f_name: { tr: 'Ad Soyad', nl: 'Naam', fr: 'Nom', en: 'Full name' },
  f_address: { tr: 'Adres', nl: 'Adres', fr: 'Adresse', en: 'Address' },
  f_zip: { tr: 'Posta kodu', nl: 'Postcode', fr: 'Code postal', en: 'Postal code' },
  f_city: { tr: 'Sehir', nl: 'Stad', fr: 'Ville', en: 'City' },
  f_country: { tr: 'Ulke', nl: 'Land', fr: 'Pays', en: 'Country' },
  pay_method: { tr: 'Odeme yontemi', nl: 'Betaalmethode', fr: 'Mode de paiement', en: 'Payment method' },
  confirm_order: { tr: 'Siparisi Onayla', nl: 'Bestelling bevestigen', fr: 'Confirmer la commande', en: 'Place order' },
  summary: { tr: 'Siparis ozeti', nl: 'Besteloverzicht', fr: 'Recapitulatif', en: 'Order summary' },
  sim_note: { tr: 'Not: Odeme simulasyondur; gercek para cekilmez.', nl: 'Let op: betaling is een simulatie; er wordt geen geld afgeschreven.', fr: 'Note : le paiement est une simulation ; aucun argent prelevе.', en: 'Note: payment is a simulation; no real money is charged.' },

  // --- Siparisler ---
  order: { tr: 'Siparis', nl: 'Bestelling', fr: 'Commande', en: 'Order' },
  orders_empty: { tr: 'Henuz siparisin yok.', nl: 'Je hebt nog geen bestellingen.', fr: "Vous n'avez pas encore de commandes.", en: 'You have no orders yet.' },
  date: { tr: 'Tarih', nl: 'Datum', fr: 'Date', en: 'Date' },
  amount: { tr: 'Tutar', nl: 'Bedrag', fr: 'Montant', en: 'Amount' },
  status: { tr: 'Durum', nl: 'Status', fr: 'Statut', en: 'Status' },
  detail: { tr: 'Detay', nl: 'Details', fr: 'Details', en: 'Details' },
  paid: { tr: 'Odendi', nl: 'Betaald', fr: 'Paye', en: 'Paid' },
  cargo: { tr: 'Kargo', nl: 'Verzending', fr: 'Livraison', en: 'Shipping' },
  subtotal: { tr: 'Ara toplam', nl: 'Subtotaal', fr: 'Sous-total', en: 'Subtotal' },
  grand_total: { tr: 'Genel toplam', nl: 'Totaal', fr: 'Total general', en: 'Grand total' },
  split_note: { tr: 'Her satici kendi parcasini ayri hazirlar/kargolar.', nl: 'Elke verkoper verwerkt/verzendt zijn deel apart.', fr: 'Chaque vendeur prepare/expedie sa part separement.', en: 'Each seller prepares/ships their part separately.' },

  // --- Durum etiketleri ---
  st_hazirlaniyor: { tr: 'Hazirlaniyor', nl: 'In voorbereiding', fr: 'En preparation', en: 'Preparing' },
  st_kargoda: { tr: 'Kargoda', nl: 'Verzonden', fr: 'Expedie', en: 'Shipped' },
  st_teslim: { tr: 'Teslim edildi', nl: 'Geleverd', fr: 'Livre', en: 'Delivered' },

  // --- Giris / kayit ---
  email: { tr: 'E-posta', nl: 'E-mail', fr: 'E-mail', en: 'Email' },
  password: { tr: 'Sifre', nl: 'Wachtwoord', fr: 'Mot de passe', en: 'Password' },
  no_account: { tr: 'Hesabin yok mu?', nl: 'Nog geen account?', fr: 'Pas de compte ?', en: 'No account?' },
  have_account: { tr: 'Zaten hesabin var mi?', nl: 'Heb je al een account?', fr: 'Deja un compte ?', en: 'Already have an account?' },
  account_type: { tr: 'Hesap turu', nl: 'Accounttype', fr: 'Type de compte', en: 'Account type' },
  buyer_opt: { tr: 'Alici (alisveris yapacagim)', nl: 'Koper (ik wil winkelen)', fr: 'Acheteur (je veux acheter)', en: 'Buyer (I want to shop)' },
  seller_opt: { tr: 'Satici (dukkan acacagim)', nl: 'Verkoper (ik wil verkopen)', fr: 'Vendeur (je veux vendre)', en: 'Seller (I want to sell)' },
  name_store: { tr: 'Ad / Magaza adi', nl: 'Naam / Winkelnaam', fr: 'Nom / Nom de boutique', en: 'Name / Shop name' },
  demo_logins: { tr: 'Demo girisleri:', nl: 'Demo-logins:', fr: 'Connexions demo :', en: 'Demo logins:' },

  // --- Footer / 404 ---
  mvp_note: { tr: 'Cekirdek surum (MVP) - sepet ve siparis calisiyor - odeme simulasyon.', nl: 'Kernversie (MVP) - winkelmand en bestellingen werken - betaling is simulatie.', fr: 'Version de base (MVP) - panier et commandes fonctionnent - paiement simule.', en: 'Core version (MVP) - cart and orders work - payment is simulated.' },
  nf_text: { tr: 'Aradigin sayfa bulunamadi.', nl: 'De pagina is niet gevonden.', fr: 'Page introuvable.', en: 'Page not found.' },
  home_btn: { tr: 'Ana sayfaya don', nl: 'Terug naar start', fr: "Retour a l'accueil", en: 'Back to home' },
};

function t(lang, key) {
  const e = D[key];
  if (!e) return key;
  return e[lang] || e.tr || key;
}

module.exports = { LANGS, t };
