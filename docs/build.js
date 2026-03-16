/**
 * docs/build.js
 * Converts USER_MANUAL.md → USER_MANUAL.html and USER_MANUAL.pdf
 *
 * Usage:
 *   node docs/build.js          → builds both HTML and PDF
 *   node docs/build.js --html   → HTML only (fast, no Puppeteer)
 *
 * Requirements: run from the project root (4d-toto-app/)
 *   marked and puppeteer are already installed in backend/node_modules/
 */

const fs      = require('fs');
const path    = require('path');

const DOCS_DIR   = path.join(__dirname);
const MD_FILE    = path.join(DOCS_DIR, 'USER_MANUAL.md');
const HTML_FILE  = path.join(DOCS_DIR, 'USER_MANUAL.html');
const PDF_FILE   = path.join(DOCS_DIR, 'USER_MANUAL.pdf');
const SS_DIR     = path.join(DOCS_DIR, 'screenshots');

const htmlOnly = process.argv.includes('--html');

// ── Load marked from root node_modules ────────────────────────────────────────
const { marked } = require(path.join(__dirname, '../node_modules/marked'));

// ── Configure marked: generate GitHub-style heading IDs ───────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[`*_[\]()]/g, '')          // strip markdown chars
    .replace(/[^\w\s-]/g, '')            // remove special chars
    .replace(/\s+/g, '-')               // spaces → hyphens
    .replace(/-+/g, '-')                // collapse multiple hyphens
    .trim();
}

// Track duplicate heading IDs (same as GitHub behaviour)
const headingCounts = {};
const renderer = new marked.Renderer();

renderer.heading = function({ text, depth }) {
  const cleanText = text.replace(/<[^>]*>/g, '');   // strip any inline HTML
  const base = slugify(cleanText);
  headingCounts[base] = (headingCounts[base] || 0) + 1;
  const id   = headingCounts[base] === 1 ? base : `${base}-${headingCounts[base] - 1}`;
  const tag  = `h${depth}`;
  return `<${tag} id="${id}">${text}</${tag}>\n`;
};

