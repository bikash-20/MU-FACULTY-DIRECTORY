# 📱 MU ClassCraft PWA - Installation Guide

## ✅ What's Verified

- **Responsive Meta Tags**: ✅ `viewport` with `width=device-width`
- **iOS PWA Meta Tags**: ✅ `apple-mobile-web-app-*` configured
- **App Icons**: ✅ 8 sizes (72, 96, 128, 144, 152, 192, 384, 512)
- **Square Icons**: ✅ All icons cropped to square (required for iOS)
- **Maskable Icons**: ✅ 192×192 and 512×512 for proper icon display
- **Theme Color**: ✅ `#1a5c38` (MU green)

---

## 📲 How to Install on iPhone

### Safari (Required for iOS)

1. **Open the website** in Safari on your iPhone
2. **Tap the Share button** (□↑) at the bottom toolbar
3. **Scroll down** and tap **"Add to Home Screen"**
4. **Tap "Add"** in the top right corner
5. ✅ Done! MU ClassCraft appears on your home screen with your custom icon

---

## 🔔 Push Notifications (Badge Alerts)

### For Web Push Notifications on iPhone:

**Requirements:**
1. Website must be served over **HTTPS**
2. User must add app to Home Screen (not just browser)
3. User must grant notification permission

**How to Enable:**
1. Add to Home Screen (see above)
2. Open the installed app
3. If prompted, tap **"Allow"** for notifications
4. Badge notifications will appear on the home screen icon

**Note:** Full push notifications require backend setup with VAPID keys. The service worker is ready for implementation.

---

## 🔄 How Updates Work

When you update `index.html` on your server:

1. **Returning users** get the new version automatically
2. **First-time visitors** get the latest version
3. A prompt appears: *"🔄 New version of MU ClassCraft is available!"*
4. User taps OK → app updates instantly

---

## 📱 Responsive Design

The app is fully responsive:
- Bootstrap 5 framework
- Mobile-first design
- Breakpoints: 576px, 768px, 992px, 1200px
- Touch-friendly UI
- Card grid adapts: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)

---

## 🛠️ Local Testing

```bash
npx serve .
# or
python3 -m http.server 8000
```

**Note:** PWA requires HTTPS or localhost

---

## ⚠️ Important Notes

1. **HTTPS Required** - PWA only works on HTTPS sites (or localhost)
2. **Host on web server** - Must be hosted (won't work as local file)
3. **Safari Required** - iOS PWA installation only works in Safari

---

## 📁 File Structure

```
faculty /
├── index.html              # Main app (PWA enabled)
├── manifest.json           # PWA configuration
├── sw.js                   # Service Worker
├── INSTALL.md              # This file
└── icons/
    ├── icon-square.png     # Source (936×936)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```
