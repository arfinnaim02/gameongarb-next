"use client";

import Image from "next/image";
import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Loader2,
  Search,
  X,
} from "lucide-react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  formatBDT,
} from "@/lib/money";

/* =========================================================
   TYPES
   ========================================================= */

type SearchProduct = {
  id:
    string;

  slug:
    string;

  name:
    string;

  category:
    string;

  image:
    string;

  price:
    number;

  stock:
    number;
};

type SearchCategory = {
  id:
    string;

  name:
    string;

  slug:
    string;
};

type SearchResponse = {
  products:
    SearchProduct[];

  categories:
    SearchCategory[];
};

/* =========================================================
   CONSTANTS
   ========================================================= */

const RECENT_SEARCH_KEY =
  "gog_recent_searches";

const RECENT_SEARCH_LIMIT =
  6;

/* =========================================================
   HEADER SEARCH
   ========================================================= */

export function HeaderSearch() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const inputRef =
    useRef<
      HTMLInputElement
    >(
      null,
    );

  const [
    open,
    setOpen,
  ] =
    useState(
      false,
    );

  const [
    query,
    setQuery,
  ] =
    useState(
      "",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  const [
    products,
    setProducts,
  ] =
    useState<
      SearchProduct[]
    >(
      [],
    );

  const [
    categories,
    setCategories,
  ] =
    useState<
      SearchCategory[]
    >(
      [],
    );

  const [
    recentSearches,
    setRecentSearches,
  ] =
    useState<
      string[]
    >(
      [],
    );

  /* =======================================================
     LOAD RECENT SEARCHES
     ======================================================= */

  useEffect(() => {
    try {
      const stored =
        window.localStorage
          .getItem(
            RECENT_SEARCH_KEY,
          );

      if (!stored) {
        return;
      }

      const parsed =
        JSON.parse(
          stored,
        );

      if (
        Array.isArray(
          parsed,
        )
      ) {
        setRecentSearches(
          parsed
            .filter(
              (
                item,
              ): item is string =>
                typeof item ===
                "string",
            )
            .slice(
              0,
              RECENT_SEARCH_LIMIT,
            ),
        );
      }
    } catch {
      // Recent search history is optional.
    }
  }, []);

  /* =======================================================
     CLOSE AFTER NAVIGATION
     ======================================================= */

  useEffect(() => {
    setOpen(
      false,
    );
  }, [
    pathname,
  ]);

  /* =======================================================
     ESCAPE
     ======================================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(
          false,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    open,
  ]);

  /* =======================================================
     AUTO FOCUS
     ======================================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    window.setTimeout(
      () => {
        inputRef.current
          ?.focus();
      },
      50,
    );
  }, [
    open,
  ]);

  /* =======================================================
     LIVE SEARCH
     ======================================================= */

  useEffect(() => {
    const value =
      query.trim();

    if (!value) {
      setProducts(
        [],
      );

      setCategories(
        [],
      );

      setLoading(
        false,
      );

      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          setLoading(
            true,
          );

          try {
            const response =
              await fetch(
                `/api/search/suggestions?q=${encodeURIComponent(
                  value,
                )}`,
                {
                  cache:
                    "no-store",

                  signal:
                    controller.signal,
                },
              );

            if (
              !response.ok
            ) {
              throw new Error(
                "Search failed.",
              );
            }

            const result =
              await response.json() as
                SearchResponse;

            setProducts(
              result.products ??
                [],
            );

            setCategories(
              result.categories ??
                [],
            );
          } catch (
            caught
          ) {
            if (
              caught instanceof
                DOMException &&
              caught.name ===
                "AbortError"
            ) {
              return;
            }

            setProducts(
              [],
            );

            setCategories(
              [],
            );
          } finally {
            setLoading(
              false,
            );
          }
        },
        180,
      );

    return () => {
      window.clearTimeout(
        timer,
      );

      controller.abort();
    };
  }, [
    query,
  ]);

  /* =======================================================
     RECENT SEARCH HELPERS
     ======================================================= */

  function rememberSearch(
    value:
      string,
  ) {
    const clean =
      value.trim();

    if (!clean) {
      return;
    }

    const next = [
      clean,

      ...recentSearches.filter(
        (
          item,
        ) =>
          item.toLowerCase() !==
          clean.toLowerCase(),
      ),
    ].slice(
      0,
      RECENT_SEARCH_LIMIT,
    );

    setRecentSearches(
      next,
    );

    try {
      window.localStorage
        .setItem(
          RECENT_SEARCH_KEY,
          JSON.stringify(
            next,
          ),
        );
    } catch {
      // Optional browser storage.
    }
  }

  function clearRecentSearches() {
    setRecentSearches(
      [],
    );

    try {
      window.localStorage
        .removeItem(
          RECENT_SEARCH_KEY,
        );
    } catch {
      // Optional browser storage.
    }
  }

  /* =======================================================
     OPEN
     ======================================================= */

  function openSearch() {
    setOpen(
      true,
    );
  }

  /* =======================================================
     SEARCH ALL
     ======================================================= */

  function searchAll(
    value:
      string,
  ) {
    const clean =
      value.trim();

    if (!clean) {
      return;
    }

    rememberSearch(
      clean,
    );

    setOpen(
      false,
    );

    router.push(
      `/shop?q=${encodeURIComponent(
        clean,
      )}`,
    );
  }

  function submitSearch(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    searchAll(
      query,
    );
  }

  const hasQuery =
    Boolean(
      query.trim(),
    );

  const noResults =
    hasQuery &&
    !loading &&
    products.length ===
      0 &&
    categories.length ===
      0;

  return (
    <>
      {/* ===================================================
          HEADER ICON
          =================================================== */}

      <button
        type="button"
        className="store-header-action desktop-only"
        aria-label="Search products"
        aria-expanded={
          open
        }
        aria-controls="global-store-search"
        onClick={
          openSearch
        }
      >
        <Search
          size={
            19
          }
          strokeWidth={
            1.7
          }
          aria-hidden="true"
        />
      </button>

      {/* ===================================================
          SEARCH PANEL
          =================================================== */}

      {open ? (
        <>
          <button
            type="button"
            className="header-search-backdrop desktop-only"
            aria-label="Close search"
            onClick={() =>
              setOpen(
                false,
              )
            }
          />

          <section
            id="global-store-search"
            className="header-search-panel desktop-only"
            aria-label="Search Game On Garb"
          >
            <div className="container header-search-container">
              <div className="header-search-top">
                <div>
                  <span>
                    Search Game On Garb
                  </span>

                  <strong>
                    Find your next look.
                  </strong>
                </div>

                <button
                  type="button"
                  className="header-search-close"
                  aria-label="Close search"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                >
                  <X
                    size={
                      19
                    }
                  />
                </button>
              </div>

              <form
                className="header-search-form"
                onSubmit={
                  submitSearch
                }
              >
                <Search
                  size={
                    20
                  }
                  strokeWidth={
                    1.6
                  }
                />

                <input
                  ref={
                    inputRef
                  }
                  type="search"
                  value={
                    query
                  }
                  autoComplete="off"
                  placeholder="Search products, categories, SKU..."
                  aria-label="Search products"
                  onChange={(
                    event,
                  ) =>
                    setQuery(
                      event.target
                        .value,
                    )
                  }
                />

                {loading ? (
                  <Loader2
                    size={
                      17
                    }
                    className="header-search-spinner"
                  />
                ) : query ? (
                  <button
                    type="button"
                    className="header-search-clear"
                    aria-label="Clear search"
                    onClick={() =>
                      setQuery(
                        "",
                      )
                    }
                  >
                    <X
                      size={
                        16
                      }
                    />
                  </button>
                ) : null}

                <button
                  type="submit"
                  className="header-search-submit"
                  disabled={
                    !query.trim()
                  }
                >
                  Search
                </button>
              </form>

              <div className="header-search-results">
                {/* =========================================
                    RECENT
                    ========================================= */}

                {!hasQuery &&
                recentSearches.length >
                  0 ? (
                  <div className="header-search-section">
                    <div className="header-search-section-title">
                      <span>
                        Recent Searches
                      </span>

                      <button
                        type="button"
                        onClick={
                          clearRecentSearches
                        }
                      >
                        Clear
                      </button>
                    </div>

                    <div className="header-search-recent">
                      {recentSearches.map(
                        (
                          item,
                        ) => (
                          <button
                            key={
                              item
                            }
                            type="button"
                            onClick={() => {
                              setQuery(
                                item,
                              );

                              searchAll(
                                item,
                              );
                            }}
                          >
                            <Search
                              size={
                                12
                              }
                            />

                            {
                              item
                            }
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}

                {/* =========================================
                    PRODUCTS
                    ========================================= */}

                {products.length >
                0 ? (
                  <div className="header-search-section">
                    <div className="header-search-section-title">
                      <span>
                        Products
                      </span>
                    </div>

                    <div className="header-search-products">
                      {products.map(
                        (
                          product,
                        ) => (
                          <Link
                            key={
                              product.id
                            }
                            href={`/product/${product.slug}`}
                            className="header-search-product"
                            onClick={() => {
                              rememberSearch(
                                query,
                              );

                              setOpen(
                                false,
                              );
                            }}
                          >
                            <span className="header-search-product-image">
                              <Image
                                src={
                                  product.image
                                }
                                alt=""
                                width={
                                  56
                                }
                                height={
                                  64
                                }
                              />
                            </span>

                            <span className="header-search-product-copy">
                              <small>
                                {
                                  product.category
                                }
                              </small>

                              <strong>
                                {
                                  product.name
                                }
                              </strong>

                              <span>
                                {formatBDT(
                                  product.price,
                                )}
                              </span>
                            </span>

                            <span
                              className={`header-search-stock ${
                                product.stock >
                                0
                                  ? "is-available"
                                  : "is-sold-out"
                              }`}
                            >
                              {product.stock >
                              0
                                ? "In stock"
                                : "Sold out"}
                            </span>
                          </Link>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}

                {/* =========================================
                    CATEGORIES
                    ========================================= */}

                {categories.length >
                0 ? (
                  <div className="header-search-section">
                    <div className="header-search-section-title">
                      <span>
                        Categories
                      </span>
                    </div>

                    <div className="header-search-categories">
                      {categories.map(
                        (
                          category,
                        ) => (
                          <Link
                            key={
                              category.id
                            }
                            href={`/shop?category=${encodeURIComponent(
                              category.slug,
                            )}`}
                            onClick={() => {
                              rememberSearch(
                                category.name,
                              );

                              setOpen(
                                false,
                              );
                            }}
                          >
                            <span>
                              {
                                category.name
                              }
                            </span>

                            <b>
                              View category →
                            </b>
                          </Link>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}

                {/* =========================================
                    EMPTY
                    ========================================= */}

                {noResults ? (
                  <div className="header-search-empty">
                    <Search
                      size={
                        22
                      }
                    />

                    <div>
                      <strong>
                        No instant match
                      </strong>

                      <span>
                        Search all products for “
                        {
                          query.trim()
                        }
                        ”.
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* =========================================
                    SEARCH ALL
                    ========================================= */}

                {hasQuery ? (
                  <button
                    type="button"
                    className="header-search-all"
                    onClick={() =>
                      searchAll(
                        query,
                      )
                    }
                  >
                    <span>
                      Search all for “
                      {
                        query.trim()
                      }
                      ”
                    </span>

                    <b>
                      →
                    </b>
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}