// Open external links in new tab, internal anchors stay in same page
renderer.link = function({ href, title, text }) {
  const isExternal = href && !href.startsWith('#');
  const target = isExternal ? ' target="_blank" rel="noopener"' : '';
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr}${target}>${text}</a>`;
};

// Inline images — resolve relative screenshot paths to absolute file:// paths
renderer.image = function({ href, title, text }) {
  let src = href;
  if (!src.startsWith('http') && !src.startsWith('data:')) {
    const absPath = path.join(DOCS_DIR, src);
    if (fs.existsSync(absPath)) {
      // Embed as base64 so the HTML is fully self-contained (works in PDF too)
      const ext  = path.extname(absPath).slice(1).toLowerCase();
      const mime = ext === 'jpg' ? 'jpeg' : ext;
      const b64  = fs.readFileSync(absPath).toString('base64');
      src = `data:image/${mime};base64,${b64}`;
    }
  }
  const titleAttr = title ? ` title="${title}"` : '';
  return `<figure class="screenshot">
    <img src="${src}" alt="${text}"${titleAttr} />
    <figcaption>${text}</figcaption>
  </figure>`;
};

marked.setOptions({ renderer, gfm: true, breaks: false });

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --blue:     #2563eb;
    --blue-lt:  #dbeafe;
    --ink:      #0f172a;
    --muted:    #475569;
    --border:   #e2e8f0;
    --surface:  #f8fafc;
    --code-bg:  #1e293b;
    --code-fg:  #e2e8f0;
    --accent:   #e53935;
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13.5px;
    line-height: 1.75;
    color: var(--ink);
    background: #fff;
  }

  /* ── Page wrapper ── */
  .page-wrap { max-width: 960px; margin: 0 auto; padding: 0 48px 80px; }

  /* ── Cover ── */
  .cover {
    min-height: 96vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 72px 64px;
    background: linear-gradient(140deg, #0b0f1a 0%, #1a2340 55%, #0d1117 100%);
    color: #fff;
    page-break-after: always;
    margin: 0 -48px;
  }
  .cover-badge {
    display: inline-block;
    background: #2563eb22;
    border: 1px solid #2563eb55;
    color: #7eb3ff;
    padding: 5px 16px;
    border-radius: 20px;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 28px;
  }
  .cover-title { font-size: 54px; font-weight: 800; line-height: 1.1; margin-bottom: 10px; }
  .cover-title span { color: #4a8fff; }
  .cover-sub  { font-size: 19px; color: #94a3b8; margin-bottom: 44px; }
  .cover-divider { width: 56px; height: 4px; background: linear-gradient(90deg,#4a8fff,#7b9fff); border-radius: 2px; margin: 36px 0; }
  .cover-meta { display: flex; gap: 48px; flex-wrap: wrap; }
  .cover-meta-item label { display: block; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #4a8fff; margin-bottom: 4px; }
  .cover-meta-item span  { font-size: 14px; color: #cbd5e1; }
  .cover-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 36px; }
  .cover-pill  { background: #ffffff0e; border: 1px solid #ffffff1c; color: #b0bfd8; padding: 4px 14px; border-radius: 20px; font-size: 11px; }

  /* ── Table of Contents ── */
  .toc-section {
    page-break-after: always;
    padding: 64px 0 48px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 48px;
  }
  .toc-section h2 {
    font-size: 26px;
    font-weight: 800;
    color: var(--ink);
    border-bottom: 3px solid var(--blue);
    padding-bottom: 8px;
    display: inline-block;
    margin-bottom: 32px;
  }
  .toc-list { list-style: none; }
  .toc-list > li {
    display: block;
    border-bottom: 1px dotted var(--border);
    padding: 10px 0 8px;
  }
  .toc-list > li > a {
    display: block;
    font-size: 13.5px;
    color: var(--blue);
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    transition: color .15s, opacity .15s;
  }
  .toc-list > li > a:hover { color: #1d4ed8; opacity: .85; }
  .toc-sub {
    list-style: none;
    padding-left: 20px;
    margin-top: 4px;
    border-left: 2px solid var(--border);
    margin-left: 4px;
  }
  .toc-sub li {
    display: block;
    padding: 3px 0;
  }
  .toc-sub li a {
    display: block;
    font-size: 12.5px;
    color: var(--blue);
    text-decoration: underline;
    text-underline-offset: 2px;
    opacity: .72;
    cursor: pointer;
    transition: color .15s, opacity .15s;
  }
  .toc-sub li a:hover { opacity: 1; color: #1d4ed8; }

  /* ── Headings ── */
  h1 { font-size: 30px; font-weight: 800; color: var(--ink); border-bottom: 3px solid var(--blue); padding-bottom: 10px; margin: 52px 0 20px; }
  h1:first-child { margin-top: 0; }
  h2 { font-size: 20px; font-weight: 700; color: var(--ink); padding-left: 12px; border-left: 4px solid var(--blue); margin: 36px 0 12px; }
  h3 { font-size: 15px; font-weight: 700; color: #1e3a6e; margin: 24px 0 8px; }
  h4 { font-size: 13.5px; font-weight: 700; color: var(--muted); margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .5px; }

  /* ── Body copy ── */
  p             { margin-bottom: 10px; color: #1e293b; }
  ul, ol        { padding-left: 24px; margin-bottom: 10px; }
  li            { margin-bottom: 4px; }
  strong        { color: var(--ink); }
  hr            { border: none; border-top: 1px solid var(--border); margin: 36px 0; }

  /* ── Code ── */
  code {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    background: #f1f5f9;
    color: #c7254e;
    padding: 1px 5px;
    border-radius: 3px;
  }
  pre {
    background: var(--code-bg);
    color: var(--code-fg);
    padding: 16px 20px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 12px 0 18px;
    font-size: 12px;
    line-height: 1.6;
  }
  pre code { background: none; color: inherit; padding: 0; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; margin: 14px 0 20px; font-size: 12.5px; }
  th { background: var(--blue); color: #fff; padding: 8px 12px; text-align: left; font-weight: 600; }
  td { padding: 7px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:nth-child(even) td { background: var(--surface); }

  /* ── Blockquotes (used for key-lines callouts) ── */
  blockquote {
    border-left: 4px solid var(--blue);
    background: var(--surface);
    margin: 14px 0 18px;
    padding: 12px 18px;
    border-radius: 0 6px 6px 0;
    color: var(--muted);
    font-size: 13px;
  }
  blockquote strong { color: var(--ink); font-weight: 800; background: #fff3; padding: 0 2px; border-radius: 2px; }
  blockquote code   { background: #e2e8f0; }
  blockquote h3, blockquote h4 { color: var(--blue); margin: 0 0 6px; font-size: 13px; }

  /* ── Screenshots ── */
  .screenshot { margin: 20px 0; text-align: center; }
  .screenshot img { max-width: 100%; border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 2px 12px #0002; }
  .screenshot figcaption { font-size: 11px; color: var(--muted); margin-top: 6px; font-style: italic; }

  /* ── Badges ── */
  .badge-4d   { display: inline-block; background: #fce4e4; color: #b71c1c; border-radius: 4px; padding: 1px 7px; font-size: 11px; font-weight: 700; }
  .badge-toto { display: inline-block; background: #ede7f6; color: #4a148c; border-radius: 4px; padding: 1px 7px; font-size: 11px; font-weight: 700; }

  /* ── Print / PDF ── */
  @media print {
    .cover { margin: 0; }
    h1, h2 { page-break-after: avoid; }
    pre, blockquote, table, figure { page-break-inside: avoid; }
    a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 10px; color: #666; }
    a[href^="#"]::after    { content: ""; }
  }
`;

