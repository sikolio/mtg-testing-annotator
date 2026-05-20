"use client";

import React, { useMemo, useRef, useState } from "react";
import { buildCardReferenceMap } from "@/lib/domain/decklist";

type HighlightPart = {
  text: string;
  highlighted: boolean;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type CardReference = {
  cardName: string;
  aliases: string[];
};

function matchesCardFragment(fragment: string, cardReference: CardReference) {
  const normalizedFragment = fragment.trim().toLowerCase();

  if (!normalizedFragment) {
    return false;
  }

  return cardReference.aliases.some((alias) => {
    const normalizedAlias = alias.toLowerCase();

    if (normalizedAlias.startsWith(normalizedFragment)) {
      return true;
    }

    if (normalizedFragment.includes(" ")) {
      return false;
    }

    return normalizedAlias.split(/[\s,/-]+/).some((word) => word.startsWith(normalizedFragment));
  });
}

function getReplacementRange(text: string, caretPosition: number, cardReferences: CardReference[]) {
  const beforeCaret = text.slice(0, caretPosition);
  const tokenMatches = [...beforeCaret.matchAll(/\S+/g)];
  const trailingTokens = tokenMatches.slice(-4);

  for (let tokenCount = trailingTokens.length; tokenCount >= 1; tokenCount -= 1) {
    const slice = trailingTokens.slice(trailingTokens.length - tokenCount);
    const fragment = slice.map((token) => token[0]).join(" ");

    if (cardReferences.some((cardReference) => matchesCardFragment(fragment, cardReference))) {
      const first = slice[0];
      return {
        start: first.index ?? 0,
        end: caretPosition,
        fragment
      };
    }
  }

  const lastToken = trailingTokens.at(-1);
  if (!lastToken) {
    return null;
  }

  return {
    start: lastToken.index ?? 0,
    end: caretPosition,
    fragment: lastToken[0]
  };
}

function getHighlightParts(text: string, cardReferences: CardReference[]) {
  if (!text) {
    return [{ text: "", highlighted: false }] satisfies HighlightPart[];
  }

  const sortedAliases = [...new Set(cardReferences.flatMap((cardReference) => cardReference.aliases))]
    .sort((left, right) => right.length - left.length);
  if (sortedAliases.length === 0) {
    return [{ text, highlighted: false }] satisfies HighlightPart[];
  }

  const matcher = new RegExp(sortedAliases.map(escapeRegExp).join("|"), "gi");
  const parts: HighlightPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(matcher)) {
    const start = match.index ?? 0;
    const matchedText = match[0];

    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), highlighted: false });
    }

    parts.push({ text: matchedText, highlighted: true });
    cursor = start + matchedText.length;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), highlighted: false });
  }

  return parts;
}

export function PlayTextComposer({
  name,
  value,
  onChange,
  cardNames,
  placeholder
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  cardNames: string[];
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [caretPosition, setCaretPosition] = useState(value.length);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const cardReferences = useMemo(() => buildCardReferenceMap(cardNames), [cardNames]);
  const replacementRange = useMemo(
    () => getReplacementRange(value, caretPosition, cardReferences),
    [value, caretPosition, cardReferences]
  );
  const suggestions = useMemo(() => {
    if (!replacementRange?.fragment.trim()) {
      return [];
    }

    return cardReferences
      .filter((cardReference) => matchesCardFragment(replacementRange.fragment, cardReference))
      .map((cardReference) => cardReference.cardName)
      .slice(0, 6);
  }, [cardReferences, replacementRange]);
  const highlightParts = useMemo(() => getHighlightParts(value, cardReferences), [value, cardReferences]);

  function syncCaret(event: React.SyntheticEvent<HTMLTextAreaElement>) {
    setCaretPosition(event.currentTarget.selectionStart ?? event.currentTarget.value.length);
  }

  function applySuggestion(cardName: string) {
    const range = replacementRange ?? {
      start: caretPosition,
      end: caretPosition
    };
    const nextValue = `${value.slice(0, range.start)}${cardName}${value.slice(range.end)}`;
    const nextCaretPosition = range.start + cardName.length;

    onChange(nextValue);
    setCaretPosition(nextCaretPosition);
    setActiveSuggestionIndex(0);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if ((event.key === "Tab" || event.key === "Enter") && !event.shiftKey) {
      event.preventDefault();
      applySuggestion(suggestions[activeSuggestionIndex] ?? suggestions[0]);
    }
  }

  return (
    <div className="play-composer">
      <div className="play-composer-shell">
        <div className="play-composer-highlight" aria-hidden="true">
          {highlightParts.map((part, index) =>
            part.highlighted ? (
              <mark key={`${part.text}-${index}`}>{part.text}</mark>
            ) : (
              <span key={`${part.text}-${index}`}>{part.text}</span>
            )
          )}
          {!value ? <span className="play-composer-placeholder">{placeholder}</span> : null}
        </div>
        <textarea
          ref={textareaRef}
          name={name}
          required
          rows={3}
          value={value}
          placeholder={placeholder}
          className="play-composer-input"
          onChange={(event) => {
            onChange(event.target.value);
            setCaretPosition(event.target.selectionStart ?? event.target.value.length);
            setActiveSuggestionIndex(0);
          }}
          onClick={syncCaret}
          onKeyUp={syncCaret}
          onSelect={syncCaret}
          onKeyDown={handleKeyDown}
        />
      </div>

      {suggestions.length > 0 ? (
        <div className="play-suggestions" role="listbox" aria-label="Card suggestions">
          {suggestions.map((cardName, index) => (
            <button
              key={cardName}
              type="button"
              className={index === activeSuggestionIndex ? "secondary active" : "secondary"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applySuggestion(cardName)}
            >
              {cardName}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
