import { EventApp } from "@/components/EventApp";
import { SetupMessage } from "@/components/SetupMessage";
import { SUPABASE_MISSING_MESSAGE } from "@/lib/constants";
import { getEventByShareToken } from "@/lib/events";
import { createSharingLinks, resolveTrustedOrigin } from "@/lib/origin";

type PageProps = { params: Promise<{ shareToken: string }> };

export default async function ShareEventPage({ params }: PageProps) {
  const { shareToken } = await params;
  const result = await getEventByShareToken(shareToken);

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

  const sharingLinks = result.data.isOwner
    ? createSharingLinks(
        resolveTrustedOrigin(),
        result.data.state.event.share_token
      )
    : undefined;

  return (
    <EventApp
      initialState={result.data.state}
      isOwner={result.data.isOwner}
      sharingLinks={sharingLinks}
    />
  );
}
