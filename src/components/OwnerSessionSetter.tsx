"use client";

import { useEffect } from "react";

type OwnerSessionSetterProps = {
  ownerToken: string;
};

export function OwnerSessionSetter({ ownerToken }: OwnerSessionSetterProps) {
  useEffect(() => {
    void fetch(`/api/owner-session/${ownerToken}`, {
      method: "POST"
    });
  }, [ownerToken]);

  return null;
}
