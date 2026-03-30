---
name: Tiptap Rich Text Editor Integration
description: Implement Tiptap rich text editor with collaborative editing, Convex integration, custom extensions, and document persistence
activation: ["tiptap", "editor", "rich text", "prosemirror", "collaboration", "yjs", "document", "content editing"]
projects: ["digitalium.io", "consulat.ga"]
version: 1.0.0
---

# Tiptap Rich Text Editor Integration

## Overview

Tiptap is a headless, Vue-agnostic rich text editor built on ProseMirror. OkaTech uses Tiptap for:
- `digitalium.io` (Document editing)
- `consulat.ga` (Official correspondence)

Tiptap provides:
- Framework-agnostic rich text editing
- Real-time collaboration with Yjs
- Custom extension system
- JSON-based document format
- Easy Convex integration

## Installation & Setup

### Package Installation

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
npm install @tiptap/extension-placeholder
npm install @tiptap/extension-image @tiptap/extension-link @tiptap/extension-table
npm install @tiptap/extension-collaborative @tiptap/extension-collaborative-cursor y-websocket yjs

# Optional: Markdown support
npm install @tiptap/extension-markdown tiptap-markdown

# Optional: Convex sync
npm install @convex-dev/prosemirror-sync
```

### Basic Editor Setup

```typescript
// lib/editor.ts
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';

export const useDocumentEditor = (initialContent: string = '') => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'text-base leading-relaxed',
          },
        },
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'font-bold mt-4 mb-2',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-inside ml-4',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-inside ml-4',
          },
        },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: true,
        linkOnPaste: true,
        autolink: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-gray-300',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
      Placeholder.configure({
        placeholder: 'Commencez à taper votre document...',
      }),
    ],
    content: initialContent,
    autofocus: 'start',
  });

  return editor;
};

// Component
export const DocumentEditor = ({ initialContent = '' }) => {
  const editor = useDocumentEditor(initialContent);

  if (!editor) return null;

  return <EditorContent editor={editor} className="prose prose-sm max-w-full" />;
};
```

## Core Extensions

### StarterKit

Bundles essential extensions:

```typescript
import StarterKit from '@tiptap/starter-kit';

StarterKit.configure({
  // Disable extensions you don't need
  codeBlock: false,
  code: false,
  horizontalRule: false,

  // Configure included extensions
  heading: {
    levels: [1, 2, 3, 4, 5, 6],
  },
  paragraph: {
    HTMLAttributes: { class: 'text-base' },
  },
  listItem: {
    HTMLAttributes: { class: 'ml-4' },
  },
})
```

Includes: `Document`, `Paragraph`, `Heading`, `BulletList`, `OrderedList`, `ListItem`, `Blockquote`, `CodeBlock`, `HardBreak`, `HorizontalRule`, `Bold`, `Code`, `Italic`, `Strike`, `Text`.

### Image Extension

```typescript
Image.configure({
  allowBase64: true,          // Allow data URLs
  HTMLAttributes: {
    class: 'max-w-full',
  },
  handleDOMEvents: {
    drop: (view, event) => {
      const hasFiles = event.dataTransfer?.types?.includes('Files');
      if (!hasFiles) return false;

      event.preventDefault();

      Array.from(event.dataTransfer.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          view.dispatch(
            view.state.tr.insertText('', view.state.selection.from)
            .insert(view.state.selection.from,
              view.state.schema.nodes.image.create({ src }))
          );
        };
        reader.readAsDataURL(file);
      });

      return true;
    },
  },
})
```

### Link Extension

```typescript
Link.configure({
  autolink: true,                    // Auto-detect URLs
  openOnClick: false,                // Ctrl+click to open
  HTMLAttributes: {
    rel: 'noopener noreferrer',
    target: '_blank',
  },
})
```

### Table Extension with Custom Styling

```typescript
Table.configure({
  resizable: true,
  handleWidth: 4,
  cellMinWidth: 50,
  lastColumnResizable: true,
  HTMLAttributes: {
    class: 'w-full border-collapse border border-gray-300',
  },
}),
TableRow.configure({
  HTMLAttributes: {
    class: 'hover:bg-gray-50',
  },
}),
TableHeader.configure({
  HTMLAttributes: {
    class: 'bg-gray-100 border border-gray-300 p-2 text-left font-bold',
  },
}),
TableCell.configure({
  HTMLAttributes: {
    class: 'border border-gray-300 p-2',
  },
}),
```

## Toolbar Component Pattern

### Basic Toolbar

```typescript
// components/EditorToolbar.tsx
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Image,
  Table,
} from 'lucide-react';

