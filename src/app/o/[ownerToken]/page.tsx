import { EventView } from "@/components/EventView";
import { OwnerSessionSetter } from "@/components/OwnerSessionSetter";
import { SetupMessage } from "@/components/SetupMessage";
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
    return (
      <main className="page-shell">
        <SetupMessage message={result.error} />
      </main>
    );
  }

  return (
    <>
      <OwnerSessionSetter ownerToken={ownerToken} />
      <EventView
        view={result.data}
        origin={origin}
        ownerToken={ownerToken}
        currentPath={`/o/${ownerToken}`}
        notice={
          typeof query.created === "string"
            ? "オーナー編集URLを保存してください。"
            : typeof query.saved === "string"
              ? "保存しました。"
              : null
        }
        error={typeof query.error === "string" ? query.error : null}
      />
    </>
  );
}
