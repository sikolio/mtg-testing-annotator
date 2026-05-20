type ScryfallCardResponse = {
  name?: string;
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

function normalizeCardName(cardName: string) {
  return cardName.trim().toLowerCase();
}

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
  const cacheKey = normalizeCardName(cardName);

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

export async function fetchCardImageUrls(cardNames: string[]) {
  const requestedNames = [...new Set(cardNames.map((cardName) => cardName.trim()).filter(Boolean))];

  if (requestedNames.length === 0) {
    return {} as Record<string, string | null>;
  }

  const response = await fetch("https://api.scryfall.com/cards/collection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      identifiers: requestedNames.map((name) => ({ name }))
    })
  }).catch(() => null);

  if (!response?.ok) {
    return Object.fromEntries(requestedNames.map((name) => [name, null]));
  }

  const payload = (await response.json()) as { data?: ScryfallCardResponse[] };
  const imageUrlsByNormalizedName = new Map<string, string | null>();

  for (const card of payload.data ?? []) {
    if (!card.name) {
      continue;
    }

    imageUrlsByNormalizedName.set(normalizeCardName(card.name), getScryfallImageUrl(card));
  }

  return Object.fromEntries(
    requestedNames.map((name) => {
      const imageUrl = imageUrlsByNormalizedName.get(normalizeCardName(name)) ?? null;
      imageCache.set(normalizeCardName(name), Promise.resolve(imageUrl));
      return [name, imageUrl];
    })
  );
}

export function clearScryfallImageCache() {
  imageCache.clear();
}
