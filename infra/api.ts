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

export const apiLogsSubscriptionFn = new sst.aws.Function(
  "ApiLogsSubscriptionFn",
  {
    url: true,
    handler: "packages/functions/src/cloudwatch/api-logs-subscription.main",
    timeout: "30 seconds",
    environment: {
      ENVIRONMENT: $app.stage === "production" ? "production" : "development",
    },
    link: [secrets.mongoUrl],
  }
);

const logGroupArn = apiFn.nodes.logGroup.apply((l) => l?.arn);
const logGroupName = apiFn.nodes.logGroup.apply((l) => l?.name);

if (!logGroupName) {
  throw new Error("API log group not found");
}

if (!logGroupArn) {
  throw new Error("API log group ARN not found");
}

new aws.lambda.Permission(
  `allow-cloudwatch-to-invoke-subscription-filter-lambda`,
  {
    action: "lambda:InvokeFunction",
    function: apiLogsSubscriptionFn.name,
    principal: "logs.amazonaws.com",
    sourceArn: $interpolate`${logGroupArn}:*`, // Grant permission for any log stream in the log group
  }
);

new aws.cloudwatch.LogSubscriptionFilter("ApiLogsSubscriptionFilter", {
  logGroup: $interpolate`${logGroupName}`,
  name: "api-logs-subscription",
  filterPattern: `{ $.type = "metric" }`,
  destinationArn: apiLogsSubscriptionFn.arn,
});

export const outputs = {
  apiUrl: router.url,
};
