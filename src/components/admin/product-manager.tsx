"use client";

import Image from "next/image";

import {
  ArrowLeft,
  Boxes,
  ChevronRight,
  Copy,
  FolderOpen,
  ImageIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";

import { formatBDT } from "@/lib/money";

import type {
  AdminCategoryOption,
  AdminProductImage,
  AdminProductRecord,
  AdminProductVariant,
  AdminSizeChartOption,
  ProductUploadResponse,
} from "@/lib/admin-product-types";

import styles from "./product-manager.module.css";

type ProductManagerProps = {
  initialProducts:
    AdminProductRecord[];

  categories:
    AdminCategoryOption[];

  sizeCharts:
    AdminSizeChartOption[];
};

type StockFilter =
  | "ALL"
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

type EditorVariant =
  Omit<
    AdminProductVariant,
    "id"
  > & {
    id:
      string | null;

    clientId:
      string;
  };

type EditorImage =
  Omit<
    AdminProductImage,
    "id"
  > & {
    id:
      string | null;

    clientId:
      string;
  };

type ProductFormState = {
  name:
    string;

  slug:
    string;

  brand:
    string;

  shortDescription:
    string;

  description:
    string;

  regularPrice:
    string;

  salePrice:
    string;

  categoryId:
    string;

  sizeChartId:
    string;

  status:
    AdminProductRecord["status"];

  featured:
    boolean;

  newArrival:
    boolean;

  trending:
    boolean;

  seoTitle:
    string;

  seoDescription:
    string;

  images:
    EditorImage[];

  variants:
    EditorVariant[];
};

type ProductApiResponse = {
  product?:
    AdminProductRecord;

  message?:
    string;

  mode?:
    "archived"
    | "deleted";

  error?:
    string;
};

function uid() {
  if (
    typeof crypto !==
      "undefined" &&
    "randomUUID" in
      crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function slugify(
  value:
    string,
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function emptyVariant():
  EditorVariant {
  return {
    id: null,

    clientId:
      uid(),

    sku: "",

    size: "",

    color: "",

    colorHex:
      "#111111",

    priceOverride:
      null,

    stock:
      0,

    lowStockThreshold:
      5,

    active:
      true,
  };
}

function emptyForm(
  categoryId =
    "",
):
  ProductFormState {
  return {
    name: "",

    slug: "",

    brand:
      "Game On Garb",

    shortDescription:
      "",

    description:
      "",

    regularPrice:
      "",

    salePrice:
      "",

    categoryId,

    sizeChartId:
      "",

    status:
      "DRAFT",

    featured:
      false,

    newArrival:
      false,

    trending:
      false,

    seoTitle:
      "",

    seoDescription:
      "",

    images: [],

    variants: [
      emptyVariant(),
    ],
  };
}

function productToForm(
  product:
    AdminProductRecord,
):
  ProductFormState {
  return {
    name:
      product.name,

    slug:
      product.slug,

    brand:
      product.brand,

    shortDescription:
      product.shortDescription,

    description:
      product.description,

    regularPrice:
      String(
        product.regularPrice,
      ),

    salePrice:
      product.salePrice ===
      null
        ? ""
        : String(
            product.salePrice,
          ),

    categoryId:
      product.categoryId,

    sizeChartId:
      product.sizeChartId,

    status:
      product.status,

    featured:
      product.featured,

    newArrival:
      product.newArrival,

    trending:
      product.trending,

    seoTitle:
      product.seoTitle,

    seoDescription:
      product.seoDescription,

    images:
      product.images.map(
        (image) => ({
          ...image,

          clientId:
            uid(),
        }),
      ),

    variants:
      product.variants.length >
      0
        ? product.variants.map(
            (variant) => ({
              ...variant,

              clientId:
                uid(),
            }),
          )
        : [
            emptyVariant(),
          ],
  };
}

function formPayload(
  form:
    ProductFormState,
) {
  return {
    name:
      form.name.trim(),

    slug:
      form.slug.trim(),

    brand:
      form.brand.trim(),

    shortDescription:
      form.shortDescription.trim(),

    description:
      form.description.trim(),

    regularPrice:
      Number(
        form.regularPrice,
      ),

    salePrice:
      form.salePrice.trim()
        ? Number(
            form.salePrice,
          )
        : null,

    categoryId:
      form.categoryId,

    sizeChartId:
      form.sizeChartId,

    status:
      form.status,

    featured:
      form.featured,

    newArrival:
      form.newArrival,

    trending:
      form.trending,

    seoTitle:
      form.seoTitle.trim(),

    seoDescription:
      form.seoDescription.trim(),

    images:
      form.images.map(
        (
          image,
          index,
        ) => ({
          ...(image.id
            ? {
                id:
                  image.id,
              }
            : {}),

          url:
            image.url,

          publicId:
            image.publicId,

          alt:
            image.alt.trim(),

          color:
            image.color?.trim() ??
            "",

          sortOrder:
            index,

          primary:
            image.primary,
        }),
      ),

    variants:
      form.variants.map(
        (variant) => ({
          ...(variant.id
            ? {
                id:
                  variant.id,
              }
            : {}),

          sku:
            variant.sku.trim(),

          size:
            variant.size.trim(),

          color:
            variant.color.trim(),

          colorHex:
            variant.colorHex ||
            null,

          priceOverride:
            variant.priceOverride,

          stock:
            Number(
              variant.stock,
            ),

          lowStockThreshold:
            Number(
              variant.lowStockThreshold,
            ),

          active:
            variant.active,
        }),
      ),
  };
}

function formatDate(
  value:
    string,
) {
  return new Intl.DateTimeFormat(
    "en-BD",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    },
  ).format(
    new Date(
      value,
    ),
  );
}

export function ProductManager({
  initialProducts,
  categories,
  sizeCharts,
}: ProductManagerProps) {
  const [
    products,
    setProducts,
  ] =
    useState(
      initialProducts,
    );

  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] =
    useState<
      string | null
    >(null);

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("ALL");

  const [
    stockFilter,
    setStockFilter,
  ] =
    useState<StockFilter>(
      "ALL",
    );

  const [
    editorOpen,
    setEditorOpen,
  ] =
    useState(false);

  const [
    editingProduct,
    setEditingProduct,
  ] =
    useState<
      AdminProductRecord | null
    >(null);

  const [
    form,
    setForm,
  ] =
    useState<ProductFormState>(
      emptyForm(),
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    busyProductId,
    setBusyProductId,
  ] =
    useState<
      string | null
    >(null);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const categoryMap =
    useMemo(
      () =>
        new Map(
          categories.map(
            (category) => [
              category.id,
              category,
            ],
          ),
        ),
      [
        categories,
      ],
    );

  const rootCategories =
    useMemo(
      () =>
        categories.filter(
          (category) =>
            !category.parentId,
        ),
      [
        categories,
      ],
    );

  function descendantIds(
    categoryId:
      string,
  ) {
    const result =
      new Set<string>([
        categoryId,
      ]);

    let changed =
      true;

    while (changed) {
      changed =
        false;

      categories.forEach(
        (category) => {
          if (
            category.parentId &&
            result.has(
              category.parentId,
            ) &&
            !result.has(
              category.id,
            )
          ) {
            result.add(
              category.id,
            );

            changed =
              true;
          }
        },
      );
    }

    return result;
  }

  function categoryPath(
    categoryId:
      string,
  ) {
    const names:
      string[] = [];

    let currentId:
      string | null =
      categoryId;

    const visited =
      new Set<string>();

    while (
      currentId &&
      !visited.has(
        currentId,
      )
    ) {
      visited.add(
        currentId,
      );

      const category =
        categoryMap.get(
          currentId,
        );

      if (!category) {
        break;
      }

      names.unshift(
        category.name,
      );

      currentId =
        category.parentId;
    }

    return names.join(
      " / ",
    );
  }

  const metrics =
    useMemo(
      () => ({
        total:
          products.length,

        active:
          products.filter(
            (product) =>
              product.status ===
              "ACTIVE",
          ).length,

        lowStock:
          products.filter(
            (product) =>
              product.lowStock,
          ).length,

        outOfStock:
          products.filter(
            (product) =>
              product.outOfStock,
          ).length,
      }),
      [
        products,
      ],
    );

  const categoryCards =
    useMemo(
      () => {
        return rootCategories.map(
          (category) => {
            const ids =
              descendantIds(
                category.id,
              );

            const categoryProducts =
              products.filter(
                (product) =>
                  product.categoryIds.some(
                    (id) =>
                      ids.has(
                        id,
                      ),
                  ),
              );

            return {
              ...category,

              products:
                categoryProducts.length,

              active:
                categoryProducts.filter(
                  (product) =>
                    product.status ===
                    "ACTIVE",
                ).length,

              stock:
                categoryProducts.reduce(
                  (
                    total,
                    product,
                  ) =>
                    total +
                    product.stock,
                  0,
                ),

              lowStock:
                categoryProducts.filter(
                  (product) =>
                    product.lowStock,
                ).length,
            };
          },
        );
      },
      [
        rootCategories,
        products,
        categories,
      ],
    );

  const selectedCategory =
    selectedCategoryId
      ? categoryMap.get(
          selectedCategoryId,
        ) ??
        null
      : null;

  const selectedDescendants =
    useMemo(
      () =>
        selectedCategoryId
          ? descendantIds(
              selectedCategoryId,
            )
          : null,
      [
        selectedCategoryId,
        categories,
      ],
    );

  const visibleProducts =
    useMemo(
      () => {
        const term =
          query
            .trim()
            .toLowerCase();

        return products.filter(
          (product) => {
            if (
              selectedDescendants &&
              !product.categoryIds.some(
                (id) =>
                  selectedDescendants.has(
                    id,
                  ),
              )
            ) {
              return false;
            }

            if (
              term &&
              ![
                product.name,
                product.slug,
                product.brand,
                product.category,
                ...product.variants.flatMap(
                  (variant) => [
                    variant.sku,
                    variant.size,
                    variant.color,
                  ],
                ),
              ]
                .filter(
                  Boolean,
                )
                .some(
                  (value) =>
                    value
                      .toLowerCase()
                      .includes(
                        term,
                      ),
                )
            ) {
              return false;
            }

            if (
              statusFilter !==
                "ALL" &&
              product.status !==
                statusFilter
            ) {
              return false;
            }

            if (
              stockFilter ===
                "IN_STOCK" &&
              (
                product.outOfStock ||
                product.lowStock
              )
            ) {
              return false;
            }

            if (
              stockFilter ===
                "LOW_STOCK" &&
              !product.lowStock
            ) {
              return false;
            }

            if (
              stockFilter ===
                "OUT_OF_STOCK" &&
              !product.outOfStock
            ) {
              return false;
            }

            return true;
          },
        );
      },
      [
        products,
        query,
        statusFilter,
        stockFilter,
        selectedDescendants,
      ],
    );

  const subcategories =
    useMemo(
      () =>
        selectedCategoryId
          ? categories.filter(
              (category) =>
                category.parentId ===
                selectedCategoryId,
            )
          : [],
      [
        categories,
        selectedCategoryId,
      ],
    );

  function openCreate() {
    setEditingProduct(
      null,
    );

    setForm(
      emptyForm(
        selectedCategoryId ??
          "",
      ),
    );

    setError("");
    setMessage("");

    setEditorOpen(
      true,
    );
  }

  function openEdit(
    product:
      AdminProductRecord,
  ) {
    setEditingProduct(
      product,
    );

    setForm(
      productToForm(
        product,
      ),
    );

    setError("");
    setMessage("");

    setEditorOpen(
      true,
    );
  }

  function closeEditor() {
    if (
      saving ||
      uploading
    ) {
      return;
    }

    setEditorOpen(
      false,
    );
  }

  async function submitProduct(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !form.name.trim()
    ) {
      setError(
        "Product name is required.",
      );

      return;
    }

    if (
      !form.slug.trim()
    ) {
      setError(
        "Product slug is required.",
      );

      return;
    }

    if (
      !form.categoryId
    ) {
      setError(
        "Please select a category.",
      );

      return;
    }

    if (
      Number(
        form.regularPrice,
      ) <= 0
    ) {
      setError(
        "Regular price must be greater than zero.",
      );

      return;
    }

    if (
      form.variants.length ===
      0
    ) {
      setError(
        "At least one variant is required.",
      );

      return;
    }

    const missingSku =
      form.variants.some(
        (variant) =>
          !variant.sku.trim(),
      );

    if (missingSku) {
      setError(
        "Every variant needs a SKU.",
      );

      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          editingProduct
            ? `/api/admin/products/${editingProduct.id}`
            : "/api/admin/products",
          {
            method:
              editingProduct
                ? "PATCH"
                : "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify(
                formPayload(
                  form,
                ),
              ),
          },
        );

      const data =
        (await response.json()) as
          ProductApiResponse;

      if (
        !response.ok ||
        !data.product
      ) {
        throw new Error(
          data.error ??
            "Unable to save product.",
        );
      }

      setProducts(
        (current) => {
          const exists =
            current.some(
              (product) =>
                product.id ===
                data.product!.id,
            );

          if (!exists) {
            return [
              data.product!,
              ...current,
            ];
          }

          return current.map(
            (product) =>
              product.id ===
              data.product!.id
                ? data.product!
                : product,
          );
        },
      );

      setMessage(
        data.message ??
          "Product saved.",
      );

      setEditorOpen(
        false,
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
        Error
          ? saveError.message
          : "Unable to save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadImages(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const files =
      Array.from(
        event.target.files ??
          [],
      );

    event.target.value =
      "";

    if (
      files.length ===
      0
    ) {
      return;
    }

    const remaining =
      Math.max(
        0,
        12 -
          form.images.length,
      );

    if (
      remaining ===
      0
    ) {
      setError(
        "A product can have up to 12 images.",
      );

      return;
    }

    setUploading(true);
    setError("");

    try {
      const uploaded:
        EditorImage[] = [];

      for (
        const file of
        files.slice(
          0,
          remaining,
        )
      ) {
        const payload =
          new FormData();

        payload.append(
          "file",
          file,
        );

        const response =
          await fetch(
            "/api/admin/products/upload",
            {
              method:
                "POST",

              body:
                payload,
            },
          );

        const data =
          (await response.json()) as
            | ProductUploadResponse
            | {
                error?:
                  string;
              };

        if (
          !response.ok ||
          !(
            "image" in
            data
          )
        ) {
          throw new Error(
            "error" in
              data
              ? data.error ??
                  "Upload failed."
              : "Upload failed.",
          );
        }

        uploaded.push({
          id:
            null,

          clientId:
            uid(),

          url:
            data.image.url,

          publicId:
            data.image.publicId,

          alt:
            form.name ||
            "Product image",

          color:
            "",

          sortOrder:
            form.images.length +
            uploaded.length,

          primary:
            form.images.length ===
              0 &&
            uploaded.length ===
              0,
        });
      }

      setForm(
        (current) => ({
          ...current,

          images: [
            ...current.images,
            ...uploaded,
          ],
        }),
      );
    } catch (
      uploadError
    ) {
      setError(
        uploadError instanceof
        Error
          ? uploadError.message
          : "Unable to upload image.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function duplicateProduct(
    product:
      AdminProductRecord,
  ) {
    setBusyProductId(
      product.id,
    );

    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/products",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                duplicateId:
                  product.id,
              }),
          },
        );

      const data =
        (await response.json()) as
          ProductApiResponse;

      if (
        !response.ok ||
        !data.product
      ) {
        throw new Error(
          data.error ??
            "Unable to duplicate product.",
        );
      }

      setProducts(
        (current) => [
          data.product!,
          ...current,
        ],
      );
    } catch (
      duplicateError
    ) {
      setError(
        duplicateError instanceof
        Error
          ? duplicateError.message
          : "Unable to duplicate product.",
      );
    } finally {
      setBusyProductId(
        null,
      );
    }
  }

  async function deleteProduct(
    product:
      AdminProductRecord,
  ) {
    const confirmed =
      window.confirm(
        `Delete or archive "${product.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    setBusyProductId(
      product.id,
    );

    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/products/${product.id}`,
          {
            method:
              "DELETE",
          },
        );

      const data =
        (await response.json()) as
          ProductApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to remove product.",
        );
      }

      if (
        data.mode ===
          "archived" &&
        data.product
      ) {
        setProducts(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                product.id
                  ? data.product!
                  : item,
            ),
        );
      } else {
        setProducts(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                product.id,
            ),
        );
      }

      setMessage(
        data.message ??
          "Product updated.",
      );
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof
        Error
          ? deleteError.message
          : "Unable to remove product.",
      );
    } finally {
      setBusyProductId(
        null,
      );
    }
  }

  return (
    <div
      className={
        styles.page
      }
    >
      <section
        className={
          styles.hero
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Catalog Management
          </span>

          <h1>
            Products
          </h1>

          <p>
            Manage your catalog by
            category. Open a category
            to view, add and edit its
            products.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.primaryButton
          }
          onClick={
            openCreate
          }
        >
          <Plus
            size={16}
          />

          Add Product
        </button>
      </section>

      <section
        className={
          styles.metrics
        }
      >
        <Metric
          label="Total Products"
          value={
            metrics.total
          }
        />

        <Metric
          label="Active"
          value={
            metrics.active
          }
        />

        <Metric
          label="Low Stock"
          value={
            metrics.lowStock
          }
        />

        <Metric
          label="Out of Stock"
          value={
            metrics.outOfStock
          }
        />
      </section>

      {message ? (
        <div
          className={
            styles.message
          }
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          className={
            styles.error
          }
        >
          {error}
        </div>
      ) : null}

      {!selectedCategory ? (
        <section
          className={
            styles.categorySection
          }
        >
          <div
            className={
              styles.sectionHeader
            }
          >
            <div>
              <span>
                Catalog Structure
              </span>

              <h2>
                Categories
              </h2>

              <p>
                Select a category to
                manage the products
                assigned to it.
              </p>
            </div>
          </div>

          <div
            className={
              styles.categoryGrid
            }
          >
            {categoryCards.map(
              (category) => (
                <button
                  key={
                    category.id
                  }
                  type="button"
                  className={
                    styles.categoryCard
                  }
                  onClick={() =>
                    setSelectedCategoryId(
                      category.id,
                    )
                  }
                >
                  <div
                    className={
                      styles.categoryIcon
                    }
                  >
                    <FolderOpen
                      size={
                        21
                      }
                    />
                  </div>

                  <div
                    className={
                      styles.categoryInfo
                    }
                  >
                    <strong>
                      {
                        category.name
                      }
                    </strong>

                    <span>
                      {
                        category.products
                      }{" "}
                      products
                    </span>
                  </div>

                  <div
                    className={
                      styles.categoryStats
                    }
                  >
                    <div>
                      <span>
                        Units
                      </span>

                      <strong>
                        {
                          category.stock
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Active
                      </span>

                      <strong>
                        {
                          category.active
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Low
                      </span>

                      <strong>
                        {
                          category.lowStock
                        }
                      </strong>
                    </div>
                  </div>

                  <ChevronRight
                    size={
                      18
                    }
                  />
                </button>
              ),
            )}
          </div>
        </section>
      ) : (
        <>
          <section
            className={
              styles.categoryToolbar
            }
          >
            <button
              type="button"
              className={
                styles.backButton
              }
              onClick={() => {
                setSelectedCategoryId(
                  null,
                );

                setQuery("");
              }}
            >
              <ArrowLeft
                size={
                  15
                }
              />

              Categories
            </button>

            <div
              className={
                styles.categoryTitle
              }
            >
              <span>
                {
                  categoryPath(
                    selectedCategory.id,
                  )
                }
              </span>

              <h2>
                {
                  selectedCategory.name
                }
              </h2>

              <p>
                {
                  visibleProducts.length
                }{" "}
                products currently
                shown
              </p>
            </div>

            <button
              type="button"
              className={
                styles.primaryButton
              }
              onClick={
                openCreate
              }
            >
              <Plus
                size={15}
              />

              Add Product
            </button>
          </section>

          {subcategories.length >
          0 ? (
            <section
              className={
                styles.subcategoryBar
              }
            >
              {subcategories.map(
                (
                  category,
                ) => (
                  <button
                    key={
                      category.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedCategoryId(
                        category.id,
                      )
                    }
                  >
                    {
                      category.name
                    }

                    <ChevronRight
                      size={
                        13
                      }
                    />
                  </button>
                ),
              )}
            </section>
          ) : null}

          <section
            className={
              styles.filters
            }
          >
            <div
              className={
                styles.searchBox
              }
            >
              <Search
                size={
                  15
                }
              />

              <input
                value={
                  query
                }
                onChange={(
                  event,
                ) =>
                  setQuery(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Search product, SKU, color or size"
              />
            </div>

            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event
                    .target
                    .value,
                )
              }
            >
              <option value="ALL">
                All Status
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="DRAFT">
                Draft
              </option>

              <option value="INACTIVE">
                Inactive
              </option>

              <option value="ARCHIVED">
                Archived
              </option>
            </select>

            <select
              value={
                stockFilter
              }
              onChange={(
                event,
              ) =>
                setStockFilter(
                  event
                    .target
                    .value as
                    StockFilter,
                )
              }
            >
              <option value="ALL">
                All Stock
              </option>

              <option value="IN_STOCK">
                In Stock
              </option>

              <option value="LOW_STOCK">
                Low Stock
              </option>

              <option value="OUT_OF_STOCK">
                Out of Stock
              </option>
            </select>
          </section>

          <section
            className={
              styles.productPanel
            }
          >
            <div
              className={
                styles.productPanelHeader
              }
            >
              <div>
                <span>
                  Product Catalog
                </span>

                <strong>
                  {
                    selectedCategory.name
                  }
                </strong>
              </div>

              <span>
                {
                  visibleProducts.length
                }{" "}
                results
              </span>
            </div>

            {visibleProducts.length >
            0 ? (
              <div
                className={
                  styles.tableWrap
                }
              >
                <table
                  className={
                    styles.productTable
                  }
                >
                  <thead>
                    <tr>
                      <th>
                        Product
                      </th>

                      <th>
                        Category
                      </th>

                      <th>
                        Price
                      </th>

                      <th>
                        Variants
                      </th>

                      <th>
                        Stock
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Updated
                      </th>

                      <th>
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleProducts.map(
                      (
                        product,
                      ) => (
                        <tr
                          key={
                            product.id
                          }
                        >
                          <td>
                            <div
                              className={
                                styles.productCell
                              }
                            >
                              <div
                                className={
                                  styles.productImage
                                }
                              >
                                <Image
                                  src={
                                    product.image
                                  }
                                  alt={
                                    product.name
                                  }
                                  fill
                                  sizes="56px"
                                />
                              </div>

                              <div>
                                <strong>
                                  {
                                    product.name
                                  }
                                </strong>

                                <span>
                                  {
                                    product.slug
                                  }
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                styles.categoryBadge
                              }
                            >
                              {
                                product.category
                              }
                            </span>
                          </td>

                          <td>
                            <div
                              className={
                                styles.priceCell
                              }
                            >
                              <strong>
                                {formatBDT(
                                  product.salePrice ??
                                    product.regularPrice,
                                )}
                              </strong>

                              {product.salePrice ? (
                                <span>
                                  {formatBDT(
                                    product.regularPrice,
                                  )}
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td>
                            {
                              product.activeVariantCount
                            }
                          </td>

                          <td>
                            <StockBadge
                              product={
                                product
                              }
                            />
                          </td>

                          <td>
                            <span
                              className={`${styles.statusBadge} ${styles[
                                `status${product.status}`
                              ]}`}
                            >
                              {
                                product.status
                              }
                            </span>
                          </td>

                          <td>
                            {
                              formatDate(
                                product.updatedAt,
                              )
                            }
                          </td>

                          <td>
                            <div
                              className={
                                styles.rowActions
                              }
                            >
                              <button
                                type="button"
                                title="Edit product"
                                onClick={() =>
                                  openEdit(
                                    product,
                                  )
                                }
                              >
                                <Pencil
                                  size={
                                    14
                                  }
                                />
                              </button>

                              <button
                                type="button"
                                title="Duplicate product"
                                disabled={
                                  busyProductId ===
                                  product.id
                                }
                                onClick={() =>
                                  duplicateProduct(
                                    product,
                                  )
                                }
                              >
                                <Copy
                                  size={
                                    14
                                  }
                                />
                              </button>

                              <button
                                type="button"
                                title="Delete or archive"
                                className={
                                  styles.dangerAction
                                }
                                disabled={
                                  busyProductId ===
                                  product.id
                                }
                                onClick={() =>
                                  deleteProduct(
                                    product,
                                  )
                                }
                              >
                                {busyProductId ===
                                product.id ? (
                                  <Loader2
                                    size={
                                      14
                                    }
                                    className={
                                      styles.spin
                                    }
                                  />
                                ) : (
                                  <Trash2
                                    size={
                                      14
                                    }
                                  />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className={
                  styles.empty
                }
              >
                <Boxes
                  size={
                    28
                  }
                />

                <strong>
                  No products found
                </strong>

                <span>
                  Add a product to this
                  category or adjust the
                  current filters.
                </span>

                <button
                  type="button"
                  className={
                    styles.primaryButton
                  }
                  onClick={
                    openCreate
                  }
                >
                  <Plus
                    size={
                      14
                    }
                  />

                  Add Product
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {editorOpen ? (
        <div
          className={
            styles.editorOverlay
          }
          role="presentation"
        >
          <form
            className={
              styles.editor
            }
            onSubmit={
              submitProduct
            }
          >
            <header
              className={
                styles.editorHeader
              }
            >
              <div>
                <span>
                  {
                    editingProduct
                      ? "Edit Product"
                      : "New Product"
                  }
                </span>

                <h2>
                  {
                    editingProduct
                      ?.name ??
                    "Create Product"
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeEditor
                }
              >
                <X
                  size={
                    18
                  }
                />
              </button>
            </header>

            <div
              className={
                styles.editorBody
              }
            >
              {error ? (
                <div
                  className={
                    styles.error
                  }
                >
                  {error}
                </div>
              ) : null}

              <section
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.sectionTitle
                  }
                >
                  Basic Information
                </div>

                <div
                  className={
                    styles.twoColumns
                  }
                >
                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Product Name
                    </span>

                    <input
                      value={
                        form.name
                      }
                      onChange={(
                        event,
                      ) => {
                        const name =
                          event
                            .target
                            .value;

                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            name,

                            slug:
                              editingProduct
                                ? current.slug
                                : slugify(
                                    name,
                                  ),
                          }),
                        );
                      }}
                    />
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Slug
                    </span>

                    <input
                      value={
                        form.slug
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            slug:
                              slugify(
                                event
                                  .target
                                  .value,
                              ),
                          }),
                        )
                      }
                    />
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Category
                    </span>

                    <select
                      value={
                        form.categoryId
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            categoryId:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                    >
                      <option value="">
                        Select Category
                      </option>

                      {categories.map(
                        (
                          category,
                        ) => (
                          <option
                            key={
                              category.id
                            }
                            value={
                              category.id
                            }
                          >
                            {
                              categoryPath(
                                category.id,
                              )
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Brand
                    </span>

                    <input
                      value={
                        form.brand
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            brand:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                    />
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Regular Price
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        form.regularPrice
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            regularPrice:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                    />
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Sale Price
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        form.salePrice
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            salePrice:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                    />
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Status
                    </span>

                    <select
                      value={
                        form.status
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            status:
                              event
                                .target
                                .value as
                                AdminProductRecord["status"],
                          }),
                        )
                      }
                    >
                      <option value="DRAFT">
                        Draft
                      </option>

                      <option value="ACTIVE">
                        Active
                      </option>

                      <option value="INACTIVE">
                        Inactive
                      </option>

                      <option value="ARCHIVED">
                        Archived
                      </option>
                    </select>
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Size Chart
                    </span>

                    <select
                      value={
                        form.sizeChartId
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            sizeChartId:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                    >
                      <option value="">
                        No Size Chart
                      </option>

                      {sizeCharts.map(
                        (
                          chart,
                        ) => (
                          <option
                            key={
                              chart.id
                            }
                            value={
                              chart.id
                            }
                          >
                            {
                              chart.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>

                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    Short Description
                  </span>

                  <textarea
                    rows={
                      3
                    }
                    value={
                      form.shortDescription
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          shortDescription:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    Description
                  </span>

                  <textarea
                    rows={
                      6
                    }
                    value={
                      form.description
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          description:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <div
                  className={
                    styles.checkGrid
                  }
                >
                  {[
                    [
                      "Featured",
                      "featured",
                    ],
                    [
                      "New Arrival",
                      "newArrival",
                    ],
                    [
                      "Trending",
                      "trending",
                    ],
                  ].map(
                    ([
                      label,
                      key,
                    ]) => (
                      <label
                        key={
                          key
                        }
                        className={
                          styles.checkbox
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            Boolean(
                              form[
                                key as
                                  | "featured"
                                  | "newArrival"
                                  | "trending"
                              ],
                            )
                          }
                          onChange={(
                            event,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,

                                [key]:
                                  event
                                    .target
                                    .checked,
                              }),
                            )
                          }
                        />

                        {
                          label
                        }
                      </label>
                    ),
                  )}
                </div>
              </section>

              <section
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.sectionHeadingRow
                  }
                >
                  <div
                    className={
                      styles.sectionTitle
                    }
                  >
                    Product Images
                  </div>

                  <label
                    className={
                      styles.uploadButton
                    }
                  >
                    {uploading ? (
                      <Loader2
                        size={
                          14
                        }
                        className={
                          styles.spin
                        }
                      />
                    ) : (
                      <ImageIcon
                        size={
                          14
                        }
                      />
                    )}

                    Upload Images

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={
                        uploading
                      }
                      onChange={
                        uploadImages
                      }
                    />
                  </label>
                </div>

                <div
                  className={
                    styles.imageGrid
                  }
                >
                  {form.images.map(
                    (
                      image,
                      index,
                    ) => (
                      <article
                        key={
                          image.clientId
                        }
                        className={
                          styles.imageCard
                        }
                      >
                        <div
                          className={
                            styles.imagePreview
                          }
                        >
                          <Image
                            src={
                              image.url
                            }
                            alt={
                              image.alt ||
                              form.name
                            }
                            fill
                            sizes="160px"
                          />
                        </div>

                        <input
                          value={
                            image.alt
                          }
                          placeholder="Alt text"
                          onChange={(
                            event,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,

                                images:
                                  current.images.map(
                                    (
                                      item,
                                      itemIndex,
                                    ) =>
                                      itemIndex ===
                                      index
                                        ? {
                                            ...item,

                                            alt:
                                              event
                                                .target
                                                .value,
                                          }
                                        : item,
                                  ),
                              }),
                            )
                          }
                        />

                        <div
                          className={
                            styles.imageActions
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setForm(
                                (
                                  current,
                                ) => ({
                                  ...current,

                                  images:
                                    current.images.map(
                                      (
                                        item,
                                        itemIndex,
                                      ) => ({
                                        ...item,

                                        primary:
                                          itemIndex ===
                                          index,
                                      }),
                                    ),
                                }),
                              )
                            }
                          >
                            {
                              image.primary
                                ? "Primary"
                                : "Make Primary"
                            }
                          </button>

                          <button
                            type="button"
                            className={
                              styles.dangerText
                            }
                            onClick={() =>
                              setForm(
                                (
                                  current,
                                ) => {
                                  const next =
                                    current.images.filter(
                                      (
                                        _,
                                        itemIndex,
                                      ) =>
                                        itemIndex !==
                                        index,
                                    );

                                  if (
                                    next.length >
                                      0 &&
                                    !next.some(
                                      (
                                        item,
                                      ) =>
                                        item.primary,
                                    )
                                  ) {
                                    next[0] = {
                                      ...next[0],

                                      primary:
                                        true,
                                    };
                                  }

                                  return {
                                    ...current,

                                    images:
                                      next,
                                  };
                                },
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </section>

              <section
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.sectionHeadingRow
                  }
                >
                  <div
                    className={
                      styles.sectionTitle
                    }
                  >
                    Variants
                  </div>

                  <button
                    type="button"
                    className={
                      styles.secondaryButton
                    }
                    onClick={() =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          variants: [
                            ...current.variants,
                            emptyVariant(),
                          ],
                        }),
                      )
                    }
                  >
                    <Plus
                      size={
                        14
                      }
                    />

                    Add Variant
                  </button>
                </div>

                <div
                  className={
                    styles.variantTableWrap
                  }
                >
                  <table
                    className={
                      styles.variantTable
                    }
                  >
                    <thead>
                      <tr>
                        <th>
                          SKU
                        </th>

                        <th>
                          Color
                        </th>

                        <th>
                          Size
                        </th>

                        <th>
                          Stock
                        </th>

                        <th>
                          Low Stock
                        </th>

                        <th>
                          Active
                        </th>

                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {form.variants.map(
                        (
                          variant,
                          index,
                        ) => (
                          <tr
                            key={
                              variant.clientId
                            }
                          >
                            <td>
                              <input
                                value={
                                  variant.sku
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setForm(
                                    (
                                      current,
                                    ) => ({
                                      ...current,

                                      variants:
                                        current.variants.map(
                                          (
                                            item,
                                            itemIndex,
                                          ) =>
                                            itemIndex ===
                                            index
                                              ? {
                                                  ...item,

                                                  sku:
                                                    event
                                                      .target
                                                      .value,
                                                }
                                              : item,
                                        ),
                                    }),
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                value={
                                  variant.color
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setForm(
                                    (
                                      current,
                                    ) => ({
                                      ...current,

                                      variants:
                                        current.variants.map(
                                          (
                                            item,
                                            itemIndex,
                                          ) =>
                                            itemIndex ===
                                            index
                                              ? {
                                                  ...item,

                                                  color:
                                                    event
                                                      .target
                                                      .value,
                                                }
                                              : item,
                                        ),
                                    }),
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                value={
                                  variant.size
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setForm(
                                    (
                                      current,
                                    ) => ({
                                      ...current,

                                      variants:
                                        current.variants.map(
                                          (
                                            item,
                                            itemIndex,
                                          ) =>
                                            itemIndex ===
                                            index
                                              ? {
                                                  ...item,

                                                  size:
                                                    event
                                                      .target
                                                      .value,
                                                }
                                              : item,
                                        ),
                                    }),
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                value={
                                  variant.stock
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setForm(
                                    (
                                      current,
                                    ) => ({
                                      ...current,

                                      variants:
                                        current.variants.map(
                                          (
                                            item,
                                            itemIndex,
                                          ) =>
                                            itemIndex ===
                                            index
                                              ? {
                                                  ...item,

                                                  stock:
                                                    Number(
                                                      event
                                                        .target
                                                        .value,
                                                    ),
                                                }
                                              : item,
                                        ),
                                    }),
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                value={
                                  variant.lowStockThreshold
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setForm(
                                    (
                                      current,
                                    ) => ({
                                      ...current,

                                      variants:
                                        current.variants.map(
                                          (
                                            item,
                                            itemIndex,
                                          ) =>
                                            itemIndex ===
                                            index
                                              ? {
                                                  ...item,

                                                  lowStockThreshold:
                                                    Number(
                                                      event
                                                        .target
                                                        .value,
                                                    ),
                                                }
                                              : item,
                                        ),
                                    }),
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="checkbox"
                                checked={
                                  variant.active
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setForm(
                                    (
                                      current,
                                    ) => ({
                                      ...current,

                                      variants:
                                        current.variants.map(
                                          (
                                            item,
                                            itemIndex,
                                          ) =>
                                            itemIndex ===
                                            index
                                              ? {
                                                  ...item,

                                                  active:
                                                    event
                                                      .target
                                                      .checked,
                                                }
                                              : item,
                                        ),
                                    }),
                                  )
                                }
                              />
                            </td>

                            <td>
                              <button
                                type="button"
                                className={
                                  styles.variantDelete
                                }
                                disabled={
                                  form.variants.length ===
                                  1
                                }
                                onClick={() =>
                                  setForm(
                                    (
                                      current,
                                    ) => ({
                                      ...current,

                                      variants:
                                        current.variants.filter(
                                          (
                                            _,
                                            itemIndex,
                                          ) =>
                                            itemIndex !==
                                            index,
                                        ),
                                    }),
                                  )
                                }
                              >
                                <Trash2
                                  size={
                                    13
                                  }
                                />
                              </button>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.sectionTitle
                  }
                >
                  SEO
                </div>

                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    Meta Title
                  </span>

                  <input
                    value={
                      form.seoTitle
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          seoTitle:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    Meta Description
                  </span>

                  <textarea
                    rows={
                      4
                    }
                    value={
                      form.seoDescription
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          seoDescription:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>
              </section>
            </div>

            <footer
              className={
                styles.editorFooter
              }
            >
              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={
                  closeEditor
                }
                disabled={
                  saving ||
                  uploading
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className={
                  styles.primaryButton
                }
                disabled={
                  saving ||
                  uploading
                }
              >
                {saving ? (
                  <Loader2
                    size={
                      15
                    }
                    className={
                      styles.spin
                    }
                  />
                ) : (
                  <Package
                    size={
                      15
                    }
                  />
                )}

                {
                  editingProduct
                    ? "Save Changes"
                    : "Create Product"
                }
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <article
      className={
        styles.metric
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </article>
  );
}

function StockBadge({
  product,
}: {
  product:
    AdminProductRecord;
}) {
  if (
    product.outOfStock
  ) {
    return (
      <span
        className={
          styles.stockOut
        }
      >
        Out of Stock
      </span>
    );
  }

  if (
    product.lowStock
  ) {
    return (
      <span
        className={
          styles.stockLow
        }
      >
        {product.stock} Low
      </span>
    );
  }

  return (
    <span
      className={
        styles.stockGood
      }
    >
      {product.stock} In Stock
    </span>
  );
}