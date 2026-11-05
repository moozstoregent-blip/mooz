# Mooz'u İnternete Açma (Yayına Alma) — Adım Adım

Amaç: Mooz'u her yerden (iş, ev, telefon) tarayıcıyla açabileceğin canlı bir
adrese taşımak. Node kurmaya veya dosya taşımaya gerek kalmayacak.

Kullanacağımız ücretsiz servis: **Render.com** (Node uygulamalarını çalıştırır).
Render, kodu bir **GitHub** deposundan alır. O yüzden önce GitHub'a koyacağız.

---

## Bölüm 1 — Kodu GitHub'a koy

1. https://github.com adresine git → **Sign up** (ücretsiz hesap aç). Zaten
   hesabın varsa **Sign in**.
2. Sağ üstte **+** → **New repository**.
3. Repository name: `mooz` yaz.
4. **Public** seçili kalsın.
5. **Create repository**.
6. Açılan sayfada **"uploading an existing file"** linkine tıkla
   (veya "Add file > Upload files").
7. Bilgisayarındaki `mooz` klasörünün **içindeki** şu dosya ve klasörleri
   sürükleyip bırak:
   - config.js, db.js, helpers.js, i18n.js, payment.js, shipping.js,
     server.js, views.js, styles.js, package.json, render.yaml, .gitignore,
     README.md, DEPLOY.md
   - ve **public** klasörü (içinde css/style.css var)
   > NOT: `mooz.db` dosyasını YÜKLEME (varsa atla). Gerek yok.
8. Aşağıda **Commit changes** (yeşil buton).

Artık kodun GitHub'da. 🎉

---

## Bölüm 2 — Render'da yayına al

1. https://render.com adresine git → **Get Started** → **GitHub ile giriş yap**
   (Render'ın GitHub'ına erişmesine izin ver).
2. Panelde **New +** → **Web Service**.
3. GitHub deponu (`mooz`) seç → **Connect**.
4. Ayarlar (çoğu otomatik gelir, kontrol et):
   - **Name:** mooz
   - **Region:** Frankfurt (Avrupa'ya yakın)
   - **Branch:** main
   - **Runtime:** Node
   - **Build Command:** boş bırak
   - **Start Command:** `node --experimental-sqlite server.js`
   - **Instance Type:** **Free**
5. **Create Web Service** (veya Deploy).
6. 1-2 dakika bekle. "Live" yazınca üstteki
   `https://mooz-xxxx.onrender.com` adresine tıkla — Mooz canlıda! 🚀

---

## Önemli notlar

- **Veritabanı:** Ücretsiz katmanda site uyur/yeniden başlarsa `mooz.db`
  sıfırlanır (örnek veri tekrar yüklenir). Gösterim/test için ideal. Gerçek,
  kalıcı satış için ileride kalıcı veritabanı (PostgreSQL) ekleriz.
- **İlk açılış yavaş:** Ücretsiz sitede, uzun süre kullanılmazsa ilk açılış
  ~30 saniye sürebilir (uyandırma). Sonra hızlı.
- **Kendi alan adın (mooz.store):** Site çalışınca Render'da Settings > Custom
  Domain'den `mooz.store` bağlanır. Alt alan adları (`magaza.mooz.store`) için
  wildcard DNS ayarı gerekir — o aşamada birlikte yaparız.
