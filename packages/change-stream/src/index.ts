import { ChangeStream } from "./change-stream.js";
import { eventsHandler } from "./events-handler.js";
import { logger } from "./logger.js";
import { client } from "./mongo-client.js";

async function main() {
  try {
    await client.connect();

    logger.info("Connected to MongoDB successfully");

    const db = client.db("onItChef");

    // Create the change stream instance
    const changeStream = new ChangeStream(
      db,
      "changeStreamHeartbeats",
      "resumeTokens",
      {
        collectionsToIgnore: ["resumeTokens"],
      }
    );

    changeStream.registerHandler(eventsHandler);

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      await changeStream.stop();
      await client.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await changeStream.stop();
      await client.close();
      process.exit(0);
    });

    // Start the change stream
    logger.info("Starting change stream...");

    await changeStream.start();
  } catch (error) {
    console.error(error);
    logger.error("Failed to start change stream", error as Error);
    await client.close();
    process.exit(1);
  }
}

// Run the example
main().catch((error) => {
  logger.error("Unhandled error in main", error as Error);
  process.exit(1);
});