// ── Build TOC HTML from the stripped markdown body ────────────────────────────
// Skips fenced code blocks so bash comments (# Health check) are not treated
// as headings. Only includes ## numbered sections and meaningful ### subsections.
function buildTOC(mdBody) {
  const lines   = mdBody.split('\n');
  const items   = [];
  const seen    = {};
  let inCode    = false;   // inside a fenced code block?

  // h3s that should NOT appear in the TOC (too granular / OS-specific / internal)
  const SKIP_H3 = [
    /^🔑/,                              // key-lines callouts
    /^──/,                              // env-file inline section labels
    /^On Mac/i,                         // OS sub-headings
    /^On Windows/i,
    /^Mac\/Linux/i,
    /^Windows/i,
    /^From the project/i,
    /^Backend$/i,                       // generic sub-headings inside sections
    /^Web App$/i,
    /^Mobile App/i,
    /^Step \d+/i,                       // installation step sub-headings
    /^Tool \d+/i,                       // prerequisite tool sub-headings
  ];

  for (const line of lines) {
    // Toggle code-fence tracking
    if (line.trimStart().startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) continue;   // skip everything inside code blocks

    const m = line.match(/^(#{1,3})\s+(.+)/);
    if (!m) continue;

    const depth = m[1].length;
    const raw   = m[2].trim();
    const text  = raw.replace(/[`*[\]()]/g, '');

    // Only include ## and ### — skip h1 (used only for the manual title)
    if (depth === 1) continue;

    // Apply skip rules for h3
    if (depth === 3 && SKIP_H3.some(p => p.test(text))) continue;

    const base = slugify(text);
    seen[base] = (seen[base] || 0) + 1;
    const id   = seen[base] === 1 ? base : `${base}-${seen[base] - 1}`;
    items.push({ depth, text: raw, id });
  }

  // Build HTML: h2 = main entry, h3 = indented sub-entry
  let html = '<ul class="toc-list">\n';
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.depth === 2) {
      html += `<li><a href="#${item.id}">${item.text}</a>`;
      const subs = [];
      while (i + 1 < items.length && items[i + 1].depth === 3) {
        i++;
        subs.push(items[i]);
      }
      if (subs.length) {
        html += '\n<ul class="toc-sub">\n';
        for (const s of subs) {
          html += `<li><a href="#${s.id}">${s.text}</a></li>\n`;
        }
        html += '</ul>\n';
      }
      html += '</li>\n';
      i++;
    } else {
      i++;   // skip any stray h3 not under an h2 (shouldn't happen)
    }
  }
  html += '</ul>';
  return html;
}

// ── Build cover HTML ───────────────────────────────────────────────────────────
function buildCover() {
  return `
  <div class="cover">
    <span class="cover-badge">Technical Documentation</span>
    <h1 class="cover-title">SGLottery<br><span>User Manual</span></h1>
    <p class="cover-sub">Singapore 4D &amp; TOTO Ticket Scanner Application</p>
    <div class="cover-divider"></div>
    <div class="cover-meta">
      <div class="cover-meta-item"><label>Version</label><span>2.0</span></div>
      <div class="cover-meta-item"><label>Date</label><span>March 2026</span></div>
      <div class="cover-meta-item"><label>Platform</label><span>Web · Android · iOS</span></div>
    </div>
    <div class="cover-pills">
      <span class="cover-pill">React + Vite</span>
      <span class="cover-pill">React Native + Expo</span>
      <span class="cover-pill">Express.js</span>
      <span class="cover-pill">Firebase Firestore</span>
      <span class="cover-pill">Tesseract.js + OCR.Space</span>
      <span class="cover-pill">Puppeteer</span>
    </div>
  </div>`;
}

// ── Main build ─────────────────────────────────────────────────────────────────
async function build() {
  console.log('[build] Reading markdown...');
  const md = fs.readFileSync(MD_FILE, 'utf8');

  // Strip the manual's own markdown TOC block (lines 7–31) — we generate our own
  const mdBody = md
    .replace(/^## Table of Contents[\s\S]*?^---/m, '')
    .replace(/^# SGLottery.*\n.*\n.*\n/, '');   // strip title block

  console.log('[build] Converting markdown → HTML...');
  // Reset heading counter before TOC build so it matches the renderer's count
  Object.keys(headingCounts).forEach(k => delete headingCounts[k]);
  const tocHtml  = buildTOC(mdBody);   // ← same stripped body the renderer sees
  // Reset again before marked() so renderer starts from the same state
  Object.keys(headingCounts).forEach(k => delete headingCounts[k]);
  const bodyHtml = marked(mdBody);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SGLottery — User Manual v2.0</title>
  <style>${CSS}</style>
</head>
<body>

${buildCover()}

<div class="page-wrap">

  <!-- TABLE OF CONTENTS -->
  <div class="toc-section">
    <h2>Table of Contents</h2>
    ${tocHtml}
  </div>

  <!-- CONTENT -->
  <div class="content">
    ${bodyHtml}
  </div>

</div>
</body>
</html>`;

  fs.writeFileSync(HTML_FILE, html, 'utf8');
  console.log(`[build] ✅ HTML written → ${HTML_FILE}`);

  if (htmlOnly) {
    console.log('[build] --html flag set, skipping PDF.');
    return;
  }

  // ── PDF via Puppeteer ──────────────────────────────────────────────────────
  console.log('[build] Launching Puppeteer to generate PDF...');
  const puppeteer = require(path.join(__dirname, '../backend/node_modules/puppeteer'));  // puppeteer lives in backend/node_modules
  const browser   = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page      = await browser.newPage();

  await page.setDefaultNavigationTimeout(120000);
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // Small wait for images to paint
  await new Promise(r => setTimeout(r, 2000));

  await page.pdf({
    path:              PDF_FILE,
    format:            'A4',
    printBackground:   true,
    margin:            { top: '18mm', bottom: '18mm', left: '18mm', right: '18mm' },
    displayHeaderFooter: true,
    headerTemplate:    '<div></div>',
    footerTemplate:    `<div style="font-size:10px;color:#94a3b8;width:100%;text-align:center;padding:0 18mm;">
                          SGLottery User Manual v2.0 &nbsp;|&nbsp;
                          <span class="pageNumber"></span> / <span class="totalPages"></span>
                        </div>`,
  });

  await browser.close();
  console.log(`[build] ✅ PDF written → ${PDF_FILE}`);
  console.log('[build] Done.');
}

build().catch(err => {
  console.error('[build] ❌ Error:', err.message);
  process.exit(1);
});
