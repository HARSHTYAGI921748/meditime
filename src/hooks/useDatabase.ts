import { useEffect, useState } from 'react';
import { initDatabase, isDbAvailable } from '../db/migrations';

// ============================================================
// useDatabase – initializes SQLite once on app start
// ============================================================

let initPromise: Promise<boolean> | null = null;

export function useDatabase() {
  const [ready, setReady] = useState(isDbAvailable());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initPromise) {
      initPromise = initDatabase();
    }
    initPromise.then((ok) => {
      setReady(ok);
      if (!ok) {
        setError(
          'Running in web mode – data stored in localStorage. Install as Android APK for full functionality.'
        );
      }
    });
  }, []);

  return { ready, dbAvailable: isDbAvailable(), error };
}
