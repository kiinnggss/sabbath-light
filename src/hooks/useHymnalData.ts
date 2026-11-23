import { useEffect, useState } from 'react';
import type { HymnalDataset, HymnalEntry } from '../data/hymnalTypes';

const HYMNAL_CACHE_KEY = 'sabbath-light:hymnal-meta-status';

let memoryEntries: HymnalEntry[] | null = null;

export function useHymnalData() {
  const [entries, setEntries] = useState<HymnalEntry[]>(memoryEntries || []);
  const [loading, setLoading] = useState<boolean>(memoryEntries === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (memoryEntries !== null) return;

    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${import.meta.env.BASE_URL}data/hymnal.json`);
        if (!res.ok) {
          throw new Error(`Unable to load Hymnal dataset (${res.status})`);
        }
        const data = (await res.json()) as HymnalDataset;
        if (!Array.isArray(data.entries)) {
          throw new Error('Invalid hymnal dataset format');
        }
        memoryEntries = data.entries;
        try {
          localStorage.setItem(
            HYMNAL_CACHE_KEY,
            JSON.stringify({ total: data.entries.length, updatedAt: Date.now() }),
          );
        } catch {
          // Ignore storage write error
        }
        if (!cancelled) {
          setEntries(data.entries);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Hymnal');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { entries, loading, error };
}
