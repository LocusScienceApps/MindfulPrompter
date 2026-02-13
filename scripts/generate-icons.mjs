import sharp from 'sharp';
import { writeFileSync } from 'fs';

// SVG icon: indigo gradient background with a lotus/mindfulness symbol
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#4f46e5"/>
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect width="512" height="512" rx="96" ry="96" fill="url(#bg)"/>
  <!-- Lotus/meditation symbol using simple paths -->
  <!-- Center petal -->
  <ellipse cx="256" cy="240" rx="40" ry="80" fill="white" opacity="0.95" transform="rotate(0,256,280)"/>
  <!-- Left petals -->
  <ellipse cx="256" cy="240" rx="38" ry="75" fill="white" opacity="0.85" transform="rotate(-30,256,300)"/>
  <ellipse cx="256" cy="240" rx="35" ry="70" fill="white" opacity="0.7" transform="rotate(-55,256,310)"/>
  <!-- Right petals -->
  <ellipse cx="256" cy="240" rx="38" ry="75" fill="white" opacity="0.85" transform="rotate(30,256,300)"/>
  <ellipse cx="256" cy="240" rx="35" ry="70" fill="white" opacity="0.7" transform="rotate(55,256,310)"/>
  <!-- Base arc -->
  <path d="M160,320 Q256,370 352,320" stroke="white" stroke-width="6" fill="none" opacity="0.6"/>
  <!-- Small dot at center -->
  <circle cx="256" cy="260" r="8" fill="#6366f1"/>
  <!-- App name text -->
  <text x="256" y="430" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="48" font-weight="bold" fill="white" opacity="0.95">MP</text>
</svg>
`;

// Generate both sizes
for (const size of [192, 512]) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  writeFileSync(`public/icon-${size}x${size}.png`, buf);
  console.log(`Generated icon-${size}x${size}.png`);
}

// Also generate a proper favicon
const faviconBuf = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
writeFileSync('public/favicon-32x32.png', faviconBuf);
console.log('Generated favicon-32x32.png');

// Generate apple-touch-icon
const appleBuf = await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer();
writeFileSync('public/apple-touch-icon.png', appleBuf);
console.log('Generated apple-touch-icon.png');
