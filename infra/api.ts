import { secrets } from "./secrets";

export const apiFn = new sst.aws.Function("ApiFn", {
  url: true,
  link: [
    secrets.clerkSecretKey,
    secrets.clerkPublishableKey,
    secrets.clerkWebhookSecret,
    secrets.mongoUrl,
    secrets.geminiApiKey,
  ],
  handler: "packages/functions/src/api/hono.handler",
  environment: {
    ENVIRONMENT: $app.stage === "production" ? "production" : "development",
  },
  timeout: "30 seconds",
});

export const router = new sst.aws.Router("ApiRouter", {
  routes: {
    "/*": apiFn.url,
  },
});

export const outputs = {
  apiUrl: router.url,
};
