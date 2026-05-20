export function parseDecklistCardNames(decklistText: string) {
  const uniqueNames = new Set<string>();

  for (const rawLine of decklistText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const withoutCount = line.replace(/^\d+\s*x?\s*/i, "").trim();
    const normalized = withoutCount || line;

    if (!normalized) {
      continue;
    }

    uniqueNames.add(normalized);
  }

  return [...uniqueNames];
}
