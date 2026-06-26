import { useState } from "react";
import type { FitResult } from "../types";
import { INTERACTION_LABELS } from "../lib/colors";

interface Props {
  onSearch: (name: string) => Promise<FitResult | null>;
  onAdd: (fit: FitResult) => void;
  disabled: boolean;
}

export function AddCard({ onSearch, onAdd, disabled }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [fit, setFit] = useState<FitResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleSearch() {
    if (!name.trim()) return;
    setBusy(true);
    setNotFound(false);
    const result = await onSearch(name.trim());
    setFit(result);
    setNotFound(result === null);
    setBusy(false);
  }

  const fitColor =
    fit && fit.fitScore >= 66 ? "#3f9b54" : fit && fit.fitScore >= 33 ? "#d9a441" : "#d4452f";

  return (
    <div className="panel">
      <h2>Test a card</h2>
      <input
        type="text"
        placeholder="Card name, e.g. Pitiless Plunderer"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        disabled={disabled}
      />
      <div className="row">
        <button onClick={handleSearch} disabled={disabled || busy || !name.trim()}>
          {busy ? "Checking…" : "Check fit"}
        </button>
      </div>

      {notFound && <p className="error">Card not found on Scryfall.</p>}

      {fit && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="fit-badge" style={{ color: fitColor }}>
              {fit.fitScore}
            </span>
            <span className="muted">fit score · {fit.newEdges.length} connection(s)</span>
          </div>
          {fit.newEdges.slice(0, 6).map((e, i) => (
            <div className="edge-item" key={i}>
              <span className="type">{INTERACTION_LABELS[e.type]}</span> — {e.explanation}
            </div>
          ))}
          <div className="row">
            <button onClick={() => onAdd(fit)} disabled={fit.newEdges.length === 0}>
              Add to deck
            </button>
            <button className="secondary" onClick={() => setFit(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
