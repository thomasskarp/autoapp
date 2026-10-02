const sharp = require('sharp')
const path = require('path')

async function createCleanBackdrop() {
  const masterPath = 'public/templates/ad_template_master.png'
  const meta = await sharp(masterPath).metadata()
  const w = meta.width
  const h = meta.height

  // SVG mask only for the car area (x=45 to 525, y=270 to 545)
  // Left of car at x=45, y=420 is navy/floor. Right at x=525, y=420 is navy/floor.
  const svgMask = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0a182d" />
        <stop offset="42%" stop-color="#142642" />
        <stop offset="52%" stop-color="#4e627a" />
        <stop offset="70%" stop-color="#7a8d9f" />
        <stop offset="100%" stop-color="#9aaab9" />
      </linearGradient>
    </defs>

    <!-- Clean backdrop rectangle behind car -->
    <rect x="40" y="270" width="490" height="280" fill="url(#floorGrad)" />
  </svg>
  `

  const outPath = 'public/templates/ad_template_clean_backdrop.png'
  await sharp(masterPath)
    .composite([{ input: Buffer.from(svgMask), top: 0, left: 0 }])
    .png()
    .toFile(outPath)

  console.log('Clean backdrop created at:', outPath)
}

createCleanBackdrop().catch(console.error)
