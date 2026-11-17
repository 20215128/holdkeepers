# Hold Keepers — Waitlist Landing Page

A high-converting, modern waitlist landing page engineered for **Hold Keepers** — helping Stripe SaaS founders and indie hackers stop voluntary churn by offering reason-based retention discounts and pauses before subscribers leave.

---

## 🚀 Quick Start (Local Preview)

The project uses zero external dependencies (pure Node.js standard library).

```bash
# 1. Open your terminal in the Hold Keepers folder
cd /Users/mac/Desktop/holdkeepers

# 2. Start the server
node server.js
```

Then open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Project Structure

```
/Users/mac/Desktop/holdkeepers/
├── index.html            # High-converting landing page with interactive offer simulation
├── server.js             # Zero-dependency Node server for static files & waitlist API
├── logo.svg              # Black + Deep Blue brand logo (drop your custom logo here)
├── package.json          # Node scripts ("start", "dev")
├── .gitignore            # Git ignore configuration
├── data/
│   ├── waitlist.json     # Real-time JSON log of all signups
│   └── waitlist.csv      # Real-time CSV export with qualifying answers
└── README.md             # This guide
```

---

## 🎨 Adding Your Logo

When you have your final logo file:
1. Save it directly into this folder as **`logo.svg`** or **`logo.png`**.
2. If using PNG, open `index.html` and update the `src="logo.svg"` to `src="logo.png"`.
3. The page already uses deep blue accents (`#1d4ed8`, `#2563eb`) and dark slate canvas (`#040711`) to match your black + blue aesthetic.

---

## 📊 How Waitlist Lead Collection Works

### Built-in Zero-Dependency Storage:
* Every time a visitor submits their email and answers the qualifying questions:
  * Their email, Stripe status, and customer count are recorded into `data/waitlist.json` and `data/waitlist.csv`.
  * They receive a unique queue position (e.g. `#142`) and a referral link.
* **To Export Leads:** Navigate to **`http://localhost:3000/api/waitlist/export`** in your browser to immediately download the `.csv` spreadsheet.

### Easiest 3rd-Party Integrations (Optional):
If you want emails synced directly into an external service:
* **Formspree / Formbold:** Replace the `<form>` `action` attribute with your Formspree endpoint.
* **Loops.so / Resend:** Add a 5-line webhook call inside `server.js`'s `/api/waitlist` route to trigger welcome emails automatically.
* **Google Sheets:** Connect via a free Zapier or Make.com webhook.

---

## 🐙 Git & GitHub: Do I need a new repo?

**You can keep the project right in this current folder!** You do not need to create a separate folder.

To push it to GitHub:
```bash
cd /Users/mac/Desktop/holdkeepers
git init
git add .
git commit -m "Initial commit: Hold Keepers waitlist landing page"

# Create a new repository on github.com (e.g. hold-keepers) and run:
git remote add origin https://github.com/YOUR_USERNAME/hold-keepers.git
git branch -M main
git push -u origin main
```

---

## 🌐 Publishing to the Web (Free & Fast)

### Option A: Render / Railway (Recommended with the Node.js Server)
1. Push your code to GitHub.
2. Sign in to [Render.com](https://render.com) or [Railway.app](https://railway.app).
3. Click **New Web Service** and connect your `hold-keepers` repo.
4. Set Build Command: *(leave empty)*
5. Set Start Command: `node server.js`
6. Click **Deploy**. You get a live HTTPS URL in under 2 minutes.

### Option B: Vercel / Netlify (Static Hosting)
1. Push your code to GitHub.
2. Import repo to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. If using static hosting, connect the form to Formspree, Loops, or Mailchimp so signups don't require the persistent local server.
