// Generates Prepfly advertising banners as crisp PNGs (from brand SVGs).
// Run from repo root:  node scripts/build-ads.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "web", "public", "ads");

const TEAL = "#0EA5A0";
const INDIGO = "#4F46E5";
const AMBER = "#FBBF24";
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// Prepfly paper-plane mark (from logo.svg, 100x100 space) — white, amber spark.
function logoMark(x, y, scale) {
  return `<g transform="translate(${x},${y}) scale(${scale})">
    <path d="M75.5 24.5a2.5 2.5 0 00-2.67-.56l-45 17.5a2.5 2.5 0 00.18 4.69l20.06 6.68 6.68 20.06a2.5 2.5 0 004.69.18l17.5-45a2.5 2.5 0 00-.56-2.67zM65.66 34.34l-19.68 19.68-13.16-4.39L65.66 34.34zM50.37 65.17l-4.39-13.16 19.68-19.68L50.37 65.17z" fill="#fff"/>
    <circle cx="78" cy="22" r="7" fill="${AMBER}"/>
  </g>`;
}

// Amber check bullet + white label
function check(x, y, text, fontSize) {
  const r = fontSize * 0.46;
  return `<circle cx="${x + r}" cy="${y - r * 0.7}" r="${r}" fill="${AMBER}"/>
    <path d="M${x + r * 0.5} ${y - r * 0.75} l${r * 0.35} ${r * 0.4} l${r * 0.7} ${-r * 0.9}" stroke="#1f2937" stroke-width="${r * 0.28}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${x + r * 2.6}" y="${y}" font-family="${FONT}" font-size="${fontSize}" font-weight="600" fill="#fff">${text}</text>`;
}

const defs = (w, h) => `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${TEAL}"/><stop offset="1" stop-color="${INDIGO}"/>
  </linearGradient>
</defs>`;

function pill(cx, y, w, h, label, fontSize) {
  return `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff"/>
    <text x="${cx}" y="${y + h / 2 + fontSize * 0.35}" text-anchor="middle" font-family="${FONT}" font-size="${fontSize}" font-weight="800" fill="${INDIGO}">${label}</text>`;
}

// ── 1080 × 1080  (Instagram / WhatsApp square) ──────────────────────────────
const square = `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
${defs(1080, 1080)}
<rect width="1080" height="1080" fill="url(#bg)"/>
<circle cx="960" cy="120" r="280" fill="#fff" opacity="0.06"/>
<circle cx="120" cy="1010" r="320" fill="#fff" opacity="0.05"/>
${logoMark(84, 78, 0.74)}
<text x="172" y="150" font-family="${FONT}" font-size="60" font-weight="800" fill="#fff">Prepfly</text>
<rect x="724" y="96" width="270" height="56" rx="28" fill="${AMBER}"/>
<text x="859" y="133" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="800" fill="#1f2937">FREE DURING BETA</text>

<text x="86" y="380" font-family="${FONT}" font-size="78" font-weight="700" fill="#fff">Score</text>
<text x="84" y="600" font-family="${FONT}" font-size="220" font-weight="900" fill="${AMBER}">79+</text>
<text x="90" y="690" font-family="${FONT}" font-size="58" font-weight="700" fill="#fff">in PTE Academic</text>

${check(92, 790, "AI scoring for Speaking &amp; Writing", 38)}
${check(92, 858, "All 20+ PTE question types", 38)}
${check(92, 926, "Mock tests, predictions &amp; analytics", 38)}

${pill(540, 985, 720, 78, "Start free  →  getprepfly.com", 32)}
</svg>`;

// ── 1080 × 1920  (Instagram / WhatsApp story) ───────────────────────────────
const story = `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
${defs(1080, 1920)}
<rect width="1080" height="1920" fill="url(#bg)"/>
<circle cx="980" cy="260" r="340" fill="#fff" opacity="0.06"/>
<circle cx="80" cy="1650" r="360" fill="#fff" opacity="0.05"/>
${logoMark(380, 150, 1.0)}
<text x="540" y="370" text-anchor="middle" font-family="${FONT}" font-size="72" font-weight="800" fill="#fff">Prepfly</text>
<rect x="380" y="410" width="320" height="60" rx="30" fill="${AMBER}"/>
<text x="540" y="450" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="800" fill="#1f2937">FREE DURING BETA</text>

<text x="540" y="700" text-anchor="middle" font-family="${FONT}" font-size="92" font-weight="700" fill="#fff">Score</text>
<text x="540" y="980" text-anchor="middle" font-family="${FONT}" font-size="300" font-weight="900" fill="${AMBER}">79+</text>
<text x="540" y="1080" text-anchor="middle" font-family="${FONT}" font-size="70" font-weight="700" fill="#fff">in PTE Academic</text>

${check(230, 1280, "AI Speaking &amp; Writing scoring", 44)}
${check(230, 1370, "All 20+ question types", 44)}
${check(230, 1460, "Full timed mock tests", 44)}
${check(230, 1550, "Predictions, vocab &amp; analytics", 44)}

${pill(540, 1700, 760, 96, "Start free  →  getprepfly.com", 38)}
<text x="540" y="1850" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="600" fill="#e0e7ff">Speaking · Writing · Reading · Listening</text>
</svg>`;

// ── 1200 × 630  (Facebook / web / link preview) ─────────────────────────────
const wide = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
${defs(1200, 630)}
<rect width="1200" height="630" fill="url(#bg)"/>
<circle cx="1120" cy="90" r="220" fill="#fff" opacity="0.06"/>
<circle cx="80" cy="600" r="240" fill="#fff" opacity="0.05"/>
${logoMark(70, 60, 0.62)}
<text x="146" y="118" font-family="${FONT}" font-size="48" font-weight="800" fill="#fff">Prepfly</text>

<text x="72" y="290" font-family="${FONT}" font-size="68" font-weight="700" fill="#fff">Score <tspan font-size="120" font-weight="900" fill="${AMBER}">79+</tspan></text>
<text x="72" y="360" font-family="${FONT}" font-size="46" font-weight="700" fill="#fff">in PTE Academic — powered by AI</text>

${check(74, 450, "20+ question types", 32)}
${check(74, 508, "AI Speaking &amp; Writing scoring", 32)}
${check(620, 450, "Full mock tests", 32)}
${check(620, 508, "Free during beta", 32)}

${pill(980, 545, 380, 64, "getprepfly.com", 30)}
</svg>`;

const banners = [
  { name: "prepfly-ad-square-1080", svg: square },
  { name: "prepfly-ad-story-1080x1920", svg: story },
  { name: "prepfly-ad-wide-1200x630", svg: wide },
];

await mkdir(OUT, { recursive: true });
for (const b of banners) {
  await writeFile(join(OUT, `${b.name}.svg`), b.svg, "utf8");
  await sharp(Buffer.from(b.svg)).png({ quality: 100 }).toFile(join(OUT, `${b.name}.png`));
  console.log("✓", b.name);
}
console.log("\nBanners written to apps/web/public/ads/");
