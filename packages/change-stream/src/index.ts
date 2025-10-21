import { ChangeStream } from "./change-stream.js";
import { eventsHandler } from "./events-handler.js";
import { logger } from "./logger.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getMongoClient } from "./mongo-client.js";

async function main() {
  const mongoClient = await getMongoClient();

  try {
    logger.info("Connected to MongoDB successfully");

    const db = mongoClient.db("onItChef");

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
      await mongoClient.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await changeStream.stop();
      await mongoClient.close();
      process.exit(0);
    });

    // Start the change stream
    logger.info("Starting change stream...");

    await changeStream.start();
  } catch (error) {
    console.error(error);
    logger.error("Failed to start change stream", error as Error);
    await mongoClient.close();
    process.exit(1);
  }
}

const app = new Hono();

app.get("/healthcheck", (c) => {
  return c.json({ message: "OK" }, 200);
});

serve({
  fetch: app.fetch,
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
});

// Run the example
main().catch((error) => {
  logger.error("Unhandled error in main", error as Error);
  process.exit(1);
});
