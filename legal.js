// =========================================================================
//  legal.js — Hukuki sayfa icerikleri (NL / FR / EN)
//  NOT: Bu metinler iyi bir BASLANGIC SABLONUDUR. Canli satisa gecmeden once
//  bir hukukcuya/muhasebeciye kontrol ettirmen onerilir. Sirket bilgileri
//  config.js > company alanindan gelir (tek yerden guncelle).
// =========================================================================
'use strict';
const config = require('./config');
const c = config.company;
const brand = config.brand.name;
const UPDATED = '2026-11-15';
const btwPct = Math.round((config.btwRate || 0) * 100);

const addr = `${c.legalName}, ${c.address}, ${c.postalCity}, ${c.country}`;

// --- ALGEMENE VOORWAARDEN / CONDITIONS / TERMS ---------------------------
const terms = {
  nl: { title: 'Algemene voorwaarden', html: `
    <p><strong>${brand}</strong> is een onlinemarktplaats uitgebaat door ${c.legalName}, gevestigd te ${c.address}, ${c.postalCity}, ${c.country}. Ondernemingsnummer: ${c.kbo}. BTW: ${c.vat}. E-mail: <a href="mailto:${c.email}">${c.email}</a>.</p>
    <h2>1. Toepassing</h2>
    <p>Deze voorwaarden gelden voor elk gebruik van ${brand} en voor elke bestelling die via het platform wordt geplaatst. Door een account aan te maken of een bestelling te plaatsen, aanvaard je deze voorwaarden.</p>
    <h2>2. Rol van ${brand}</h2>
    <p>${brand} is een bemiddelaar: het biedt verkopers een platform om producten aan te bieden en brengt kopers en verkopers samen. De koopovereenkomst komt tot stand tussen de koper en de betrokken verkoper. ${brand} is geen partij bij die overeenkomst, tenzij uitdrukkelijk anders vermeld.</p>
    <h2>3. Account</h2>
    <p>Je bent verantwoordelijk voor de juistheid van je gegevens en voor het geheimhouden van je wachtwoord. Je mag het platform niet gebruiken voor onwettige doeleinden.</p>
    <h2>4. Bestelling en overeenkomst</h2>
    <p>Een overeenkomst komt tot stand zodra je bestelling is bevestigd en de betaling is ontvangen. Je ontvangt een bevestiging per e-mail.</p>
    <h2>5. Prijzen en betaling</h2>
    <p>Alle prijzen zijn in euro en inclusief ${btwPct}% BTW, tenzij anders aangegeven. Betalingen verlopen via onze betaalpartners (o.a. Mollie en Stripe). ${brand} bewaart je kaartgegevens niet.</p>
    <h2>6. Levering</h2>
    <p>De levering gebeurt door of namens de verkoper. Leveringstermijnen zijn indicatief. Het risico gaat over bij de levering.</p>
    <h2>7. Herroepingsrecht</h2>
    <p>Als consument heb je het recht om de overeenkomst binnen 14 dagen na ontvangst zonder opgave van reden te herroepen. Bepaalde producten (bv. op maat gemaakt, verzegelde hygiëneproducten die geopend zijn) zijn hiervan uitgesloten. Neem voor een retour contact op met de verkoper of met ${brand} via ${c.email}.</p>
    <h2>8. Verplichtingen van de verkoper</h2>
    <p>De verkoper staat in voor de juistheid van de productinformatie, de wettelijke conformiteit van de producten, de levering en de wettelijke garantie. ${brand} kan verkopers die deze voorwaarden schenden schorsen of verwijderen.</p>
    <h2>9. Aansprakelijkheid</h2>
    <p>${brand} is niet aansprakelijk voor schade die voortvloeit uit de overeenkomst tussen koper en verkoper, behoudens in geval van opzet of grove fout van ${brand}. Niets in deze voorwaarden beperkt je dwingende wettelijke rechten als consument.</p>
    <h2>10. Klachten en geschillen</h2>
    <p>Klachten kunnen worden gericht aan ${c.email}. Je kunt ook terecht bij het Europees ODR-platform: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.</p>
    <h2>11. Toepasselijk recht</h2>
    <p>Op deze voorwaarden is het Belgische recht van toepassing. Geschillen behoren tot de bevoegdheid van de rechtbanken van het arrondissement waar ${c.legalName} gevestigd is, onverminderd dwingende consumentenbescherming.</p>` },
  fr: { title: 'Conditions générales', html: `
    <p><strong>${brand}</strong> est une place de marché en ligne exploitée par ${c.legalName}, sise ${c.address}, ${c.postalCity}, ${c.country}. Numéro d'entreprise : ${c.kbo}. TVA : ${c.vat}. E-mail : <a href="mailto:${c.email}">${c.email}</a>.</p>
    <h2>1. Application</h2>
    <p>Ces conditions s'appliquent à toute utilisation de ${brand} et à toute commande passée via la plateforme. En créant un compte ou en passant commande, vous les acceptez.</p>
    <h2>2. Rôle de ${brand}</h2>
    <p>${brand} agit comme intermédiaire : la plateforme permet aux vendeurs de proposer des produits et met en relation acheteurs et vendeurs. Le contrat de vente est conclu entre l'acheteur et le vendeur concerné. ${brand} n'est pas partie à ce contrat, sauf mention expresse.</p>
    <h2>3. Compte</h2>
    <p>Vous êtes responsable de l'exactitude de vos données et de la confidentialité de votre mot de passe. L'usage de la plateforme à des fins illicites est interdit.</p>
    <h2>4. Commande et contrat</h2>
    <p>Le contrat est conclu dès confirmation de votre commande et réception du paiement. Vous recevez une confirmation par e-mail.</p>
    <h2>5. Prix et paiement</h2>
    <p>Tous les prix sont en euros et incluent ${btwPct}% de TVA, sauf indication contraire. Les paiements sont traités par nos partenaires (notamment Mollie et Stripe). ${brand} ne conserve pas vos données de carte.</p>
    <h2>6. Livraison</h2>
    <p>La livraison est assurée par ou pour le compte du vendeur. Les délais sont indicatifs. Le risque est transféré à la livraison.</p>
    <h2>7. Droit de rétractation</h2>
    <p>En tant que consommateur, vous disposez d'un délai de 14 jours après réception pour vous rétracter sans motif. Certains produits (sur mesure, produits d'hygiène descellés) en sont exclus. Pour un retour, contactez le vendeur ou ${brand} via ${c.email}.</p>
    <h2>8. Obligations du vendeur</h2>
    <p>Le vendeur garantit l'exactitude des informations, la conformité légale des produits, la livraison et la garantie légale. ${brand} peut suspendre ou retirer les vendeurs qui enfreignent ces conditions.</p>
    <h2>9. Responsabilité</h2>
    <p>${brand} n'est pas responsable des dommages découlant du contrat entre acheteur et vendeur, sauf dol ou faute grave de ${brand}. Rien n'affecte vos droits impératifs de consommateur.</p>
    <h2>10. Réclamations et litiges</h2>
    <p>Les réclamations peuvent être adressées à ${c.email}. Vous pouvez aussi recourir à la plateforme européenne RLL : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.</p>
    <h2>11. Droit applicable</h2>
    <p>Ces conditions sont régies par le droit belge. Les litiges relèvent des tribunaux de l'arrondissement du siège de ${c.legalName}, sans préjudice de la protection impérative du consommateur.</p>` },
  en: { title: 'Terms & Conditions', html: `
    <p><strong>${brand}</strong> is an online marketplace operated by ${c.legalName}, located at ${c.address}, ${c.postalCity}, ${c.country}. Company number: ${c.kbo}. VAT: ${c.vat}. E-mail: <a href="mailto:${c.email}">${c.email}</a>.</p>
    <h2>1. Scope</h2>
    <p>These terms apply to all use of ${brand} and to every order placed through the platform. By creating an account or placing an order, you accept them.</p>
    <h2>2. Role of ${brand}</h2>
    <p>${brand} acts as an intermediary: it lets sellers offer products and connects buyers and sellers. The sales contract is concluded between the buyer and the relevant seller. ${brand} is not a party to that contract unless expressly stated.</p>
    <h2>3. Account</h2>
    <p>You are responsible for the accuracy of your details and for keeping your password confidential. The platform may not be used for unlawful purposes.</p>
    <h2>4. Order and contract</h2>
    <p>A contract is formed once your order is confirmed and payment received. You receive a confirmation by e-mail.</p>
    <h2>5. Prices and payment</h2>
    <p>All prices are in euro and include ${btwPct}% VAT unless stated otherwise. Payments are processed by our partners (including Mollie and Stripe). ${brand} does not store your card details.</p>
    <h2>6. Delivery</h2>
    <p>Delivery is carried out by or on behalf of the seller. Delivery times are indicative. Risk passes on delivery.</p>
    <h2>7. Right of withdrawal</h2>
    <p>As a consumer you may withdraw from the contract within 14 days of receipt without giving a reason. Certain products (custom-made, unsealed hygiene items) are excluded. For a return, contact the seller or ${brand} at ${c.email}.</p>
    <h2>8. Seller obligations</h2>
    <p>The seller is responsible for the accuracy of information, legal conformity of products, delivery and the legal warranty. ${brand} may suspend or remove sellers who breach these terms.</p>
    <h2>9. Liability</h2>
    <p>${brand} is not liable for damage arising from the contract between buyer and seller, except in case of intent or gross negligence by ${brand}. Nothing limits your mandatory consumer rights.</p>
    <h2>10. Complaints and disputes</h2>
    <p>Complaints can be sent to ${c.email}. You may also use the EU ODR platform: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.</p>
    <h2>11. Governing law</h2>
    <p>These terms are governed by Belgian law. Disputes fall under the courts of the district where ${c.legalName} is established, without prejudice to mandatory consumer protection.</p>` },
};

