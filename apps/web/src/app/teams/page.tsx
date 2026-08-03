import { Suspense } from "react";
import TeamsPageClient from "./teams-page-client";

export default function TeamsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading teams...</div>}>
      <TeamsPageClient />
    </Suspense>
  );
}
