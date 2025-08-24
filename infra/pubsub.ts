import { secrets } from "./secrets";

export const eventsTopic = new sst.aws.SnsTopic("EventsTopic", {
  fifo: true,
});

export const userQuotaQueue = new sst.aws.Queue("UserQuotaQueue", {
  fifo: true,
});

const syncUserSubscriptionQueue = new sst.aws.Queue(
  "SyncUserSubscriptionQueue",
  {
    fifo: true,
  }
);

eventsTopic.subscribeQueue("UserQuotaQueue", userQuotaQueue);
eventsTopic.subscribeQueue(
  "SyncUserSubscriptionQueue",
  syncUserSubscriptionQueue
);

userQuotaQueue.subscribe({
  handler: "packages/functions/src/pubsub/user-quota-handler.main",
  link: [
    userQuotaQueue,
    secrets.mongoUrl,
    secrets.revenueCatProjectId,
    secrets.revenueCatRestApiKey,
  ],
});

syncUserSubscriptionQueue.subscribe({
  handler: "packages/functions/src/pubsub/sync-user-subscription.main",
  link: [
    syncUserSubscriptionQueue,
    secrets.mongoUrl,
    secrets.revenueCatProjectId,
    secrets.revenueCatRestApiKey,
  ],
});

export const outputs = {
  eventsTopic: eventsTopic.arn,
  userQuotaQueue: userQuotaQueue.arn,
};
