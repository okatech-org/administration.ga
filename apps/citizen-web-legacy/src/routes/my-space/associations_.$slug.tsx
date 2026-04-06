import { createFileRoute } from "@tanstack/react-router";
import { AssociationDetailContent } from "@/components/my-space/association-detail";

export const Route = createFileRoute("/my-space/associations_/$slug")({
  component: () => {
    const { slug } = Route.useParams();
    return <AssociationDetailContent slug={slug} />;
  },
});
