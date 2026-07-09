import { SetupMessage } from "@/components/SetupMessage";

export default function NotFound() {
  return (
    <main className="page-shell">
      <SetupMessage
        heading="ページが みつかりません"
        message="リンクがまちがっているかもしれません。もういちどたしかめてね。"
      />
    </main>
  );
}