// --- PRIVACYBELEID / POLITIQUE / PRIVACY ---------------------------------
const privacy = {
  nl: { title: 'Privacybeleid', html: `
    <p>Dit privacybeleid legt uit hoe ${c.legalName} ("${brand}") je persoonsgegevens verwerkt, in overeenstemming met de AVG/GDPR.</p>
    <h2>1. Verwerkingsverantwoordelijke</h2>
    <p>${addr}. Ondernemingsnummer ${c.kbo}. Contact: <a href="mailto:${c.email}">${c.email}</a>.</p>
    <h2>2. Welke gegevens</h2>
    <p>Naam, e-mailadres, bestel- en leveringsgegevens, en technische gegevens die nodig zijn om het platform te laten werken. Betaalgegevens worden rechtstreeks door onze betaalpartners verwerkt; ${brand} ontvangt geen volledige kaartgegevens.</p>
    <h2>3. Doeleinden en grondslag</h2>
    <p>We gebruiken je gegevens om je account te beheren, bestellingen te verwerken en te leveren, je te contacteren over je bestelling, en om wettelijke verplichtingen na te komen. De grondslag is de uitvoering van de overeenkomst, een wettelijke verplichting, of ons gerechtvaardigd belang.</p>
    <h2>4. Delen met derden</h2>
    <p>We delen gegevens enkel wanneer nodig: met de verkoper van je bestelling (om te leveren), met betaalpartners (Mollie, Stripe) en met onze e-maildienstverlener. We verkopen je gegevens niet.</p>
    <h2>5. Bewaartermijn</h2>
    <p>We bewaren je gegevens zolang je account bestaat en zolang nodig voor wettelijke verplichtingen (bv. boekhouding).</p>
    <h2>6. Je rechten</h2>
    <p>Je hebt recht op inzage, verbetering, verwijdering, beperking, overdraagbaarheid en bezwaar. Stuur je verzoek naar ${c.email}. Je kunt ook klacht indienen bij de Gegevensbeschermingsautoriteit (gegevensbeschermingsautoriteit.be).</p>
    <h2>7. Beveiliging</h2>
    <p>We nemen passende technische en organisatorische maatregelen om je gegevens te beschermen. Wachtwoorden worden versleuteld opgeslagen.</p>` },
  fr: { title: 'Politique de confidentialité', html: `
    <p>Cette politique explique comment ${c.legalName} ("${brand}") traite vos données personnelles, conformément au RGPD.</p>
    <h2>1. Responsable du traitement</h2>
    <p>${addr}. Numéro d'entreprise ${c.kbo}. Contact : <a href="mailto:${c.email}">${c.email}</a>.</p>
    <h2>2. Quelles données</h2>
    <p>Nom, adresse e-mail, données de commande et de livraison, et données techniques nécessaires au fonctionnement de la plateforme. Les données de paiement sont traitées directement par nos partenaires ; ${brand} ne reçoit pas vos données de carte complètes.</p>
    <h2>3. Finalités et base légale</h2>
    <p>Nous utilisons vos données pour gérer votre compte, traiter et livrer vos commandes, vous contacter à leur sujet et respecter nos obligations légales. La base est l'exécution du contrat, une obligation légale ou notre intérêt légitime.</p>
    <h2>4. Partage avec des tiers</h2>
    <p>Nous ne partageons des données que lorsque c'est nécessaire : avec le vendeur de votre commande (livraison), les partenaires de paiement (Mollie, Stripe) et notre prestataire e-mail. Nous ne vendons pas vos données.</p>
    <h2>5. Durée de conservation</h2>
    <p>Nous conservons vos données tant que votre compte existe et aussi longtemps que l'exigent les obligations légales (p. ex. comptabilité).</p>
    <h2>6. Vos droits</h2>
    <p>Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition. Envoyez votre demande à ${c.email}. Vous pouvez aussi déposer une plainte auprès de l'Autorité de protection des données (autoriteprotectiondonnees.be).</p>
    <h2>7. Sécurité</h2>
    <p>Nous prenons des mesures techniques et organisationnelles appropriées. Les mots de passe sont stockés chiffrés.</p>` },
  en: { title: 'Privacy Policy', html: `
    <p>This policy explains how ${c.legalName} ("${brand}") processes your personal data, in line with the GDPR.</p>
    <h2>1. Data controller</h2>
    <p>${addr}. Company number ${c.kbo}. Contact: <a href="mailto:${c.email}">${c.email}</a>.</p>
    <h2>2. What data</h2>
    <p>Name, e-mail address, order and delivery details, and technical data needed to run the platform. Payment data is processed directly by our payment partners; ${brand} does not receive your full card details.</p>
    <h2>3. Purposes and legal basis</h2>
    <p>We use your data to manage your account, process and deliver orders, contact you about them, and meet legal obligations. The basis is performance of the contract, a legal obligation, or our legitimate interest.</p>
    <h2>4. Sharing with third parties</h2>
    <p>We share data only where necessary: with the seller of your order (for delivery), with payment partners (Mollie, Stripe) and with our e-mail provider. We do not sell your data.</p>
    <h2>5. Retention</h2>
    <p>We keep your data as long as your account exists and as long as legal obligations require (e.g. accounting).</p>
    <h2>6. Your rights</h2>
    <p>You have the right to access, rectify, erase, restrict, port and object. Send your request to ${c.email}. You may also lodge a complaint with the Belgian Data Protection Authority (gegevensbeschermingsautoriteit.be).</p>
    <h2>7. Security</h2>
    <p>We take appropriate technical and organisational measures. Passwords are stored encrypted.</p>` },
};

