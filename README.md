# Mooz — Çok Satıcılı Pazaryeri (MVP çekirdek)

Bu, Mooz'un ilk çalışan sürümüdür. Tamamen Node.js'in **yerleşik** modülleriyle
yazıldı — hiçbir dış paket kurmana gerek yok.

## Çalıştırma

Bilgisayarında **Node.js 22 veya üstü** kurulu olmalı (https://nodejs.org).

```bash
cd mooz
node server.js
```

Sonra tarayıcıda aç: **http://localhost:3000**

İlk çalıştırmada `mooz.db` adında bir veritabanı dosyası oluşur ve örnek
veriyle dolar.

## Demo girişleri

- **Admin:**  admin@mooz.store / admin123
- **Satıcı:** moda@mooz.store / satici123  (ve tekno@mooz.store, guzellik@mooz.store — hepsi satici123)

Yeni alıcı/satıcı hesabını "Kayıt ol"dan da açabilirsin.

## Şu an ne çalışıyor (MVP çekirdek)

- Üyelik: kayıt / giriş / çıkış (alıcı + satıcı), şifreler güvenli (crypto.scrypt)
- Satıcı paneli: mağaza durumu, ürün ekle / listele / sil
- Pazaryeri vitrini: ana sayfa, kategori filtresi, arama, ürün detay, satıcı etiketi
- Satıcı vitrini: /store/<magaza-adi> (storefront'un temeli)
- Admin paneli: mağaza onaylama / askıya alma, istatistikler

## Sonraki adımlar (henüz yok)

Sepet, ödeme + komisyon dağıtımı (Mollie/Stripe/iyzico), kargo, çok dil/para,
özel domain. Bunları birlikte adım adım ekleyeceğiz.

## Dosyalar

- `config.js`  — marka adı, renk, komisyon. **Mooz'u değiştirmek istersen burayı değiştir.**
- `server.js`  — sunucu ve tüm rotalar
- `db.js`      — veritabanı şeması + örnek veri
- `views.js`   — HTML şablonları
- `helpers.js` — şifre, çerez, biçimlendirme yardımcıları
- `public/css/style.css` — stil

## Not

Bu bir geliştirme sürümüdür; gerçek yayına almadan önce oturum güvenliği,
HTTPS ve gerçek veritabanı (PostgreSQL) gibi konular eklenecek.
