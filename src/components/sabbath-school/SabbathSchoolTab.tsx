import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  CalendarCheck,
  CaretLeft,
  CaretRight,
  WarningCircle,
} from '@phosphor-icons/react';
import type { SabbathSchoolEdition } from '../../hooks/usePreferences';
import type { SaveNoteInput } from '../../hooks/useNotes';
import { makeSSBlockRef, makeSSReflectionRef } from '../../lib/noteReferences';
import type { StudyNote } from '../../lib/offlineDb';
import {
  extractMemoryText,
  fetchDayRead,
  fetchLessonDetail,
  fetchQuarterlies,
  fetchQuarterlyDetail,
  filterQuarterliesByEdition,
  getQuarterIdPrefixForDate,
  resolveActiveDay,
  resolveActiveLesson,
  resolveActiveQuarterly,
  type ExtractedMemoryText,
  type SSDayRead,
  type SSLessonDetail,
  type SSLessonSummary,
  type SSQuarterlySummary,
} from '../../lib/sabbathSchoolApi';
import type { NoteEditorRequest } from '../notes/NoteEditorSheet';
import { CornerstonePdfReader } from './CornerstonePdfReader';
import { DailyReflectionCard } from './DailyReflectionCard';
import { DaySwitcher } from './DaySwitcher';
import { EditionSwitcher } from './EditionSwitcher';
import { LessonContent } from './LessonContent';
import { MemoryTextCard } from './MemoryTextCard';
import { QuarterlyArchiveModal } from './QuarterlyArchiveModal';

export interface SabbathSchoolJumpTarget {
  edition: SabbathSchoolEdition;
  quarterlyId: string;
  lessonId: string;
  dayId: string;
  blockIdx?: number;
  isReflection?: boolean;
  seq: number;
}

interface SabbathSchoolTabProps {
  edition: SabbathSchoolEdition;
  onEditionChange: (edition: SabbathSchoolEdition) => void;
  onOpenScripture: (reference: string, verseAttr?: string) => void;
  notesByRefId: Map<string, StudyNote>;
  onOpenNoteEditor: (req: NoteEditorRequest) => void;
  onSaveNote: (input: SaveNoteInput) => Promise<StudyNote | null>;
  onDeleteNote: (noteId: string) => Promise<void>;
  jumpTarget: SabbathSchoolJumpTarget | null;
}

function getOptimisticQuarterlyId(edition: SabbathSchoolEdition): string {
  const prefix = getQuarterIdPrefixForDate(new Date());
  if (edition === 'inverse') return `${prefix}-cq`;
  if (edition === 'cornerstone') return `${prefix}-cc`;
  return prefix;
}

const EDITION_LABEL: Record<SabbathSchoolEdition, string> = {
  adult: 'Adult',
  inverse: 'Inverse',
  cornerstone: 'Cornerstone',
};

