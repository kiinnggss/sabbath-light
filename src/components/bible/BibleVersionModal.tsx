import { useEffect } from 'react';
import {
  CheckCircle,
  CloudArrowDown,
  Trash,
  X,
} from '@phosphor-icons/react';
import type { BibleVersionId } from '../../hooks/usePreferences';
import type { ActiveVersionDownload } from '../../hooks/useOfflineSync';
import { BIBLE_VERSIONS } from '../../lib/bibleApi';
import type { OfflineBibleVersionMeta } from '../../lib/offlineDb';

interface BibleVersionModalProps {
  open: boolean;
  onClose: () => void;
  selectedVersion: BibleVersionId;
  onSelectVersion: (v: BibleVersionId) => void;
  downloadedVersions: OfflineBibleVersionMeta[];
  activeDownloads: Partial<Record<BibleVersionId, ActiveVersionDownload>>;
  isOnline: boolean;
  onDownloadVersion: (v: BibleVersionId) => void;
  onRemoveVersion: (v: BibleVersionId) => void;
}

export function BibleVersionModal({
  open,
  onClose,
  selectedVersion,
  onSelectVersion,
  downloadedVersions,
  activeDownloads,
  isOnline,
  onDownloadVersion,
  onRemoveVersion,
}: BibleVersionModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const downloadedMap = new Map(downloadedVersions.map((m) => [m.version, m]));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bible-versions-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sheet-enter flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] shadow-[var(--shadow-sheet)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4">
          <div className="min-w-0">
            <h2
              id="bible-versions-title"
              className="font-display truncate text-base font-bold text-[var(--ink-primary)]"
            >
              Bible Translations
            </h2>
            <p className="truncate text-xs text-[var(--ink-muted)]">
              Switch version or save full translations for offline study
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close translation switcher"
            className="tactile-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--ink-primary)]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
          {BIBLE_VERSIONS.map((v) => {
            const isSelected = v.id === selectedVersion;
            const meta = downloadedMap.get(v.id);
            const activeDl = activeDownloads[v.id];

            return (
              <div
                key={v.id}
                className={`rounded-2xl border p-3.5 transition-colors ${
                  isSelected
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVersion(v.id);
                      onClose();
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-mono)] text-sm font-bold text-[var(--ink-primary)]">
                        {v.id}
                      </span>
                      {isSelected && (
                        <span className="rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-on-accent)]">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-[var(--ink-secondary)]">
                      {v.name}
                    </p>
                  </button>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {activeDl ? (
                      <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--bg-surface)] px-3 font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--accent-primary)]">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>{activeDl.pct}%</span>
                      </span>
                    ) : meta ? (
                      <>
                        <span className="inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-2.5 text-xs font-bold text-[var(--ink-primary)]">
                          <CheckCircle size={15} weight="fill" className="text-[var(--accent-primary)]" />
                          <span>Saved Offline</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveVersion(v.id)}
                          aria-label={`Remove offline download for ${v.id}`}
                          title={`Remove offline copy (${meta.chapterCount} chapters)`}
                          className="tactile-btn flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--accent-primary)]"
                        >
                          <Trash size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={!isOnline}
                        onClick={() => onDownloadVersion(v.id)}
                        className="tactile-btn inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--bg-surface)] px-3 text-xs font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--ink-on-accent)] disabled:opacity-45"
                      >
                        <CloudArrowDown size={15} weight="duotone" />
                        <span>Download for Offline</span>
                      </button>
                    )}
                  </div>
                </div>

                {activeDl && (
                  <div className="mt-2.5 space-y-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-recessed)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-150"
                        style={{ width: `${activeDl.pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-medium text-[var(--ink-muted)]">
                      {activeDl.detail}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
