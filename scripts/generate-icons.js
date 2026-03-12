import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 48, 96, 128];

async function generateIcons() {
  const iconDir = path.join(__dirname, "..", "public", "icon");

  for (const size of sizes) {
    // API Debugger icon - bug/magnifying glass over code
    const strokeWidth = Math.max(1, size * 0.06);
    const cornerRadius = size * 0.2;
    
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#6366F1"/>
            <stop offset="50%" style="stop-color:#8B5CF6"/>
            <stop offset="100%" style="stop-color:#A855F7"/>
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#F472B6"/>
            <stop offset="100%" style="stop-color:#EC4899"/>
          </linearGradient>
        </defs>
        
        <!-- Background rounded square -->
        <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg)"/>
        
        <!-- Code brackets < > -->
        <g stroke="white" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Left bracket < -->
          <path d="M ${size * 0.28} ${size * 0.35} L ${size * 0.18} ${size * 0.5} L ${size * 0.28} ${size * 0.65}" opacity="0.6"/>
          <!-- Right bracket > -->
          <path d="M ${size * 0.72} ${size * 0.35} L ${size * 0.82} ${size * 0.5} L ${size * 0.72} ${size * 0.65}" opacity="0.6"/>
        </g>
        
        <!-- Bug icon in center -->
        <g transform="translate(${size * 0.38}, ${size * 0.32})">
          <!-- Bug body -->
          <ellipse cx="${size * 0.12}" cy="${size * 0.18}" rx="${size * 0.08}" ry="${size * 0.1}" fill="white"/>
          <!-- Bug head -->
          <circle cx="${size * 0.12}" cy="${size * 0.06}" r="${size * 0.045}" fill="white"/>
          <!-- Antenna -->
          <line x1="${size * 0.08}" y1="${size * 0.02}" x2="${size * 0.04}" y2="${size * -0.02}" stroke="white" stroke-width="${strokeWidth * 0.8}" stroke-linecap="round"/>
          <line x1="${size * 0.16}" y1="${size * 0.02}" x2="${size * 0.2}" y2="${size * -0.02}" stroke="white" stroke-width="${strokeWidth * 0.8}" stroke-linecap="round"/>
          <!-- Legs -->
          <line x1="${size * 0.04}" y1="${size * 0.12}" x2="${size * -0.02}" y2="${size * 0.1}" stroke="white" stroke-width="${strokeWidth * 0.7}" stroke-linecap="round"/>
          <line x1="${size * 0.04}" y1="${size * 0.18}" x2="${size * -0.02}" y2="${size * 0.2}" stroke="white" stroke-width="${strokeWidth * 0.7}" stroke-linecap="round"/>
          <line x1="${size * 0.04}" y1="${size * 0.24}" x2="${size * -0.02}" y2="${size * 0.28}" stroke="white" stroke-width="${strokeWidth * 0.7}" stroke-linecap="round"/>
          <line x1="${size * 0.2}" y1="${size * 0.12}" x2="${size * 0.26}" y2="${size * 0.1}" stroke="white" stroke-width="${strokeWidth * 0.7}" stroke-linecap="round"/>
          <line x1="${size * 0.2}" y1="${size * 0.18}" x2="${size * 0.26}" y2="${size * 0.2}" stroke="white" stroke-width="${strokeWidth * 0.7}" stroke-linecap="round"/>
          <line x1="${size * 0.2}" y1="${size * 0.24}" x2="${size * 0.26}" y2="${size * 0.28}" stroke="white" stroke-width="${strokeWidth * 0.7}" stroke-linecap="round"/>
        </g>
        
        <!-- Magnifying glass circle hint -->
        <circle cx="${size * 0.72}" cy="${size * 0.72}" r="${size * 0.12}" stroke="white" stroke-width="${strokeWidth}" fill="none" opacity="0.4"/>
      </svg>
    `;

    const outputPath = path.join(iconDir, `${size}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    console.log(`Generated ${size}x${size} icon`);
  }

  console.log("All icons generated!");
}

generateIcons().catch(console.error);
