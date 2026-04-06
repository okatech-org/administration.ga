import { createFileRoute } from "@tanstack/react-router";
import { CompanyDetailContent } from "@/components/my-space/company-detail";

export const Route = createFileRoute("/my-space/companies_/$id")({
  component: () => {
    const { id } = Route.useParams();
    return <CompanyDetailContent id={id} />;
  },
});
