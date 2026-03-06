#!/usr/bin/env node
/**
 * generate-manifest.js
 *
 * Run this from your repo root whenever you add new photos:
 *   node generate-manifest.js
 *
 * It scans ./photos/** for image files and writes ./photos/manifest.json
 * Commit both the images AND the updated manifest.json to your repo.
 *
 * GitHub Actions can also run this automatically on push — see README note below.
 */

const fs   = require('fs');
const path = require('path');

const PHOTOS_DIR    = path.join(__dirname, 'photos');
const MANIFEST_PATH = path.join(PHOTOS_DIR, 'manifest.json');
const IMAGE_EXTS    = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff']);

function scanDir(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...scanDir(full, rel));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        const stat = fs.statSync(full);
        results.push({
          // path relative to /photos/ — use as src in HTML: /photos/<relativePath>
          relativePath: rel,
          filename:     entry.name,
          folder:       base || '/',
          sizeBytes:    stat.size,
          // mtime lets you sort by "date added to repo" as a fallback
          addedAt:      stat.mtime.toISOString(),
        });
      }
    }
  }

  return results;
}

// ── Run ──────────────────────────────────────────────────────────────────────
if (!fs.existsSync(PHOTOS_DIR)) {
  console.error(`photos/ directory not found at ${PHOTOS_DIR}`);
  process.exit(1);
}

const images = scanDir(PHOTOS_DIR);

// Preserve existing manifest entries so we don't clobber addedAt dates
let existing = {};
if (fs.existsSync(MANIFEST_PATH)) {
  try {
    const prev = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    for (const item of prev.images || []) {
      existing[item.relativePath] = item;
    }
  } catch (e) { /* start fresh if corrupt */ }
}

const merged = images.map(img => ({
  ...img,
  // keep original addedAt if this file was already in the manifest
  addedAt: existing[img.relativePath]?.addedAt ?? img.addedAt,
}));

const manifest = {
  generated: new Date().toISOString(),
  count:     merged.length,
  images:    merged,
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`✓ manifest.json written — ${merged.length} image(s) found`);

/**
 * ── GITHUB ACTIONS (optional) ────────────────────────────────────────────────
 * To auto-generate the manifest whenever you push new photos, add this file
 * to your repo at .github/workflows/manifest.yml:
 *
 * name: Update photo manifest
 * on:
 *   push:
 *     paths:
 *       - 'photos/**'
 * jobs:
 *   manifest:
 *     runs-on: ubuntu-latest
 *     steps:
 *       - uses: actions/checkout@v4
 *       - uses: actions/setup-node@v4
 *         with: { node-version: '20' }
 *       - run: node generate-manifest.js
 *       - run: |
 *           git config user.email "actions@github.com"
 *           git config user.name  "GitHub Actions"
 *           git add photos/manifest.json
 *           git diff --staged --quiet || git commit -m "chore: update photo manifest"
 *           git push
 */
