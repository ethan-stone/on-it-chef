export const eventsTopic = new sst.aws.SnsTopic("EventsTopic", {
  fifo: true,
});

export const analyticsQueue = new sst.aws.Queue("AnalyticsQueue", {
  fifo: true,
});

eventsTopic.subscribeQueue("AnalyticsQueue", analyticsQueue);

export const outputs = {
  eventsTopic: eventsTopic.arn,
  analyticsQueue: analyticsQueue.arn,
};
