"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCardImageUrls } from "@/lib/scryfall";

export function useCardImageUrls(cardNames: string[]) {
  const dedupedCardNames = useMemo(() => [...new Set(cardNames.map((cardName) => cardName.trim()).filter(Boolean))], [cardNames]);
  const [imageUrls, setImageUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;

    if (dedupedCardNames.length === 0) {
      setImageUrls({});
      return;
    }

    void fetchCardImageUrls(dedupedCardNames).then((nextImageUrls) => {
      if (!cancelled) {
        setImageUrls(nextImageUrls);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dedupedCardNames]);

  return imageUrls;
}
