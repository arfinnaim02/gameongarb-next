import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCategoryTree } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export default async function Categories() {
  const categories = await getCategoryTree();
  return (
    <div className="container" style={{ padding: "40px 0 70px" }}>
      <span className="eyebrow">Explore</span>
      <h1
        className="display"
        style={{ fontSize: "clamp(3rem,7vw,5rem)", margin: "8px 0 32px" }}
      >
        Categories
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
          gap: 16,
        }}
      >
        {categories.map((c, i) => (
          <section
            className="card"
            key={c.id}
            style={{
              padding: 22,
              background: i < 2 ? "#121515" : "white",
              color: i < 2 ? "white" : "inherit",
            }}
          >
            <Link
              href={`/shop?category=${c.slug}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ fontSize: 27, margin: 0 }}>{c.name}</h2>
              <ChevronRight color="var(--orange)" />
            </Link>
            {c.children.length > 0 && (
              <div
                style={{
                  marginTop: 18,
                  borderTop: `1px solid ${i < 2 ? "#343838" : "var(--line)"}`,
                }}
              >
                {c.children.map((child) => (
                  <details
                    key={child.id}
                    style={{
                      padding: "12px 0",
                      borderBottom: `1px solid ${i < 2 ? "#292d2b" : "var(--line)"}`,
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Link href={`/shop?category=${child.slug}`}>
                        {child.name}
                      </Link>
                      <ChevronRight size={16} />
                    </summary>
                    {child.children.map((grandchild) => (
                      <Link
                        key={grandchild.id}
                        href={`/shop?category=${grandchild.slug}`}
                        style={{
                          display: "block",
                          padding: "9px 0 0 18px",
                          fontSize: 12,
                          opacity: 0.78,
                        }}
                      >
                        ↳ {grandchild.name}
                      </Link>
                    ))}
                  </details>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