// --- COOKIEBELEID / COOKIES ----------------------------------------------
const cookies = {
  nl: { title: 'Cookiebeleid', html: `
    <p>${brand} gebruikt een beperkt aantal cookies die nodig zijn om de website te laten werken.</p>
    <h2>1. Noodzakelijke cookies</h2>
    <p>Deze houden je sessie bij (ingelogd blijven) en onthouden je winkelmand. Zonder deze cookies werkt de site niet. Ze vereisen geen toestemming.</p>
    <h2>2. Functionele cookies</h2>
    <p>Deze onthouden je taal- en valutakeuze en of je deze cookiemelding al hebt gezien.</p>
    <h2>3. Geen tracking</h2>
    <p>We gebruiken momenteel geen advertentie- of trackingcookies en geen externe analysetools. Als dat verandert, vragen we vooraf je toestemming.</p>
    <h2>4. Beheer</h2>
    <p>Je kunt cookies verwijderen of blokkeren via de instellingen van je browser. Vragen? ${c.email}.</p>` },
  fr: { title: 'Politique de cookies', html: `
    <p>${brand} utilise un nombre limité de cookies nécessaires au fonctionnement du site.</p>
    <h2>1. Cookies nécessaires</h2>
    <p>Ils maintiennent votre session (rester connecté) et mémorisent votre panier. Sans eux, le site ne fonctionne pas. Ils ne requièrent pas de consentement.</p>
    <h2>2. Cookies fonctionnels</h2>
    <p>Ils mémorisent votre choix de langue et de devise et si vous avez déjà vu cet avis de cookies.</p>
    <h2>3. Pas de pistage</h2>
    <p>Nous n'utilisons actuellement aucun cookie publicitaire ou de pistage, ni d'outil d'analyse externe. En cas de changement, nous demanderons votre consentement au préalable.</p>
    <h2>4. Gestion</h2>
    <p>Vous pouvez supprimer ou bloquer les cookies via les paramètres de votre navigateur. Questions ? ${c.email}.</p>` },
  en: { title: 'Cookie Policy', html: `
    <p>${brand} uses a limited number of cookies that are needed to run the website.</p>
    <h2>1. Necessary cookies</h2>
    <p>These keep your session (staying logged in) and remember your cart. The site does not work without them. They do not require consent.</p>
    <h2>2. Functional cookies</h2>
    <p>These remember your language and currency choice and whether you have already seen this cookie notice.</p>
    <h2>3. No tracking</h2>
    <p>We currently use no advertising or tracking cookies and no external analytics. If that changes, we will ask for your consent first.</p>
    <h2>4. Management</h2>
    <p>You can delete or block cookies via your browser settings. Questions? ${c.email}.</p>` },
};

