import { EventApp } from "@/components/EventApp";
import { SetupMessage } from "@/components/SetupMessage";
import { SUPABASE_MISSING_MESSAGE } from "@/lib/constants";
import { getEventByShareToken } from "@/lib/events";
import { getRequestOrigin } from "@/lib/origin";

type PageProps = { params: Promise<{ shareToken: string }> };

export default async function ShareEventPage({ params }: PageProps) {
  const { shareToken } = await params;
  const result = await getEventByShareToken(shareToken);
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
      initialState={result.data.state}
      isOwner={result.data.isOwner}
      origin={origin}
    />
  );
}
