import { EventView } from "@/components/EventView";
import { SetupMessage } from "@/components/SetupMessage";
import { getEventByShareToken } from "@/lib/events";
import { getRequestOrigin } from "@/lib/origin";

type PageProps = {
  params: Promise<{ shareToken: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ShareEventPage({
  params,
  searchParams
}: PageProps) {
  const { shareToken } = await params;
  const query = await searchParams;
  const result = await getEventByShareToken(shareToken);
  const origin = await getRequestOrigin();

  if (!result.data) {
    return (
      <main className="page-shell">
        <SetupMessage message={result.error} />
      </main>
    );
  }

  return (
    <EventView
      view={result.data}
      origin={origin}
      currentPath={`/e/${shareToken}`}
      notice={typeof query.saved === "string" ? "保存しました。" : null}
      error={typeof query.error === "string" ? query.error : null}
    />
  );
}
