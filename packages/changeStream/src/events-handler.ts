import { Events } from "@on-it-chef/core/services/events";
import { ChangeStreamHandler } from "./change-stream";

export const eventsHandler: ChangeStreamHandler = async (options) => {
  if (options.change.operationType === "insert") {
    const event = options.change.fullDocument as Events;
  }
};
