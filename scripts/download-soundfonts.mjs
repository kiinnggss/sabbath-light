import { mkdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PIANO_NOTES = [
  'A1',
  'C2',
  'Ds2',
  'Fs2',
  'A2',
  'C3',
  'Ds3',
  'Fs3',
  'A3',
  'C4',
  'Ds4',
  'Fs4',
  'A4',
  'C5',
  'Ds5',
  'Fs5',
  'A5',
  'C6',
];

const ORGAN_NOTES = [
  'C2',
  'F2',
  'A2',
  'C3',
  'F3',
  'A3',
  'C4',
  'F4',
  'A4',
  'C5',
  'F5',
  'C6',
];

const PIANO_BASE = 'https://tonejs.github.io/audio/salamander/';
const ORGAN_BASE =
  'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/church_organ-mp3/';

async function downloadFile(url, destPath) {
  if (existsSync(destPath) && statSync(destPath).size > 5000) {
    return { status: 'skipped', size: statSync(destPath).size };
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} downloading ${url}`);
  }
  const arr = await res.arrayBuffer();
  if (arr.byteLength < 3000) {
    throw new Error(`Unexpected small sample (${arr.byteLength} bytes) from ${url}`);
  }
  writeFileSync(destPath, Buffer.from(arr));
  return { status: 'downloaded', size: arr.byteLength };
}

async function downloadBank(label, baseUrl, notes, outDir) {
  mkdirSync(outDir, { recursive: true });
  let totalBytes = 0;
  let downloaded = 0;
  let skipped = 0;

  for (const note of notes) {
    const filename = `${note}.mp3`;
    const dest = join(outDir, filename);
    const result = await downloadFile(`${baseUrl}${filename}`, dest);
    totalBytes += result.size;
    if (result.status === 'downloaded') downloaded += 1;
    else skipped += 1;
  }

  console.log(
    `${label}: ${notes.length} samples ready (${downloaded} downloaded, ${skipped} cached, ${(
      totalBytes / 1024
    ).toFixed(1)} KB total)`,
  );
}

async function main() {
  await downloadBank(
    'Salamander Grand Piano',
    PIANO_BASE,
    PIANO_NOTES,
    join(ROOT, 'public', 'samples', 'piano'),
  );
  await downloadBank(
    'FluidR3_GM Church Organ',
    ORGAN_BASE,
    ORGAN_NOTES,
    join(ROOT, 'public', 'samples', 'organ'),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
