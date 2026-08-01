import { BrandHeader } from "@/components/BrandHeader";
import { EventHistory } from "@/components/EventHistory";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  return (
    <main className="page-shell">
      <BrandHeader />
      <h1 className="sr-only">きめごと一覧</h1>
      <EventHistory mode="all" />
    </main>
  );
}
