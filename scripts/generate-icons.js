import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 48, 96, 128];

async function generateIcons() {
  const iconDir = path.join(__dirname, "..", "public", "icon");

  for (const size of sizes) {
    const sw = Math.max(1.5, size * 0.06);
    const cr = size * 0.22;
    
    // Clean API/Debug icon - HTTP request/response arrows with debug dots
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5"/>
            <stop offset="100%" style="stop-color:#7C3AED"/>
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="${size}" height="${size}" rx="${cr}" fill="url(#bg)"/>
        
        <!-- HTTP arrows icon -->
        <g stroke="white" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Outgoing arrow (request) -->
          <path d="M ${size * 0.22} ${size * 0.35} L ${size * 0.42} ${size * 0.35} L ${size * 0.35} ${size * 0.28}" />
          <line x1="${size * 0.42}" y1="${size * 0.35}" x2="${size * 0.42}" y2="${size * 0.48}"/>
          
          <!-- Incoming arrow (response) -->
          <path d="M ${size * 0.78} ${size * 0.65} L ${size * 0.58} ${size * 0.65} L ${size * 0.65} ${size * 0.72}" />
          <line x1="${size * 0.58}" y1="${size * 0.52}" x2="${size * 0.58}" y2="${size * 0.65}"/>
          
          <!-- Connection dots -->
          <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.06}" fill="white" stroke="none"/>
          <circle cx="${size * 0.3}" cy="${size * 0.5}" r="${size * 0.035}" fill="white" stroke="none" opacity="0.7"/>
          <circle cx="${size * 0.7}" cy="${size * 0.5}" r="${size * 0.035}" fill="white" stroke="none" opacity="0.7"/>
        </g>
        
        <!-- Status indicator dot -->
        <circle cx="${size * 0.78}" cy="${size * 0.28}" r="${size * 0.08}" fill="#34D399"/>
      </svg>
    `;

    const outputPath = path.join(iconDir, `${size}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    console.log(`Generated ${size}x${size} icon`);
  }

  console.log("All icons generated!");
}

generateIcons().catch(console.error);
