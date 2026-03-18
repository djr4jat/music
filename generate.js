/**
 * NOIR Music Player — Song Generator
 * ─────────────────────────────────────────────────────
 * Run this script whenever you add new songs to music/
 *
 *   node generate.js
 *
 * It will:
 *   1. Scan every .mp3 / .m4a / .ogg / .flac / .wav in music/
 *   2. Read ID3 tags (title, artist, album, duration)
 *   3. Fall back to the filename if tags are missing
 *   4. Write songs.json — the player loads this automatically
 *
 * Requirements (one-time install):
 *   npm install music-metadata
 * ─────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const MUSIC_DIR  = path.join(__dirname, 'music');
const OUTPUT     = path.join(__dirname, 'songs.json');
const EXTENSIONS = ['.mp3', '.m4a', '.ogg', '.flac', '.wav'];

async function generate() {
  // Check music/ folder exists
  if (!fs.existsSync(MUSIC_DIR)) {
    console.error('❌  music/ folder not found. Create it and put your songs inside.');
    process.exit(1);
  }

  // Try to load music-metadata
  let mm;
  try {
    mm = await import('music-metadata');
  } catch {
    console.error('❌  music-metadata not installed.\n   Run: npm install music-metadata\n   Then: node generate.js');
    process.exit(1);
  }

  const files = fs.readdirSync(MUSIC_DIR)
    .filter(f => EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort();

  if (!files.length) {
    console.log('⚠️   No audio files found in music/');
    fs.writeFileSync(OUTPUT, JSON.stringify([], null, 2));
    return;
  }

  console.log(`\n🎵  Found ${files.length} file(s) — reading metadata...\n`);

  const songs = [];

  for (const file of files) {
    const filePath = path.join(MUSIC_DIR, file);
    const baseName = path.basename(file, path.extname(file));

    let title    = baseName;
    let artist   = 'Unknown';
    let album    = '';
    let duration = 0;

    try {
      const meta = await mm.parseFile(filePath, { duration: true });
      const tags = meta.common;

      title    = tags.title    || guessTitle(baseName);
      artist   = tags.artist   || guessArtist(baseName) || 'Unknown';
      album    = tags.album    || '';
      duration = Math.round(meta.format.duration || 0);
    } catch (err) {
      console.warn(`  ⚠️  Could not read tags for ${file} — using filename`);
    }

    songs.push({ file, title, artist, album, duration });

    const dur = duration ? `${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')}` : '?:??';
    console.log(`  ✓  ${title} — ${artist}  [${dur}]`);
  }

  const output = { version: Date.now(), songs };
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`\n✅  songs.json written with ${songs.length} track(s)\n`);
  console.log('   Commit & push to GitHub — your player is ready!\n');
}

// ── Helpers ───────────────────────────────────────

// "Artist - Title" → title
function guessTitle(name) {
  const parts = name.split(' - ');
  return parts.length > 1 ? parts.slice(1).join(' - ').trim() : name.trim();
}

// "Artist - Title" → artist
function guessArtist(name) {
  const parts = name.split(' - ');
  return parts.length > 1 ? parts[0].trim() : '';
}

generate();
