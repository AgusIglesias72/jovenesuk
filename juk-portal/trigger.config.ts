import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "<set TRIGGER_PROJECT_ID>",
  runtime: "node",
  logLevel: "info",
  maxDuration: 300,  // 5 min max per task
  dirs: ["./src/trigger"],

  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
