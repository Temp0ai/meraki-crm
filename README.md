# 👗 Meraki — Let Your Style Speak

**AI-Powered WhatsApp CRM for Clothing Boutiques**

A Progressive Web App (PWA) designed specifically for clothing boutiques to manage customers, send personalized WhatsApp broadcasts, and track sales — all powered by Gemini AI.

![Meraki CRM](https://img.shields.io/badge/Meraki-CRM-purple?style=for-the-badge) ![WhatsApp](https://img.shields.io/badge/WhatsApp-Broadcasts-green?style=for-the-badge) ![AI](https://img.shields.io/badge/Gemini-AI-blue?style=for-the-badge)

---

## ✨ Features

### 🤖 Gemini AI Message Generator
- Generate personalized WhatsApp messages for any occasion
- **6 Tone options**: Warm, Formal, Enthusiastic, Casual, Elegant, Playful
- **3 Length options**: Short, Medium, Long
- **Custom keywords**: Add specific themes the AI should incorporate
- **Per-customer personalization**: Uses name, preferences, size, purchase history

### 📢 WhatsApp Bulk Broadcasts
- Send to multiple customers with **4-second delay** between each
- Live progress bar with cancel option
- Manual mode for one-by-one sending
- Individual message logging

### 👥 Customer Management
- Categories: VIP 💎, Regular 👗, New ✨, Bridal 💍, Inactive 💤
- Style preferences: Sarees, Suits, Western, Lehenga, Kurti, Indo-Western, Accessories
- Size tracking (XS-XXL + Custom Stitching)
- Birthday tracking with upcoming alerts

### 🛍️ Sales Tracking
- Record sales in INR (₹)
- Today / This Week / This Month revenue dashboard
- Category-wise tracking
- Per-customer purchase history

### 📱 Quick Broadcasts
- 🎂 Birthday Wishes
- 👗 New Collection Announcements
- 🏷️ Sale Alerts
- 🪔 Festival Offers
- 📦 Back in Stock Notifications
- 💡 Styling Tips

### 💡 AI Insights
- Smart suggestions for customer engagement
- Top spender alerts
- Style preference analytics
- Inactive customer reminders

---

## 🚀 Getting Started

### Option 1: Use Online
Visit the deployed URL and add to your Android home screen.

### Option 2: Run Locally
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/meraki-crm.git
cd meraki-crm

# Open in browser
# Simply open index.html in any browser
# Or use a local server:
python3 -m http.server 8080
# Then visit http://localhost:8080
```

### Option 3: Install as Android App
1. Open the URL in Chrome on Android
2. Tap ⋮ → **Add to Home Screen**
3. Or use [PWABuilder](https://www.pwabuilder.com) to generate an APK

---

## ⚙️ Setup Gemini AI

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key
5. In the app → ⚙️ Settings → Gemini AI → Paste key → Save

---

## 📁 Project Structure

```
meraki-crm/
├── index.html      # App structure & UI
├── styles.css      # Styling (purple theme, mobile-first)
├── app.js          # All logic — CRM, AI, WhatsApp, data
├── manifest.json   # PWA manifest for Android install
└── README.md       # This file
```

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **AI**: Google Gemini API (gemini-2.0-flash)
- **Storage**: localStorage (client-side)
- **Deployment**: Netlify (PWA)
- **Messaging**: WhatsApp Web API (wa.me links)

---

## 📄 License

MIT License — feel free to use and modify.

---

**Made with 💜 for boutique owners who let their style speak.**
