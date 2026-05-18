<div align="center">

<img src="icons/icon-192.png" alt="MU ClassCraft Logo" width="96" height="96" style="border-radius:20px"/>

# MU ClassCraft
### Faculty Directory — Progressive Web App

**Metropolitan University, Sylhet · Bangladesh**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-1a5c38?style=for-the-badge&logo=vercel)](https://mu-faculty-directory.vercel.app)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-c9a84c?style=for-the-badge)](LICENSE)
[![Made with Love](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F%20for%20MU%20Students-ff6b6b?style=for-the-badge)](https://metropolitan.ac.bd)

</div>

---

## 🌟 About This Project

**MU ClassCraft** is a community-built, open-source Progressive Web App I developed independently to help students at Metropolitan University instantly find faculty contact details, departments, designations, and qualifications — without navigating clunky university portals.

This is a **real-world, production-deployed application** used by students daily. It is not a classroom assignment or tutorial project. Everything — design, data collection, architecture, PWA implementation — was researched, built, and maintained by me from scratch.

> *I built this because I believe every student deserves fast, easy access to the people who teach them. When I leave for higher studies, I hope this keeps serving the university community.*

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔍 **Smart Search** | Real-time filter by name, department, and designation |
| 🏛️ **8 Departments** | CSE, SWE, EEE, Data Science, English, Business Admin, Economics, Law & Justice |
| 👨‍🏫 **138+ Faculty** | Comprehensive profiles with qualifications, specializations & email |
| 📱 **Installable PWA** | Works like a native app on Android, iPhone, Windows, macOS |
| ⚡ **Offline-First** | Full offline access after the first visit |
| 🔄 **Auto Updates** | Users see an update toast — no manual cache clearing needed |
| 🛠️ **Student Tools** | Built-in Cover Page Generator for lab reports & assignments |
| 🎨 **Dept. Color Coding** | Each department has a distinct visual identity |
| 🔔 **Push Ready** | Infrastructure in place for server-side push notifications |
| 🗃️ **IndexedDB Hooks** | Background sync wired for future database integration |
| 🍎 **iOS Support** | Custom install guide for Safari users |

---

## 🖥️ Screenshots

<div align="center">

| Hero & Stats | Faculty Cards | Student Tools |
|:---:|:---:|:---:|
| *(Home screen with live faculty count)* | *(Colour-coded dept. cards)* | *(Cover page generator link)* |

</div>

---

## 🗂️ Project Structure

```
mu-classcraft/
├── index.html          # App shell — all UI, FACULTY data array, logic
├── sw.js               # Service worker: caching, updates, background sync
├── manifest.json       # PWA manifest: icons, theme, shortcuts, display modes
└── icons/
    ├── icon-72.png     ─┐
    ├── icon-96.png      │
    ├── icon-128.png     │  All required PWA icon sizes
    ├── icon-144.png     │  for Android, iOS, Windows
    ├── icon-152.png     │
    ├── icon-192.png     │
    ├── icon-384.png     │
    ├── icon-512.png    ─┘
    └── icon-square.png  ← Maskable icon (Android adaptive)
```

---

## 🚀 Getting Started

### View Locally

No build step. No npm. No framework. Just open the file:

```bash
git clone https://github.com/your-username/mu-classcraft.git
cd mu-classcraft

# Option 1 — Python (built-in)
python -m http.server 8000

# Option 2 — Node.js
npx serve .

# Then open http://localhost:8000
```

> ⚠️ Service Workers require `localhost` or `https://` — opening `index.html` directly as a `file://` URL will register the SW but some features may behave differently.

### Deploy Your Own

1. Fork this repository
2. Connect to [Vercel](https://vercel.com) → Import Project
3. No build settings needed — it's a pure static site
4. Vercel provides HTTPS automatically ✅

```bash
# Push an update
git add .
git commit -m "feat: add new faculty data"
git push
# ↑ Vercel deploys in ~30 seconds. Users see the update toast automatically.
```

---

## ⚙️ Service Worker Architecture

```
Page Load
    │
    ├─ HTML document    → Network-First  (always fresh when online)
    │                      └─ Cache fallback if offline
    │
    ├─ CDN assets       → Stale-While-Revalidate
    │  (Bootstrap, Fonts)   └─ Serve cache instantly, update in background
    │
    ├─ Images           → Cache-First    (long TTL, bandwidth-efficient)
    │
    └─ Local JS/CSS     → Cache-First    (instant from cache)
```

**Update flow:**
```
You push to GitHub
    → Vercel deploys (~30s)
    → SW polls for update (every 60s or on page load)
    → New SW downloads silently in background
    → "New version ready — Refresh" toast appears
    → User clicks Refresh → instant reload with new content
```

---

## 🗃️ Extending the App

### Add Faculty Data

Faculty data lives in a plain JavaScript array inside `index.html`:

```js
const FACULTY = [
  {
    name: "Dr. Example Name",
    designation: "Associate Professor",
    department: "CSE",
    departmentFull: "Department of Computer Science & Engineering",
    email: "example@metrouni.edu.bd",
    phone: "",
    qualifications: ["PhD in CS, Some University"],
    specialization: "Machine Learning, Computer Vision"
  },
  // ...
];
```

### Bump Cache Version on Deploy

```js
// sw.js — line 17
const CACHE_VERSION = 'v1.0.1';  // ← increment on every deploy
```

### Add a New Department

```js
// In getDeptClass()
const map = {
  CSE: 'dept-cse',
  NEW: 'dept-new',   // ← add here
  // ...
};

// Then add CSS for .dept-new .card-accent-strip, .dept-new .card-top, etc.
```

---

## 📲 Installation Guide

| Platform | Browser | Method |
|---|---|---|
| **Android** | Chrome / Edge | Install banner appears automatically |
| **iPhone / iPad** | Safari | Tap **Share ⬆** → *Add to Home Screen* |
| **Windows** | Chrome / Edge | Click ⊕ install icon in address bar |
| **macOS** | Chrome | Click ⊕ install icon in address bar |
| **Linux** | Chrome | Click ⊕ install icon in address bar |

---

## 🛠️ Tech Stack

This project intentionally uses **zero dependencies** beyond CDN-delivered UI libraries:

| Layer | Technology | Why |
|---|---|---|
| **Structure** | HTML5 / CSS3 / Vanilla JS | No build step, maximum portability |
| **UI Components** | Bootstrap 5.3 | Responsive grid + accessible components |
| **Icons** | Bootstrap Icons 1.11 | Consistent icon set |
| **Typography** | Google Fonts (Playfair Display + DM Sans) | Elegant pairing |
| **PWA** | Service Worker API + Web App Manifest | Native-like install & offline |
| **Hosting** | Vercel | Free, HTTPS, auto-deploy from GitHub |

---

## 🗺️ Roadmap

- [x] Faculty directory with search & filter
- [x] PWA — installable + offline
- [x] Auto-update via service worker
- [x] Cover Page Generator (Student Tools)
- [ ] Class routine viewer (per department & semester)
- [ ] Department notice board
- [ ] Academic calendar
- [ ] Dark mode

---

## 🤝 Contributing

Contributions are welcome — especially faculty data corrections and additions.

1. Fork the repository
2. Create a branch: `git checkout -b fix/faculty-data`
3. Commit your changes: `git commit -m "fix: update CSE faculty list"`
4. Push and open a Pull Request

For data corrections or additions, please open an **Issue** with the correct information.

---

## 👤 Author

**Bikash Talukder** *(or your name)*
Student, Metropolitan University Sylhet

> *This project was built independently, outside of any coursework, as a free resource for fellow students. If it helped you, consider giving it a ⭐ — it means a lot.*

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
The faculty data is publicly available information sourced from the Metropolitan University official website.

---

<div align="center">

**Metropolitan University, Sylhet, Bangladesh**
[metropolitan.ac.bd](https://metropolitan.ac.bd)

*Built with ❤️ for the students of Metropolitan University*

</div>
