export function Section({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="container" style={{ padding: "34px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2 className="section-title" style={{ margin: "4px 0 0" }}>
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
