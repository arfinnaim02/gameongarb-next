export function Kpi({
  label,
  value,
  note,
  tone = "orange",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div
      className="card"
      style={{ padding: 16, borderTop: `3px solid ${tone}` }}
    >
      <small className="muted">{label}</small>
      <b style={{ display: "block", fontSize: 23, margin: "7px 0" }}>{value}</b>
      <small style={{ color: "var(--green)" }}>{note}</small>
    </div>
  );
}
