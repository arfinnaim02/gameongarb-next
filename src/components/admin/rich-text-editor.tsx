"use client";

import {
  EditorContent,
  useEditor,
} from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";

import {
  Color,
  TextStyle,
} from "@tiptap/extension-text-style";

import {
  Bold,
  Eraser,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";

import styles from "./rich-text-editor.module.css";

/* =========================================================
   TYPES
   ========================================================= */

type RichTextEditorProps = {
  value:
    string;

  onChange:
    (
      value:
        string,
    ) => void;

  placeholder?:
    string;
};

/* =========================================================
   LEGACY CONTENT
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
    );
}

function normalizeInitialContent(
  value:
    string,
) {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  const containsHtml =
    /<\/?[a-z][\s\S]*>/i.test(
      trimmed,
    );

  if (containsHtml) {
    return trimmed;
  }

  return trimmed
    .split(
      /\n{2,}/,
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
    )
    .join(
      "",
    );
}

/* =========================================================
   BUTTON
   ========================================================= */

function ToolbarButton({
  active =
    false,
  disabled =
    false,
  title,
  onClick,
  children,
}: {
  active?:
    boolean;

  disabled?:
    boolean;

  title:
    string;

  onClick:
    () => void;

  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={
        title
      }
      aria-label={
        title
      }
      aria-pressed={
        active
      }
      disabled={
        disabled
      }
      className={`${styles.toolbarButton} ${
        active
          ? styles.toolbarButtonActive
          : ""
      }`}
      onClick={
        onClick
      }
    >
      {
        children
      }
    </button>
  );
}

/* =========================================================
   EDITOR
   ========================================================= */

export function RichTextEditor({
  value,
  onChange,
  placeholder =
    "Write a premium product description…",
}: RichTextEditorProps) {
  const editor =
    useEditor({
      immediatelyRender:
        false,

      extensions: [
        StarterKit.configure({
          link: {
            openOnClick:
              false,

            autolink:
              true,

            defaultProtocol:
              "https",
          },
        }),

        TextStyle,

        Color.configure({
          types: [
            "textStyle",
          ],
        }),
      ],

      content:
        normalizeInitialContent(
          value,
        ),

      editorProps: {
        attributes: {
          class:
            styles.editorContent,

          "data-placeholder":
            placeholder,
        },
      },

      onUpdate: ({
        editor:
          currentEditor,
      }) => {
        const html =
          currentEditor.getHTML();

        onChange(
          html ===
            "<p></p>"
            ? ""
            : html,
        );
      },
    });

  if (!editor) {
    return (
      <div
        className={
          styles.loading
        }
      >
        Loading editor…
      </div>
    );
  }

  function setLink() {
    if (!editor) {
      return;
    }

    const previous =
      editor.getAttributes(
        "link",
      ).href as
        string |
        undefined;

    const url =
      window.prompt(
        "Enter link URL",
        previous ??
          "https://",
      );

    if (
      url ===
      null
    ) {
      return;
    }

    if (
      !url.trim()
    ) {
      editor
        .chain()
        .focus()
        .unsetLink()
        .run();

      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange(
        "link",
      )
      .setLink({
        href:
          url.trim(),
      })
      .run();
  }

  const colors = [
    "#171A18",
    "#E86A22",
    "#B42318",
    "#067647",
    "#175CD3",
    "#6941C6",
  ];

  return (
    <div
      className={
        styles.editorShell
      }
    >
      <div
        className={
          styles.toolbar
        }
      >
        <div
          className={
            styles.toolbarGroup
          }
        >
          <ToolbarButton
            title="Bold"
            active={
              editor.isActive(
                "bold",
              )
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBold()
                .run()
            }
          >
            <Bold
              size={
                16
              }
            />
          </ToolbarButton>

          <ToolbarButton
            title="Italic"
            active={
              editor.isActive(
                "italic",
              )
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleItalic()
                .run()
            }
          >
            <Italic
              size={
                16
              }
            />
          </ToolbarButton>

          <ToolbarButton
            title="Underline"
            active={
              editor.isActive(
                "underline",
              )
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleUnderline()
                .run()
            }
          >
            <Underline
              size={
                16
              }
            />
          </ToolbarButton>

          <ToolbarButton
            title="Strikethrough"
            active={
              editor.isActive(
                "strike",
              )
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleStrike()
                .run()
            }
          >
            <Strikethrough
              size={
                16
              }
            />
          </ToolbarButton>
        </div>

        <div
          className={
            styles.toolbarDivider
          }
        />

        <div
          className={
            styles.toolbarGroup
          }
        >
          <ToolbarButton
            title="Heading 2"
            active={
              editor.isActive(
                "heading",
                {
                  level:
                    2,
                },
              )
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level:
                    2,
                })
                .run()
            }
          >
            <Heading2
              size={
                17
              }
            />
          </ToolbarButton>

          <ToolbarButton
            title="Heading 3"
            active={
              editor.isActive(
                "heading",
                {
                  level:
                    3,
                },
              )
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level:
                    3,
                })
                .run()
            }
          >
            <Heading3
              size={
                17
              }
            />
          </ToolbarButton>

          <ToolbarButton
            title="Bullet list"
            active={
              editor.isActive(
                "bulletList",
              )
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBulletList()
                .run()
            }
          >
            <List
              size={
                17
              }
            />
          </ToolbarButton>

          <ToolbarButton
            title="Numbered list"
            active={
              editor.isActive(
                "orderedList",
              )
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleOrderedList()
                .run()
            }
          >
            <ListOrdered
              size={
                17
              }
            />
          </ToolbarButton>
        </div>

        <div
          className={
            styles.toolbarDivider
          }
        />

        <div
          className={
            styles.colorGroup
          }
        >
          {colors.map(
            (
              color,
            ) => (
              <button
                key={
                  color
                }
                type="button"
                title={`Text color ${color}`}
                aria-label={`Text color ${color}`}
                className={
                  styles.colorButton
                }
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .setColor(
                      color,
                    )
                    .run()
                }
              >
                <span
                  style={{
                    backgroundColor:
                      color,
                  }}
                />
              </button>
            ),
          )}

          <label
            className={
              styles.customColor
            }
            title="Custom text color"
          >
            <input
              type="color"
              defaultValue="#171A18"
              onChange={(
                event,
              ) =>
                editor
                  .chain()
                  .focus()
                  .setColor(
                    event
                      .target
                      .value,
                  )
                  .run()
              }
            />

            <span>
              A
            </span>
          </label>

          <ToolbarButton
            title="Remove text color"
            onClick={() =>
              editor
                .chain()
                .focus()
                .unsetColor()
                .run()
            }
          >
            <Eraser
              size={
                16
              }
            />
          </ToolbarButton>
        </div>

        <div
          className={
            styles.toolbarDivider
          }
        />

        <div
          className={
            styles.toolbarGroup
          }
        >
          <ToolbarButton
            title="Add link"
            active={
              editor.isActive(
                "link",
              )
            }
            onClick={
              setLink
            }
          >
            <Link2
              size={
                16
              }
            />
          </ToolbarButton>

          <ToolbarButton
            title="Remove link"
            disabled={
              !editor.isActive(
                "link",
              )
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .unsetLink()
                .run()
            }
          >
            <Unlink
              size={
                16
              }
            />
          </ToolbarButton>

          <ToolbarButton
            title="Clear formatting"
            onClick={() =>
              editor
                .chain()
                .focus()
                .unsetAllMarks()
                .clearNodes()
                .run()
            }
          >
            <RemoveFormatting
              size={
                16
              }
            />
          </ToolbarButton>
        </div>

        <div
          className={
            styles.toolbarDivider
          }
        />

        <div
          className={
            styles.toolbarGroup
          }
        >
          <ToolbarButton
            title="Undo"
            disabled={
              !editor.can()
                .chain()
                .focus()
                .undo()
                .run()
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .undo()
                .run()
            }
          >
            <Undo2
              size={
                16
              }
            />
          </ToolbarButton>

          <ToolbarButton
            title="Redo"
            disabled={
              !editor.can()
                .chain()
                .focus()
                .redo()
                .run()
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .redo()
                .run()
            }
          >
            <Redo2
              size={
                16
              }
            />
          </ToolbarButton>
        </div>
      </div>

      <EditorContent
        editor={
          editor
        }
      />

      <div
        className={
          styles.footer
        }
      >
        <span>
          Rich product description
        </span>

        <span>
          Bold · Italic · Color · Lists · Links
        </span>
      </div>
    </div>
  );
}