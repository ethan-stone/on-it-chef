export const eventsTopic = new sst.aws.SnsTopic("EventsTopic", {
  fifo: true,
});
