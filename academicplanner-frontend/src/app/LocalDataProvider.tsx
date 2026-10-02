import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useStoredData } from '../storage/useStoredData';
import { scheduleStorage, type StorageReadResult } from '../storage/scheduleStorage';

interface LocalDataContext extends StorageReadResult {
  usingLastValid: boolean;
  dataCleared: boolean;
  setUsingLastValid: (value: boolean) => void;
}

const Context = createContext<LocalDataContext | null>(null);

export function LocalDataProvider({ children }: { children: ReactNode }) {
  const stored = useStoredData();
  const [usingLastValid, setUsingLastValid] = useState(false);
  const [dataCleared, setDataCleared] = useState(false);
  useEffect(() => scheduleStorage.subscribe((change) => {
    if (change === 'cleared') setDataCleared(true);
    else if (scheduleStorage.get()?.session) setDataCleared(false);
  }), []);
  useEffect(() => {
    if (!stored.data?.session) setUsingLastValid(false);
  }, [stored.data?.session]);
  return <Context.Provider value={{ ...stored, usingLastValid, dataCleared, setUsingLastValid }}>{children}</Context.Provider>;
}

export function useLocalData() {
  const context = useContext(Context);
  if (!context) throw new Error('Se requiere LocalDataProvider');
  return context;
}
