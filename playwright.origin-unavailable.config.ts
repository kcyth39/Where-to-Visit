import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "trusted-origin.spec.ts",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "origin-unavailable",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "next dev --hostname 127.0.0.1 --port 3001",
    env: {
      APP_ORIGIN: ""
    },
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    timeout: 120_000
  }
});
