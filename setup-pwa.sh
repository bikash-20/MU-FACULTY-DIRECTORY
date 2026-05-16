#!/bin/bash
# PWA Setup Script for MU ClassCraft
# Run this script to add PWA functionality to your existing index.html

echo "🛠️  Setting up MU ClassCraft PWA..."

# 1. Add PWA meta tags to index.html (after <title> tag)
PWA_META='
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#1a5c38"/>
  <meta name="description" content="MU ClassCraft - Metropolitan University Faculty Directory & More"/>
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="MU ClassCraft"/>
  <link rel="manifest" href="manifest.json"/>
  <link rel="apple-touch-icon" href="icons/icon-192.png"/>'

# Check if meta tags already exist
if ! grep -q "MU ClassCraft" index.html; then
  # Add meta tags after title line
  sed -i '' '/<title>.*<\/title>/a\'"$PWA_META" index.html
  echo "✅ Added PWA meta tags"
else
  echo "✅ PWA meta tags already present"
fi

# 2. Add Service Worker registration before </body>
SW_REGISTER='
<!-- ══ PWA SERVICE WORKER ═══════════════════════════════════════ -->
<script>
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);
          
          // Check for updates
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New content available, show notification
                if (confirm("🔄 New version of MU ClassCraft is available! Click OK to update.")) {
                  newWorker.postMessage({ type: "skipWaiting" });
                  location.reload();
                }
              }
            });
          });
        })
        .catch((err) => console.log("[PWA] SW registration failed:", err));
    });
  }
</script>'

# Check if SW already registered
if ! grep -q "serviceWorker" index.html; then
  # Add before </body>
  sed -i '' '/<\/body>/i\'"$SW_REGISTER" index.html
  echo "✅ Added Service Worker registration"
else
  echo "✅ Service Worker already registered"
fi

echo ""
echo "✅ MU ClassCraft PWA setup complete!"
echo ""
echo "📱 Next steps:"
echo "   1. Place your app icon as: icons/icon-192.png"
echo "   2. Host all files on a web server (HTTPS required for PWA)"
echo "   3. Open in Safari/Chrome on iPhone and tap Share > Add to Home Screen"