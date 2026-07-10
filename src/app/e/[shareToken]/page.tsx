import { EventView } from "@/components/EventView";
import { SetupMessage } from "@/components/SetupMessage";
import { SUPABASE_MISSING_MESSAGE } from "@/lib/constants";
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
    const isConfigError = result.error === SUPABASE_MISSING_MESSAGE;

    return (
      <main className="page-shell">
        <SetupMessage
          heading={isConfigError ? undefined : "お題が みつかりません"}
          message={
            isConfigError
              ? result.error
              : "リンクが間違っているか、無くなっているのかもしれません。"
          }
        />
      </main>
    );
  }

  return (
    <EventView
      view={result.data}
      origin={origin}
      currentPath={`/e/${shareToken}`}
      notice={typeof query.saved === "string" ? "保存しました！" : null}
      error={
        typeof query.error === "string"
          ? query.error
          : typeof query.candidateError === "string"
            ? query.candidateError
            : null
      }
    />
  );
}
