import { EventView } from "@/components/EventView";
import { SetupMessage } from "@/components/SetupMessage";
import { SUPABASE_MISSING_MESSAGE } from "@/lib/constants";
import { getEventByOwnerToken } from "@/lib/events";
import { getRequestOrigin } from "@/lib/origin";

type PageProps = {
  params: Promise<{ ownerToken: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OwnerEventPage({
  params,
  searchParams
}: PageProps) {
  const { ownerToken } = await params;
  const query = await searchParams;
  const result = await getEventByOwnerToken(ownerToken);
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
      ownerToken={ownerToken}
      currentPath={`/o/${ownerToken}`}
      notice={
        typeof query.created === "string"
          ? "あなた専用リンクだよ。無くさないように保存してね。"
          : typeof query.saved === "string"
            ? "保存しました！"
            : null
      }
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