// --- HAKKIMIZDA / OVER ONS / ABOUT ---------------------------------------
const about = {
  nl: { title: 'Over ons', html: `
    <p><strong>${brand}</strong> is een onlinemarktplaats waar elke verkoper zijn eigen winkel opent en jij koopt wat je wilt — met focus op België en Nederland.</p>
    <h2>Wat we doen</h2>
    <p>We brengen lokale verkopers en kopers samen op één platform: eenvoudig bestellen, veilig betalen (Mollie, Stripe) en duidelijke prijzen inclusief BTW.</p>
    <h2>Waarom ${brand}</h2>
    <p>Meerdere verkopers, één winkelmand. Beoordelingen en sterren, een verlanglijst, meertalig (NL/FR/EN) en een eerlijk retourbeleid van 14 dagen.</p>
    <h2>Verkoper worden</h2>
    <p>Open gratis je eigen winkel en begin met verkopen. <a href="/register">Meld je aan</a> als verkoper.</p>
    <p class="muted small">${c.legalName} · ${c.postalCity}, ${c.country}</p>` },
  fr: { title: 'À propos', html: `
    <p><strong>${brand}</strong> est une place de marché en ligne où chaque vendeur ouvre sa propre boutique et où vous achetez ce que vous voulez — axée sur la Belgique et les Pays-Bas.</p>
    <h2>Ce que nous faisons</h2>
    <p>Nous réunissons vendeurs locaux et acheteurs sur une seule plateforme : commande simple, paiement sécurisé (Mollie, Stripe) et prix clairs TVA comprise.</p>
    <h2>Pourquoi ${brand}</h2>
    <p>Plusieurs vendeurs, un seul panier. Avis et étoiles, liste de souhaits, multilingue (NL/FR/EN) et droit de rétractation de 14 jours.</p>
    <h2>Devenir vendeur</h2>
    <p>Ouvrez gratuitement votre boutique et vendez. <a href="/register">Inscrivez-vous</a> comme vendeur.</p>
    <p class="muted small">${c.legalName} · ${c.postalCity}, ${c.country}</p>` },
  en: { title: 'About us', html: `
    <p><strong>${brand}</strong> is an online marketplace where every seller opens their own shop and you buy what you like — focused on Belgium and the Netherlands.</p>
    <h2>What we do</h2>
    <p>We bring local sellers and buyers together on one platform: easy ordering, secure payment (Mollie, Stripe) and clear prices including VAT.</p>
    <h2>Why ${brand}</h2>
    <p>Many sellers, one cart. Reviews and stars, a wishlist, multilingual (NL/FR/EN) and a fair 14-day return policy.</p>
    <h2>Become a seller</h2>
    <p>Open your own shop for free and start selling. <a href="/register">Sign up</a> as a seller.</p>
    <p class="muted small">${c.legalName} · ${c.postalCity}, ${c.country}</p>` },
};

