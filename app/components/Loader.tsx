// Écran de chargement : un ballon qui rebondit pendant que le rond central se trace.
// Retiré par Motion (classe `is-loaded` sur <html>) ; une animation CSS le masque de toute façon après 4 s.
export default function Loader() {
  return (
    <div className="loader" aria-hidden="true">
      <div className="loader__stage">
        <svg className="loader__ring" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" pathLength={1} />
        </svg>
        <div className="loader__ball">
          <Ball />
        </div>
        <span className="loader__shadow" />
      </div>
      <p className="loader__word">
        {"Supercity".split("").map((c, i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties}>
            {c}
          </span>
        ))}
      </p>
    </div>
  );
}

export function Ball() {
  return (
    <svg viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="#fff8f1" stroke="#1f1a17" strokeWidth="3" />
      <polygon points="32,20 43,28 39,41 25,41 21,28" fill="#1f1a17" />
      <path d="M32 20V4M43 28l15-5M39 41l9 13M25 41l-9 13M21 28L6 23" stroke="#1f1a17" strokeWidth="3" fill="none" />
    </svg>
  );
}
