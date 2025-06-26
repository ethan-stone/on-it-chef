const clerkSecretKey = new sst.Secret("ClerkSecretKey");
const clerkPublishableKey = new sst.Secret("ClerkPublishableKey");
const clerkWebhookSecret = new sst.Secret("ClerkWebhookSecret");
const mongoUrl = new sst.Secret("MongoUrl");

export const secrets = {
  clerkSecretKey,
  clerkPublishableKey,
  clerkWebhookSecret,
  mongoUrl,
};
