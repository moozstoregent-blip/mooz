// mailer.js — sifir bagimlilik e-posta (node:https).
// Anahtar girilmezse "log modu": mailler Render log'una yazilir, akis bozulmaz.
// EMAIL_PROVIDER + EMAIL_API_KEY + EMAIL_FROM env'e eklenince gercek gonderir.
'use strict';
const https = require('node:https');
const config = require('./config');

function env(k, d) { return String(process.env[k] || d || '').trim(); }

function cfg() {
  return {
    provider: env('EMAIL_PROVIDER').toLowerCase(),  // resend | brevo | '' (log)
    apiKey:   env('EMAIL_API_KEY'),
    from:     env('EMAIL_FROM'),                     // "Mooz <noreply@mooz.store>" veya "noreply@mooz.store"
    fromName: env('EMAIL_FROM_NAME', (config.brand && config.brand.name) || 'Mooz'),
    replyTo:  env('EMAIL_REPLY_TO'),
  };
}

// Saglayici + anahtar + gonderen varsa gercek gonderim acik
function isConfigured() {
  const c = cfg();
  return !!(c.provider && c.apiKey && c.from);
}

// "Ad <a@b.com>" -> {name,email} ; "a@b.com" -> {email}
function parseAddr(s) {
  const m = /^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/.exec(s || '');
  if (m) return { name: m[1] || '', email: m[2] };
  return { name: '', email: String(s || '').trim() };
}

function httpsRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body));
    const req = https.request({
      method,
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: Object.assign({ 'Content-Length': Buffer.byteLength(data) }, headers),
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// --- Saglayicilar -----------------------------------------------------------
async function viaResend(c, msg) {
  const payload = { from: c.from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text };
  if (c.replyTo) payload.reply_to = c.replyTo;
  const r = await httpsRequest('POST', 'https://api.resend.com/emails', {
    'Authorization': 'Bearer ' + c.apiKey,
    'Content-Type': 'application/json',
  }, payload);
  return { ok: r.status >= 200 && r.status < 300, status: r.status, body: r.body };
}

async function viaBrevo(c, msg) {
  const from = parseAddr(c.from);
  if (!from.name && c.fromName) from.name = c.fromName;
  const payload = {
    sender: from.name ? { email: from.email, name: from.name } : { email: from.email },
    to: [{ email: msg.to }],
    subject: msg.subject,
    htmlContent: msg.html,
    textContent: msg.text,
  };
  if (c.replyTo) payload.replyTo = { email: c.replyTo };
  const r = await httpsRequest('POST', 'https://api.brevo.com/v3/smtp/email', {
    'api-key': c.apiKey,
    'Content-Type': 'application/json',
    'accept': 'application/json',
  }, payload);
  return { ok: r.status >= 200 && r.status < 300, status: r.status, body: r.body };
}

// --- Ana gonderim (her zaman resolve olur; siparis akisini asla bozmaz) ------
async function send(msg) {
  const c = cfg();
  if (!isConfigured()) {
    console.log('\n===== [MAIL — LOG MODU] =====');
    console.log('Alici :', msg.to);
    console.log('Konu  :', msg.subject);
    console.log(msg.text || '(text yok)');
    console.log('(gercek gonderim: EMAIL_PROVIDER + EMAIL_API_KEY + EMAIL_FROM env ekle)');
    console.log('=============================\n');
    return { ok: true, mode: 'log' };
  }
  try {
    let r;
    if (c.provider === 'resend') r = await viaResend(c, msg);
    else if (c.provider === 'brevo') r = await viaBrevo(c, msg);
    else { console.log('[MAIL] bilinmeyen EMAIL_PROVIDER:', c.provider); return { ok: false, mode: 'unknown' }; }
    if (!r.ok) console.log('[MAIL] gonderim hatasi', c.provider, r.status, String(r.body || '').slice(0, 300));
    return { ok: r.ok, mode: c.provider, status: r.status };
  } catch (e) {
    console.log('[MAIL] istisna:', e && e.message);
    return { ok: false, mode: c.provider, error: e && e.message };
  }
}

// Basit markali HTML sarmalayici
function layout(title, bodyHtml) {
  const brand = (config.brand && config.brand.name) || 'Mooz';
  return '<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">'
    + '<div style="max-width:560px;margin:0 auto;padding:24px">'
    + '<div style="font-size:22px;font-weight:700;color:#4f46e5;padding:8px 0 16px">' + brand + '</div>'
    + '<div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px">'
    + '<h1 style="margin:0 0 12px;font-size:18px">' + title + '</h1>'
    + bodyHtml
    + '</div>'
    + '<div style="color:#71717a;font-size:12px;padding:16px 4px">' + brand + ' · Gent, België</div>'
    + '</div></body></html>';
}

module.exports = { send, isConfigured, layout, cfg, parseAddr };
