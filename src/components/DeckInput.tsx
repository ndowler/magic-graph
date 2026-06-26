import { useState } from "react";
import { SAMPLE_DECK } from "../sampleDeck";

interface Props {
  loading: boolean;
  error: string | null;
  warnings: string[];
  notFound: string[];
  onAnalyze: (raw: string) => void;
}

export function DeckInput({ loading, error, warnings, notFound, onAnalyze }: Props) {
  const [raw, setRaw] = useState("");

  return (
    <div className="panel">
      <h2>Deck</h2>
      <textarea
        placeholder={"Paste your Commander decklist…\n\n1 Atraxa, Praetors' Voice  *CMDR*\n1 Sol Ring\n1 Doubling Season\n…"}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        spellCheck={false}
      />
      <div className="row">
        <button onClick={() => onAnalyze(raw)} disabled={loading || !raw.trim()}>
          {loading ? "Analyzing…" : "Build graph"}
        </button>
        <button
          className="secondary"
          onClick={() => {
            setRaw(SAMPLE_DECK);
            onAnalyze(SAMPLE_DECK);
          }}
          disabled={loading}
        >
          Load sample
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {notFound.length > 0 && (
        <p className="error">Not found on Scryfall: {notFound.join(", ")}</p>
      )}
      {warnings.length > 0 && (
        <p className="muted">{warnings.length} line(s) skipped while parsing.</p>
      )}
    </div>
  );
}
