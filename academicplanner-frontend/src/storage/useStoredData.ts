import { useEffect, useState } from 'react';
import { scheduleStorage } from './scheduleStorage';

/** Single storage boundary; updates after writes, clearing and other tabs. */
export function useStoredData() {
  const [result, setResult] = useState(scheduleStorage.read);
  useEffect(() => {
    const refresh = () => setResult(scheduleStorage.read());
    const unsubscribe = scheduleStorage.subscribe(refresh);
    refresh();
    return unsubscribe;
  }, []);
  return result;
}
