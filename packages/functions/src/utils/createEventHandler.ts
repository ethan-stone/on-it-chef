import { SNSMessage, SQSEvent } from "aws-lambda";
import { safeJsonParse } from "./safeJsonParse";
import { Events } from "@on-it-chef/core/services/events";
import { Logger } from "./logger";

export type EventHandlerConfig = {
  onEvent: (event: Events) => Promise<void>;
};

export function createEventHandler(config: EventHandlerConfig) {
  return async (sqsEvent: SQSEvent) => {
    for (const record of sqsEvent.Records) {
      const snsMessageParseResult = safeJsonParse(record.body);

      if (!snsMessageParseResult.success) {
        console.error("Failed to parse SNS message");

        continue;
      }

      const snsMessage = snsMessageParseResult.data as SNSMessage;

      const messageParseResult = safeJsonParse(snsMessage.Message);

      if (!messageParseResult.success) {
        console.error("Failed to parse event");

        continue;
      }

      const event = messageParseResult.data;

      await config.onEvent(event);
    }
  };
}
