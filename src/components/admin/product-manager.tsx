"use client";

import Image from "next/image";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImageIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  formatBDT,
} from "@/lib/money";

import type {
  AdminCategoryOption,
  AdminProductImage,
  AdminSizeChartOption,
  AdminProductRecord,
  AdminProductVariant,
  ProductUploadResponse,
} from "@/lib/admin-product-types";

import styles from "./product-manager.module.css";

/* =========================================================
   TYPES
   ========================================================= */

type ProductManagerProps = {
  initialProducts:
    AdminProductRecord[];

  categories:
    AdminCategoryOption[];

  sizeCharts:
    AdminSizeChartOption[];
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

type ProductFormState = {
  name: string;
  slug: string;

  shortDescription:
    string;

  description:
    string;

  brand: string;

  regularPrice:
    string;

  salePrice:
    string;

  status:
    AdminProductRecord["status"];

  featured:
    boolean;

  newArrival:
    boolean;

  trending:
    boolean;

  categoryId:
    string;

      sizeChartId:
    string;

  seoTitle:
    string;

  seoDescription:
    string;

  images:
    EditorImage[];

  variants:
    EditorVariant[];
};

type EditorTab =
  | "basic"
  | "images"
  | "pricing"
  | "variants"
  | "inventory"
  | "seo";

type StockFilter =
  | "ALL"
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

type ProductApiResponse = {
  product?:
    AdminProductRecord;

  mode?:
    "archived"
    | "deleted";

  message?:
    string;

  error?:
    string;
};

/* =========================================================
   CONSTANTS
   ========================================================= */

const TABS: {
  id: EditorTab;
  label: string;
}[] = [
  {
    id: "basic",
    label: "Basic Info",
  },
  {
    id: "images",
    label: "Images",
  },
  {
    id: "pricing",
    label: "Pricing",
  },
  {
    id: "variants",
    label: "Variants",
  },
  {
    id: "inventory",
    label: "Inventory",
  },
  {
    id: "seo",
    label: "SEO",
  },
];

/* =========================================================
   HELPERS
   ========================================================= */

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
  value: string,
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

    stock: 0,

    lowStockThreshold:
      5,

    active: true,
  };
}

