import { randomBytes } from "node:crypto";

export function createToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}
