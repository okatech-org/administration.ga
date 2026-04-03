import { lazy, Suspense } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";

const RichTextEditorLazy = lazy(() =>
  import("@/components/common/rich-text-editor").then((m) => ({
    default: m.RichTextEditor,
  })),
);

export function RichTextEditor(
  props: React.ComponentProps<typeof RichTextEditorLazy>,
) {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full rounded-md" />}>
      <RichTextEditorLazy {...props} />
    </Suspense>
  );
}