function emptyForm():
  ProductFormState {
  return {
    name: "",
    slug: "",

    shortDescription:
      "",

    description:
      "",

    brand:
      "Game On Garb",

    regularPrice:
      "",

    salePrice:
      "",

    status:
      "DRAFT",

    featured:
      false,

    newArrival:
      false,

    trending:
      false,

    categoryId:
      "",

          sizeChartId:
      "",

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
): ProductFormState {
  return {
    name:
      product.name,

    slug:
      product.slug,

    shortDescription:
      product.shortDescription,

    description:
      product.description,

    brand:
      product.brand,

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

    status:
      product.status,

    featured:
      product.featured,

    newArrival:
      product.newArrival,

    trending:
      product.trending,

    categoryId:
      product.categoryId,

          sizeChartId:
      product.sizeChartId,

    seoTitle:
      product.seoTitle,

    seoDescription:
      product.seoDescription,

    images:
      product.images.map(
        (
          image,
        ) => ({
          ...image,

          clientId:
            uid(),
        }),
      ),

    variants:
      product.variants.length >
      0
        ? product.variants.map(
            (
              variant,
            ) => ({
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

    shortDescription:
      form.shortDescription.trim(),

    description:
      form.description.trim(),

    brand:
      form.brand.trim(),

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

    status:
      form.status,

    featured:
      form.featured,

    newArrival:
      form.newArrival,

    trending:
      form.trending,

    categoryId:
      form.categoryId,

          sizeChartId:
      form.sizeChartId,

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

          sortOrder:
            index,

          primary:
            image.primary,
        }),
      ),

    variants:
      form.variants.map(
        (
          variant,
        ) => ({
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
            variant.colorHex.trim() ||
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

/* =========================================================
   MANAGER
   ========================================================= */

export function ProductManager({
  initialProducts,
  categories,
  sizeCharts,
}: ProductManagerProps) {
  const [
    products,
    setProducts,
  ] =
    useState<
      AdminProductRecord[]
    >(
      initialProducts,
    );

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState(
    "ALL",
  );

  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    "ALL",
  );

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
  ] = useState(false);

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
    activeTab,
    setActiveTab,
  ] =
    useState<EditorTab>(
      "basic",
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    busyProductId,
    setBusyProductId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  /* =======================================================
     METRICS
     ======================================================= */

  const metrics =
    useMemo(
      () => ({
        total:
          products.length,

        active:
          products.filter(
            (
              product,
            ) =>
              product.status ===
              "ACTIVE",
          ).length,

        lowStock:
          products.filter(
            (
              product,
            ) =>
              product.lowStock,
          ).length,

        outOfStock:
          products.filter(
            (
              product,
            ) =>
              product.outOfStock,
          ).length,
      }),
      [
        products,
      ],
    );

  /* =======================================================
     FILTERS
     ======================================================= */

  const filteredProducts =
    useMemo(
      () => {
        const term =
          query
            .trim()
            .toLowerCase();

        return products.filter(
          (
            product,
          ) => {
            if (
              term &&
              ![
                product.name,
                product.slug,
                product.category,
                ...product.variants.map(
                  (
                    variant,
                  ) =>
                    variant.sku,
                ),
              ].some(
                (
                  value,
                ) =>
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
              categoryFilter !==
                "ALL" &&
              product.categoryId !==
                categoryFilter
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
        categoryFilter,
        products,
        query,
        statusFilter,
        stockFilter,
      ],
    );

  /* =======================================================
     EDITOR
     ======================================================= */

  function openCreate() {
    setEditingProduct(
      null,
    );

    setForm(
      emptyForm(),
    );

    setActiveTab(
      "basic",
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

    setActiveTab(
      "basic",
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

  /* =======================================================
     SAVE PRODUCT
     ======================================================= */

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

      setActiveTab(
        "basic",
      );

      return;
    }

    if (
      !form.slug.trim()
    ) {
      setError(
        "Product slug is required.",
      );

      setActiveTab(
        "basic",
      );

      return;
    }

    if (
      !form.regularPrice ||
      Number(
        form.regularPrice,
      ) <= 0
    ) {
      setError(
        "Regular price must be greater than zero.",
      );

      setActiveTab(
        "pricing",
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

      setActiveTab(
        "variants",
      );

      return;
    }

    if (
      form.variants.some(
        (
          variant,
        ) =>
          !variant.sku.trim(),
      )
    ) {
      setError(
        "Every variant requires an SKU.",
      );

      setActiveTab(
        "variants",
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
        (
          current,
        ) => {
          const exists =
            current.some(
              (
                product,
              ) =>
                product.id ===
                data.product!
                  .id,
            );

          if (!exists) {
            return [
              data.product!,
              ...current,
            ];
          }

          return current.map(
            (
              product,
            ) =>
              product.id ===
              data.product!
                .id
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
    } catch (saveError) {
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

  /* =======================================================
     UPLOAD
     ======================================================= */

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
      files.length === 0
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
      remaining === 0
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
        const file
        of files.slice(
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
          !("image" in
            data)
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
          id: null,

          clientId:
            uid(),

          url:
            data.image.url,

          publicId:
            data.image.publicId,

          alt:
            form.name ||
            "Product image",

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
        (
          current,
        ) => ({
          ...current,

          images: [
            ...current.images,
            ...uploaded,
          ],
        }),
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof
        Error
          ? uploadError.message
          : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  /* =======================================================
     DUPLICATE
     ======================================================= */

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
        (
          current,
        ) => [
          data.product!,
          ...current,
        ],
      );

      setMessage(
        data.message ??
          "Product duplicated.",
      );
    } catch (duplicateError) {
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

  /* =======================================================
     ACTIVATE / DEACTIVATE
     ======================================================= */

  async function toggleProduct(
    product:
      AdminProductRecord,
  ) {
    setBusyProductId(
      product.id,
    );

    setError("");

    try {
      const nextStatus =
        product.status ===
        "ACTIVE"
          ? "INACTIVE"
          : "ACTIVE";

      const response =
        await fetch(
          `/api/admin/products/${product.id}`,
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...formPayload(
                  productToForm(
                    product,
                  ),
                ),

                status:
                  nextStatus,
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
            "Unable to update product.",
        );
      }

      setProducts(
        (
          current,
        ) =>
          current.map(
            (
              item,
            ) =>
              item.id ===
              data.product!
                .id
                ? data.product!
                : item,
          ),
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof
        Error
          ? toggleError.message
          : "Unable to update product.",
      );
    } finally {
      setBusyProductId(
        null,
      );
    }
  }

  /* =======================================================
     DELETE
     ======================================================= */

  async function deleteProduct(
    product:
      AdminProductRecord,
  ) {
    const accepted =
      window.confirm(
        `Delete ${product.name}? Products with order or inventory history will be archived instead.`,
      );

    if (!accepted) {
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

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Unable to delete product.",
        );
      }

      if (
        data.mode ===
          "archived" &&
        data.product
      ) {
        setProducts(
          (
            current,
          ) =>
            current.map(
              (
                item,
              ) =>
                item.id ===
                data.product!
                  .id
                  ? data.product!
                  : item,
            ),
        );
      } else {
        setProducts(
          (
            current,
          ) =>
            current.filter(
              (
                item,
              ) =>
                item.id !==
                product.id,
            ),
        );
      }

      setMessage(
        data.message ??
          "Product updated.",
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof
        Error
          ? deleteError.message
          : "Unable to delete product.",
      );
    } finally {
      setBusyProductId(
        null,
      );
    }
  }

  /* =======================================================
     IMAGE OPERATIONS
     ======================================================= */

  function makePrimary(
    clientId:
      string,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        images:
          current.images.map(
            (
              image,
            ) => ({
              ...image,

              primary:
                image.clientId ===
                clientId,
            }),
          ),
      }),
    );
  }

  function removeImage(
    clientId:
      string,
  ) {
    setForm(
      (
        current,
      ) => {
        const removed =
          current.images.find(
            (
              image,
            ) =>
              image.clientId ===
              clientId,
          );

        const next =
          current.images.filter(
            (
              image,
            ) =>
              image.clientId !==
              clientId,
          );

        if (
          removed?.primary &&
          next[0]
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
    );
  }

  function moveImage(
    index:
      number,

    direction:
      -1 | 1,
  ) {
    setForm(
      (
        current,
      ) => {
        const target =
          index +
          direction;

        if (
          target < 0 ||
          target >=
            current.images
              .length
        ) {
          return current;
        }

        const next = [
          ...current.images,
        ];

        [
          next[index],
          next[target],
        ] = [
          next[target],
          next[index],
        ];

        return {
          ...current,

          images:
            next,
        };
      },
    );
  }

  /* =======================================================
     VARIANT OPERATIONS
     ======================================================= */

  function updateVariant(
    clientId:
      string,

    patch:
      Partial<EditorVariant>,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        variants:
          current.variants.map(
            (
              variant,
            ) =>
              variant.clientId ===
              clientId
                ? {
                    ...variant,
                    ...patch,
                  }
                : variant,
          ),
      }),
    );
  }

  function removeVariant(
    clientId:
      string,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        variants:
          current.variants.filter(
            (
              variant,
            ) =>
              variant.clientId !==
              clientId,
          ),
      }),
    );
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className={styles.manager}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            Catalog
          </span>

          <h1>
            Products
          </h1>

          <p>
            Manage products,
            images, pricing,
            size and color
            variants, stock and
            storefront visibility.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={
            openCreate
          }
        >
          <Plus
            size={16}
          />

          Add Product
        </button>
      </div>

      {error ? (
        <div className={styles.errorBanner}>
          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Dismiss error"
          >
            <X
              size={16}
            />
          </button>
        </div>
      ) : null}

      {message ? (
        <div className={styles.successBanner}>
          <Check
            size={16}
          />

          {message}
        </div>
      ) : null}

      <div className={styles.metrics}>
        <Metric
          label="Total Products"
          value={
            metrics.total
          }
        />

        <Metric
          label="Active Products"
          value={
            metrics.active
          }
          tone="green"
        />

        <Metric
          label="Low Stock"
          value={
            metrics.lowStock
          }
          tone="orange"
        />

        <Metric
          label="Out of Stock"
          value={
            metrics.outOfStock
          }
          tone="red"
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.filters}>
          <label className={styles.search}>
            <Search
              size={15}
            />

            <input
              value={
                query
              }
              onChange={(
                event,
              ) =>
                setQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search product, SKU or category..."
            />
          </label>

          <select
            value={
              categoryFilter
            }
            onChange={(
              event,
            ) =>
              setCategoryFilter(
                event.target
                  .value,
              )
            }
          >
            <option value="ALL">
              All Categories
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
                    category.name
                  }
                </option>
              ),
            )}
          </select>

          <select
            value={
              statusFilter
            }
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event.target
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
                event.target
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
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  Image
                </th>

                <th>
                  Product
                </th>

                <th>
                  Category
                </th>

                <th>
                  SKU
                </th>

                <th>
                  Price
                </th>

                <th>
                  Stock
                </th>

                <th>
                  Status
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map(
                (
                  product,
                ) => {
                  const firstVariant =
                    product.variants.find(
                      (
                        variant,
                      ) =>
                        variant.active,
                    ) ??
                    product.variants[0];

                  const busy =
                    busyProductId ===
                    product.id;

                  return (
                    <tr
                      key={
                        product.id
                      }
                    >
                      <td>
                        <div className={styles.productThumb}>
                          <Image
                            src={
                              product.image
                            }
                            alt=""
                            fill
                            sizes="54px"
                          />
                        </div>
                      </td>

                      <td>
                        <strong className={styles.productName}>
                          {
                            product.name
                          }
                        </strong>

                        <span className={styles.productMeta}>
                          {
                            product.activeVariantCount
                          }{" "}
                          active variant
                          {
                            product.activeVariantCount ===
                            1
                              ? ""
                              : "s"
                          }
                        </span>
                      </td>

                      <td>
                        {
                          product.category
                        }
                      </td>

                      <td className={styles.mono}>
                        {
                          firstVariant?.sku ??
                          "—"
                        }

                        {product.variants.length >
                        1 ? (
                          <small>
                            +
                            {
                              product.variants.length -
                              1
                            }{" "}
                            more
                          </small>
                        ) : null}
                      </td>

                      <td>
                        <strong className={styles.price}>
                          {formatBDT(
                            product.salePrice ??
                              product.regularPrice,
                          )}
                        </strong>

                        {product.salePrice ? (
                          <s>
                            {formatBDT(
                              product.regularPrice,
                            )}
                          </s>
                        ) : null}
                      </td>

                      <td>
                        <StockBadge
                          product={
                            product
                          }
                        />
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            product.status
                          }
                        />
                      </td>

                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                product,
                              )
                            }
                            aria-label="Edit product"
                          >
                            <Pencil
                              size={14}
                            />
                          </button>

                          <button
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              duplicateProduct(
                                product,
                              )
                            }
                            aria-label="Duplicate product"
                          >
                            <Copy
                              size={14}
                            />
                          </button>

                          <button
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              toggleProduct(
                                product,
                              )
                            }
                            aria-label={
                              product.status ===
                              "ACTIVE"
                                ? "Deactivate product"
                                : "Activate product"
                            }
                          >
                            {busy ? (
                              <Loader2
                                size={14}
                                className={styles.spin}
                              />
                            ) : (
                              <Package
                                size={14}
                              />
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={
                              busy
                            }
                            className={styles.dangerAction}
                            onClick={() =>
                              deleteProduct(
                                product,
                              )
                            }
                            aria-label="Delete product"
                          >
                            <Trash2
                              size={14}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>

          {filteredProducts.length ===
          0 ? (
            <div className={styles.emptyState}>
              No products match
              the current filters.
            </div>
          ) : null}
        </div>
      </div>

      {editorOpen ? (
        <div
          className={styles.overlay}
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditor();
            }
          }}
        >
          <aside className={styles.editor}>
            <form
              className={styles.editorForm}
              onSubmit={
                submitProduct
              }
            >
              <div className={styles.editorHeader}>
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
                      editingProduct?.name ??
                      "Add New Product"
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeEditor
                  }
                  aria-label="Close product editor"
                >
                  <X
                    size={19}
                  />
                </button>
              </div>

              <div className={styles.tabs}>
                {TABS.map(
                  (
                    tab,
                  ) => (
                    <button
                      key={
                        tab.id
                      }
                      type="button"
                      className={
                        activeTab ===
                        tab.id
                          ? styles.activeTab
                          : ""
                      }
                      onClick={() =>
                        setActiveTab(
                          tab.id,
                        )
                      }
                    >
                      {
                        tab.label
                      }
                    </button>
                  ),
                )}
              </div>

              <div className={styles.editorBody}>
                {activeTab ===
                "basic" ? (
                  <BasicTab
                    form={
                      form
                    }
                    categories={
                      categories
                    }
                    sizeCharts={
                      sizeCharts
                    }
                    setForm={
                      setForm
                    }
                  />
                ) : null}

                {activeTab ===
                "images" ? (
                  <ImagesTab
                    form={
                      form
                    }
                    uploading={
                      uploading
                    }
                    uploadImages={
                      uploadImages
                    }
                    makePrimary={
                      makePrimary
                    }
                    removeImage={
                      removeImage
                    }
                    moveImage={
                      moveImage
                    }
                    setForm={
                      setForm
                    }
                  />
                ) : null}

                {activeTab ===
                "pricing" ? (
                  <PricingTab
                    form={
                      form
                    }
                    setForm={
                      setForm
                    }
                  />
                ) : null}

                {activeTab ===
                "variants" ? (
                  <VariantsTab
                    variants={
                      form.variants
                    }
                    updateVariant={
                      updateVariant
                    }
                    removeVariant={
                      removeVariant
                    }
                    addVariant={() =>
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
                  />
                ) : null}

                {activeTab ===
                "inventory" ? (
                  <InventoryTab
                    variants={
                      form.variants
                    }
                    updateVariant={
                      updateVariant
                    }
                  />
                ) : null}

                {activeTab ===
                "seo" ? (
                  <SeoTab
                    form={
                      form
                    }
                    setForm={
                      setForm
                    }
                  />
                ) : null}
              </div>

              <div className={styles.editorFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={
                    closeEditor
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={
                    saving ||
                    uploading
                  }
                >
                  {saving ? (
                    <Loader2
                      size={15}
                      className={styles.spin}
                    />
                  ) : (
                    <Check
                      size={15}
                    />
                  )}

                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Save Changes"
                      : "Create Product"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   BASIC TAB
   ========================================================= */

function BasicTab({
  form,
  categories,
  sizeCharts,
  setForm,
}: {
  form:
    ProductFormState;

  categories:
    AdminCategoryOption[];

  sizeCharts:
    AdminSizeChartOption[];

  setForm:
    React.Dispatch<
      React.SetStateAction<ProductFormState>
    >;
}) {
  return (
    <div className={styles.formStack}>
      <div className={styles.sectionHeading}>
        <h3>
          Product Information
        </h3>

        <p>
          Core storefront identity
          and catalog placement.
        </p>
      </div>

      <Field
        label="Product Name"
        required
      >
        <input
          value={
            form.name
          }
          onChange={(
            event,
          ) =>
            setForm(
              (
                current,
              ) => {
                const previousAutoSlug =
                  slugify(
                    current.name,
                  );

                const shouldUpdateSlug =
                  !current.slug ||
                  current.slug ===
                    previousAutoSlug;

                return {
                  ...current,

                  name:
                    event.target
                      .value,

                  slug:
                    shouldUpdateSlug
                      ? slugify(
                          event.target
                            .value,
                        )
                      : current.slug,
                };
              },
            )
          }
        />
      </Field>

      <div className={styles.twoColumns}>
        <Field
          label="Slug"
          required
        >
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
                      event.target
                        .value,
                    ),
                }),
              )
            }
          />
        </Field>

        <Field label="Brand">
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
                    event.target
                      .value,
                }),
              )
            }
          />
        </Field>
      </div>

      <Field label="Category">
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
                  event.target
                    .value,
              }),
            )
          }
        >
          <option value="">
            Uncategorized
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
                  category.name
                }
              </option>
            ),
          )}
        </select>
      </Field>

            <Field label="Size Guide">
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
                  event.target
                    .value,
              }),
            )
          }
        >
          <option value="">
            No Size Guide
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
                disabled={
                  !chart.active &&
                  chart.id !==
                    form.sizeChartId
                }
              >
                {chart.name}
                {!chart.active
                  ? " (Archived)"
                  : ""}
              </option>
            ),
          )}
        </select>

        <small
          style={{
            color:
              "#8b908c",

            fontSize:
              8,

            lineHeight:
              1.5,
          }}
        >
          Reusable size
          chart shown on the
          product details
          page.{" "}

          <a
            href="/admin/size-charts"
            target="_blank"
            rel="noreferrer"
            style={{
              color:
                "#f15a24",

              fontWeight:
                800,
            }}
          >
            Manage Size Charts
          </a>
        </small>
      </Field>

      <Field label="Short Description">
        <textarea
          rows={3}
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
                  event.target
                    .value,
              }),
            )
          }
        />
      </Field>

      <Field label="Full Description">
        <textarea
          rows={8}
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
                  event.target
                    .value,
              }),
            )
          }
        />
      </Field>

      <Field label="Status">
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
                  event.target
                    .value as
                    ProductFormState["status"],
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
      </Field>

      <div className={styles.checkGrid}>
        <CheckField
          label="Featured"
          checked={
            form.featured
          }
          change={(
            value,
          ) =>
            setForm(
              (
                current,
              ) => ({
                ...current,
                featured:
                  value,
              }),
            )
          }
        />

        <CheckField
          label="New Arrival"
          checked={
            form.newArrival
          }
          change={(
            value,
          ) =>
            setForm(
              (
                current,
              ) => ({
                ...current,
                newArrival:
                  value,
              }),
            )
          }
        />

        <CheckField
          label="Trending"
          checked={
            form.trending
          }
          change={(
            value,
          ) =>
            setForm(
              (
                current,
              ) => ({
                ...current,
                trending:
                  value,
              }),
            )
          }
        />
      </div>
    </div>
  );
}

