import { Suspense } from "react";
import CommunicationsPageClient from "@/components/communications/communications-page-client";

export default function CommunicationsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading communications...</div>}>
      <CommunicationsPageClient />
    </Suspense>
  );
}
