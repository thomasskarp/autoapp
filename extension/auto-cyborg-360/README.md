# 🧩 Auto-Cyborg 360 Chrome Extension (v1.0.0)

Companion browser automation extension for automotive sales advisors and social media managers. Enables single-click DOM autocompletion across Facebook Marketplace, Instagram, and WhatsApp Web directly from AutoApp inventory.

---

### 📦 Quick Installation Guide (1 Minute)

1. Open Google Chrome, Brave, or Microsoft Edge.
2. Navigate to:
   ```text
   chrome://extensions
   ```
3. In the top right corner, enable **"Developer mode"**.
4. Click **"Load unpacked"**.
5. Select the extension directory:
   ```text
   autoapp/extension/auto-cyborg-360
   ```
6. Done! The Auto-Cyborg 360 icon will appear in your browser extensions toolbar.

---

### 🚀 Usage from AutoApp

1. Inside the AutoApp dashboard, navigate to the **Stock** module.
2. On any vehicle card, click the **"Publish"** action button (megaphone icon).
3. Select **Facebook Marketplace**, **Instagram Feed**, or **WhatsApp Status**.
4. AutoApp automatically launches the target portal injecting vehicle metadata via hash bridge (`#autoapp=...`, `#autoapp_ig=...`, `#autoapp_wa=...`).
5. Auto-Cyborg 360 detects the payload, copies the formatted copy and photos to your clipboard, and displays an assisted completion overlay.
