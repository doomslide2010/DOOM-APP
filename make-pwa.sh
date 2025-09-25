#!/bin/bash
set -e

echo "⚡ Convirtiendo tu app en PWA + Capacitor..."

# 1. Archivos básicos de PWA
cat > public/manifest.json <<'EOF'
{
  "name": "Vega AI",
  "short_name": "VegaAI",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
EOF

cat > public/service-worker.js <<'EOF'
self.addEventListener("install", (e) => {
  console.log("Service Worker instalado");
  e.waitUntil(
    caches.open("vega-cache").then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/manifest.json"
      ]);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
EOF

# 2. Agregar los links de PWA al index.html
if ! grep -q "manifest.json" public/index.html; then
  sed -i 's|</head>|  <link rel="manifest" href="/manifest.json">\n  <script>if("serviceWorker" in navigator){navigator.serviceWorker.register("/service-worker.js");}</script>\n</head>|' public/index.html
fi

# 3. Instalar Capacitor (si no está ya instalado)
npm install @capacitor/core @capacitor/cli --save

# 4. Inicializar Capacitor (esto pregunta nombre e id si no lo pasamos)
npx cap init VegaAI com.vega.ai --web-dir=public

# 5. Instalar Android
npm install @capacitor/android --save
npx cap add android

echo "✅ PWA creada y Capacitor inicializado"
echo ""
echo "➡ Siguientes pasos:"
echo "1) Abre Android Studio: npx cap open android"
echo "2) Conecta tu teléfono o emulador y dale a 'Run'"
echo "3) Genera APK desde Build > Build Bundle(s) / APK(s)"
