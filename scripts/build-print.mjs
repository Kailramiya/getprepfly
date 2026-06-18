// Generates PRINT-READY Prepfly posters (vector SVG + 300-DPI PNG) with a QR code.
// Run from repo root:  node scripts/build-print.mjs
import sharp from "sharp";
import QRCode from "qrcode";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "web", "public", "ads", "print");

const TEAL = "#0EA5A0";
const INDIGO = "#4F46E5";
const AMBER = "#FBBF24";
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const SITE = "getprepfly.com";

// ---- EDIT YOUR CENTRE CONTACT HERE (or leave the placeholders) -------------
const CONTACT = {
  phone: "+91 98XXX XXXXX",
  handle: "@prepfly",
  // address shown only on portrait/standee; keep short
  address: "Your Centre Name, City",
};

const PLANE = `<path d="M75.5 24.5a2.5 2.5 0 00-2.67-.56l-45 17.5a2.5 2.5 0 00.18 4.69l20.06 6.68 6.68 20.06a2.5 2.5 0 004.69.18l17.5-45a2.5 2.5 0 00-.56-2.67zM65.66 34.34l-19.68 19.68-13.16-4.39L65.66 34.34zM50.37 65.17l-4.39-13.16 19.68-19.68L50.37 65.17z" fill="#fff"/><circle cx="78" cy="22" r="7" fill="${AMBER}"/>`;

const logoMark = (x, y, scale) => `<g transform="translate(${x},${y}) scale(${scale})">${PLANE}</g>`;

const defs = (w, h) => `<defs><linearGradient id="bg" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${TEAL}"/><stop offset="1" stop-color="${INDIGO}"/></linearGradient></defs>`;

// amber check bullet + white label (left-aligned at x, text baseline y)
function check(x, y, text, fs) {
  const r = fs * 0.5;
  return `<circle cx="${x + r}" cy="${y - r * 0.7}" r="${r}" fill="${AMBER}"/>
  <path d="M${x + r * 0.55} ${y - r * 0.72} l${r * 0.32} ${r * 0.4} l${r * 0.7} ${-r * 0.95}" stroke="#1f2937" stroke-width="${r * 0.26}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="${x + r * 2.7}" y="${y}" font-family="${FONT}" font-size="${fs}" font-weight="600" fill="#fff">${text}</text>`;
}

// White QR card: square QR image + caption to the right
function qrCard(x, y, w, h, qr, fs) {
  const pad = h * 0.12;
  const qrS = h - pad * 2;
  const tx = x + qrS + pad * 1.6;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h * 0.14}" fill="#fff"/>
  <image x="${x + pad}" y="${y + pad}" width="${qrS}" height="${qrS}" href="${qr}"/>
  <text x="${tx}" y="${y + h * 0.42}" font-family="${FONT}" font-size="${fs}" font-weight="800" fill="${INDIGO}">Scan to start FREE</text>
  <text x="${tx}" y="${y + h * 0.42 + fs * 1.25}" font-family="${FONT}" font-size="${fs * 0.82}" font-weight="600" fill="#475569">${SITE}</text>`;
}

const BENEFITS = [
  "All 20+ PTE question types",
  "AI Speaking &amp; Writing scoring",
  "Full mock tests &amp; predictions",
  "Vocabulary, templates &amp; analytics",
  "Practice on web &amp; mobile",
];

// ── PORTRAIT (A4 / A3 share aspect ratio √2) — authored at A4 @300dpi ────────
function portrait() {
  const W = 2480, H = 3508, M = 200;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
${defs(W, H)}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="${W - 120}" cy="320" r="640" fill="#fff" opacity="0.06"/>
<circle cx="120" cy="${H - 200}" r="700" fill="#fff" opacity="0.05"/>

${logoMark(M, 200, 2.0)}
<text x="${M + 250}" y="370" font-family="${FONT}" font-size="150" font-weight="800" fill="#fff">Prepfly</text>
<rect x="${W - M - 560}" y="250" width="560" height="110" rx="55" fill="${AMBER}"/>
<text x="${W - M - 280}" y="325" text-anchor="middle" font-family="${FONT}" font-size="50" font-weight="800" fill="#1f2937">FREE DURING BETA</text>

<text x="${M}" y="900" font-family="${FONT}" font-size="200" font-weight="700" fill="#fff">Score</text>
<text x="${M - 20}" y="1500" font-family="${FONT}" font-size="640" font-weight="900" fill="${AMBER}">79+</text>
<text x="${M}" y="1680" font-family="${FONT}" font-size="150" font-weight="700" fill="#fff">in PTE Academic</text>
<text x="${M}" y="1810" font-family="${FONT}" font-size="76" font-weight="500" fill="#e0e7ff">AI-powered practice for Speaking, Writing, Reading &amp; Listening</text>

${BENEFITS.map((b, i) => check(M + 10, 2060 + i * 175, b, 84)).join("\n")}

${qrCard(M, 2840, 1500, 430, "__QR__", 76)}
<text x="${W - M}" y="${2840 + 250}" text-anchor="end" font-family="${FONT}" font-size="64" font-weight="800" fill="#fff">${SITE}</text>

<text x="${W / 2}" y="${H - 110}" text-anchor="middle" font-family="${FONT}" font-size="54" font-weight="600" fill="#e0e7ff">Call ${CONTACT.phone}   ·   ${CONTACT.address}   ·   ${CONTACT.handle}</text>
</svg>`;
}

