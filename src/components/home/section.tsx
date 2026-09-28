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
    <section className="container home-section">
      <div className="home-section-heading">
        <div className="home-section-heading-copy">
          {eyebrow ? (
            <div className="eyebrow">
              {eyebrow}
            </div>
          ) : null}

          <h2 className="home-section-title">
            {title}
          </h2>
        </div>

        {action ? (
          <div className="home-section-action">
            {action}
          </div>
        ) : null}
      </div>

      <div className="home-section-content">
        {children}
      </div>
    </section>
  );
}