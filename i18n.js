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

  // --- Filtreler / siralama ---
  f_sort: { tr: 'Sirala', nl: 'Sorteren', fr: 'Trier', en: 'Sort' },
  f_sort_new: { tr: 'En yeni', nl: 'Nieuwste', fr: 'Plus recent', en: 'Newest' },
  f_sort_price_asc: { tr: 'Fiyat (artan)', nl: 'Prijs (oplopend)', fr: 'Prix (croissant)', en: 'Price (low-high)' },
  f_sort_price_desc: { tr: 'Fiyat (azalan)', nl: 'Prijs (aflopend)', fr: 'Prix (decroissant)', en: 'Price (high-low)' },
  f_sort_rating: { tr: 'Puan (yuksek)', nl: 'Beoordeling (hoog)', fr: 'Note (elevee)', en: 'Rating (high)' },
  f_sort_name: { tr: 'Isme gore (A-Z)', nl: 'Naam (A-Z)', fr: 'Nom (A-Z)', en: 'Name (A-Z)' },
  f_price: { tr: 'Fiyat', nl: 'Prijs', fr: 'Prix', en: 'Price' },
  f_instock: { tr: 'Sadece stokta', nl: 'Alleen op voorraad', fr: 'En stock seulement', en: 'In stock only' },
  f_apply: { tr: 'Uygula', nl: 'Toepassen', fr: 'Appliquer', en: 'Apply' },
  f_clear: { tr: 'Temizle', nl: 'Wissen', fr: 'Effacer', en: 'Clear' },
  f_no_results: { tr: 'Bu filtrelere uygun urun bulunamadi.', nl: 'Geen producten voor deze filters.', fr: 'Aucun produit pour ces filtres.', en: 'No products match these filters.' },
  f_clear_filters: { tr: 'Filtreleri temizle', nl: 'Filters wissen', fr: 'Effacer les filtres', en: 'Clear filters' },

  // --- Favoriler ---
  fav_mine: { tr: 'Favorilerim', nl: 'Mijn favorieten', fr: 'Mes favoris', en: 'My favorites' },
  fav_empty: { tr: 'Henuz favori urunun yok. Begendigin urunlerdeki kalbe basarak ekleyebilirsin.', nl: 'Je hebt nog geen favorieten. Tik op het hartje bij producten die je leuk vindt.', fr: "Vous n'avez pas encore de favoris. Touchez le cœur sur les produits que vous aimez.", en: 'You have no favorites yet. Tap the heart on products you like.' },
  fav_browse: { tr: 'Urunlere goz at', nl: 'Bekijk producten', fr: 'Voir les produits', en: 'Browse products' },
  fav_add: { tr: 'Favorilere ekle', nl: 'Aan favorieten toevoegen', fr: 'Ajouter aux favoris', en: 'Add to favorites' },
  fav_remove: { tr: 'Favorilerden cikar', nl: 'Uit favorieten verwijderen', fr: 'Retirer des favoris', en: 'Remove from favorites' },

  // --- Yorumlar / puan ---
  rv_title: { tr: 'Degerlendirmeler', nl: 'Beoordelingen', fr: 'Avis', en: 'Reviews' },
  rv_none_short: { tr: 'Henuz yorum yok', nl: 'Nog geen beoordelingen', fr: "Pas encore d'avis", en: 'No reviews yet' },
  rv_none: { tr: 'Henuz yorum yok. Ilk yorumu sen yap!', nl: 'Nog geen beoordelingen. Wees de eerste!', fr: "Pas encore d'avis. Soyez le premier !", en: 'No reviews yet. Be the first!' },
  rv_login_pre: { tr: 'Yorum yapmak icin', nl: 'Om een beoordeling te plaatsen,', fr: 'Pour laisser un avis,', en: 'To leave a review,' },
  rv_login_link: { tr: 'giris yap', nl: 'log in', fr: 'connectez-vous', en: 'log in' },
  rv_ph: { tr: 'Urun hakkinda ne dusunuyorsun? (istege bagli)', nl: 'Wat vind je van dit product? (optioneel)', fr: 'Que pensez-vous du produit ? (facultatif)', en: 'What do you think about it? (optional)' },
  rv_update: { tr: 'Yorumu guncelle', nl: 'Beoordeling bijwerken', fr: "Mettre a jour l'avis", en: 'Update review' },
  rv_send: { tr: 'Yorum gonder', nl: 'Beoordeling plaatsen', fr: "Envoyer l'avis", en: 'Submit review' },

  // --- Kupon ---
  cp_subtotal: { tr: 'Ara toplam', nl: 'Subtotaal', fr: 'Sous-total', en: 'Subtotal' },
  cp_discount: { tr: 'Indirim', nl: 'Korting', fr: 'Reduction', en: 'Discount' },
  cp_ph: { tr: 'Indirim kodu', nl: 'Kortingscode', fr: 'Code promo', en: 'Discount code' },
  cp_apply: { tr: 'Uygula', nl: 'Toepassen', fr: 'Appliquer', en: 'Apply' },
  cp_remove: { tr: 'Kaldir', nl: 'Verwijderen', fr: 'Retirer', en: 'Remove' },
  cp_off: { tr: 'indirim', nl: 'korting', fr: 'de reduction', en: 'off' },

  // --- Satici paneli ---
  sp_hello: { tr: 'Merhaba', nl: 'Hallo', fr: 'Bonjour', en: 'Hello' },
  sp_manage: { tr: 'magazani buradan yonet.', nl: 'beheer hier je winkel.', fr: 'gerez votre boutique ici.', en: 'manage your shop here.' },
  sp_new_product: { tr: 'Yeni Urun', nl: 'Nieuw product', fr: 'Nouveau produit', en: 'New product' },
  sp_no_store: { tr: 'Magaza kaydin bulunamadi.', nl: 'Geen winkel gevonden.', fr: 'Aucune boutique trouvee.', en: 'No shop found.' },
  sp_pending: { tr: 'Magazan <strong>admin onayi</strong> bekliyor. Onaylanana kadar urunlerin vitrinde gorunmez, ama simdiden ekleyebilirsin.', nl: 'Je winkel wacht op <strong>goedkeuring</strong>. Tot die tijd zijn je producten niet zichtbaar, maar je kunt ze al toevoegen.', fr: 'Votre boutique attend <strong>approbation</strong>. Vos produits ne sont pas visibles jusque-la, mais vous pouvez deja les ajouter.', en: 'Your shop awaits <strong>approval</strong>. Your products are hidden until then, but you can already add them.' },
  sp_suspended: { tr: 'Magazan askiya alinmis.', nl: 'Je winkel is opgeschort.', fr: 'Votre boutique est suspendue.', en: 'Your shop is suspended.' },
  sp_active: { tr: 'Magazan <strong>aktif</strong>. Vitrinin:', nl: 'Je winkel is <strong>actief</strong>. Etalage:', fr: 'Votre boutique est <strong>active</strong>. Vitrine :', en: 'Your shop is <strong>active</strong>. Storefront:' },
  sp_new_orders: { tr: 'yeni siparisin var!', nl: 'nieuwe bestelling(en)!', fr: 'nouvelle(s) commande(s) !', en: 'new order(s)!' },
  sp_see_orders: { tr: 'Siparisleri gor', nl: 'Bekijk bestellingen', fr: 'Voir les commandes', en: 'View orders' },
  sp_stat_products: { tr: 'Urunum', nl: 'Producten', fr: 'Produits', en: 'Products' },
  sp_stat_neworder: { tr: 'Yeni siparis', nl: 'Nieuwe bestelling', fr: 'Nouvelle commande', en: 'New orders' },
  sp_stat_address: { tr: 'Magaza adresi', nl: 'Winkeladres', fr: 'Adresse boutique', en: 'Shop address' },
  sp_manage_products: { tr: 'Urunlerimi yonet', nl: 'Producten beheren', fr: 'Gerer mes produits', en: 'Manage products' },
  sp_incoming: { tr: 'Gelen Siparisler', nl: 'Binnenkomende bestellingen', fr: 'Commandes reçues', en: 'Incoming orders' },
  sp_view_store: { tr: 'Vitrinimi gor', nl: 'Bekijk etalage', fr: 'Voir ma vitrine', en: 'View storefront' },
  sp_my_site: { tr: 'Magaza Sitem', nl: 'Mijn winkelsite', fr: 'Mon site boutique', en: 'My shop site' },
  sp_my_site_desc: { tr: 'Kendi markali vitrinin. Hem market icinde hem de kendi alt alan adinda yayinlanir.', nl: 'Je eigen etalage. Verschijnt zowel in de markt als op je eigen subdomein.', fr: 'Votre vitrine de marque. Publiee dans le marche et sur votre sous-domaine.', en: 'Your branded storefront. Published both in the market and on your own subdomain.' },
  sp_subdomain: { tr: 'Alt alan adi (canli):', nl: 'Subdomein (live):', fr: 'Sous-domaine (live) :', en: 'Subdomain (live):' },
  sp_when_live: { tr: 'site yayina alininca', nl: 'zodra de site live is', fr: 'une fois le site en ligne', en: 'once the site is live' },
  sp_test_now: { tr: 'Simdi test et:', nl: 'Test nu:', fr: 'Tester maintenant :', en: 'Test now:' },
  sp_market_store: { tr: 'Market vitrini:', nl: 'Marktetalage:', fr: 'Vitrine marche :', en: 'Market storefront:' },
  sp_store_desc_label: { tr: 'Magaza aciklamasi (vitrininde gorunur)', nl: 'Winkelbeschrijving (zichtbaar in je etalage)', fr: 'Description boutique (visible en vitrine)', en: 'Shop description (shown in storefront)' },
  sp_store_desc_ph: { tr: 'Orn: Kaliteli mobilya, hizli teslimat', nl: 'Bijv: Kwaliteitsmeubels, snelle levering', fr: 'Ex : Meubles de qualite, livraison rapide', en: 'E.g. Quality furniture, fast delivery' },
  save: { tr: 'Kaydet', nl: 'Opslaan', fr: 'Enregistrer', en: 'Save' },

  // --- Gelen siparisler (satici) ---
  so_title: { tr: 'Gelen Siparisler', nl: 'Binnenkomende bestellingen', fr: 'Commandes reçues', en: 'Incoming orders' },
  so_none_head: { tr: 'Henuz siparis yok.', nl: 'Nog geen bestellingen.', fr: 'Pas encore de commandes.', en: 'No orders yet.' },
  so_none_body: { tr: 'Magazana siparis geldiginde burada gorunecek.', nl: 'Bestellingen voor je winkel verschijnen hier.', fr: 'Les commandes de votre boutique apparaitront ici.', en: 'Orders for your shop will appear here.' },
  so_count: { tr: 'siparis', nl: 'bestellingen', fr: 'commandes', en: 'orders' },
  so_new: { tr: 'yeni', nl: 'nieuw', fr: 'nouveau', en: 'new' },
  so_badge_new: { tr: 'YENI', nl: 'NIEUW', fr: 'NOUVEAU', en: 'NEW' },
  so_delivery: { tr: 'Teslimat', nl: 'Bezorging', fr: 'Livraison', en: 'Delivery' },
  so_commission: { tr: 'Komisyon', nl: 'Commissie', fr: 'Commission', en: 'Commission' },
  so_earning: { tr: 'Senin kazancin', nl: 'Jouw opbrengst', fr: 'Votre gain', en: 'Your earnings' },
  so_status_label: { tr: 'Durum:', nl: 'Status:', fr: 'Statut :', en: 'Status:' },
  so_preparing: { tr: 'Hazirlaniyor', nl: 'In voorbereiding', fr: 'En preparation', en: 'Preparing' },
  so_delivered: { tr: 'Teslim edildi', nl: 'Geleverd', fr: 'Livre', en: 'Delivered' },
  so_carrier_ph: { tr: 'Kargo firmasi...', nl: 'Vervoerder...', fr: 'Transporteur...', en: 'Carrier...' },
  so_tracking_ph: { tr: 'Takip no', nl: 'Trackingnr', fr: 'N de suivi', en: 'Tracking no' },
  so_ship_now: { tr: 'Kargoya ver', nl: 'Verzenden', fr: 'Expedier', en: 'Ship' },
};

function t(lang, key) {
  const e = D[key];
  if (!e) return key;
  return e[lang] || e.tr || key;
}

module.exports = { LANGS, t };
