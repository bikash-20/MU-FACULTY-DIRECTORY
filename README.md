# 🎓 MU ClassCraft — Faculty Directory PWA

> **Metropolitan University** · Progressive Web App · Faculty Directory

A fast, offline-capable Progressive Web App for browsing Metropolitan University faculty by department and designation. Installable on **Android, iPhone, Windows, macOS, and Linux** — no app store required.

---

## ✨ Features

- 🔍 **Search & Filter** — Browse faculty by department and designation
- 📱 **Installable** — Works like a native app on all platforms
- ⚡ **Instant Load** — App shell cached for near-instant startup
- 🌐 **Offline Ready** — Full offline access after first visit
- 🔄 **Auto Updates** — Users see an update toast when new content is deployed; no manual cache clearing needed
- 🔔 **Push Notifications** — Infrastructure ready for server-side push
- 🗃️ **IndexedDB Ready** — Background sync hooks wired in the service worker for future database integration
- 🍎 **iOS Support** — Custom install instructions for Safari users

---

## 📁 Project Structure

```
your-repo/
├── index.html          # Main app shell + UI
├── sw.js               # Service worker (caching, updates, sync)
├── manifest.json       # PWA manifest (icons, colors, shortcuts)
└── icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    ├── icon-512.png
    └── icon-square.png   ← maskable icon for Android
```

---

## 🚀 Deployment (GitHub + Vercel)

This project is deployed via **Vercel** connected to this GitHub repository. Every push to `main` triggers an automatic deployment.

### First-time setup

1. Fork or clone this repository
2. Connect the repo to [Vercel](https://vercel.com) (import project)
3. No build settings needed — it's a static site
4. Vercel provides HTTPS automatically, which is required for PWA/Service Workers

### Deploy an update

```bash
# Edit your files, then:
git add .
git commit -m "Update faculty data"
git push
```

Vercel deploys in ~30 seconds. Users already on the site will see the **"New version ready — Refresh"** toast automatically.

---

## 🔄 How Updates Work

The service worker uses **`skipWaiting` + `clients.claim()`** so updates are instant:

1. You push a change to GitHub → Vercel deploys
2. The SW checks for updates every **60 seconds** (and on every page load)
3. New SW downloads silently in the background
4. An **update toast** appears top-right: *"New version ready! Refresh"*
5. User clicks Refresh → page reloads with new content immediately

### To force a new cache version

Open `sw.js` and bump the version string at the top:

```js
// Line 17 in sw.js
const CACHE_VERSION = 'v1.0.1';  // ← change this on every deploy
```

This invalidates all old caches and forces every user to download fresh assets.

---

## 📲 Install Instructions by Platform

| Platform | Browser | How to Install |
|----------|---------|----------------|
| Android | Chrome / Edge | Install banner appears automatically |
| iPhone / iPad | Safari | Tap **Share ⬆** → "Add to Home Screen" |
| Windows | Chrome / Edge | Click install icon in address bar |
| macOS | Chrome | Click install icon in address bar |
| Linux | Chrome | Click install icon in address bar |

> **Note:** The install banner on iOS shows a step-by-step guide automatically since Safari doesn't support the `beforeinstallprompt` event.

---

## ⚙️ Service Worker Caching Strategy

| Resource Type | Strategy | Cache Name |
|---------------|----------|------------|
| HTML pages | Network-First → cache fallback | `mu-static-vX` |
| CDN assets (Bootstrap, fonts) | Stale-While-Revalidate | `mu-dynamic-vX` |
| Images | Cache-First | `mu-images-vX` |
| Local JS / CSS | Cache-First | `mu-static-vX` |

Old caches from previous versions are **automatically deleted** on SW activation.

---

## 🗃️ IndexedDB Integration (Coming Soon)

Background sync hooks are already wired in `sw.js`. When you're ready to add IndexedDB:

1. Open `sw.js` and find the `sync` event handler
2. Add your IndexedDB → API sync logic inside `syncPendingData()`
3. From the main thread, register a sync tag:

```js
// In index.html or your app JS
const reg = await navigator.serviceWorker.ready;
await reg.sync.register('mu-data-sync');
```

The service worker will call your sync function when the user comes back online.

---

## 🔔 Push Notifications

The service worker handles push events and `notificationclick` out of the box. To send a push notification from your server:

```json
{
  "title": "MU ClassCraft",
  "body": "Faculty list has been updated!",
  "icon": "/icons/icon-192.png",
  "url": "/index.html"
}
```

You'll need a VAPID key pair and a push server (e.g. [web-push](https://github.com/web-push-libs/web-push) for Node.js) to send notifications.

---

## 🛠️ Tech Stack

- **HTML / CSS / Vanilla JS** — no framework, no build step
- **Bootstrap 5.3** — UI components and grid
- **Bootstrap Icons 1.11** — icon set
- **Google Fonts** — Playfair Display + DM Sans
- **Service Worker API** — caching and background sync
- **Web App Manifest** — installability
- **Vercel** — hosting and CI/CD

---

## 📞 Contact

**Metropolitan University**  
Sylhet, Bangladesh  
[metropolitan.ac.bd](https://metropolitan.ac.bd)

---

*Built with ❤️ for Metropolitan University*
