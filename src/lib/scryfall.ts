type ScryfallCardResponse = {
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
  };
  card_faces?: Array<{
    image_uris?: {
      small?: string;
      normal?: string;
      large?: string;
    };
  }>;
};

const imageCache = new Map<string, Promise<string | null>>();

export function getScryfallImageUrl(card: ScryfallCardResponse) {
  return (
    card.image_uris?.normal ??
    card.image_uris?.large ??
    card.image_uris?.small ??
    card.card_faces?.[0]?.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.large ??
    card.card_faces?.[0]?.image_uris?.small ??
    null
  );
}

export function fetchCardImageUrl(cardName: string) {
  const cacheKey = cardName.trim().toLowerCase();

  if (!cacheKey) {
    return Promise.resolve(null);
  }

  const cached = imageCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`)
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as ScryfallCardResponse;
      return getScryfallImageUrl(payload);
    })
    .catch(() => null);

  imageCache.set(cacheKey, request);
  return request;
}

export function clearScryfallImageCache() {
  imageCache.clear();
}