interface ToolbarProps {
  editor: Editor | null;
}

export const EditorToolbar: React.FC<ToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  const handleAddImage = () => {
    const url = window.prompt('Entrez l\'URL de l\'image:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleAddLink = () => {
    const url = window.prompt('Entrez l\'URL du lien:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleAddTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
      {/* Text Formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-gray-300' : ''}
        title="Gras (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-gray-300' : ''}
        title="Italique (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bg-gray-300' : ''}
        title="Barré"
      >
        <Strikethrough className="w-4 h-4" />
      </Button>

      <div className="border-l border-gray-300 mx-1" />

      {/* Headings */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''}
        title="Titre 1"
      >
        <Heading1 className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''}
        title="Titre 2"
      >
        <Heading2 className="w-4 h-4" />
      </Button>

      {/* Lists */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-gray-300' : ''}
        title="Liste à puces"
      >
        <List className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-gray-300' : ''}
        title="Liste numérotée"
      >
        <ListOrdered className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'bg-gray-300' : ''}
        title="Bloc de citation"
      >
        <Quote className="w-4 h-4" />
      </Button>

      <div className="border-l border-gray-300 mx-1" />

      {/* Insert Elements */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddLink}
        className={editor.isActive('link') ? 'bg-gray-300' : ''}
        title="Ajouter un lien"
      >
        <Link2 className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddImage}
        title="Ajouter une image"
      >
        <Image className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddTable}
        title="Ajouter un tableau"
      >
        <Table className="w-4 h-4" />
      </Button>
    </div>
  );
};
```

## Collaborative Editing with Yjs

### Setup with WebSocket

```typescript
// lib/collaboration.ts
import WebSocketProvider from 'y-websocket';
import * as Y from 'yjs';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';

export const setupCollaboration = (documentId: string, userId: string) => {
  // Create Yjs document
  const ydoc = new Y.Doc();

  // Connect to WebSocket server
  const provider = new WebSocketProvider(
    'ws://localhost:1234',
    documentId,
    ydoc
  );

  // Awareness for remote cursors
  provider.awareness.setLocalState({
    user: {
      name: userId,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    },
  });

  return {
    ydoc,
    provider,
    extensions: [
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: userId,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        },
      }),
    ],
  };
};

// Usage in editor
const { ydoc, provider, extensions } = setupCollaboration('doc-123', 'user-456');

const editor = useEditor({
  extensions: [
    StarterKit,
    ...extensions,
  ],
  onUpdate: ({ editor }) => {
    // Save to Convex
    saveDocument(editor.getJSON());
  },
});
```

### Multiple Cursors UI

```typescript
// components/CollaborativeCursors.tsx
import { useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';

interface RemoteCursor {
  userId: string;
  name: string;
  color: string;
  position: number;
}

export const RemoteCursorsDisplay = ({ provider }) => {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

  useEffect(() => {
    const handleUpdate = () => {
      const states = provider.awareness.getStates();
      const newCursors = Array.from(states.values()).map((state: any) => ({
        userId: state.user?.name,
        name: state.user?.name,
        color: state.user?.color,
        position: state.position || 0,
      }));
      setCursors(newCursors);
    };

    provider.awareness.on('update', handleUpdate);
    return () => provider.awareness.off('update', handleUpdate);
  }, [provider]);

  return (
    <div className="space-y-1 text-xs">
      {cursors.map((cursor) => (
        <div key={cursor.userId} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: cursor.color }}
          />
          <span>{cursor.name}</span>
        </div>
      ))}
    </div>
  );
};
```

## Convex Integration

### Convex Schema for Documents

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    content: v.any(), // JSON content from Tiptap
    htmlContent: v.optional(v.string()),
    authorId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    documentType: v.string(), // 'report', 'letter', etc.
    tags: v.array(v.string()),
    isPublished: v.boolean(),
  })
    .index('by_author', ['authorId'])
    .index('by_created', ['createdAt']),

  documentVersions: defineTable({
    documentId: v.id('documents'),
    content: v.any(),
    authorId: v.string(),
    timestamp: v.number(),
    changeDescription: v.string(),
  })
    .index('by_document', ['documentId']),

  documentCollaborators: defineTable({
    documentId: v.id('documents'),
    userId: v.string(),
    role: v.enum('viewer', 'editor', 'owner'),
    addedAt: v.number(),
  })
    .index('by_document', ['documentId']),
});
```

