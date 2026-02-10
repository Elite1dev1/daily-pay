import { useState, useEffect } from 'react';
import { isOnline, setupOnlineListener } from '../services/syncService';

export function useOffline() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const cleanup = setupOnlineListener(
      () => setOnline(true),
      () => setOnline(false)
    );

    return cleanup;
  }, []);

  return { online, offline: !online };
}
