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
          <p className="eyebrow">お題作成</p>
          <h1>みんなで決める場所を作る</h1>
          <p>
            イベント名とメモを入れると、共有URLとオーナー編集URLを発行します。
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
