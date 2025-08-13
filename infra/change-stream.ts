import { eventsTopic } from "./pubsub";
import { secrets } from "./secrets";
import { vpc } from "./vpc";

const cluster = new sst.aws.Cluster("ChangeStreamCluster", {
  vpc: vpc,
});

export const service = new sst.aws.Service("ChangeStreamService", {
  cluster: cluster,
  image: {
    context: ".",
    dockerfile: "packages/changeStream/Dockerfile",
  },
  dev: {
    command: "bun run --cwd packages/changeStream dev",
  },
  link: [secrets.mongoUrl, eventsTopic],
  capacity: "spot", // Spot is okay for this use case. It's cheap and the change stream is resumable so it will pick up where it left off.
  scaling: {
    min: 1,
    max: 1,
  },
});
