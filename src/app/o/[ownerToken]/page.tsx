import { EventApp } from "@/components/EventApp";
import { SetupMessage } from "@/components/SetupMessage";
import { SUPABASE_MISSING_MESSAGE } from "@/lib/constants";
import { getEventByOwnerToken } from "@/lib/events";
import { getRequestOrigin } from "@/lib/origin";

type PageProps = {
  params: Promise<{ ownerToken: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OwnerEventPage({ params, searchParams }: PageProps) {
  const { ownerToken } = await params;
  const query = await searchParams;
  const result = await getEventByOwnerToken(ownerToken);
  const origin = await getRequestOrigin();

  if (!result.data) {
    const configError = result.error === SUPABASE_MISSING_MESSAGE;
    return (
      <main className="page-shell">
        <SetupMessage
          heading={configError ? undefined : "きめることが みつかりません"}
          message={configError ? result.error : "リンクが間違っているか、無くなっているのかもしれません。"}
        />
      </main>
    );
  }

  return (
    <EventApp
      initialSetup={query.created === "1"}
      initialState={result.data.state}
      isOwner
      origin={origin}
      ownerToken={ownerToken}
    />
  );
}
