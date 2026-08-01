import { CreateEventForm } from "@/components/CreateEventForm";
import { BrandHeader } from "@/components/BrandHeader";
import { EventHistory } from "@/components/EventHistory";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="page-shell">
      <BrandHeader homeCurrent />

      <section className="home-grid">
        <div className="intro">
          <p className="eyebrow">どうしようか...</p>
          <h1>みんなに聞いてみよう！</h1>
          <p>
            きめることと、必要ならつたえたいことを入れると、みんなで使うリンクができます。リンクを送って、意見を聞いてみよう。
          </p>
        </div>
        <div className="panel">
          <CreateEventForm />
        </div>
        <EventHistory mode="recent" />
      </section>
    </main>
  );
}
