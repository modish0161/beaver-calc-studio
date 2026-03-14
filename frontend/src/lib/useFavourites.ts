import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Favourites Hook — localStorage-backed calculator favourites
// ============================================================================

const STORAGE_KEY = 'calculatorFavorites';

export interface FavouriteCalculator {
  key: string;
  name: string;
  category: string;
  addedAt: string;
}

function getAll(): FavouriteCalculator[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(favs: FavouriteCalculator[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  // Dispatch storage event for cross-component sync
  window.dispatchEvent(new Event('storage'));
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<FavouriteCalculator[]>([]);

  // Initial load and sync
  useEffect(() => {
    setFavourites(getAll());

    const handleStorage = () => setFavourites(getAll());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  /** Check if a calculator is favourited */
  const isFavourite = useCallback(
    (key: string): boolean => {
      return favourites.some((f) => f.key === key);
    },
    [favourites]
  );

  /** Add a calculator to favourites */
  const addFavourite = useCallback(
    (key: string, name: string, category: string) => {
      const current = getAll();
      if (current.some((f) => f.key === key)) return; // Already exists

      const newFav: FavouriteCalculator = {
        key,
        name,
        category,
        addedAt: new Date().toISOString(),
      };
      const updated = [newFav, ...current];
      persist(updated);
      setFavourites(updated);
    },
    []
  );

  /** Remove a calculator from favourites */
  const removeFavourite = useCallback((key: string) => {
    const current = getAll();
    const updated = current.filter((f) => f.key !== key);
    persist(updated);
    setFavourites(updated);
  }, []);

  /** Toggle favourite status */
  const toggleFavourite = useCallback(
    (key: string, name: string, category: string) => {
      if (isFavourite(key)) {
        removeFavourite(key);
      } else {
        addFavourite(key, name, category);
      }
    },
    [isFavourite, addFavourite, removeFavourite]
  );

  /** Clear all favourites */
  const clearFavourites = useCallback(() => {
    persist([]);
    setFavourites([]);
  }, []);

  return {
    favourites,
    isFavourite,
    addFavourite,
    removeFavourite,
    toggleFavourite,
    clearFavourites,
    count: favourites.length,
  };
}

// Standalone helpers for components that don't need the full hook
export function getFavourites(): FavouriteCalculator[] {
  return getAll();
}

export function getFavouriteKeys(): string[] {
  return getAll().map((f) => f.key);
}

export function isFavourited(key: string): boolean {
  return getAll().some((f) => f.key === key);
}
