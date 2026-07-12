import { EventApp } from "@/components/EventApp";
import { SetupMessage } from "@/components/SetupMessage";
import { SUPABASE_MISSING_MESSAGE } from "@/lib/constants";
import { getEventByShareToken } from "@/lib/events";
import { getRequestOrigin } from "@/lib/origin";

type PageProps = {
  params: Promise<{ shareToken: string; candidateId: string }>;
};

export default async function CandidatePage({ params }: PageProps) {
  const { shareToken, candidateId } = await params;
  const result = await getEventByShareToken(shareToken);
  const origin = await getRequestOrigin();

  if (!result.data || !result.data.state.candidates.some((row) => row.candidate.id === candidateId)) {
    const configError = result.error === SUPABASE_MISSING_MESSAGE;
    return (
      <main className="page-shell">
        <SetupMessage
          heading={configError ? undefined : "候補が みつかりません"}
          message={configError ? result.error : "リンクが間違っているか、候補が無くなっているのかもしれません。"}
        />
      </main>
    );
  }

  return (
    <EventApp
      candidateId={candidateId}
      initialState={result.data.state}
      isOwner={result.data.isOwner}
      origin={origin}
    />
  );
}
