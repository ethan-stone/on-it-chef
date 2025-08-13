import { ChangeStream } from "./change-stream";
import { MongoClient } from "@on-it-chef/core/services/db";
import { recipeVersionsHandler } from "./recipe-versions-handler";
import { Resource } from "sst";

async function main() {
  const client = new MongoClient("");

  try {
    await client.connect();
    console.info("Connected to MongoDB successfully");

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

    changeStream.registerHandler(recipeVersionsHandler);

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.info("Received SIGINT, shutting down gracefully...");
      await changeStream.stop();
      await client.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.info("Received SIGTERM, shutting down gracefully...");
      await changeStream.stop();
      await client.close();
      process.exit(0);
    });

    // Start the change stream
    console.info("Starting change stream...");
    await changeStream.start();
  } catch (error) {
    console.error("Failed to start change stream", error as Error);
    await client.close();
    process.exit(1);
  }
}

// Run the example
main().catch((error) => {
  console.error("Unhandled error in main", error as Error);
  process.exit(1);
});
