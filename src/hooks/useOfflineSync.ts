import { useCallback, useEffect, useRef, useState } from 'react';
import type { BibleVersionId } from '../hooks/usePreferences';
import { downloadBibleVersionOffline } from '../lib/bibleApi';
import {
  deleteOfflineBibleVersion,
  getOfflineBibleVersions,
  getSyncMeta,
  type OfflineBibleVersionMeta,
  type SabbathSchoolSyncMeta,
} from '../lib/offlineDb';
import {
  getCachedMidiCount,
  requestPersistentStorage,
  SS_SYNC_META_KEY,
  syncAllHymnMidisOffline,
  syncCurrentSabbathSchoolQuarter,
  TOTAL_HYMN_MIDIS,
} from '../lib/offlineSync';
import { getQuarterIdPrefixForDate } from '../lib/sabbathSchoolApi';

export interface ActiveVersionDownload {
  pct: number;
  detail: string;
}

export function useOfflineSync(defaultBibleVersion: BibleVersionId) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [storagePersisted, setStoragePersisted] = useState(false);
  const [usageBytes, setUsageBytes] = useState(0);
  const [quotaBytes, setQuotaBytes] = useState(0);
  const [downloadedVersions, setDownloadedVersions] = useState<OfflineBibleVersionMeta[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<
    Partial<Record<BibleVersionId, ActiveVersionDownload>>
  >({});
  const [ssSyncMeta, setSsSyncMeta] = useState<SabbathSchoolSyncMeta | null>(null);
  const [ssSyncing, setSsSyncing] = useState(false);
  const [ssSyncDetail, setSsSyncDetail] = useState('');
  const [midiCachedCount, setMidiCachedCount] = useState(0);
  const [midiSyncing, setMidiSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const bibleInFlightRef = useRef(new Set<BibleVersionId>());
  const ssInFlightRef = useRef(false);
  const midiInFlightRef = useRef(false);
  const bootCheckedRef = useRef(false);

  const refreshStorageStats = useCallback(async () => {
    const [report, versions, ssMeta, midiCount] = await Promise.all([
      requestPersistentStorage(),
      getOfflineBibleVersions().catch(() => []),
      getSyncMeta<SabbathSchoolSyncMeta>(SS_SYNC_META_KEY).catch(() => null),
      getCachedMidiCount().catch(() => 0),
    ]);
    setStoragePersisted(report.persisted);
    setUsageBytes(report.usageBytes);
    setQuotaBytes(report.quotaBytes);
    setDownloadedVersions(versions);
    setSsSyncMeta(ssMeta);
    setMidiCachedCount(midiCount);
    return { report, versions, ssMeta, midiCount };
  }, []);

  const downloadBibleVersion = useCallback(
    async (version: BibleVersionId) => {
      if (bibleInFlightRef.current.has(version)) return;
      bibleInFlightRef.current.add(version);
      setSyncError(null);
      setActiveDownloads((prev) => ({
        ...prev,
        [version]: { pct: 2, detail: `Preparing ${version}...` },
      }));

      try {
        await downloadBibleVersionOffline(version, (pct, detail) => {
          setActiveDownloads((prev) => ({
            ...prev,
            [version]: { pct, detail },
          }));
        });
        await refreshStorageStats();
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : `Failed downloading ${version}`);
      } finally {
        bibleInFlightRef.current.delete(version);
        setActiveDownloads((prev) => {
          const next = { ...prev };
          delete next[version];
          return next;
        });
      }
    },
    [refreshStorageStats],
  );

  const removeBibleVersion = useCallback(
    async (version: BibleVersionId) => {
      await deleteOfflineBibleVersion(version);
      await refreshStorageStats();
    },
    [refreshStorageStats],
  );

  const syncQuarterNow = useCallback(
    async (forceRefresh = false) => {
      if (ssInFlightRef.current) return;
      ssInFlightRef.current = true;
      setSsSyncing(true);
      setSyncError(null);

      try {
        const meta = await syncCurrentSabbathSchoolQuarter((detail) => {
          setSsSyncDetail(detail);
        }, forceRefresh);
        setSsSyncMeta(meta);
        await refreshStorageStats();
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Sabbath School sync failed');
      } finally {
        ssInFlightRef.current = false;
        setSsSyncing(false);
      }
    },
    [refreshStorageStats],
  );

  const syncMidisNow = useCallback(async () => {
    if (midiInFlightRef.current) return;
    midiInFlightRef.current = true;
    setMidiSyncing(true);

    try {
      const count = await syncAllHymnMidisOffline((cached) => {
        setMidiCachedCount(cached);
      });
      setMidiCachedCount(count);
      await refreshStorageStats();
    } catch {
      // Best-effort silent background cache; next online launch resumes any remaining MIDIs
    } finally {
      midiInFlightRef.current = false;
      setMidiSyncing(false);
    }
  }, [refreshStorageStats]);

  const runAutoSyncCheck = useCallback(
    async (forceQuarterCheck = false) => {
      const { versions, ssMeta, midiCount } = await refreshStorageStats();
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      const currentPrefix = getQuarterIdPrefixForDate(new Date());
      const needsQuarter =
        forceQuarterCheck ||
        !ssMeta ||
        ssMeta.quarterPrefix !== currentPrefix ||
        ssMeta.status !== 'ready';

      if (needsQuarter) {
        void syncQuarterNow(forceQuarterCheck);
      }

      if (versions.length === 0) {
        void downloadBibleVersion(defaultBibleVersion);
      }

      if (midiCount < TOTAL_HYMN_MIDIS) {
        void syncMidisNow();
      }
    },
    [
      defaultBibleVersion,
      downloadBibleVersion,
      refreshStorageStats,
      syncMidisNow,
      syncQuarterNow,
    ],
  );

  useEffect(() => {
    if (bootCheckedRef.current) return;
    bootCheckedRef.current = true;

    const timer = window.setTimeout(() => {
      void runAutoSyncCheck(false);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [runAutoSyncCheck]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      void runAutoSyncCheck(false);
    };
    const onOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [runAutoSyncCheck]);

  const syncNow = useCallback(async () => {
    await runAutoSyncCheck(true);
    if (downloadedVersions.length === 0) {
      await downloadBibleVersion(defaultBibleVersion);
    }
  }, [defaultBibleVersion, downloadBibleVersion, downloadedVersions.length, runAutoSyncCheck]);

  const anyDownloading =
    ssSyncing || Object.keys(activeDownloads).length > 0;
  const isReadyForOffline =
    downloadedVersions.length > 0 &&
    Boolean(ssSyncMeta && ssSyncMeta.lessonsCached > 0);

  return {
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
    anyDownloading,
    isReadyForOffline,
    syncError,
    downloadBibleVersion,
    removeBibleVersion,
    syncNow,
  };
}