// ── LANDSCAPE (flex / hoarding) 2:1 — big & readable from distance ──────────
function landscape() {
  const W = 3600, H = 1800, M = 200;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
${defs(W, H)}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="${W - 100}" cy="120" r="520" fill="#fff" opacity="0.06"/>
<circle cx="100" cy="${H - 60}" r="560" fill="#fff" opacity="0.05"/>

${logoMark(M, 150, 1.9)}
<text x="${M + 240}" y="310" font-family="${FONT}" font-size="140" font-weight="800" fill="#fff">Prepfly</text>

<text x="${M}" y="820" font-family="${FONT}" font-size="180" font-weight="700" fill="#fff">Score <tspan font-size="300" font-weight="900" fill="${AMBER}">79+</tspan></text>
<text x="${M}" y="960" font-family="${FONT}" font-size="130" font-weight="700" fill="#fff">in PTE Academic — powered by AI</text>

${check(M + 10, 1180, BENEFITS[0], 80)}
${check(M + 10, 1320, BENEFITS[1], 80)}
${check(M + 10, 1460, BENEFITS[2], 80)}

${qrCard(W - M - 1180, 1120, 1180, 460, "__QR__", 78)}
<rect x="${W - M - 560}" y="250" width="560" height="110" rx="55" fill="${AMBER}"/>
<text x="${W - M - 280}" y="325" text-anchor="middle" font-family="${FONT}" font-size="50" font-weight="800" fill="#1f2937">FREE DURING BETA</text>
<text x="${M}" y="${H - 90}" font-family="${FONT}" font-size="58" font-weight="600" fill="#e0e7ff">Call ${CONTACT.phone}   ·   ${CONTACT.address}   ·   ${SITE}</text>
</svg>`;
}

// ── TALL (standee / roll-up) ~1 : 2.4 ───────────────────────────────────────
function standee() {
  const W = 1500, H = 3600, M = 140;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
${defs(W, H)}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="${W - 40}" cy="360" r="520" fill="#fff" opacity="0.06"/>
<circle cx="60" cy="${H - 120}" r="560" fill="#fff" opacity="0.05"/>

${logoMark(W / 2 - 240, 200, 1.7)}
<text x="${W / 2 + 30}" y="350" text-anchor="middle" font-family="${FONT}" font-size="130" font-weight="800" fill="#fff">Prepfly</text>
<rect x="${W / 2 - 280}" y="430" width="560" height="104" rx="52" fill="${AMBER}"/>
<text x="${W / 2}" y="500" text-anchor="middle" font-family="${FONT}" font-size="48" font-weight="800" fill="#1f2937">FREE DURING BETA</text>

<text x="${W / 2}" y="900" text-anchor="middle" font-family="${FONT}" font-size="190" font-weight="700" fill="#fff">Score</text>
<text x="${W / 2}" y="1380" text-anchor="middle" font-family="${FONT}" font-size="560" font-weight="900" fill="${AMBER}">79+</text>
<text x="${W / 2}" y="1540" text-anchor="middle" font-family="${FONT}" font-size="130" font-weight="700" fill="#fff">in PTE Academic</text>

${BENEFITS.map((b, i) => check(M + 40, 1820 + i * 165, b, 70)).join("\n")}

${qrCard(M, 2780, W - 2 * M, 420, "__QR__", 72)}
<text x="${W / 2}" y="${H - 120}" text-anchor="middle" font-family="${FONT}" font-size="52" font-weight="600" fill="#e0e7ff">${CONTACT.phone} · ${SITE}</text>
</svg>`;
}

// ── Build ───────────────────────────────────────────────────────────────────
const qr = await QRCode.toDataURL(`https://${SITE}`, { margin: 1, width: 640, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } });

const portraitSvg = portrait().replaceAll("__QR__", qr);
const landscapeSvg = landscape().replaceAll("__QR__", qr);
const standeeSvg = standee().replaceAll("__QR__", qr);

const jobs = [
  // A4 & A3 reuse the portrait artwork; exported at their own 300-DPI pixel sizes
  { name: "prepfly-print-A4-portrait", svg: portraitSvg, px: { width: 2480, height: 3508 } },
  { name: "prepfly-print-A3-portrait", svg: portraitSvg, px: { width: 3508, height: 4961 } },
  { name: "prepfly-print-flex-hoarding-2x1", svg: landscapeSvg, px: { width: 3600, height: 1800 } },
  { name: "prepfly-print-standee-rollup", svg: standeeSvg, px: { width: 1500, height: 3600 } },
];

await mkdir(OUT, { recursive: true });
for (const j of jobs) {
  await writeFile(join(OUT, `${j.name}.svg`), j.svg, "utf8");
  await sharp(Buffer.from(j.svg), { density: 300 }).resize(j.px).png().toFile(join(OUT, `${j.name}.png`));
  console.log("✓", j.name, `${j.px.width}×${j.px.height}`);
}
console.log("\nPrint files written to apps/web/public/ads/print/");
