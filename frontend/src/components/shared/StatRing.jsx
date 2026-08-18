export default function StatRing({ value, max = 100, size = 100, stroke = 8, color = "var(--green)", label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const dash = pct * circ;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center"
        }}>
          <span style={{ fontSize: size > 80 ? "1.3rem" : "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {typeof value === "number" && max === 100 ? `${value}%` : value}
          </span>
        </div>
      </div>
      {label && <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textAlign: "center" }}>{label}</span>}
      {sublabel && <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center" }}>{sublabel}</span>}
    </div>
  );
}
