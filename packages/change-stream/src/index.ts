import { ChangeStream } from "./change-stream.js";
import { MongoClient } from "@on-it-chef/core/services/db";
import { eventsHandler } from "./events-handler.js";
import { Resource } from "sst";
import { logger } from "./logger.js";
import { generateHeapSnapshot } from "bun";

async function main() {
  const client = new MongoClient(Resource.MongoUrl.value);

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

    let occurences = 0;

    setInterval(async () => {
      occurences++;
      // 10 minutes
      const snapshot = generateHeapSnapshot();
      await Bun.write(
        `heap-snapshot-${occurences}.json`,
        JSON.stringify(snapshot, null, 2)
      );
    }, 1000 * 60);

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
