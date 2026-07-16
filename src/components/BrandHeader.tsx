import type { ReactNode } from "react";

export function BrandHeader({
  homeCurrent = false,
  navigation = null
}: {
  homeCurrent?: boolean;
  navigation?: ReactNode;
}) {
  return (
    <header aria-label="ブランドヘッダー" className="brand-header">
      <span className="brand-tagline">Clarity Before Choice</span>
      <a aria-current={homeCurrent ? "page" : undefined} className="brand" href="/">
        きめのすけ
      </a>
      <div className="brand-header-navigation" data-testid="brand-header-navigation-slot">
        {navigation}
      </div>
    </header>
  );
}
