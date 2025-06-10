'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook to handle hydration state.
 * Returns true only after the component has hydrated on the client.
 * This prevents hydration mismatches by ensuring server and client render the same initially.
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/**
 * Custom hook to safely access localStorage only on the client side.
 * Returns null during SSR and initial hydration.
 */
export function useLocalStorage(key: string, defaultValue: any = null) {
  const [value, setValue] = useState(defaultValue);
  const isHydrated = useHydration();

  useEffect(() => {
    if (isHydrated) {
      try {
        const item = localStorage.getItem(key);
        setValue(item ? JSON.parse(item) : defaultValue);
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        setValue(defaultValue);
      }
    }
  }, [key, defaultValue, isHydrated]);

  const setStoredValue = (newValue: any) => {
    if (isHydrated) {
      try {
        setValue(newValue);
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    }
  };

  const removeStoredValue = () => {
    if (isHydrated) {
      try {
        setValue(defaultValue);
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Error removing localStorage key "${key}":`, error);
      }
    }
  };

  return [value, setStoredValue, removeStoredValue, isHydrated] as const;
}
