import { useEffect, useState } from "react";
import type { Card } from "../types";
import {
  buildShareUrl,
  cardsToDecklist,
  deleteDeck,
  loadSavedDecks,
  saveDeck,
  suggestDeckName,
  type SavedDeck,
} from "../lib/share";

interface Props {
  /** The current deck, used to build the share link and seed the save name. */
  cards: Card[];
  /** Load a saved deck's list back into the app. */
  onLoad: (decklist: string) => void;
  disabled: boolean;
}

export function SharePanel({ cards, onLoad, disabled }: Props) {
  const [saved, setSaved] = useState<SavedDeck[]>([]);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Hydrate the saved-deck list from localStorage on mount.
  useEffect(() => setSaved(loadSavedDecks()), []);

  async function handleCopy() {
    const url = buildShareUrl(cards, window.location.href);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (insecure context / denied) — fall back to
      // putting the link in the address bar so the user can copy it manually.
      window.location.hash = url.split("#")[1] ?? "";
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function handleSave() {
    const finalName = (name.trim() || suggestDeckName(cards)).trim();
    const updated = saveDeck(finalName, cardsToDecklist(cards), Date.now());
    if (updated) {
      setSaved(updated);
      setName("");
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
    }
  }

  function handleDelete(deckName: string) {
    setSaved(deleteDeck(deckName));
  }

  return (
    <div className="panel">
      <h2>Save &amp; share</h2>

      <input
        type="text"
        placeholder={cards.length ? suggestDeckName(cards) : "Deck name"}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !disabled && handleSave()}
        disabled={disabled}
      />
      <div className="row">
        <button onClick={handleSave} disabled={disabled}>
          {savedFlash ? "Saved ✓" : "Save deck"}
        </button>
        <button className="secondary" onClick={handleCopy} disabled={disabled}>
          {copied ? "Link copied ✓" : "Copy share link"}
        </button>
      </div>

      {saved.length > 0 && (
        <ul className="list saved-decks">
          {saved.map((d) => (
            <li key={d.name}>
              <span className="deck-name" onClick={() => onLoad(d.decklist)} title="Load this deck">
                {d.name}
              </span>
              <button
                className="link-btn"
                onClick={() => handleDelete(d.name)}
                aria-label={`Delete ${d.name}`}
                title="Delete"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
