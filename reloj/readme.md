# Reloj Web App

A web-based clock and stopwatch display with support for ESPHome device integration.

## Features

- 📺 Three display modes: Clock, Stopwatch, and Sign
- ⏱ Stopwatch controls with +/- 1 min
- 📶 Connection status indicator
- 🔁 Auto-reconnect with mixed content help
- 🌓 Dark mode support
- 📲 Shareable link with QR + WhatsApp
- 💾 Installable as a PWA (works offline)

## Setup

1. **Deploy the project** to a server or GitHub Pages.
2. Access via:
https://your-site.com/?clock=http://reloj.local
Or replace `reloj.local` with the IP of your ESPHome device.

3. Allow *mixed content* in the browser if using HTTP.

## PWA Installation

Click the **"Instalar como app"** button in the share modal, or use your browser’s native install prompt.

## Development

- `index.html` — main UI
- `script.js` — all logic: connection, events, rendering
- `style.css` — LED-inspired styling, blinking, and layout
- `sw.js` — service worker for offline caching
- `manifest.webmanifest` — PWA metadata

## Browser Notes

Allow mixed content for full functionality:
- Chrome: Click lock icon → Site settings → Allow insecure content
- Firefox: Click shield icon → Disable protection
- Safari: Enable dev menu → Disable secure content restrictions

---