### Save Document to Convex

```typescript
// convex/documents.ts
import { mutation, query } from 'convex/_generated/server';
import { v } from 'convex/values';

export const createDocument = mutation({
  args: {
    title: v.string(),
    content: v.any(),
  },
  async handler(ctx, args) {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error('Not authenticated');

    const documentId = await ctx.db.insert('documents', {
      title: args.title,
      content: args.content,
      authorId: userId.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      documentType: 'general',
      tags: [],
      isPublished: false,
    });

    return documentId;
  },
});

export const updateDocument = mutation({
  args: {
    documentId: v.id('documents'),
    title: v.optional(v.string()),
    content: v.optional(v.any()),
  },
  async handler(ctx, args) {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error('Not authenticated');

    const doc = await ctx.db.get(args.documentId);
    if (doc?.authorId !== userId.subject) {
      throw new Error('Unauthorized');
    }

    await ctx.db.patch(args.documentId, {
      ...(args.title && { title: args.title }),
      ...(args.content && { content: args.content }),
      updatedAt: Date.now(),
    });

    // Create version for history
    if (args.content) {
      await ctx.db.insert('documentVersions', {
        documentId: args.documentId,
        content: args.content,
        authorId: userId.subject,
        timestamp: Date.now(),
        changeDescription: 'Manual save',
      });
    }

    return doc;
  },
});

export const getDocument = query({
  args: {
    documentId: v.id('documents'),
  },
  async handler(ctx, args) {
    return await ctx.db.get(args.documentId);
  },
});

export const getDocumentVersions = query({
  args: {
    documentId: v.id('documents'),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query('documentVersions')
      .withIndex('by_document', (q) => q.eq('documentId', args.documentId))
      .collect();
  },
});
```

### React Component with Auto-Save

```typescript
// components/DocumentEditor.tsx
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCallback, useEffect } from 'react';

export const DocumentEditor = ({ documentId }) => {
  const document = useQuery(api.documents.getDocument, { documentId });
  const updateDocument = useMutation(api.documents.updateDocument);

  const editor = useEditor({
    extensions: [...],
    content: document?.content || '',
  });

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!editor) return;

    const interval = setInterval(() => {
      const json = editor.getJSON();
      updateDocument({
        documentId,
        content: json,
      }).catch(console.error);
    }, 5000);

    return () => clearInterval(interval);
  }, [editor, documentId, updateDocument]);

  if (!document) return <div>Chargement...</div>;

  return (
    <div>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
```

## Custom Extensions

### Code Block with Syntax Highlighting

```typescript
// extensions/CodeBlockHighlight.ts
import CodeBlock from '@tiptap/extension-code-block';
import { Node } from '@tiptap/core';
import { HighlightingCodeBlock } from '@tiptap/pm/nodes';
import Prism from 'prismjs';

export const CodeBlockWithHighlight = CodeBlock.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      lowlight: null,
      HTMLAttributes: {
        class: 'bg-gray-900 text-white p-4 rounded overflow-x-auto',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['pre', HTMLAttributes, ['code', 0]];
  },
});
```

### Callout/Alert Extension

```typescript
// extensions/Callout.ts
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  atom: false,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-type'),
        renderHTML: (attributes) => ({
          'data-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
        getAttrs: (element) => ({
          type: (element as HTMLElement).getAttribute('data-type'),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { class: 'bg-blue-50 border-l-4 border-blue-500 p-4' },
        HTMLAttributes
      ),
      ['div', { contenteditable: 'true' }, 0],
    ];
  },
});
```

## Bubble & Floating Menus

