type SetupMessageProps = {
  message: string;
};

export function SetupMessage({ message }: SetupMessageProps) {
  return (
    <section className="setup-message" role="alert">
      <h1>設定を確認してください</h1>
      <p>{message}</p>
    </section>
  );
}
