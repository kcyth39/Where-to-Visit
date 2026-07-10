import { SetupMessage } from "@/components/SetupMessage";

export default function NotFound() {
  return (
    <main className="page-shell">
      <SetupMessage
        heading="ページが みつかりません"
        message="リンクが間違っているかもしれません。もう一度確かめて下さい。"
      />
    </main>
  );
}
