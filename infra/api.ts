import { secrets } from "./secrets";

export const apiFn = new sst.aws.Function("ApiFn", {
  url: true,
  link: [
    secrets.clerkSecretKey,
    secrets.clerkPublishableKey,
    secrets.clerkWebhookSecret,
    secrets.mongoUrl,
    secrets.geminiApiKey,
    secrets.revenueCatWebhookAuthHeader,
    secrets.revenueCatRestApiKey,
    secrets.revenueCatProjectId,
  ],
  handler: "packages/functions/src/api/hono.handler",
  environment: {
    ENVIRONMENT: $app.stage === "production" ? "production" : "development",
  },
  timeout: "30 seconds",
});

const apiLogGroup = apiFn.nodes.logGroup;

new aws.cloudwatch.LogMetricFilter("4xxApiErrors", {
  logGroupName: apiLogGroup.apply((lg) => lg!.name),
  pattern: "{ $.httpStatusCode >= 400 && $.httpStatusCode < 500 }",
  metricTransformation: {
    value: "1",
    namespace: "Api",
    name: "4xxApiErrors",
  },
});

new aws.cloudwatch.LogMetricFilter("5xxApiErrors", {
  logGroupName: apiLogGroup.apply((lg) => lg!.name),
  pattern: "{ $.httpStatusCode >= 500 && $.httpStatusCode < 600 }",
  metricTransformation: {
    value: "1",
    namespace: "Api",
    name: "5xxApiErrors",
  },
});

export const router = new sst.aws.Router("ApiRouter", {
  routes: {
    "/*": apiFn.url,
  },
});

export const outputs = {
  apiUrl: router.url,
};
