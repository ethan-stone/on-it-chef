import { secrets } from "./secrets";

export const eventsTopic = new sst.aws.SnsTopic("EventsTopic", {
  fifo: true,
});

export const userQuotaQueue = new sst.aws.Queue("UserQuotaQueue", {
  fifo: true,
});

eventsTopic.subscribeQueue("UserQuotaQueue", userQuotaQueue);

userQuotaQueue.subscribe({
  handler: "packages/functions/src/pubsub/user-quota-handler.main",
  link: [userQuotaQueue, secrets.mongoUrl],
});

export const outputs = {
  eventsTopic: eventsTopic.arn,
  userQuotaQueue: userQuotaQueue.arn,
};
