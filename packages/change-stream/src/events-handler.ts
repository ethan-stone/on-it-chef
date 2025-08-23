import { Events } from "@on-it-chef/core/services/events";
import { ChangeStreamHandler } from "./change-stream";
import { publish } from "./sns";
import { logger } from "./logger";
import { client } from "./mongo-client";

export const eventsHandler: ChangeStreamHandler = async (options) => {
  if (
    options.change.operationType === "insert" &&
    options.change.ns.coll === "events"
  ) {
    const event = options.change.fullDocument as Events;

    if (event.sentAt) {
      logger.info(`Event ${event._id} already sent. Skipping.`);
      return;
    }

    await publish({
      deduplicationId: event._id,
      message: JSON.stringify(event),
      key: event.key,
    });

    const eventsCollection = client.db("onItChef").collection<Events>("events");

    const sentAt = new Date();

    await eventsCollection.updateOne({ _id: event._id }, { $set: { sentAt } });

    logger.info(`Sent event ${event._id} at ${sentAt.toISOString()}.`);
  }
};
