import type { ParsedHymnScore, ScoreMeasure, ScoreNoteEvent } from './midiScore';

export type SheetLayoutMode = 'hymnal' | 'melody';

export interface MeasureHitBox {
  measureIndex: number;
  displayNumber: number;
  startSec: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OnsetOverlay {
  onsetIndex: number;
  tick: number;
  x: number;
  topY: number;
  staffHeight: number;
  lyricY: number;
}

export interface EngraveScoreOptions {
  score: ParsedHymnScore;
  visibleMeasures: ScoreMeasure[];
  containerWidth: number;
  layoutMode: SheetLayoutMode;
  onsetByMeasureStep: Map<string, number>;
}

export interface EngraveScoreResult {
  displayHeight: number;
  measureBoxes: MeasureHitBox[];
  onsetOverlays: OnsetOverlay[];
}

const HYMNAL_SCALE = 0.72;
const MELODY_SCALE = 0.78;
const HYMNAL_SYSTEM_HEIGHT = 268;
const MELODY_SYSTEM_HEIGHT = 164;
const TOP_PADDING = 6;
const TREBLE_OFFSET_Y = 6;
const HYMNAL_LYRIC_OFFSET_Y = 114;
const HYMNAL_BASS_OFFSET_Y = 148;
const HORIZONTAL_PADDING = 10;

export function chooseMeasuresPerSystem(logicalWidth: number, mode: SheetLayoutMode): number {
  if (mode === 'hymnal') {
    if (logicalWidth < 600) return 2;
    if (logicalWidth < 920) return 3;
    return 4;
  }
  if (logicalWidth < 540) return 2;
  if (logicalWidth < 800) return 3;
  return 4;
}

/**
 * Lazy-loads VexFlow (Bravura font bundle) and engraves a responsive SVG grand staff
 * (4-part SATB with centered lyric band) or single-staff melody sheet into `target`.
 */
export async function engraveScoreToSvg(
  target: HTMLDivElement,
  options: EngraveScoreOptions,
): Promise<EngraveScoreResult> {
  const vf = await import('vexflow/bravura');
  const { score, visibleMeasures, containerWidth, layoutMode, onsetByMeasureStep } = options;

  target.innerHTML = '';

  const scale = layoutMode === 'hymnal' ? HYMNAL_SCALE : MELODY_SCALE;
  const systemHeight = layoutMode === 'hymnal' ? HYMNAL_SYSTEM_HEIGHT : MELODY_SYSTEM_HEIGHT;
  const logicalWidth = Math.round(containerWidth / scale);
  const measuresPerSystem = chooseMeasuresPerSystem(logicalWidth, layoutMode);
  const totalSystems = Math.ceil(visibleMeasures.length / measuresPerSystem);
  const logicalHeight = TOP_PADDING * 2 + totalSystems * systemHeight;
  const displayHeight = Math.round(logicalHeight * scale);
  const usableWidth = Math.max(280, logicalWidth - HORIZONTAL_PADDING * 2);

  const renderer = new vf.Renderer(target, vf.Renderer.Backends.SVG);
  renderer.resize(containerWidth, displayHeight);
  const context = renderer.getContext() as InstanceType<typeof vf.SVGContext>;
  context.setViewBox(0, 0, logicalWidth, logicalHeight);
  context.setFillStyle('currentColor');
  context.setStrokeStyle('currentColor');

  const [tsNum, tsDen] = score.timeSignature;
  const measureBoxes: MeasureHitBox[] = [];
  const onsetOverlays: OnsetOverlay[] = [];

  const buildVexVoiceNotes = (
    events: ScoreNoteEvent[],
    clef: 'treble' | 'bass',
    stemDirection?: number,
  ) => {
    const notes = events.map((ev) => {
      const duration = `${ev.baseDuration}${ev.dots > 0 ? 'd' : ''}${ev.isRest ? 'r' : ''}`;
      const staveNote = new vf.StaveNote({
        keys: ev.keys,
        duration,
        clef,
        stemDirection: !ev.isRest ? stemDirection : undefined,
        autoStem: !ev.isRest && stemDirection === undefined,
      });

      if (ev.dots > 0) {
        vf.Dot.buildAndAttach([staveNote], { all: true });
      }

      if (!ev.isRest) {
        ev.accidentals.forEach((acc, idx) => {
          if (acc) {
            staveNote.addModifier(new vf.Accidental(acc), idx);
          }
        });
      }

      return staveNote;
    });

    const ties: InstanceType<typeof vf.StaveTie>[] = [];
    for (let i = 1; i < events.length; i++) {
      if (events[i].tieFromPrevious && !events[i].isRest && !events[i - 1].isRest) {
        ties.push(
          new vf.StaveTie({
            firstNote: notes[i - 1],
            lastNote: notes[i],
            firstIndexes: [0],
            lastIndexes: [0],
          }),
        );
      }
    }

    const beamable = notes.filter((_, i) => !events[i].isRest);
    const beams =
      beamable.length >= 2
        ? vf.Beam.generateBeams(beamable, {
            maintainStemDirections: stemDirection !== undefined,
          })
        : [];

    return { notes, beams, ties };
  };

  const drawCrossBarTie = (
    prevNote: InstanceType<typeof vf.StaveNote> | null,
    currNote: InstanceType<typeof vf.StaveNote> | null,
  ) => {
    if (!prevNote && !currNote) return;
    new vf.StaveTie({
      firstNote: prevNote,
      lastNote: currNote,
      firstIndexes: [0],
      lastIndexes: [0],
    })
      .setContext(context)
      .draw();
  };

  for (let sysIdx = 0; sysIdx < totalSystems; sysIdx++) {
    const sliceStart = sysIdx * measuresPerSystem;
    const rowMeasures = visibleMeasures.slice(sliceStart, sliceStart + measuresPerSystem);
    const systemY = TOP_PADDING + sysIdx * systemHeight;
    const trebleY = systemY + TREBLE_OFFSET_Y;
    const bassY = systemY + HYMNAL_BASS_OFFSET_Y;

    const firstMeasureBonus = sysIdx === 0 ? 84 : 54;
    const baseMeasureWidth = Math.floor((usableWidth - firstMeasureBonus) / measuresPerSystem);

    let x = HORIZONTAL_PADDING;

    let prevSopranoTieOut: InstanceType<typeof vf.StaveNote> | null = null;
    let prevAltoTieOut: InstanceType<typeof vf.StaveNote> | null = null;
    let prevTenorTieOut: InstanceType<typeof vf.StaveNote> | null = null;
    let prevBassTieOut: InstanceType<typeof vf.StaveNote> | null = null;

    rowMeasures.forEach((measure, colIdx) => {
      const isFirstInSystem = colIdx === 0;
      const isLastInSystem = colIdx === rowMeasures.length - 1;
      const isVeryLast = sliceStart + colIdx === visibleMeasures.length - 1;
      const measureWidth = isFirstInSystem
        ? baseMeasureWidth + firstMeasureBonus
        : baseMeasureWidth;

      const trebleStave = new vf.Stave(x, trebleY, measureWidth);
      if (isFirstInSystem) {
        trebleStave.addClef('treble').addKeySignature(score.keySignature);
        if (sysIdx === 0) {
          trebleStave.addTimeSignature(score.timeSignatureLabel);
        }
        trebleStave.setMeasure(sliceStart + colIdx + 1);
      }
      if (isVeryLast) {
        trebleStave.setEndBarType(vf.Barline.type.END);
      }
      trebleStave.setContext(context).draw();

      if (layoutMode === 'melody') {
        const { notes, beams, ties } = buildVexVoiceNotes(measure.melody, 'treble');
        const voice = new vf.Voice({ numBeats: tsNum, beatValue: tsDen })
          .setStrict(false)
          .addTickables(notes);

        const formatWidth = Math.max(40, x + measureWidth - trebleStave.getNoteStartX() - 14);
        new vf.Formatter().joinVoices([voice]).format([voice], formatWidth);

        voice.draw(context, trebleStave);
        beams.forEach((b) => b.setContext(context).draw());
        ties.forEach((t) => t.setContext(context).draw());

        measure.melody.forEach((ev, evIdx) => {
          const onsetIdx = onsetByMeasureStep.get(`${measure.index}:${ev.startStep}`);
          if (onsetIdx === undefined) return;
          const note = notes[evIdx];
          const cx = (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
          onsetOverlays.push({
            onsetIndex: onsetIdx,
            tick: measure.startTick + ev.startStep * score.stepTicks,
            x: cx * scale,
            topY: (trebleY + 18) * scale,
            staffHeight: 74 * scale,
            lyricY: (trebleY + 122) * scale,
          });
        });
      } else {
        const bassStave = new vf.Stave(x, bassY, measureWidth);
        if (isFirstInSystem) {
          bassStave.addClef('bass').addKeySignature(score.keySignature);
          if (sysIdx === 0) {
            bassStave.addTimeSignature(score.timeSignatureLabel);
          }
        }
        if (isVeryLast) {
          bassStave.setEndBarType(vf.Barline.type.END);
        }
        bassStave.setContext(context).draw();

        if (isFirstInSystem) {
          new vf.StaveConnector(trebleStave, bassStave)
            .setType(vf.StaveConnector.type.BRACE)
            .setContext(context)
            .draw();
          new vf.StaveConnector(trebleStave, bassStave)
            .setType(vf.StaveConnector.type.SINGLE_LEFT)
            .setContext(context)
            .draw();
        }
        if (isLastInSystem) {
          new vf.StaveConnector(trebleStave, bassStave)
            .setType(
              isVeryLast
                ? vf.StaveConnector.type.BOLD_DOUBLE_RIGHT
                : vf.StaveConnector.type.SINGLE_RIGHT,
            )
            .setContext(context)
            .draw();
        }

        const sopBuilt = buildVexVoiceNotes(measure.soprano, 'treble', vf.Stem.UP);
        const altBuilt = buildVexVoiceNotes(measure.alto, 'treble', vf.Stem.DOWN);
        const tenBuilt = buildVexVoiceNotes(measure.tenor, 'bass', vf.Stem.UP);
        const basBuilt = buildVexVoiceNotes(measure.bassVoice, 'bass', vf.Stem.DOWN);

        const sopVoice = new vf.Voice({ numBeats: tsNum, beatValue: tsDen })
          .setStrict(false)
          .addTickables(sopBuilt.notes);
        const altVoice = new vf.Voice({ numBeats: tsNum, beatValue: tsDen })
          .setStrict(false)
          .addTickables(altBuilt.notes);
        const tenVoice = new vf.Voice({ numBeats: tsNum, beatValue: tsDen })
          .setStrict(false)
          .addTickables(tenBuilt.notes);
        const basVoice = new vf.Voice({ numBeats: tsNum, beatValue: tsDen })
          .setStrict(false)
          .addTickables(basBuilt.notes);

        const noteStartX = Math.max(trebleStave.getNoteStartX(), bassStave.getNoteStartX());
        trebleStave.setNoteStartX(noteStartX);
        bassStave.setNoteStartX(noteStartX);

        const formatWidth = Math.max(40, x + measureWidth - noteStartX - 12);
        new vf.Formatter()
          .joinVoices([sopVoice, altVoice])
          .joinVoices([tenVoice, basVoice])
          .format([sopVoice, altVoice, tenVoice, basVoice], formatWidth);

        sopVoice.draw(context, trebleStave);
        altVoice.draw(context, trebleStave);
        tenVoice.draw(context, bassStave);
        basVoice.draw(context, bassStave);

        sopBuilt.beams.forEach((b) => b.setContext(context).draw());
        altBuilt.beams.forEach((b) => b.setContext(context).draw());
        tenBuilt.beams.forEach((b) => b.setContext(context).draw());
        basBuilt.beams.forEach((b) => b.setContext(context).draw());

        sopBuilt.ties.forEach((t) => t.setContext(context).draw());
        altBuilt.ties.forEach((t) => t.setContext(context).draw());
        tenBuilt.ties.forEach((t) => t.setContext(context).draw());
        basBuilt.ties.forEach((t) => t.setContext(context).draw());

        const handleVoiceCrossTies = (
          events: ScoreNoteEvent[],
          notes: InstanceType<typeof vf.StaveNote>[],
          prevOut: InstanceType<typeof vf.StaveNote> | null,
        ): InstanceType<typeof vf.StaveNote> | null => {
          if (events.length > 0 && events[0].tieFromPreviousBar && !events[0].isRest) {
            drawCrossBarTie(prevOut, notes[0]);
          }
          const lastIdx = events.length - 1;
          if (lastIdx >= 0 && events[lastIdx].tieToNextBar && !events[lastIdx].isRest) {
            if (isLastInSystem) {
              drawCrossBarTie(notes[lastIdx], null);
              return null;
            }
            return notes[lastIdx];
          }
          return null;
        };

        prevSopranoTieOut = handleVoiceCrossTies(
          measure.soprano,
          sopBuilt.notes,
          prevSopranoTieOut,
        );
        prevAltoTieOut = handleVoiceCrossTies(measure.alto, altBuilt.notes, prevAltoTieOut);
        prevTenorTieOut = handleVoiceCrossTies(measure.tenor, tenBuilt.notes, prevTenorTieOut);
        prevBassTieOut = handleVoiceCrossTies(
          measure.bassVoice,
          basBuilt.notes,
          prevBassTieOut,
        );

        measure.soprano.forEach((ev, evIdx) => {
          if (ev.isRest) return;
          const onsetIdx = onsetByMeasureStep.get(`${measure.index}:${ev.startStep}`);
          if (onsetIdx === undefined) return;
          const note = sopBuilt.notes[evIdx];
          const cx = (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
          onsetOverlays.push({
            onsetIndex: onsetIdx,
            tick: measure.startTick + ev.startStep * score.stepTicks,
            x: cx * scale,
            topY: (trebleY + 18) * scale,
            staffHeight: (bassY + 86 - (trebleY + 18)) * scale,
            lyricY: (systemY + HYMNAL_LYRIC_OFFSET_Y) * scale,
          });
        });
      }

      measureBoxes.push({
        measureIndex: measure.index,
        displayNumber: sliceStart + colIdx + 1,
        startSec: measure.startSec,
        x: x * scale,
        y: (systemY + 6) * scale,
        width: measureWidth * scale,
        height: (systemHeight - 12) * scale,
      });

      x += measureWidth;
    });
  }

  return { displayHeight, measureBoxes, onsetOverlays };
}
