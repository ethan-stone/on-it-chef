const clerkSecretKey = new sst.Secret("ClerkSecretKey");
const clerkPublishableKey = new sst.Secret("ClerkPublishableKey");
const clerkWebhookSecret = new sst.Secret("ClerkWebhookSecret");
const mongoUrl = new sst.Secret("MongoUrl");
const geminiApiKey = new sst.Secret("GeminiApiKey");
const revenueCatWebhookAuthHeader = new sst.Secret(
  "RevenueCatWebhookAuthHeader"
);
const revenueCatRestApiKey = new sst.Secret("RevenueCatRestApiKey");
const revenueCatProjectId = new sst.Secret("RevenueCatProjectId");

export const secrets = {
  clerkSecretKey,
  clerkPublishableKey,
  clerkWebhookSecret,
  mongoUrl,
  geminiApiKey,
  revenueCatWebhookAuthHeader,
  revenueCatRestApiKey,
  revenueCatProjectId,
};
