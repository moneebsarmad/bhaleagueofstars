import { useEffect, useState } from "react";
import { canonicalHouseName, HOUSE_NAMES } from "./school.config";

const STORAGE_KEY = "los_house_selection";

export function useHouseSelection(initialHouse?: string) {
  const [house, setHouse] = useState<string | null>(initialHouse ? canonicalHouseName(initialHouse) : null);

  useEffect(() => {
    if (initialHouse) {
      const normalized = canonicalHouseName(initialHouse);
      setHouse(normalized);
      localStorage.setItem(STORAGE_KEY, normalized);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setHouse(canonicalHouseName(stored));
    }
  }, [initialHouse]);

  const updateHouse = (nextHouse: string) => {
    const normalized = canonicalHouseName(nextHouse);
    setHouse(normalized);
    localStorage.setItem(STORAGE_KEY, normalized);
  };

  return {
    house,
    setHouse: updateHouse,
    houses: HOUSE_NAMES,
  };
}
