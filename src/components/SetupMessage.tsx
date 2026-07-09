type SetupMessageProps = {
  heading?: string;
  message: string;
};

export function SetupMessage({
  heading = "設定を確認してください",
  message
}: SetupMessageProps) {
  return (
    <section className="setup-message" role="alert">
      <h1>{heading}</h1>
      <p>{message}</p>
    </section>
  );
}
