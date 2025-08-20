import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Resource } from "sst";

const client = new SNSClient({});

type PublishOptions = {
  deduplicationId: string;
  message: string;
  key: string;
};

export async function publish(options: PublishOptions) {
  const command = new PublishCommand({
    TopicArn: Resource.EventsTopic.arn,
    MessageDeduplicationId: options.deduplicationId,
    MessageGroupId: options.key,
    Message: options.message,
  });

  const result = await client.send(command);

  if (result.$metadata.httpStatusCode !== 200) {
    throw new Error("Failed to publish message");
  }
}
