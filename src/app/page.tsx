import { CreateEventForm } from "@/components/CreateEventForm";
import { BrandHeader } from "@/components/BrandHeader";
import { SetupMessage } from "@/components/SetupMessage";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const { configError } = getSupabaseServerClient();

  return (
    <main className="page-shell">
      <BrandHeader homeCurrent />

      <section className="home-grid">
        <div className="intro">
          <p className="eyebrow">どうしようか...</p>
          <h1>みんなに聞いてみよう！</h1>
          <p>
            きめることと、必要ならつたえておきたいことを入れると、みんなに送るリンクと、あとで直せるあなた専用リンクができます。みんなにリンクを送って、意見を聞いてみよう。
          </p>
        </div>
        <div className="panel">
          {configError ? <SetupMessage message={configError} /> : null}
          <CreateEventForm disabled={Boolean(configError)} />
        </div>
      </section>
    </main>
  );
}
