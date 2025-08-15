import { SQSHandler } from "aws-lambda";
import { Events } from "@on-it-chef/core/services/events";
import { Logger } from "../utils/logger";
import { safeJsonParse } from "../utils/safeJsonParse";

export const main: SQSHandler = async (event, ctx) => {
  const logger = new Logger({
    env: process.env.NODE_ENV === "production" ? "production" : "development",
    service: "functions",
    namespace: "analytics",
    dataset: "analytics",
    requestId: ctx.awsRequestId,
  });

  for (const record of event.Records) {
    const message = safeJsonParse(record.body);

    if (!message.success) {
      logger.error("Failed to parse event", {
        error: message.error,
      });

      continue;
    }

    const eventParseResult = await Events.safeParseAsync(message.data);

    if (!eventParseResult.success) {
      logger.error("Failed to parse event", {
        error: eventParseResult.error,
      });

      continue;
    }

    const event = eventParseResult.data;

    switch (event.type) {
      case "recipe_version.created":
        logger.info(`Recipe version ${event.payload.recipeVersionId} created`);
        break;
    }
  }
};
