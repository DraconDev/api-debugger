import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 48, 96, 128];

async function generateIcons() {
  const iconDir = path.join(__dirname, "..", "public", "icon");

  for (const size of sizes) {
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#D946EF;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
        <text 
          x="50%" 
          y="50%" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="${size * 0.45}" 
          font-weight="bold" 
          fill="white" 
          text-anchor="middle" 
          dominant-baseline="central"
        >AD</text>
      </svg>
    `;

    const outputPath = path.join(iconDir, `${size}.png`);

    await sharp(Buffer.from(svg)).png().toFile(outputPath);

    console.log(`Generated ${size}x${size} icon`);
  }

  console.log("All icons generated!");
}

generateIcons().catch(console.error);
