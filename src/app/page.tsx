import { CreateEventForm } from "@/components/CreateEventForm";
import { SetupMessage } from "@/components/SetupMessage";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const { configError } = getSupabaseServerClient();

  return (
    <main className="page-shell">
      <section className="topbar" aria-label="サービス名">
        <a className="brand" href="/">
          きめのすけ
        </a>
      </section>

      <section className="home-grid">
        <div className="intro">
          <p className="eyebrow">どうしようか...</p>
          <h1>みんなに聞いてみよう！</h1>
          <p>
            お題ときめたいことを入れると、みんなに送るリンクと、あとで直せるあなた専用リンクができます。みんなにリンクを送って、意見を聞いてみよう。
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
