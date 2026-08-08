import { EventApp } from "@/components/EventApp";
import { EventHistoryRecorder } from "@/components/EventHistory";
import { SetupMessage } from "@/components/SetupMessage";
import { SUPABASE_MISSING_MESSAGE } from "@/lib/constants";
import { canonicalEventPathname, normalizeEventHistoryTitle } from "@/lib/event-history";
import { getEventByShareToken } from "@/lib/events";
import { createSharingLinks, resolveTrustedOrigin } from "@/lib/origin";

type PageProps = {
  params: Promise<{ shareToken: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function ShareEventPage({
  params,
  searchParams
}: PageProps) {
  const { shareToken } = await params;
  const { created } = await searchParams;
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

  const sharingLinks = createSharingLinks(
    resolveTrustedOrigin(),
    result.data.state.event.share_token
  );
  const pathname = canonicalEventPathname(shareToken);
  const historyTitle = normalizeEventHistoryTitle(result.data.state.event.title);

  return (
    <>
      {pathname && historyTitle ? (
        <EventHistoryRecorder pathname={pathname} title={historyTitle} />
      ) : null}
      <EventApp
        initialState={result.data.state}
        initialSetup={created === "1"}
        sharingLinks={sharingLinks}
      />
    </>
  );
}
