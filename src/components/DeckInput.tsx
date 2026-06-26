import { useState } from "react";
import { SAMPLE_DECK } from "../sampleDeck";
import { buildShareUrl } from "../lib/share";

interface Props {
  value: string;
  onChange: (raw: string) => void;
  loading: boolean;
  error: string | null;
  warnings: string[];
  notFound: string[];
  onAnalyze: (raw: string) => void;
}

export function DeckInput({
  value,
  onChange,
  loading,
  error,
  warnings,
  notFound,
  onAnalyze,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = buildShareUrl(value);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure context) — surface the link in the
      // address bar so the user can still copy it manually.
      window.history.replaceState(null, "", url);
    }
  }

  return (
    <div className="panel">
      <h2>Deck</h2>
      <textarea
        placeholder={"Paste your Commander decklist…\n\n1 Atraxa, Praetors' Voice  *CMDR*\n1 Sol Ring\n1 Doubling Season\n…"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      <div className="row">
        <button onClick={() => onAnalyze(value)} disabled={loading || !value.trim()}>
          {loading ? "Analyzing…" : "Build graph"}
        </button>
        <button
          className="secondary"
          onClick={() => {
            onChange(SAMPLE_DECK);
            onAnalyze(SAMPLE_DECK);
          }}
          disabled={loading}
        >
          Load sample
        </button>
      </div>
      <div className="row">
        <button
          className="secondary"
          onClick={handleShare}
          disabled={!value.trim()}
          title="Copy a read-only link that reproduces this deck's graph"
        >
          {copied ? "Link copied ✓" : "Copy share link"}
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
