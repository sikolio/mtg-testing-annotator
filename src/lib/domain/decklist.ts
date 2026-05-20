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

const IGNORE_WORDS = new Set(["a", "an", "and", "of", "the", "to"]);

function getMeaningfulWords(cardName: string) {
  return cardName
    .split(/[\s,/-]+/)
    .map((word) => word.replace(/[^a-z0-9']/gi, ""))
    .filter((word) => word.length > 0)
    .filter((word) => !IGNORE_WORDS.has(word.toLowerCase()))
    .map((word) => word.replace(/'s$/i, ""));
}

export function buildCardReferenceMap(cardNames: string[]) {
  return cardNames.map((cardName) => {
    const aliases = new Set<string>();
    const meaningfulWords = getMeaningfulWords(cardName);

    aliases.add(cardName);

    for (const word of meaningfulWords) {
      aliases.add(word);
    }

    if (meaningfulWords.length > 1) {
      aliases.add(meaningfulWords.map((word) => word[0]).join("").toUpperCase());
    }

    return {
      cardName,
      aliases: [...aliases].filter(Boolean)
    };
  });
}
