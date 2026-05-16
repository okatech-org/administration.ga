/**
 * Tiptap custom nodes for the editorial content (Article.html / Guide.html
 * maquettes).
 *
 * Markup serialized in the HTML matches the maquette directly so the
 * citizen-web RichTextRenderer can style it with arbitrary Tailwind
 * selectors without bridge transforms.
 *
 *  - keyFacts   → <div class="keyfacts"> · 1-4 figures (value + label)
 *  - pullquote  → <blockquote class="pullquote"> + optional <cite>
 *  - callout    → <div class="callout" data-variant="info|ok|warn"> + title + body
 *  - figure     → <figure class="figure"> <img> + <figcaption> (+ credit)
 */

import { Node, mergeAttributes } from "@tiptap/core"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    keyFacts: {
      insertKeyFacts: (facts: Array<{ value: string; label: string }>) => ReturnType
    }
    pullquote: {
      insertPullquote: (quote: string, attribution?: string) => ReturnType
    }
    callout: {
      insertCallout: (
        variant: "info" | "ok" | "warn",
        title: string,
        body: string,
      ) => ReturnType
    }
    editorFigure: {
      insertEditorFigure: (
        src: string,
        caption: string,
        credit?: string,
      ) => ReturnType
    }
  }
}

// ────────────────────────────────────────────────────────────────────────
// keyFacts — grid of 1-4 figures (value + label)
// ────────────────────────────────────────────────────────────────────────

type KeyFact = { value: string; label: string }

export const KeyFactsNode = Node.create({
  name: "keyFacts",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      facts: {
        default: [] as KeyFact[],
        parseHTML: (el) => {
          const items = Array.from(el.querySelectorAll(".kf")).map((kf) => ({
            value: kf.querySelector(".kf-v")?.textContent ?? "",
            label: kf.querySelector(".kf-l")?.textContent ?? "",
          }))
          return items
        },
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: "div.keyfacts" }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const facts = (node.attrs.facts as KeyFact[]) ?? []
    const children = facts.flatMap((f) => [
      [
        "div",
        { class: "kf" },
        ["div", { class: "kf-v" }, f.value],
        ["div", { class: "kf-l" }, f.label],
      ] as const,
    ]) as unknown as Array<[string, object, ...unknown[]]>
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "keyfacts" }),
      ...children,
    ]
  },

  addCommands() {
    return {
      insertKeyFacts:
        (facts: KeyFact[]) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { facts },
          }),
    }
  },
})

// ────────────────────────────────────────────────────────────────────────
// pullquote — block quote + attribution
// ────────────────────────────────────────────────────────────────────────

export const PullquoteNode = Node.create({
  name: "pullquote",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      cite: {
        default: null as string | null,
        parseHTML: (el) =>
          el.querySelector("cite")?.textContent ?? el.getAttribute("data-cite"),
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "blockquote.pullquote",
      },
      {
        tag: "div.pullquote",
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const cite = node.attrs.cite as string | null
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, { class: "pullquote" }),
      ["p", 0],
      ...(cite ? [["cite", {}, cite] as [string, object, string]] : []),
    ]
  },

  addCommands() {
    return {
      insertPullquote:
        (quote: string, attribution?: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { cite: attribution ?? null },
            content: [{ type: "text", text: quote }],
          }),
    }
  },
})

// ────────────────────────────────────────────────────────────────────────
// callout — variant pill + title + body (block content)
// ────────────────────────────────────────────────────────────────────────

const CALLOUT_VARIANTS = ["info", "ok", "warn"] as const
type CalloutVariant = (typeof CALLOUT_VARIANTS)[number]

export const CalloutNode = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info" as CalloutVariant,
        parseHTML: (el) => {
          const v = el.getAttribute("data-variant")
          return CALLOUT_VARIANTS.includes(v as CalloutVariant) ? v : "info"
        },
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "div.callout" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "callout" }),
      0,
    ]
  },

  addCommands() {
    return {
      insertCallout:
        (variant: CalloutVariant, title: string, body: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { variant },
            content: [
              {
                type: "heading",
                attrs: { level: 4 },
                content: [{ type: "text", text: title }],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: body }],
              },
            ],
          }),
    }
  },
})

// ────────────────────────────────────────────────────────────────────────
// editorFigure — image + caption + credit (atom, replaces vanilla <img>)
// ────────────────────────────────────────────────────────────────────────

export const EditorFigureNode = Node.create({
  name: "editorFigure",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
      credit: { default: null as string | null },
    }
  },

  parseHTML() {
    return [
      {
        tag: "figure.figure",
        getAttrs: (el) => ({
          src: el.querySelector("img")?.getAttribute("src") ?? "",
          alt: el.querySelector("img")?.getAttribute("alt") ?? "",
          caption: el.querySelector("figcaption")?.textContent ?? "",
          credit: el.querySelector(".credit")?.textContent ?? null,
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, caption, credit } = node.attrs as {
      src: string
      alt: string
      caption: string
      credit: string | null
    }
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { class: "figure" }),
      ["img", { src, alt }],
      ...(credit
        ? [["span", { class: "credit" }, credit] as [string, object, string]]
        : []),
      ["figcaption", {}, caption],
    ]
  },

  addCommands() {
    return {
      insertEditorFigure:
        (src: string, caption: string, credit?: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { src, alt: caption, caption, credit: credit ?? null },
          }),
    }
  },
})

export const EDITORIAL_NODES = [
  KeyFactsNode,
  PullquoteNode,
  CalloutNode,
  EditorFigureNode,
]
