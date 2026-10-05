import Link from "next/link";

import {
  ChevronRight,
  ImageIcon,
} from "lucide-react";

import {
  getCategoryTree,
} from "@/lib/catalog";

export const dynamic =
  "force-dynamic";

export default async function Categories() {
  const categories =
    await getCategoryTree();

  return (
    <div
      className="container"
      style={{
        padding:
          "40px 0 70px",
      }}
    >
      <span className="eyebrow">
        Explore
      </span>

      <h1
        className="display"
        style={{
          fontSize:
            "clamp(3rem,7vw,5rem)",

          margin:
            "8px 0 32px",
        }}
      >
        Categories
      </h1>

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit,minmax(280px,1fr))",

          gap:
            18,
        }}
      >
        {categories.map(
          (
            category,
            index,
          ) => {
            const background =
              category.image
                ? `linear-gradient(
                    to top,
                    rgba(8,10,9,.9) 0%,
                    rgba(8,10,9,.42) 48%,
                    rgba(8,10,9,.12) 100%
                  ),
                  url("${category.image}")`
                : index %
                      2 ===
                    0
                  ? "linear-gradient(140deg,#2c302f,#101212)"
                  : "linear-gradient(140deg,#5f4a3a,#171919)";

            return (
              <section
                key={
                  category.id
                }
                className="card"
                style={{
                  padding: 0,
                  overflow:
                    "hidden",
                  borderRadius: 0,
                }}
              >
                <Link
                  href={`/shop?category=${category.slug}`}
                  style={{
                    minHeight:
                      330,

                    padding:
                      24,

                    display:
                      "flex",

                    flexDirection:
                      "column",

                    justifyContent:
                      "flex-end",

                    position:
                      "relative",

                    backgroundImage:
                      background,

                    backgroundSize:
                      "cover",

                    backgroundPosition:
                      "center",

                    color:
                      "white",

                    textDecoration:
                      "none",
                  }}
                >
                  <span
                    style={{
                      marginBottom:
                        8,

                      color:
                        "var(--orange)",

                      fontSize:
                        11,

                      fontWeight:
                        900,

                      letterSpacing:
                        ".16em",

                      textTransform:
                        "uppercase",
                    }}
                  >
                    Shop category
                  </span>

                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      alignItems:
                        "end",

                      gap:
                        18,
                    }}
                  >
                    <h2
                      style={{
                        margin:
                          0,

                        maxWidth:
                          "10ch",

                        fontSize:
                          "clamp(28px,4vw,42px)",

                        lineHeight:
                          0.95,

                        fontWeight:
                          950,

                        letterSpacing:
                          "-.04em",
                      }}
                    >
                      {
                        category.name
                      }
                    </h2>

                    <span
                      style={{
                        width:
                          42,

                        height:
                          42,

                        flex:
                          "0 0 auto",

                        border:
                          "1px solid rgba(255,255,255,.45)",

                        display:
                          "grid",

                        placeItems:
                          "center",

                        background:
                          "rgba(0,0,0,.18)",
                      }}
                    >
                      <ChevronRight
                        size={19}
                        color="var(--orange)"
                      />
                    </span>
                  </div>
                </Link>

                {category.children
                  .length >
                  0 && (
                  <div
                    style={{
                      background:
                        "white",

                      padding:
                        "6px 20px 14px",
                    }}
                  >
                    {category.children.map(
                      (
                        child,
                      ) => (
                        <div
                          key={
                            child.id
                          }
                          style={{
                            borderBottom:
                              "1px solid var(--line)",
                          }}
                        >
                          <Link
                            href={`/shop?category=${child.slug}`}
                            style={{
                              minHeight:
                                68,

                              display:
                                "flex",

                              alignItems:
                                "center",

                              gap:
                                12,

                              textDecoration:
                                "none",
                            }}
                          >
                            <span
                              style={{
                                width:
                                  44,

                                height:
                                  44,

                                flex:
                                  "0 0 44px",

                                overflow:
                                  "hidden",

                                backgroundImage:
                                  child.image
                                    ? `url("${child.image}")`
                                    : "linear-gradient(140deg,#eceeea,#d9ddd8)",

                                backgroundSize:
                                  "cover",

                                backgroundPosition:
                                  "center",

                                display:
                                  "grid",

                                placeItems:
                                  "center",
                              }}
                            >
                              {!child.image && (
                                <ImageIcon
                                  size={
                                    16
                                  }
                                  color="#8b918c"
                                />
                              )}
                            </span>

                            <strong
                              style={{
                                flex:
                                  1,

                                fontSize:
                                  13,
                              }}
                            >
                              {
                                child.name
                              }
                            </strong>

                            <ChevronRight
                              size={
                                15
                              }
                              color="var(--orange)"
                            />
                          </Link>

                          {child.children
                            .length >
                            0 && (
                            <div
                              style={{
                                padding:
                                  "0 0 11px 56px",

                                display:
                                  "flex",

                                flexWrap:
                                  "wrap",

                                gap:
                                  "6px 12px",
                              }}
                            >
                              {child.children.map(
                                (
                                  grandchild,
                                ) => (
                                  <Link
                                    key={
                                      grandchild.id
                                    }
                                    href={`/shop?category=${grandchild.slug}`}
                                    style={{
                                      color:
                                        "#707671",

                                      fontSize:
                                        11,

                                      fontWeight:
                                        700,

                                      textDecoration:
                                        "none",
                                    }}
                                  >
                                    {
                                      grandchild.name
                                    }
                                  </Link>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>
            );
          },
        )}
      </div>
    </div>
  );
}