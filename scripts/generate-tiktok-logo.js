const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.resolve(__dirname, '../public');
const artifactDir = 'C:/Users/tomas/.gemini/antigravity/brain/279c57ad-48c8-414f-a874-11423761e485';

// 1. Dark Luxury Oval Edition (1080x1080) - Ideal for TikTok Profile
// Font weight matches the official OKM Motors dealership emblem: clean, balanced, automotive chrome.
const svgOval = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient: Deep Obsidian Black -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#151924"/>
      <stop offset="55%" stop-color="#0A0D14"/>
      <stop offset="100%" stop-color="#030406"/>
    </radialGradient>

    <!-- Chrome Outer Rim -->
    <linearGradient id="chromeBezel" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#A2ABB8"/>
      <stop offset="22%" stop-color="#FFFFFF"/>
      <stop offset="46%" stop-color="#5B6474"/>
      <stop offset="70%" stop-color="#D7DFEA"/>
      <stop offset="88%" stop-color="#838E9F"/>
      <stop offset="100%" stop-color="#242934"/>
    </linearGradient>

    <!-- Chrome Inner Highlight -->
    <linearGradient id="chromeInner" x1="88%" y1="100%" x2="12%" y2="0%">
      <stop offset="0%" stop-color="#4F5766"/>
      <stop offset="25%" stop-color="#B8C1CD"/>
      <stop offset="50%" stop-color="#FFFFFF"/>
      <stop offset="75%" stop-color="#4F5665"/>
      <stop offset="100%" stop-color="#1A1E27"/>
    </linearGradient>

    <!-- Brushed Metallic Face -->
    <radialGradient id="silverFace" cx="44%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F2F6FA"/>
      <stop offset="35%" stop-color="#D9E1EB"/>
      <stop offset="72%" stop-color="#ACB8C8"/>
      <stop offset="100%" stop-color="#7E8B9D"/>
    </radialGradient>

    <!-- Soft Ambient Halo / Shadow -->
    <filter id="medallionShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="30" flood-color="#000000" flood-opacity="0.95"/>
    </filter>
    
    <filter id="textDepth" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.4"/>
      <feDropShadow dx="0" dy="-1" stdDeviation="1" flood-color="#FFFFFF" flood-opacity="0.7"/>
    </filter>
  </defs>

  <!-- Square Background -->
  <rect width="1080" height="1080" fill="url(#bgGrad)"/>

  <!-- Subtle TikTok Circle Safe-Zone Boundary (radius: 495px) -->
  <circle cx="540" cy="540" r="495" fill="none" stroke="#1D2333" stroke-width="2.5" stroke-opacity="0.5"/>

  <!-- Outer Bezel -->
  <g filter="url(#medallionShadow)">
    <ellipse cx="540" cy="540" rx="430" ry="275" fill="url(#chromeBezel)"/>
    <ellipse cx="540" cy="540" rx="416" ry="263" fill="#0A0E17"/>
    <ellipse cx="540" cy="540" rx="408" ry="255" fill="url(#chromeInner)"/>
    <ellipse cx="540" cy="540" rx="396" ry="245" fill="#181D29"/>
    <ellipse cx="540" cy="540" rx="388" ry="237" fill="url(#silverFace)"/>

    <!-- Subtle Curved Specular Glass Highlight -->
    <path d="M 210 480 Q 540 310 870 480 A 388 237 0 0 0 210 480 Z" fill="#FFFFFF" fill-opacity="0.28"/>

    <!-- Typography: Okmmotors -->
    <g transform="translate(540, 540)" filter="url(#textDepth)">
      <text text-anchor="middle" y="38" font-family="'Segoe UI', Roboto, -apple-system, Arial, sans-serif" font-weight="700" font-size="134" letter-spacing="-0.5">
        <tspan fill="#0C101A">Okm</tspan><tspan fill="#161C2A" font-style="italic" font-weight="600">motors</tspan>
      </text>
    </g>
  </g>
</svg>
`;

// 2. Circular Badge Edition (1080x1080) - Fills the TikTok circular avatar seamlessly
const svgCircular = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGradC" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#151924"/>
      <stop offset="55%" stop-color="#0A0D14"/>
      <stop offset="100%" stop-color="#030406"/>
    </radialGradient>

    <linearGradient id="chromeBezelC" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#A2ABB8"/>
      <stop offset="22%" stop-color="#FFFFFF"/>
      <stop offset="46%" stop-color="#5B6474"/>
      <stop offset="70%" stop-color="#D7DFEA"/>
      <stop offset="88%" stop-color="#838E9F"/>
      <stop offset="100%" stop-color="#242934"/>
    </linearGradient>

    <linearGradient id="chromeInnerC" x1="88%" y1="100%" x2="12%" y2="0%">
      <stop offset="0%" stop-color="#4F5766"/>
      <stop offset="25%" stop-color="#B8C1CD"/>
      <stop offset="50%" stop-color="#FFFFFF"/>
      <stop offset="75%" stop-color="#4F5665"/>
      <stop offset="100%" stop-color="#1A1E27"/>
    </linearGradient>

    <radialGradient id="silverFaceC" cx="44%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F2F6FA"/>
      <stop offset="35%" stop-color="#D9E1EB"/>
      <stop offset="72%" stop-color="#ACB8C8"/>
      <stop offset="100%" stop-color="#7E8B9D"/>
    </radialGradient>

    <filter id="medallionShadowC" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="30" flood-color="#000000" flood-opacity="0.95"/>
    </filter>
    
    <filter id="textDepthC" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.4"/>
      <feDropShadow dx="0" dy="-1" stdDeviation="1" flood-color="#FFFFFF" flood-opacity="0.7"/>
    </filter>
  </defs>

  <rect width="1080" height="1080" fill="url(#bgGradC)"/>

  <g filter="url(#medallionShadowC)">
    <circle cx="540" cy="540" r="440" fill="url(#chromeBezelC)"/>
    <circle cx="540" cy="540" r="424" fill="#0A0E17"/>
    <circle cx="540" cy="540" r="416" fill="url(#chromeInnerC)"/>
    <circle cx="540" cy="540" r="402" fill="#181D29"/>
    <circle cx="540" cy="540" r="394" fill="url(#silverFaceC)"/>

    <path d="M 230 460 Q 540 240 850 460 A 394 394 0 0 0 230 460 Z" fill="#FFFFFF" fill-opacity="0.28"/>

    <g transform="translate(540, 540)" filter="url(#textDepthC)">
      <text text-anchor="middle" y="40" font-family="'Segoe UI', Roboto, -apple-system, Arial, sans-serif" font-weight="700" font-size="142" letter-spacing="-0.5">
        <tspan fill="#0C101A">Okm</tspan><tspan fill="#161C2A" font-style="italic" font-weight="600">motors</tspan>
      </text>
    </g>
  </g>
</svg>
`;

async function run() {
  console.log('Rendering polished HD TikTok profile pictures...');

  const f1 = path.join(outDir, 'okmmotors_perfil_tiktok_oval.png');
  await sharp(Buffer.from(svgOval)).png({ quality: 100 }).toFile(f1);

  const f2 = path.join(outDir, 'okmmotors_perfil_tiktok_circular.png');
  await sharp(Buffer.from(svgCircular)).png({ quality: 100 }).toFile(f2);

  // Copy to artifact directory
  fs.copyFileSync(f1, path.join(artifactDir, 'okmmotors_perfil_tiktok_oval.png'));
  fs.copyFileSync(f2, path.join(artifactDir, 'okmmotors_perfil_tiktok_circular.png'));

  console.log('Done!');
}

run().catch(console.error);
