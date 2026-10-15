# GDS Window Cleaning

A responsive Dutch-language landing page for GDS Window Cleaning. It uses
plain HTML, CSS, and browser JavaScript, with a small Express server to deliver
the site and send contact form requests through Brevo SMTP.

## Configure email

1. Create/verify `info@gdswindows.be` as a sender in Brevo and authenticate the
   `gdswindows.be` domain using the DNS records Brevo provides.
2. Copy `.env.example` to `.env`.
3. Set `BREVO_SMTP_USER` and `BREVO_SMTP_KEY` using the SMTP credentials from
   Brevo. Do not use an API key or your Brevo account password.
4. Set `CONTACT_FROM` to the verified sender and `CONTACT_TO` to
   `info@gdswindows.be`.
5. Automatic confirmations are enabled by default. Set `AUTO_REPLY_ENABLED=0`
   to disable them.

Keep `.env` private and never commit it.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Fill in the Brevo credentials in `.env`, then visit <http://localhost:3000>.

## Deploy

Deploy the project to a Node.js host such as the DigitalOcean droplet and
install production dependencies with `npm ci --omit=dev`. Store the email
settings in a protected environment file outside the project directory and
load it into the systemd service with `EnvironmentFile`. Keep the Node process
bound to `127.0.0.1` and proxy public HTTPS traffic through Nginx.

The contact endpoint accepts `POST /api/contact`, limits each client to five
submissions per 15 minutes, and emails form details to `info@gdswindows.be`.

## Content notes

- Gallery images are illustrative stock photos, not confirmed GDS client work.
  Replace them with approved project photos when available.
- Google Fonts and the gallery/hero stock photos are loaded from external
  services and require an internet connection.
