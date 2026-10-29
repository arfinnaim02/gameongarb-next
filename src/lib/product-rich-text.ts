import sanitizeHtml from "sanitize-html";

/* =========================================================
   LEGACY PLAIN TEXT
   ========================================================= */

function escapeHtml(
  value:
    string,
) {
  return value
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      "\"",
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}

function containsHtml(
  value:
    string,
) {
  return /<\/?[a-z][\s\S]*>/i.test(
    value,
  );
}

function normalizeLegacyText(
  value:
    string,
) {
  if (
    !value ||
    containsHtml(
      value,
    )
  ) {
    return value;
  }

  const paragraphs =
    value
      .split(
        /\n{2,}/,
      )
      .map(
        (
          paragraph,
        ) =>
          paragraph.trim(),
      )
      .filter(
        Boolean,
      )
      .map(
        (
          paragraph,
        ) =>
          `<p>${escapeHtml(
            paragraph,
          ).replace(
            /\n/g,
            "<br>",
          )}</p>`,
      );

  return paragraphs.join(
    "",
  );
}

/* =========================================================
   PRODUCT DESCRIPTION SANITIZER
   ========================================================= */

export function sanitizeProductDescription(
  value:
    string |
    null |
    undefined,
) {
  const input =
    (
      value ??
      ""
    ).trim();

  if (!input) {
    return "";
  }

  const normalized =
    normalizeLegacyText(
      input,
    );

  return sanitizeHtml(
    normalized,
    {
      allowedTags: [
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "h2",
        "h3",
        "ul",
        "ol",
        "li",
        "blockquote",
        "a",
        "span",
        "hr",
      ],

      allowedAttributes: {
        a: [
          "href",
          "target",
          "rel",
        ],

        span: [
          "style",
        ],
      },

      allowedStyles: {
        span: {
          color: [
            /^#[0-9a-fA-F]{6}$/,
          ],
        },
      },

      allowedSchemes: [
        "http",
        "https",
        "mailto",
        "tel",
      ],

      transformTags: {
        a:
          sanitizeHtml.simpleTransform(
            "a",
            {
              target:
                "_blank",

              rel:
                "noopener noreferrer",
            },
          ),
      },
    },
  ).trim();
}

/* =========================================================
   FRONTEND
   ========================================================= */

export function toProductDescriptionHtml(
  value:
    string |
    null |
    undefined,
) {
  return sanitizeProductDescription(
    value,
  );
}