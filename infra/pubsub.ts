import { secrets } from "./secrets";

const sqsFailureFeedbackRoleArn = new aws.iam.Role("SqsFailureFeedbackRole", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: "sns.amazonaws.com",
        },
        Action: "sts:AssumeRole",
      },
    ],
  },
});

const sqsFailureFeedbackPolicy = new aws.iam.Policy(
  "SqsFailureFeedbackPolicy",
  {
    policy: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "sns.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
      ],
    },
  }
);

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