export function SabbathSchoolTab({
  edition,
  onEditionChange,
  onOpenScripture,
  notesByRefId,
  onOpenNoteEditor,
  onSaveNote,
  onDeleteNote,
  jumpTarget,
}: SabbathSchoolTabProps) {
  const [allQuarterlies, setAllQuarterlies] = useState<SSQuarterlySummary[]>([]);
  const [selectedQuarterlyId, setSelectedQuarterlyId] = useState<string>(() =>
    getOptimisticQuarterlyId(edition),
  );
  const [quarterlyMeta, setQuarterlyMeta] = useState<SSQuarterlySummary | null>(null);
  const [lessons, setLessons] = useState<SSLessonSummary[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [lessonDetail, setLessonDetail] = useState<SSLessonDetail | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [todayDayId, setTodayDayId] = useState<string | null>(null);
  const [dayRead, setDayRead] = useState<SSDayRead | null>(null);
  const [memoryText, setMemoryText] = useState<ExtractedMemoryText | null>(null);

  const [focusBlockIdx, setFocusBlockIdx] = useState<number | undefined>(undefined);
  const [highlightReflection, setHighlightReflection] = useState(false);

  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const pendingJumpRef = useRef<SabbathSchoolJumpTarget | null>(null);

  const editionQuarterlies = useMemo(
    () => filterQuarterliesByEdition(allQuarterlies, edition),
    [allQuarterlies, edition],
  );

  // Handle explicit 1-tap jump from My Notes
  useEffect(() => {
    if (!jumpTarget) return;
    pendingJumpRef.current = jumpTarget;
    setFocusBlockIdx(jumpTarget.blockIdx);
    setHighlightReflection(Boolean(jumpTarget.isReflection));
    if (jumpTarget.edition !== edition) {
      onEditionChange(jumpTarget.edition);
    }
    setSelectedQuarterlyId(jumpTarget.quarterlyId);
    setSelectedLessonId(jumpTarget.lessonId);
    setSelectedDayId(jumpTarget.dayId);
  }, [jumpTarget, edition, onEditionChange]);

  // 1. Load global quarterlies index in the background for Archive + fallback resolution
  useEffect(() => {
    let cancelled = false;
    fetchQuarterlies()
      .then((list) => {
        if (!cancelled) {
          setAllQuarterlies(list);
        }
      })
      .catch(() => {
        // Ignore background archive fetch failure if optimistic current quarterly loaded
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Immediately resolve optimistic quarterly ID when edition switches, unless a jump is pending
  useEffect(() => {
    if (pendingJumpRef.current && pendingJumpRef.current.edition === edition) {
      setSelectedQuarterlyId(pendingJumpRef.current.quarterlyId);
      return;
    }
    if (editionQuarterlies.length > 0) {
      const active = resolveActiveQuarterly(editionQuarterlies, new Date());
      if (active) {
        setSelectedQuarterlyId(active.id);
        return;
      }
    }
    setSelectedQuarterlyId(getOptimisticQuarterlyId(edition));
  }, [edition, editionQuarterlies]);

  // 3. Load quarterly detail & resolve active lesson (or pending jump lesson)
  useEffect(() => {
    if (!selectedQuarterlyId) return;
    let cancelled = false;
    async function loadQ() {
      try {
        setLoading(true);
        setQuarterlyMeta(null);
        setLessonDetail(null);
        const jumpLessonId =
          pendingJumpRef.current?.quarterlyId === selectedQuarterlyId
            ? pendingJumpRef.current.lessonId
            : '';
        if (!jumpLessonId) {
          setSelectedLessonId('');
        }
        const detail = await fetchQuarterlyDetail(selectedQuarterlyId);
        if (cancelled) return;
        setQuarterlyMeta(detail.quarterly);
        setLessons(detail.lessons);

        if (jumpLessonId) {
          setSelectedLessonId(jumpLessonId);
        } else {
          const activeLesson = resolveActiveLesson(detail.lessons, new Date());
          if (activeLesson) {
            setSelectedLessonId(activeLesson.id);
          }
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load quarterly');
          setLoading(false);
        }
      }
    }
    loadQ();
    return () => {
      cancelled = true;
    };
  }, [selectedQuarterlyId]);

  // 4. Load lesson detail & resolve active day + extract Memory Text from day 01
  useEffect(() => {
    if (!selectedQuarterlyId || !selectedLessonId) return;
    let cancelled = false;

    async function loadLesson() {
      try {
        setLoading(true);
        const detail = await fetchLessonDetail(selectedQuarterlyId, selectedLessonId);
        if (cancelled) return;
        setLessonDetail(detail);

        if (detail.days.length > 0) {
          const activeDay = resolveActiveDay(detail.days, new Date());
          setTodayDayId(activeDay?.id || null);

          const pending = pendingJumpRef.current;
          if (
            pending &&
            pending.quarterlyId === selectedQuarterlyId &&
            pending.lessonId === selectedLessonId
          ) {
            const exists = detail.days.some((d) => d.id === pending.dayId);
            setSelectedDayId(exists ? pending.dayId : activeDay?.id || detail.days[0].id);
            pendingJumpRef.current = null;
          } else {
            setSelectedDayId(activeDay?.id || detail.days[0].id);
          }

          // Pre-fetch Day 01 for pinned weekly Memory Text
          const day01 = detail.days.find((d) => d.id === '01') || detail.days[0];
          fetchDayRead(selectedQuarterlyId, selectedLessonId, day01.id)
            .then((d01) => {
              if (!cancelled) {
                setMemoryText(extractMemoryText(d01.content));
              }
            })
            .catch(() => {
              if (!cancelled) setMemoryText(null);
            });
        } else {
          setTodayDayId(null);
          setSelectedDayId('');
          setDayRead(null);
          setMemoryText(null);
          if (pendingJumpRef.current?.lessonId === selectedLessonId) {
            pendingJumpRef.current = null;
          }
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load lesson');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLesson();
    return () => {
      cancelled = true;
    };
  }, [selectedQuarterlyId, selectedLessonId]);

  // 5. Load active day reading HTML
  useEffect(() => {
    if (!selectedQuarterlyId || !selectedLessonId || !selectedDayId) return;
    let cancelled = false;

    async function loadDay() {
      try {
        setDayLoading(true);
        const read = await fetchDayRead(selectedQuarterlyId, selectedLessonId, selectedDayId);
        if (!cancelled) {
          setDayRead(read);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load day reading');
        }
      } finally {
        if (!cancelled) setDayLoading(false);
      }
    }

    loadDay();
    return () => {
      cancelled = true;
    };
  }, [selectedQuarterlyId, selectedLessonId, selectedDayId]);

  // Scroll smoothly to Reflection card when jumped from My Notes
  useEffect(() => {
    if (!highlightReflection || dayLoading) return;
    const el = document.getElementById('ss-daily-reflection');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightReflection, dayLoading, dayRead]);

  const currentLessonIdx = useMemo(
    () => lessons.findIndex((l) => l.id === selectedLessonId),
    [lessons, selectedLessonId],
  );

  const jumpToToday = useCallback(() => {
    pendingJumpRef.current = null;
    setFocusBlockIdx(undefined);
    setHighlightReflection(false);
    const q = resolveActiveQuarterly(editionQuarterlies, new Date());
    if (q) setSelectedQuarterlyId(q.id);
    if (lessons.length > 0) {
      const l = resolveActiveLesson(lessons, new Date());
      if (l) setSelectedLessonId(l.id);
    }
    if (lessonDetail && lessonDetail.days.length > 0) {
      const d = resolveActiveDay(lessonDetail.days, new Date());
      if (d) setSelectedDayId(d.id);
    }
  }, [editionQuarterlies, lessons, lessonDetail]);

  const isPdfOnly =
    Boolean(lessonDetail?.lesson.pdfOnly) ||
    Boolean(lessonDetail && lessonDetail.days.length === 0 && lessonDetail.pdfs.length > 0);

  const effectiveDayId = selectedDayId || '01';
  const reflectionRefId = selectedQuarterlyId && selectedLessonId
    ? makeSSReflectionRef(edition, selectedQuarterlyId, selectedLessonId, effectiveDayId)
    : '';
  const reflectionLabel = dayRead
    ? `${EDITION_LABEL[edition]} Lesson ${selectedLessonId} · ${dayRead.title}`
    : `${EDITION_LABEL[edition]} Lesson ${selectedLessonId}`;
  const existingReflection = reflectionRefId ? notesByRefId.get(reflectionRefId) : undefined;

  return (
    <div className="space-y-4 py-4 pb-10">
      {/* Top 3-Edition Switcher */}
      <EditionSwitcher
        edition={edition}
        onChange={(next) => {
          pendingJumpRef.current = null;
          setFocusBlockIdx(undefined);
          setHighlightReflection(false);
          onEditionChange(next);
        }}
      />

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--accent-primary)]/50 bg-[var(--bg-surface)] p-4 text-sm">
          <WarningCircle size={20} weight="duotone" className="mt-0.5 shrink-0 text-[var(--accent-primary)]" />
          <div>
            <p className="font-bold text-[var(--ink-primary)]">Sabbath School connection issue</p>
            <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">{error}</p>
          </div>
        </div>
      )}

      {/* Quarterly & Active Week Header Card */}
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-primary)]">
              {quarterlyMeta?.title || 'Loading Quarterly...'} ·{' '}
              {quarterlyMeta?.human_date || selectedQuarterlyId}
            </p>
            <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-[var(--ink-primary)] leading-snug">
              {lessonDetail?.lesson.id === 'introduction'
                ? lessonDetail.lesson.title
                : lessonDetail
                  ? `Lesson ${lessonDetail.lesson.id}: ${lessonDetail.lesson.title}`
                  : 'Loading this week...'}
            </h2>
            {lessonDetail && (
              <p className="mt-1 text-xs font-medium text-[var(--ink-muted)]">
                {lessonDetail.lesson.start_date} - {lessonDetail.lesson.end_date}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start">
            <button
              type="button"
              onClick={jumpToToday}
              title="Jump to today's reading"
              className="tactile-btn inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-3 text-xs font-bold text-[var(--ink-primary)] hover:border-[var(--border-strong)]"
            >
              <CalendarCheck size={16} weight="duotone" className="text-[var(--accent-primary)]" />
              <span>Today</span>
            </button>
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="tactile-btn inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-3 text-xs font-bold text-[var(--ink-primary)] hover:border-[var(--border-strong)]"
            >
              <Archive size={16} weight="duotone" />
              <span>Archive</span>
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        {lessons.length > 1 && (
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
            <button
              type="button"
              disabled={currentLessonIdx <= 0}
              onClick={() => {
                setFocusBlockIdx(undefined);
                setHighlightReflection(false);
                if (currentLessonIdx > 0) setSelectedLessonId(lessons[currentLessonIdx - 1].id);
              }}
              className="tactile-btn inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-xs font-semibold text-[var(--ink-primary)] disabled:opacity-35"
            >
              <CaretLeft size={14} weight="bold" />
              <span>Prev Week</span>
            </button>

            <span className="font-[family-name:var(--font-mono)] text-xs font-semibold text-[var(--ink-muted)]">
              Week {Math.max(1, currentLessonIdx + 1)} of {lessons.length}
            </span>

            <button
              type="button"
              disabled={currentLessonIdx < 0 || currentLessonIdx >= lessons.length - 1}
              onClick={() => {
                setFocusBlockIdx(undefined);
                setHighlightReflection(false);
                if (currentLessonIdx >= 0 && currentLessonIdx < lessons.length - 1) {
                  setSelectedLessonId(lessons[currentLessonIdx + 1].id);
                }
              }}
              className="tactile-btn inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-xs font-semibold text-[var(--ink-primary)] disabled:opacity-35"
            >
              <span>Next Week</span>
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        )}
      </section>

      {/* Pinned Weekly Memory Text Card */}
      {memoryText && (
        <MemoryTextCard memoryText={memoryText} onOpenScripture={onOpenScripture} />
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--bg-recessed)]" />
          <div className="h-64 w-full animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]" />
        </div>
      ) : isPdfOnly && lessonDetail ? (
        <div className="space-y-4">
          <CornerstonePdfReader
            pdfs={lessonDetail.pdfs}
            onOpenScripture={(ref) => onOpenScripture(ref)}
          />
          {reflectionRefId && (
            <DailyReflectionCard
              referenceLabel={`${EDITION_LABEL[edition]} Lesson ${selectedLessonId}`}
              quoteSnippet={lessonDetail.lesson.title}
              existingNote={existingReflection}
              highlighted={highlightReflection}
              onSaveReflection={async (text) => {
                await onSaveNote({
                  id: existingReflection?.id,
                  sourceType: 'sabbath-school',
                  referenceId: reflectionRefId,
                  referenceLabel: `${EDITION_LABEL[edition]} Lesson ${selectedLessonId}`,
                  quoteSnippet: lessonDetail.lesson.title,
                  noteText: text,
                });
              }}
              onDeleteReflection={onDeleteNote}
            />
          )}
        </div>
      ) : (
        <>
          {lessonDetail && lessonDetail.days.length > 0 && (
            <DaySwitcher
              edition={edition}
              days={lessonDetail.days}
              activeDayId={selectedDayId}
              todayDayId={todayDayId}
              onSelectDay={(id) => {
                setFocusBlockIdx(undefined);
                setHighlightReflection(false);
                setSelectedDayId(id);
              }}
            />
          )}

          {dayLoading ? (
            <div className="h-72 w-full animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]" />
          ) : dayRead ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
                <div>
                  <h3 className="font-display text-lg font-bold text-[var(--ink-primary)]">
                    {dayRead.title}
                  </h3>
                  <p className="text-[11px] font-medium text-[var(--ink-muted)]">
                    Tap any verse link for Scripture preview, or tap a paragraph to attach a note
                  </p>
                </div>
                <span className="text-xs font-medium text-[var(--ink-muted)]">
                  {dayRead.date}
                </span>
              </div>

              <LessonContent
                html={dayRead.content}
                edition={edition}
                quarterlyId={selectedQuarterlyId}
                lessonId={selectedLessonId}
                dayId={effectiveDayId}
                focusBlockIdx={focusBlockIdx}
                notesByRefId={notesByRefId}
                onOpenScripture={onOpenScripture}
                onSelectBlockNote={(blockIdx, snippet) => {
                  const refId = makeSSBlockRef(
                    edition,
                    selectedQuarterlyId,
                    selectedLessonId,
                    effectiveDayId,
                    blockIdx,
                  );
                  onOpenNoteEditor({
                    sourceType: 'sabbath-school',
                    referenceId: refId,
                    referenceLabel: `${reflectionLabel} · Paragraph ${blockIdx + 1}`,
                    quoteSnippet: snippet,
                    existingNote: notesByRefId.get(refId),
                  });
                }}
              />

              {reflectionRefId && (
                <DailyReflectionCard
                  referenceLabel={reflectionLabel}
                  quoteSnippet={lessonDetail?.lesson.title || dayRead.title}
                  existingNote={existingReflection}
                  highlighted={highlightReflection}
                  onSaveReflection={async (text) => {
                    await onSaveNote({
                      id: existingReflection?.id,
                      sourceType: 'sabbath-school',
                      referenceId: reflectionRefId,
                      referenceLabel: reflectionLabel,
                      quoteSnippet: lessonDetail?.lesson.title || dayRead.title,
                      noteText: text,
                    });
                  }}
                  onDeleteReflection={onDeleteNote}
                />
              )}
            </div>
          ) : null}
        </>
      )}

      <QuarterlyArchiveModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        quarterlies={editionQuarterlies}
        activeQuarterlyId={selectedQuarterlyId}
        lessons={lessons}
        activeLessonId={selectedLessonId}
        onSelectQuarterly={(id) => {
          pendingJumpRef.current = null;
          setSelectedQuarterlyId(id);
        }}
        onSelectLesson={(id) => {
          pendingJumpRef.current = null;
          setSelectedLessonId(id);
        }}
      />
    </div>
  );
}
