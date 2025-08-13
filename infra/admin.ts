import { secrets } from "./secrets";

export const createAdminApiKeyFn = new sst.aws.Function("CreateAdminApiKeyFn", {
  url: true,
  handler: "packages/functions/src/admin/create-admin-api-key.main",
  timeout: "30 seconds",
  environment: {
    ENVIRONMENT: $app.stage === "production" ? "production" : "development",
  },
  link: [secrets.mongoUrl],
});
