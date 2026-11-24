import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEST_DIR = path.join(PROJECT_ROOT, 'public', 'midi');
const TMP_REPO_DIR = '/tmp/sdah-midis-src';
const REPO_URL = 'https://github.com/TinasheMzondiwa/sda-hymnal-android.git';
const REPO_MIDI_SUBDIR = 'features/sing/src/main/assets/midis';
const TOTAL_HYMNS = 695;

function padNumber(num) {
  return String(num).padStart(3, '0');
}

function hasMthdHeader(buf) {
  return (
    buf.byteLength >= 14 &&
    buf[0] === 0x4d &&
    buf[1] === 0x54 &&
    buf[2] === 0x68 &&
    buf[3] === 0x64
  );
}

async function main() {
  const mod = await import('@tonejs/midi');
  const Midi = mod.Midi || mod.default?.Midi;
  if (!Midi) {
    throw new Error('Could not resolve Midi constructor from @tonejs/midi');
  }

  await fs.rm(TMP_REPO_DIR, { recursive: true, force: true });

  try {
    console.log(`Cloning ${REPO_MIDI_SUBDIR} from ${REPO_URL}...`);
    execFileSync(
      'git',
      ['clone', '--depth=1', '--filter=blob:none', '--sparse', REPO_URL, TMP_REPO_DIR],
      { stdio: 'inherit' },
    );
    execFileSync(
      'git',
      ['-C', TMP_REPO_DIR, 'sparse-checkout', 'set', REPO_MIDI_SUBDIR],
      { stdio: 'inherit' },
    );

    const sourceDir = path.join(TMP_REPO_DIR, REPO_MIDI_SUBDIR);
    await fs.mkdir(DEST_DIR, { recursive: true });

    // Remove existing .mid files cleanly before copying verified set
    const existingEntries = await fs.readdir(DEST_DIR);
    for (const name of existingEntries) {
      if (/\.mid$/i.test(name)) {
        await fs.unlink(path.join(DEST_DIR, name));
      }
    }

    let totalBytes = 0;
    let minDuration = Infinity;
    let maxDuration = 0;
    let maxLeadingSilence = 0;
    let percussionCount = 0;
    const failures = [];

    for (let num = 1; num <= TOTAL_HYMNS; num += 1) {
      const filename = `${padNumber(num)}.mid`;
      const srcPath = path.join(sourceDir, filename);
      const destPath = path.join(DEST_DIR, filename);

      try {
        await fs.copyFile(srcPath, destPath);
        const buf = await fs.readFile(destPath);
        totalBytes += buf.byteLength;

        if (!hasMthdHeader(buf)) {
          failures.push(`${filename}: invalid MThd header`);
          continue;
        }

        const midi = new Midi(buf);
        let nonPercNotes = 0;
        let hasPerc = false;
        let earliestNote = Infinity;

        for (const track of midi.tracks) {
          if (track.notes.length === 0) continue;
          if (track.channel === 9 || Boolean(track.instrument?.percussion)) {
            hasPerc = true;
            continue;
          }
          nonPercNotes += track.notes.length;
          const t0 = track.notes[0]?.time;
          if (typeof t0 === 'number' && t0 < earliestNote) {
            earliestNote = t0;
          }
        }

        if (hasPerc) percussionCount += 1;
        if (nonPercNotes <= 0 || midi.duration <= 0) {
          failures.push(`${filename}: empty notes or zero duration`);
          continue;
        }

        if (midi.duration < minDuration) minDuration = midi.duration;
        if (midi.duration > maxDuration) maxDuration = midi.duration;
        if (Number.isFinite(earliestNote) && earliestNote > maxLeadingSilence) {
          maxLeadingSilence = earliestNote;
        }
      } catch (err) {
        failures.push(`${filename}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const attributionText = [
      'Seventh-day Adventist Hymnal (1985) MIDI Tracks (001.mid through 695.mid)',
      '',
      'Source repository: https://github.com/TinasheMzondiwa/sda-hymnal-android',
      `Directory: ${REPO_MIDI_SUBDIR}`,
      'License: Apache-2.0',
      `Updated: ${new Date().toISOString()}`,
      '',
    ].join('\n');

    await fs.writeFile(path.join(DEST_DIR, 'ATTRIBUTION.txt'), attributionText, 'utf8');

    const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
    console.log(
      [
        '',
        `Audited ${TOTAL_HYMNS} MIDI files in ${DEST_DIR}`,
        `Total size: ${totalMb} MB (${totalBytes} bytes)`,
        `Duration range: ${minDuration.toFixed(1)}s to ${maxDuration.toFixed(1)}s`,
        `Max leading silence: ${maxLeadingSilence.toFixed(2)}s`,
        `Files with percussion tracks: ${percussionCount}`,
        `Failures: ${failures.length}`,
      ].join('\n'),
    );

    if (failures.length > 0) {
      console.error(failures.slice(0, 20).join('\n'));
      process.exitCode = 1;
    }
  } finally {
    await fs.rm(TMP_REPO_DIR, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
