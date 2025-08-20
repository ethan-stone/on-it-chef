import { Events } from "@on-it-chef/core/services/events";
import { ChangeStreamHandler } from "./change-stream";
import { publish } from "./sns";
import { logger } from "./logger";

export const eventsHandler: ChangeStreamHandler = async (options) => {
  if (
    options.change.operationType === "insert" &&
    options.change.ns.coll === "events"
  ) {
    const event = options.change.fullDocument as Events;

    await publish({
      deduplicationId: event._id,
      message: JSON.stringify(event),
      key: event.key,
    });

    logger.info(`Published event ${event._id}.`);
  }
};
