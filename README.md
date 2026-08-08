# WePlay Recharge — Full Site (Frontend + Backend)

A ready-to-deploy site: the login screen, gold recharge page, checkout,
admin dashboard, and the serverless backend behind all of them.

## Deploy from GitHub in 5 minutes

**1. Push this folder to a new GitHub repo:**

```bash
cd weplay-backend
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(Create the empty repo on github.com first, then run the commands above
inside this folder.)

**2. Import it into Vercel:**

- Go to [vercel.com/new](https://vercel.com/new)
- Select **Import Git Repository** and pick the repo you just pushed
- Vercel auto-detects this as a Node/serverless project — no build
  settings to change, just click **Deploy**

**3. Add your environment variables** (Project → Settings → Environment
Variables) before the payment/admin features will work — see step 2–4
below for exactly which ones and where to get them. After adding them,
redeploy (or Vercel will prompt you to).

**4. Connect Upstash Redis** via the project's **Storage** tab (see step 2
below) — this auto-injects the Redis env vars, no copy/pasting needed.

Once those are set, your site is live at `your-repo.vercel.app`, with
`/admin.html` as the dashboard.

---


## 1. File structure

```
api/
  track.js              → POST, logs a visit
  admin/
    visits.js           → GET, admin-only visit stats
    orders.js           → GET, admin-only order/payment list
  payment/
    create-order.js      → POST, creates a Cashfree order
    webhook.js            → POST, Cashfree calls this when payment completes
lib/
  redis.js               → Upstash Redis client
  adminAuth.js            → checks the admin password header
  cashfree.js              → Cashfree base URL / auth headers / signature check
public/
  index.html                → redirects visitors to login.html
  login.html                 → "Enter your WePlay ID" screen
  recharge.html                → gold package list (links each card to checkout.html)
  checkout.html                  → "Pay Now" page using Cashfree's SDK
  payment-status.html             → page Cashfree redirects to after checkout
  admin.html                       → the password-gated dashboard
  track-snippet.js                  → drop-in script tag, already wired into login.html/recharge.html
.env.example
vercel.json
package.json
```

## 2. Set up Upstash Redis (free tier is fine)

1. In your Vercel project → **Storage** tab → **Create Database** → **Upstash Redis**.
   (Or create one directly at upstash.com and copy the REST URL/token.)
2. Vercel automatically adds `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` as environment variables — you don't need to
   copy/paste them yourself if you use the Storage tab.

## 3. Set your admin password

In Vercel → Project → **Settings → Environment Variables**, add:

```
ADMIN_PASSWORD = <pick a strong password>
```

That's the password you'll type into `/admin.html`.

## 4. Get your Cashfree API keys

1. Sign up / log in at [merchant.cashfree.com](https://merchant.cashfree.com).
2. Go to **Developers → API Keys**.
3. Start with the **Test/Sandbox** keys while you build — no real money moves.
4. Copy the **Client ID** and **Client Secret**.

Add these as environment variables in Vercel:

```
CASHFREE_APP_ID     = <your client id>
CASHFREE_SECRET_KEY = <your client secret>
CASHFREE_ENV         = sandbox        (change to "production" when you go live)
SITE_URL              = https://your-site.vercel.app
```

`.env.example` in this folder lists all of these with comments — copy it to
`.env` for local testing with `vercel dev`, or just fill the same names into
the Vercel dashboard for a real deployment.

## 5. Register the webhook in Cashfree

In the Cashfree dashboard → **Developers → Webhooks**, add:

```
https://your-site.vercel.app/api/payment/webhook
```

This is what actually confirms a payment succeeded — `create-order.js`
starts a payment as `PENDING`, and only the webhook (verified via Cashfree's
signature) flips it to `SUCCESS` or `FAILED`. Don't trust the redirect page
alone for that.

## 6. The pages are already wired together

- `index.html` → redirects to `login.html`
- `login.html` → "Next" button sends the visitor to `recharge.html`
- `recharge.html` → tapping any gold package goes to `checkout.html?package=...&amount=...`
- `checkout.html` → calls `create-order.js`, opens Cashfree's checkout, then Cashfree redirects to `payment-status.html`
- `login.html` and `recharge.html` already include `<script src="/track-snippet.js"></script>` before `</body>`, so visits are logged automatically. Add the same line to any new page you create.

## 7. View the dashboard

Go to `/admin.html`, enter the `ADMIN_PASSWORD` you set in step 3. You'll see:

- Total visits + visits today
- A 14-day visits bar chart
- Recent visit log (time, page, IP, referrer)
- Recent orders with live payment status (PENDING / SUCCESS / FAILED)

## Notes / things to double check before going live

- Switch `CASHFREE_ENV` to `production` **and** swap in your production
  API keys only once you've tested the full sandbox flow end to end.
- The admin auth here is a single shared password in a header — fine for
  one person checking a dashboard, but if you ever need multiple admins
  or tighter security, replace `lib/adminAuth.js` with real sessions/JWT.
- Visit IPs are stored so you can spot bots/abuse; if you're in a region
  with data-protection rules (India's DPDP Act, GDPR, etc.), add a short
  privacy note on your site mentioning that visits are logged.
