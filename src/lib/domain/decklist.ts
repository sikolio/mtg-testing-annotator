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
const ALIAS_BOUNDARY = /[a-z0-9']/i;

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

function hasAliasBoundary(text: string, start: number, end: number) {
  const characterBefore = start > 0 ? text[start - 1] : "";
  const characterAfter = end < text.length ? text[end] : "";

  return !ALIAS_BOUNDARY.test(characterBefore) && !ALIAS_BOUNDARY.test(characterAfter);
}

export function findCardAliasMatches(
  text: string,
  cardNames: string[]
): Array<{ text: string; cardName?: string }> {
  const aliasEntries = buildCardReferenceMap(cardNames)
    .flatMap((reference) => reference.aliases.map((alias) => ({ alias, cardName: reference.cardName })))
    .sort((left, right) => right.alias.length - left.alias.length);

  if (aliasEntries.length === 0) {
    return [{ text }];
  }

  const segments: Array<{ text: string; cardName?: string }> = [];
  let cursor = 0;
  let plainTextStart = 0;

  while (cursor < text.length) {
    const matchedAlias = aliasEntries.find((entry) => {
      const candidate = text.slice(cursor, cursor + entry.alias.length);

      if (candidate.toLowerCase() !== entry.alias.toLowerCase()) {
        return false;
      }

      return hasAliasBoundary(text, cursor, cursor + entry.alias.length);
    });

    if (!matchedAlias) {
      cursor += 1;
      continue;
    }

    if (cursor > plainTextStart) {
      segments.push({ text: text.slice(plainTextStart, cursor) });
    }

    const end = cursor + matchedAlias.alias.length;
    segments.push({
      text: text.slice(cursor, end),
      cardName: matchedAlias.cardName
    });
    cursor = end;
    plainTextStart = end;
  }

  if (plainTextStart < text.length) {
    segments.push({ text: text.slice(plainTextStart) });
  }

  return segments;
}