/* =========================================================
   IMAGES TAB
   ========================================================= */

function ImagesTab({
  form,
  uploading,
  uploadImages,
  makePrimary,
  removeImage,
  moveImage,
  setForm,
}: {
  form:
    ProductFormState;

  uploading:
    boolean;

  uploadImages:
    (
      event:
        ChangeEvent<HTMLInputElement>,
    ) => Promise<void>;

  makePrimary:
    (
      id:
        string,
    ) => void;

  removeImage:
    (
      id:
        string,
    ) => void;

  moveImage:
    (
      index:
        number,
      direction:
        -1 | 1,
    ) => void;

  setForm:
    React.Dispatch<
      React.SetStateAction<ProductFormState>
    >;
}) {
  return (
    <div className={styles.formStack}>
      <div className={styles.sectionHeading}>
        <h3>
          Product Images
        </h3>

        <p>
          Upload up to 12 images.
          Choose the primary
          storefront image and
          arrange gallery order.
        </p>
      </div>

      <label className={styles.uploadBox}>
        {uploading ? (
          <Loader2
            className={styles.spin}
            size={24}
          />
        ) : (
          <Upload
            size={24}
          />
        )}

        <strong>
          {uploading
            ? "Uploading..."
            : "Upload Images"}
        </strong>

        <span>
          JPG, PNG, WEBP or AVIF ·
          maximum 8MB each
        </span>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={
            uploading
          }
          onChange={
            uploadImages
          }
        />
      </label>

      {form.images.length ===
      0 ? (
        <div className={styles.imageEmpty}>
          <ImageIcon
            size={24}
          />

          No product images
          uploaded yet.
        </div>
      ) : (
        <div className={styles.imageGrid}>
          {form.images.map(
            (
              image,
              index,
            ) => (
              <div
                key={
                  image.clientId
                }
                className={`${styles.imageCard} ${
                  image.primary
                    ? styles.primaryImageCard
                    : ""
                }`}
              >
                <div className={styles.imagePreview}>
                  <Image
                    src={
                      image.url
                    }
                    alt={
                      image.alt ||
                      form.name ||
                      "Product image"
                    }
                    fill
                    sizes="180px"
                  />

                  {image.primary ? (
                    <span className={styles.primaryChip}>
                      Primary
                    </span>
                  ) : null}
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
                            ) =>
                              item.clientId ===
                              image.clientId
                                ? {
                                    ...item,

                                    alt:
                                      event.target
                                        .value,
                                  }
                                : item,
                          ),
                      }),
                    )
                  }
                />

                <div className={styles.imageActions}>
                  <button
                    type="button"
                    disabled={
                      index ===
                      0
                    }
                    onClick={() =>
                      moveImage(
                        index,
                        -1,
                      )
                    }
                  >
                    <ChevronLeft
                      size={14}
                    />
                  </button>

                  <button
                    type="button"
                    disabled={
                      index ===
                      form.images.length -
                        1
                    }
                    onClick={() =>
                      moveImage(
                        index,
                        1,
                      )
                    }
                  >
                    <ChevronRight
                      size={14}
                    />
                  </button>

                  {!image.primary ? (
                    <button
                      type="button"
                      onClick={() =>
                        makePrimary(
                          image.clientId,
                        )
                      }
                    >
                      Set Primary
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className={styles.dangerText}
                    onClick={() =>
                      removeImage(
                        image.clientId,
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PRICING
   ========================================================= */

function PricingTab({
  form,
  setForm,
}: {
  form:
    ProductFormState;

  setForm:
    React.Dispatch<
      React.SetStateAction<ProductFormState>
    >;
}) {
  const discount =
    form.salePrice &&
    Number(
      form.regularPrice,
    ) >
      0
      ? Math.round(
          (
            1 -
            Number(
              form.salePrice,
            ) /
              Number(
                form.regularPrice,
              )
          ) *
            100,
        )
      : 0;

  return (
    <div className={styles.formStack}>
      <div className={styles.sectionHeading}>
        <h3>
          Pricing
        </h3>

        <p>
          Product-level price is
          used unless a variant has
          its own price override.
        </p>
      </div>

      <div className={styles.twoColumns}>
        <Field
          label="Regular Price"
          required
        >
          <input
            type="number"
            min="0"
            step="0.01"
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
                    event.target
                      .value,
                }),
              )
            }
          />
        </Field>

        <Field label="Sale Price">
          <input
            type="number"
            min="0"
            step="0.01"
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
                    event.target
                      .value,
                }),
              )
            }
          />
        </Field>
      </div>

      {discount >
      0 ? (
        <div className={styles.discountPreview}>
          Customer saves{" "}
          <strong>
            {discount}%
          </strong>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   VARIANTS
   ========================================================= */

function VariantsTab({
  variants,
  updateVariant,
  removeVariant,
  addVariant,
}: {
  variants:
    EditorVariant[];

  updateVariant:
    (
      clientId:
        string,
      patch:
        Partial<EditorVariant>,
    ) => void;

  removeVariant:
    (
      clientId:
        string,
    ) => void;

  addVariant:
    () => void;
}) {
  return (
    <div className={styles.formStack}>
      <div className={styles.sectionHeadingRow}>
        <div>
          <h3>
            Size & Color Variants
          </h3>

          <p>
            Every purchasable
            combination needs its
            own SKU and stock.
          </p>
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={
            addVariant
          }
        >
          <Plus
            size={14}
          />

          Add Variant
        </button>
      </div>

      <div className={styles.variantTableWrap}>
        <table className={styles.variantTable}>
          <thead>
            <tr>
              <th>
                Color
              </th>

              <th>
                HEX
              </th>

              <th>
                Size
              </th>

              <th>
                SKU
              </th>

              <th>
                Price Override
              </th>

              <th>
                Active
              </th>

              <th />
            </tr>
          </thead>

          <tbody>
            {variants.map(
              (
                variant,
              ) => (
                <tr
                  key={
                    variant.clientId
                  }
                >
                  <td>
                    <input
                      value={
                        variant.color
                      }
                      placeholder="Black"
                      onChange={(
                        event,
                      ) =>
                        updateVariant(
                          variant.clientId,
                          {
                            color:
                              event.target
                                .value,
                          },
                        )
                      }
                    />
                  </td>

                  <td>
                    <div className={styles.colorField}>
                      <input
                        type="color"
                        value={
                          /^#[0-9a-fA-F]{6}$/.test(
                            variant.colorHex,
                          )
                            ? variant.colorHex
                            : "#111111"
                        }
                        onChange={(
                          event,
                        ) =>
                          updateVariant(
                            variant.clientId,
                            {
                              colorHex:
                                event.target
                                  .value,
                            },
                          )
                        }
                      />

                      <input
                        value={
                          variant.colorHex
                        }
                        placeholder="#111111"
                        onChange={(
                          event,
                        ) =>
                          updateVariant(
                            variant.clientId,
                            {
                              colorHex:
                                event.target
                                  .value,
                            },
                          )
                        }
                      />
                    </div>
                  </td>

                  <td>
                    <input
                      value={
                        variant.size
                      }
                      placeholder="M"
                      onChange={(
                        event,
                      ) =>
                        updateVariant(
                          variant.clientId,
                          {
                            size:
                              event.target
                                .value,
                          },
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={
                        variant.sku
                      }
                      placeholder="GOG-POLO-BLK-M"
                      onChange={(
                        event,
                      ) =>
                        updateVariant(
                          variant.clientId,
                          {
                            sku:
                              event.target
                                .value,
                          },
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        variant.priceOverride ??
                        ""
                      }
                      placeholder="Default"
                      onChange={(
                        event,
                      ) =>
                        updateVariant(
                          variant.clientId,
                          {
                            priceOverride:
                              event.target
                                .value
                                ? Number(
                                    event.target
                                      .value,
                                  )
                                : null,
                          },
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
                        updateVariant(
                          variant.clientId,
                          {
                            active:
                              event.target
                                .checked,
                          },
                        )
                      }
                    />
                  </td>

                  <td>
                    <button
                      type="button"
                      disabled={
                        variants.length ===
                        1
                      }
                      className={styles.variantDelete}
                      onClick={() =>
                        removeVariant(
                          variant.clientId,
                        )
                      }
                      aria-label="Remove variant"
                    >
                      <Trash2
                        size={14}
                      />
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================
   INVENTORY
   ========================================================= */

function InventoryTab({
  variants,
  updateVariant,
}: {
  variants:
    EditorVariant[];

  updateVariant:
    (
      clientId:
        string,
      patch:
        Partial<EditorVariant>,
    ) => void;
}) {
  const total =
    variants
      .filter(
        (
          variant,
        ) =>
          variant.active,
      )
      .reduce(
        (
          sum,
          variant,
        ) =>
          sum +
          Number(
            variant.stock,
          ),

        0,
      );

  return (
    <div className={styles.formStack}>
      <div className={styles.inventorySummary}>
        <span>
          Total Available Stock
        </span>

        <strong>
          {total}
        </strong>
      </div>

      <div className={styles.variantTableWrap}>
        <table className={styles.variantTable}>
          <thead>
            <tr>
              <th>
                Variant
              </th>

              <th>
                SKU
              </th>

              <th>
                Stock
              </th>

              <th>
                Low Stock Alert
              </th>
            </tr>
          </thead>

          <tbody>
            {variants.map(
              (
                variant,
              ) => (
                <tr
                  key={
                    variant.clientId
                  }
                >
                  <td>
                    <strong>
                      {
                        variant.color ||
                        "Default"
                      }
                    </strong>

                    <small>
                      {
                        variant.size ||
                        "One Size"
                      }
                    </small>
                  </td>

                  <td className={styles.mono}>
                    {
                      variant.sku ||
                      "—"
                    }
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        variant.stock
                      }
                      onChange={(
                        event,
                      ) =>
                        updateVariant(
                          variant.clientId,
                          {
                            stock:
                              Math.max(
                                0,
                                Number(
                                  event.target
                                    .value,
                                ),
                              ),
                          },
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        variant.lowStockThreshold
                      }
                      onChange={(
                        event,
                      ) =>
                        updateVariant(
                          variant.clientId,
                          {
                            lowStockThreshold:
                              Math.max(
                                0,
                                Number(
                                  event.target
                                    .value,
                                ),
                              ),
                          },
                        )
                      }
                    />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================
   SEO
   ========================================================= */

function SeoTab({
  form,
  setForm,
}: {
  form:
    ProductFormState;

  setForm:
    React.Dispatch<
      React.SetStateAction<ProductFormState>
    >;
}) {
  return (
    <div className={styles.formStack}>
      <div className={styles.sectionHeading}>
        <h3>
          Search Engine
          Optimization
        </h3>

        <p>
          Optional metadata for
          search engines and social
          previews.
        </p>
      </div>

      <Field label="SEO Title">
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
                  event.target
                    .value,
              }),
            )
          }
        />
      </Field>

      <Field label="SEO Description">
        <textarea
          rows={5}
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
                  event.target
                    .value,
              }),
            )
          }
        />
      </Field>

      <div className={styles.seoPreview}>
        <span>
          gameongarb.com/product/
          {form.slug ||
            "product-slug"}
        </span>

        <strong>
          {form.seoTitle ||
            form.name ||
            "Product title"}
        </strong>

        <p>
          {form.seoDescription ||
            form.shortDescription ||
            "Product description will appear here."}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;

  tone?:
    | "green"
    | "orange"
    | "red";
}) {
  return (
    <div
      className={`${styles.metric} ${
        tone
          ? styles[
              `metric${tone[0].toUpperCase()}${tone.slice(
                1,
              )}`
            ]
          : ""
      }`}
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    AdminProductRecord["status"];
}) {
  return (
    <span
      className={`${styles.statusBadge} ${
        status ===
        "ACTIVE"
          ? styles.statusActive
          : status ===
              "DRAFT"
            ? styles.statusDraft
            : styles.statusInactive
      }`}
    >
      {status
        .toLowerCase()
        .replace(
          /^./,
          (
            value,
          ) =>
            value.toUpperCase(),
        )}
    </span>
  );
}

function StockBadge({
  product,
}: {
  product:
    AdminProductRecord;
}) {
  return (
    <div>
      <strong>
        {
          product.stock
        }
      </strong>

      <span
        className={`${styles.stockState} ${
          product.outOfStock
            ? styles.stockRed
            : product.lowStock
              ? styles.stockOrange
              : styles.stockGreen
        }`}
      >
        {product.outOfStock
          ? "Out of Stock"
          : product.lowStock
            ? "Low Stock"
            : "In Stock"}
      </span>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label:
    string;

  required?:
    boolean;

  children:
    React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span>
        {label}

        {required ? (
          <b>
            *
          </b>
        ) : null}
      </span>

      {children}
    </label>
  );
}

function CheckField({
  label,
  checked,
  change,
}: {
  label:
    string;

  checked:
    boolean;

  change:
    (
      value:
        boolean,
    ) => void;
}) {
  return (
    <label className={styles.checkField}>
      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event,
        ) =>
          change(
            event.target
              .checked,
          )
        }
      />

      <span>
        {label}
      </span>
    </label>
  );
}