// --- CONTACT -------------------------------------------------------------
const contact = {
  nl: { title: 'Contact', html: `
    <p>Vragen over een bestelling, een retour of je verkopersaccount? We helpen je graag.</p>
    <h2>E-mail</h2>
    <p><a href="mailto:${c.email}">${c.email}</a></p>
    <h2>Adres</h2>
    <p>${c.legalName}<br>${c.address}, ${c.postalCity}<br>${c.country}</p>
    <p class="muted small">Ondernemingsnummer ${c.kbo} · ${btwPct ? 'BTW ' + c.vat : ''}</p>` },
  fr: { title: 'Contact', html: `
    <p>Des questions sur une commande, un retour ou votre compte vendeur ? Nous sommes là pour vous aider.</p>
    <h2>E-mail</h2>
    <p><a href="mailto:${c.email}">${c.email}</a></p>
    <h2>Adresse</h2>
    <p>${c.legalName}<br>${c.address}, ${c.postalCity}<br>${c.country}</p>
    <p class="muted small">Numéro d'entreprise ${c.kbo} · ${btwPct ? 'TVA ' + c.vat : ''}</p>` },
  en: { title: 'Contact', html: `
    <p>Questions about an order, a return or your seller account? We're happy to help.</p>
    <h2>E-mail</h2>
    <p><a href="mailto:${c.email}">${c.email}</a></p>
    <h2>Address</h2>
    <p>${c.legalName}<br>${c.address}, ${c.postalCity}<br>${c.country}</p>
    <p class="muted small">Company number ${c.kbo} · ${btwPct ? 'VAT ' + c.vat : ''}</p>` },
};

