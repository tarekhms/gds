const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT || 3000);
const smtpHost = String(process.env.BREVO_SMTP_HOST || '').trim();
const smtpPort = Number(process.env.BREVO_SMTP_PORT || 2525);
const smtpUser = String(process.env.BREVO_SMTP_USER || '').trim();
const smtpKey = String(process.env.BREVO_SMTP_KEY || '').trim();
const mailFrom = String(process.env.CONTACT_FROM || '').trim();
const mailTo = String(process.env.CONTACT_TO || 'request@gds.be').trim();
const rateLimitWindowMs = 15 * 60 * 1000;
const rateLimitMax = 5;
const contactRequests = new Map();
const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, request] of contactRequests) {
    if (now - request.startedAt >= rateLimitWindowMs) contactRequests.delete(ip);
  }
}, rateLimitWindowMs);
rateLimitCleanup.unref();

app.set('trust proxy', 'loopback');
app.use(express.urlencoded({ extended: false, limit: '12kb' }));
app.use(express.json({ limit: '12kb' }));

const transporter = smtpHost && smtpUser && smtpKey
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      requireTLS: smtpPort !== 465,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: { user: smtpUser, pass: smtpKey }
    })
  : null;

console.log('[contact] Brevo SMTP config', {
  host: smtpHost || '(missing)',
  port: smtpPort,
  user: smtpUser ? '(set)' : '(missing)',
  key: smtpKey ? '(set)' : '(missing)',
  from: mailFrom || '(missing)',
  to: mailTo
});

function boundedString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function isPlausibleEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function rateLimited(ip) {
  const now = Date.now();
  const previous = contactRequests.get(ip);
  if (!previous || now - previous.startedAt >= rateLimitWindowMs) {
    contactRequests.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  previous.count += 1;
  return previous.count > rateLimitMax;
}

function sendPublicFile(fileName, contentType) {
  return (req, res, next) => {
    res.type(contentType);
    res.sendFile(path.join(__dirname, fileName), (error) => {
      if (error) next(error);
    });
  };
}

app.get('/', sendPublicFile('index.html', 'html'));
app.get('/styles.css', sendPublicFile('styles.css', 'css'));
app.get('/script.js', sendPublicFile('script.js', 'js'));
app.get('/favicon.png', sendPublicFile('favicon.png', 'png'));
app.get(
  [
    '/796691243_122101763667465598_2605406461141275375_n.jpg',
    '/796746076_122101763235465598_5836600542732663167_n.jpg'
  ],
  (req, res, next) => {
    res.type('jpg');
    res.sendFile(path.join(__dirname, path.basename(req.path)), (error) => {
      if (error) next(error);
    });
  }
);

app.post('/api/contact', async (req, res) => {
  const name = boundedString(req.body.name, 100).replace(/[\r\n]+/g, ' ');
  const email = boundedString(req.body.email, 254);
  const phone = boundedString(req.body.phone, 40).replace(/[\r\n]+/g, ' ');
  const customerType = boundedString(req.body.customerType, 30);
  const message = boundedString(req.body.message, 3000);

  if (req.body.website) {
    res.status(400).json({ ok: false, error: 'Je bericht kon niet worden verzonden.' });
    return;
  }

  if (rateLimited(req.ip || req.socket.remoteAddress || 'unknown')) {
    res.status(429).json({ ok: false, error: 'Je hebt net meerdere berichten verstuurd. Probeer het later opnieuw.' });
    return;
  }

  if (!name || !email || !customerType || !message || !isPlausibleEmail(email)) {
    res.status(400).json({ ok: false, error: 'Controleer je gegevens en probeer opnieuw.' });
    return;
  }

  if (!['Particulier', 'Bedrijf'].includes(customerType)) {
    res.status(400).json({ ok: false, error: 'Kies particulier of bedrijf.' });
    return;
  }

  if (!transporter || !mailFrom) {
    console.error('[contact] Brevo SMTP is not fully configured');
    res.status(503).json({ ok: false, error: 'Het contactformulier is tijdelijk niet beschikbaar. Bel ons op 0470 07 08 89.' });
    return;
  }

  try {
    await transporter.sendMail({
      from: { name: 'GDS Window Cleaning', address: mailFrom },
      to: mailTo,
      replyTo: { name, address: email },
      subject: `Nieuwe aanvraag via de website — ${name}`,
      text: [
        'Nieuwe aanvraag via de GDS Window Cleaning website',
        '',
        `Naam: ${name}`,
        `E-mailadres: ${email}`,
        `Telefoonnummer: ${phone || 'Niet opgegeven'}`,
        `Type klant: ${customerType}`,
        '',
        'Bericht:',
        message
      ].join('\n')
    });

    res.json({ ok: true, message: 'Bedankt! Je bericht is verzonden. We nemen zo snel mogelijk contact met je op.' });
  } catch (error) {
    console.error('[contact] Brevo send failed:', error.message);
    res.status(502).json({ ok: false, error: 'Je bericht kon niet worden verzonden. Probeer het later opnieuw of bel ons.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Pagina niet gevonden.' });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`GDS Window Cleaning running at http://127.0.0.1:${port}`);
});
