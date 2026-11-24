import { useEffect, useRef, useState } from 'react';
import {
  ArrowsClockwise,
  CheckCircle,
  CloudArrowDown,
  DownloadSimple,
  GearSix,
  HardDrives,
  Trash,
  UploadSimple,
  WifiSlash,
  X,
} from '@phosphor-icons/react';
import type { BibleVersionId } from '../../hooks/usePreferences';
import type { ActiveVersionDownload } from '../../hooks/useOfflineSync';
import { BIBLE_VERSIONS } from '../../lib/bibleApi';
import type { OfflineBibleVersionMeta, SabbathSchoolSyncMeta } from '../../lib/offlineDb';
import { TOTAL_HYMN_MIDIS } from '../../lib/offlineSync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  storagePersisted: boolean;
  usageBytes: number;
  quotaBytes: number;
  downloadedVersions: OfflineBibleVersionMeta[];
  activeDownloads: Partial<Record<BibleVersionId, ActiveVersionDownload>>;
  ssSyncMeta: SabbathSchoolSyncMeta | null;
  ssSyncing: boolean;
  ssSyncDetail: string;
  midiCachedCount: number;
  midiSyncing: boolean;
  isReadyForOffline: boolean;
  syncError: string | null;
  onSyncNow: () => Promise<void> | void;
  onDownloadBibleVersion: (v: BibleVersionId) => void;
  onRemoveBibleVersion: (v: BibleVersionId) => void;
  notesCount: number;
  onExportNotesJson: () => string;
  onImportNotesJson: (raw: string) => Promise<{ imported: number }>;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export function SettingsModal({
  isOpen,
  onClose,
  isOnline,
  storagePersisted,
  usageBytes,
  quotaBytes,
  downloadedVersions,
  activeDownloads,
  ssSyncMeta,
  ssSyncing,
  ssSyncDetail,
  midiCachedCount,
  midiSyncing,
  isReadyForOffline,
  syncError,
  onSyncNow,
  onDownloadBibleVersion,
  onRemoveBibleVersion,
  notesCount,
  onExportNotesJson,
  onImportNotesJson,
}: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const downloadedMap = new Map(downloadedVersions.map((m) => [m.version, m]));
  const activeDownloadEntries = Object.entries(activeDownloads) as Array<
    [BibleVersionId, ActiveVersionDownload]
  >;

  const handleExport = () => {
    try {
      const json = onExportNotesJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sabbath-light-notes-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupError(null);
      setBackupNotice(`Exported ${notesCount} ${notesCount === 1 ? 'note' : 'notes'} to JSON.`);
    } catch {
      setBackupError('Could not export notes JSON.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const raw = await file.text();
      const { imported } = await onImportNotesJson(raw);
      setBackupError(null);
      setBackupNotice(`Imported ${imported} ${imported === 1 ? 'note' : 'notes'} into IndexedDB.`);
    } catch (err) {
      setBackupNotice(null);
      setBackupError(err instanceof Error ? err.message : 'Invalid JSON backup file.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sheet-enter flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] shadow-[var(--shadow-sheet)] sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]">
              <GearSix size={20} weight="duotone" />
            </span>
            <div className="min-w-0">
              <h2
                id="settings-modal-title"
                className="font-display truncate text-base font-bold text-[var(--ink-primary)]"
              >
                Offline Storage &amp; Backups
              </h2>
              <p className="truncate text-xs text-[var(--ink-muted)]">
                PWA cache status, auto-sync, and JSON notes backup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="tactile-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-primary)]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Readiness Status Card */}
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {!isOnline ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-amber-soft)] px-3 py-1 text-xs font-bold text-[var(--ink-primary)]">
                    <WifiSlash size={14} weight="bold" />
                    <span>Offline Mode Active</span>
                  </span>
                ) : isReadyForOffline ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--accent-primary)]">
                    <CheckCircle size={15} weight="fill" />
                    <span>Ready for offline use</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-recessed)] px-3 py-1 text-xs font-bold text-[var(--ink-secondary)]">
                    <CloudArrowDown size={15} weight="duotone" />
                    <span>{ssSyncing || activeDownloadEntries.length > 0 ? 'Syncing offline study data...' : 'Preparing offline storage'}</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={!isOnline || ssSyncing}
                onClick={() => void onSyncNow()}
                className="tactile-btn inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 text-xs font-bold text-[var(--ink-on-accent)] shadow-[var(--shadow-tactile)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-45"
              >
                <ArrowsClockwise size={15} weight="bold" className={ssSyncing ? 'animate-spin' : ''} />
                <span>{ssSyncing ? 'Syncing...' : 'Check for Updates / Sync Now'}</span>
              </button>
            </div>

            {ssSyncDetail && (
              <p className="mt-2.5 text-xs font-medium text-[var(--ink-secondary)]">
                {ssSyncDetail}
              </p>
            )}

            {syncError && (
              <p className="mt-2 text-xs font-semibold text-[var(--accent-primary)]">
                {syncError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                  Hymnal &amp; Audio
                </p>
                <p className="mt-1 text-xs font-bold text-[var(--ink-primary)]">
                  1-920 + Piano/Organ
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                  {midiCachedCount >= TOTAL_HYMN_MIDIS
                    ? `${TOTAL_HYMN_MIDIS}/${TOTAL_HYMN_MIDIS} MIDI tracks offline`
                    : midiSyncing
                      ? `Caching MIDI tracks (${midiCachedCount}/${TOTAL_HYMN_MIDIS})...`
                      : `${midiCachedCount}/${TOTAL_HYMN_MIDIS} MIDI tracks cached`}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                  Sabbath School
                </p>
                <p className="mt-1 text-xs font-bold text-[var(--ink-primary)]">
                  {ssSyncMeta
                    ? `${ssSyncMeta.quarterPrefix} (${ssSyncMeta.lessonsCached} lessons)`
                    : 'Not synced yet'}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                  {ssSyncMeta
                    ? `Adult, Inverse, Cornerstone · ${new Date(ssSyncMeta.lastSyncedAt).toLocaleDateString()}`
                    : 'Syncs Adult, Inverse, Cornerstone'}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                  <HardDrives size={12} weight="bold" />
                  <span>Device Storage</span>
                </p>
                <p className="mt-1 text-xs font-bold text-[var(--ink-primary)]">
                  {usageBytes > 0 ? formatBytes(usageBytes) : 'IndexedDB Ready'}
                  {quotaBytes > 0 ? ` / ${formatBytes(quotaBytes)}` : ''}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                  {storagePersisted ? 'Persistent storage granted' : 'Standard browser storage'}
                </p>
              </div>
            </div>
          </section>

          {/* Offline Bible Versions */}
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[var(--ink-primary)]">
                  Offline Bible Translations
                </h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  Download extra translations for zero-internet verse reading and search
                </p>
              </div>
              <span className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--ink-secondary)]">
                {downloadedVersions.length}/{BIBLE_VERSIONS.length}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BIBLE_VERSIONS.map((v) => {
                const meta = downloadedMap.get(v.id);
                const dl = activeDownloads[v.id];
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--ink-primary)]">
                        {v.id}
                      </p>
                      <p className="truncate text-[11px] text-[var(--ink-muted)]">
                        {dl
                          ? dl.detail
                          : meta
                            ? `${meta.chapterCount} ch saved offline`
                            : v.name}
                      </p>
                    </div>

                    {dl ? (
                      <span className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--accent-primary)]">
                        {dl.pct}%
                      </span>
                    ) : meta ? (
                      <button
                        type="button"
                        onClick={() => onRemoveBibleVersion(v.id)}
                        aria-label={`Remove offline copy of ${v.id}`}
                        className="tactile-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--accent-primary)]"
                      >
                        <Trash size={13} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!isOnline}
                        onClick={() => onDownloadBibleVersion(v.id)}
                        className="tactile-btn inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-[11px] font-bold text-[var(--accent-primary)] hover:border-[var(--accent-primary)] disabled:opacity-45"
                      >
                        <CloudArrowDown size={13} weight="duotone" />
                        <span>Save</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notes Backup & Restore */}
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <h3 className="text-sm font-bold text-[var(--ink-primary)]">
              Notes Backup &amp; Transfer
            </h3>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              {notesCount} {notesCount === 1 ? 'note' : 'notes'} stored locally in IndexedDB. Export as JSON to back up or move between devices.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="tactile-btn inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 text-xs font-bold text-[var(--ink-primary)] shadow-[var(--shadow-tactile)] hover:border-[var(--border-strong)]"
              >
                <DownloadSimple size={15} weight="bold" />
                <span>Export Notes (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="tactile-btn inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 text-xs font-bold text-[var(--ink-primary)] shadow-[var(--shadow-tactile)] hover:border-[var(--border-strong)]"
              >
                <UploadSimple size={15} weight="bold" />
                <span>Import Notes (JSON)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
                aria-label="Import notes JSON file"
              />
            </div>

            {backupNotice && (
              <p className="mt-2.5 text-xs font-semibold text-[var(--accent-primary)]">
                {backupNotice}
              </p>
            )}
            {backupError && (
              <p className="mt-2.5 text-xs font-semibold text-[var(--accent-primary)]">
                {backupError}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
