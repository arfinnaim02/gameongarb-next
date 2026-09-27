export default function Loading() {
  return (
    <div className="container" style={{ padding: "45px 0" }}>
      <div
        className="skeleton"
        style={{ width: "40%", height: 48, marginBottom: 24 }}
      />
      <div className="grid-products">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((x) => (
          <div className="card" key={x} style={{ padding: 10 }}>
            <div className="skeleton" style={{ aspectRatio: "1/1.05" }} />
            <div
              className="skeleton"
              style={{ height: 14, width: "80%", marginTop: 12 }}
            />
            <div
              className="skeleton"
              style={{ height: 14, width: "45%", marginTop: 8 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