```typescript
// components/BubbleMenu.tsx
import { BubbleMenu, Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';

export const TextBubbleMenu = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100 }}
      shouldShow={({ editor, from, to }) => from === to && editor.isActive('paragraph')}
    >
      <div className="flex gap-1 p-2 bg-white border border-gray-300 rounded shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200' : ''}
        >
          Gras
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200' : ''}
        >
          Italique
        </Button>
      </div>
    </BubbleMenu>
  );
};
```

## Markdown Import/Export

```typescript
// lib/markdown.ts
import { generateJSON } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import md from 'markdown-it';

const extensions = [
  StarterKit,
  Link,
  Image,
];

// Markdown string → Tiptap JSON
export const markdownToJSON = (markdown: string) => {
  const html = md().render(markdown);
  return generateJSON(html, extensions);
};

// Tiptap JSON → Markdown string
export const jsonToMarkdown = (json: any) => {
  const html = generateHTML(json, extensions);
  // Use html2md or similar library
  return html;
};

// Tiptap JSON → HTML
export const jsonToHTML = (json: any) => {
  return generateHTML(json, extensions);
};
```

## Document Templates

```typescript
// lib/templates.ts
export const templates = {
  letter: {
    name: 'Lettre officielle',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '[En-tête du ministère]' }],
        },
        { type: 'paragraph' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Objet: ' }],
        },
        { type: 'paragraph' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Madame, Monsieur,' }],
        },
        { type: 'paragraph' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '[Corps du texte...]' }],
        },
      ],
    },
  },
  report: {
    name: 'Rapport',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Titre du rapport' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Auteur: ' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Date: ' }],
        },
      ],
    },
  },
};
```

## Content Validation

```typescript
// lib/validators.ts
import { z } from 'zod';

export const documentContentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(z.any()).optional(),
});

export const validateEditorContent = (content: any): boolean => {
  try {
    documentContentSchema.parse(content);
    return true;
  } catch {
    return false;
  }
};

// Sanitize content before saving
export const sanitizeContent = (content: any) => {
  // Remove script tags, iframes, etc.
  return JSON.parse(JSON.stringify(content)); // Deep clone
};
```

## Read-Only Mode for Previews

```typescript
// components/DocumentPreview.tsx
export const DocumentPreview = ({ content }) => {
  const editor = useEditor({
    extensions: [...],
    content,
    editable: false, // Read-only
  });

  return (
    <div className="prose prose-sm max-w-full">
      <EditorContent editor={editor} />
    </div>
  );
};
```

## Anti-Patterns

### Do Not

1. **Store HTML directly**: Always use JSON format (Tiptap native)
2. **Ignore collaborative conflicts**: Use Yjs properly, don't override doc state
3. **Skip content validation**: Always validate before saving to Convex
4. **Use direct innerHTML**: Let Tiptap handle DOM rendering
5. **Forget to disable unwanted extensions**: Bloated editor = poor UX
6. **Store large documents without pagination**: Implement chunking for 10k+ words
7. **Ignore editor.isActive()**: Always check state before running commands
8. **Mix Tiptap and contentEditable**: Tiptap manages content, don't edit raw HTML
9. **Forget autosave**: Always implement auto-save with debouncing
10. **Hardcode image URLs**: Use Convex file uploads, not raw URLs

## Troubleshooting

### Editor Not Rendering

```typescript
// Ensure content is valid JSON
const isValid = editor?.state.doc.content.length > 0;

// Check for missing extensions
console.log(editor?.extensionManager.extensions);
```

### Collaboration Not Working

```typescript
// Verify WebSocket connection
provider.on('connection-error', (error) => {
  console.error('WebSocket error:', error);
});

// Check Awareness updates
provider.awareness.on('update', (changes) => {
  console.log('Awareness updated:', changes);
});
```

### Performance Issues

```typescript
// Debounce save operations
import { debounce } from 'lodash';

const debouncedSave = debounce((content) => {
  updateDocument({ content });
}, 1000);

editor?.on('update', ({ editor }) => {
  debouncedSave(editor.getJSON());
});
```

## Resources

- [Tiptap Documentation](https://tiptap.dev)
- [ProseMirror](https://prosemirror.net)
- [Yjs Documentation](https://docs.yjs.dev)
- [Convex ProseMirror Sync](https://labs.convex.dev/prosemirror)
