import { SNSMessage, SQSHandler } from "aws-lambda";
import { Events } from "@on-it-chef/core/services/events";
import { Logger } from "../utils/logger";
import { safeJsonParse } from "../utils/safeJsonParse";
import { MongoClient } from "mongodb";
import { Resource } from "sst";
import { UserService } from "@on-it-chef/core/services/users";
import { RemoteConfigService } from "@on-it-chef/core/services/remote-configs";
import { createEventHandler } from "../utils/createEventHandler";

const mongoClient = new MongoClient(Resource.MongoUrl.value);

const remoteConfigService = new RemoteConfigService(mongoClient);

const userService = new UserService(mongoClient, remoteConfigService);

// |  +6ms          body: '{\n' +
// |  +6ms            '  "Type" : "Notification",\n' +
// |  +6ms            '  "MessageId" : "d73beac2-32d3-581b-8451-8bdb7fcad85d",\n' +
// |  +6ms            '  "SequenceNumber" : "10000000000000012000",\n' +
// |  +6ms            '  "TopicArn" : "arn:aws:sns:us-east-1:475216627762:on-it-chef-ethanstone-EventsTopicTopic-urukanuh.fifo",\n' +
// |  +6ms            '  "Message" : "{\\"_id\\":\\"evt_01K2Q3RRNSAV3GXTGFNAQQ7J7J\\",\\"timestamp\\":\\"2025-08-15T14:57:29.726Z\\",\\"type\\":\\"recipe_version.created\\",\\"key\\":\\"user_31K
// Lo4tI9MJCiu7prJzTnfbSJNh\\",\\"payload\\":{\\"recipeVersionId\\":\\"recipe_ver_01K2Q3RRKYY690V1A43F19722M\\",\\"recipeId\\":\\"recipe_01K2Q3RRKXH4GYG0QD5MBP75EQ\\",\\"userId\\":\\"user_31KLo4
// tI9MJCiu7prJzTnfbSJNh\\"}}",\n' +
// |  +6ms            '  "Timestamp" : "2025-08-15T14:57:29.972Z",\n' +
// |  +6ms            '  "UnsubscribeURL" : "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:475216627762:on-it-chef-ethanstone-EventsTopicTopic-uru
// kanuh.fifo:cc6de3a4-a007-418b-a23a-6bdd5f591b49"\n' +
// |  +8ms            '}',

const logger = new Logger({
  env: process.env.NODE_ENV === "production" ? "production" : "development",
  service: "functions",
  namespace: "analytics",
  dataset: "analytics",
});

export const main = createEventHandler({
  onEvent: async (event) => {
    switch (event.type) {
      case "recipe_version.created": {
        await userService.decrementRemainingRecipeVersions(
          event.payload.userId
        );

        logger.info(
          `Decremented remaining recipe versions for user ${event.payload.userId}`
        );

        break;
      }
    }
  },
});