// --- SSS / VEELGESTELDE VRAGEN / FAQ -------------------------------------
const faq = {
  nl: { title: 'Veelgestelde vragen', html: `
    <h2>Hoe plaats ik een bestelling?</h2>
    <p>Voeg producten toe aan je winkelmand en reken af. Je betaalt veilig via onze betaalpartners; de prijzen zijn inclusief BTW.</p>
    <h2>Kan ik van meerdere verkopers tegelijk kopen?</h2>
    <p>Ja. Je winkelmand kan producten van meerdere verkopers bevatten; de bestelling wordt automatisch per verkoper verwerkt.</p>
    <h2>Hoe werkt retourneren?</h2>
    <p>Je hebt 14 dagen herroepingsrecht. Vraag een retour aan vanuit je bestelling; na goedkeuring wordt het bedrag terugbetaald.</p>
    <h2>Hoe word ik verkoper?</h2>
    <p>Meld je aan als verkoper, vul je bedrijfsgegevens in en wacht op goedkeuring. Daarna kun je producten toevoegen.</p>
    <h2>Hoe neem ik contact op?</h2>
    <p>Mail naar <a href="mailto:${c.email}">${c.email}</a>.</p>` },
  fr: { title: 'Questions fréquentes', html: `
    <h2>Comment passer une commande ?</h2>
    <p>Ajoutez des produits au panier et payez. Le paiement est sécurisé via nos partenaires ; les prix sont TVA comprise.</p>
    <h2>Puis-je acheter à plusieurs vendeurs à la fois ?</h2>
    <p>Oui. Votre panier peut contenir des produits de plusieurs vendeurs ; la commande est traitée automatiquement par vendeur.</p>
    <h2>Comment fonctionne un retour ?</h2>
    <p>Vous disposez de 14 jours de rétractation. Demandez un retour depuis votre commande ; après validation, vous êtes remboursé.</p>
    <h2>Comment devenir vendeur ?</h2>
    <p>Inscrivez-vous comme vendeur, renseignez vos informations et attendez la validation. Vous pourrez ensuite ajouter des produits.</p>
    <h2>Comment vous contacter ?</h2>
    <p>Écrivez à <a href="mailto:${c.email}">${c.email}</a>.</p>` },
  en: { title: 'FAQ', html: `
    <h2>How do I place an order?</h2>
    <p>Add products to your cart and check out. Payment is secure via our partners; prices include VAT.</p>
    <h2>Can I buy from several sellers at once?</h2>
    <p>Yes. Your cart can contain products from multiple sellers; the order is processed automatically per seller.</p>
    <h2>How do returns work?</h2>
    <p>You have a 14-day right of withdrawal. Request a return from your order; once approved, you are refunded.</p>
    <h2>How do I become a seller?</h2>
    <p>Sign up as a seller, fill in your business details and wait for approval. Then you can add products.</p>
    <h2>How do I get in touch?</h2>
    <p>Email <a href="mailto:${c.email}">${c.email}</a>.</p>` },
};

const DOCS = { terms, privacy, cookies, about, contact, faq };

// slug + dil -> { title, html }; dil yoksa NL'ye duser
function page(slug, lang) {
  const d = DOCS[slug];
  if (!d) return null;
  const doc = d[lang] || d.nl;
  return { title: doc.title, html: doc.html, updated: UPDATED };
}

module.exports = { page, SLUGS: Object.keys(DOCS) };
