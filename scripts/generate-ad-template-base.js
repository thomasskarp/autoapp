const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

async function buildBaseTemplate() {
  const origPath = 'C:/Users/tomas/.gemini/antigravity/brain/92a647a0-1cd2-451a-b173-37f23d119466/.user_uploaded/media_1790620895630.png'
  const img = sharp(origPath)
  const meta = await img.metadata()
  const w = meta.width
  const h = meta.height

  // SVG overlay that cleanly covers dynamic areas:
  // 1. Title area: y=182 to 260
  // 2. Car backdrop area: y=268 to 558
  // 3. Banner text area: inside pill y=568 to 604
  // 4. Card 1 text: x=48 to 275, y=628 to 702
  // 5. Card 2 text: x=298 to 525, y=628 to 702
  // 6. Card 3 text: x=48 to 275, y=718 to 792
  // 7. Card 4 text: x=298 to 525, y=718 to 792
  // 8. Footer texts: under icons y=880 to 922
  // 9. Bottom legals: y=950 to 975

  const svg = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="navyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#08172c" />
        <stop offset="100%" stop-color="#0d1d36" />
      </linearGradient>

      <linearGradient id="studioFloor" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0d1d36" />
        <stop offset="38%" stop-color="#142644" />
        <stop offset="47%" stop-color="#4d6178" />
        <stop offset="65%" stop-color="#798c9f" />
        <stop offset="100%" stop-color="#9aaab9" />
      </linearGradient>

      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e8ebef" />
        <stop offset="100%" stop-color="#d6dae0" />
      </linearGradient>

      <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#dce0e5" />
        <stop offset="100%" stop-color="#c5ccd5" />
      </linearGradient>

      <linearGradient id="footerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#c9cfd8" />
        <stop offset="100%" stop-color="#b9c0cb" />
      </linearGradient>
    </defs>

    <!-- 1. Title area mask -->
    <rect x="25" y="180" width="521" height="82" fill="url(#navyGrad)" />

    <!-- 2. Studio floor and car backdrop -->
    <rect x="40" y="266" width="491" height="292" fill="url(#studioFloor)" />

    <!-- 3. Banner text area (inside pill) -->
    <rect x="52" y="568" width="467" height="34" rx="16" fill="url(#bannerGrad)" />

    <!-- 4. Card 1 inside text -->
    <rect x="48" y="628" width="224" height="70" rx="10" fill="url(#cardGrad)" />

    <!-- 5. Card 2 inside text -->
    <rect x="298" y="628" width="224" height="70" rx="10" fill="url(#cardGrad)" />

    <!-- 6. Card 3 inside text -->
    <rect x="48" y="718" width="224" height="70" rx="10" fill="url(#cardGrad)" />

    <!-- 7. Card 4 inside text -->
    <rect x="298" y="718" width="224" height="70" rx="10" fill="url(#cardGrad)" />

    <!-- 8. Footer text under icons -->
    <rect x="25" y="880" width="135" height="38" fill="url(#footerGrad)" />
    <rect x="185" y="880" width="200" height="38" fill="url(#footerGrad)" />
    <rect x="400" y="880" width="145" height="38" fill="url(#footerGrad)" />

    <!-- 9. Legal disclaimer text -->
    <rect x="0" y="948" width="571" height="38" fill="url(#footerGrad)" />
  </svg>
  `

  const outDir = path.resolve(__dirname, '../public/templates')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  const outPath = path.join(outDir, 'ad_template_base.png')

  await sharp(origPath)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath)

  console.log('Base template created successfully at:', outPath)
}

buildBaseTemplate().catch(console.error)
