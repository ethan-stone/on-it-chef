import {
  ChangeStreamDocument,
  ChangeStreamOptions,
  Collection,
  Db,
  ChangeStream as MongoChangeStream,
} from "mongodb";

export type ResumeToken = {
  dbName: string;
  resumeToken: any; // MongoDB resume token type
  updatedAt: Date;
};

export type ChangeStreamHeartbeat = {
  dbName: string;
  heartbeatTimestamp: Date;
};

export type ChangeStreamHandler = (args: {
  change: ChangeStreamDocument;
  db: Db;
}) => Promise<void>;

export class ChangeStream {
  private resumeTokenCollection: Collection<ResumeToken>;
  private heartbeatCollection: Collection<ChangeStreamHeartbeat>;
  private changeStream: MongoChangeStream | null = null;
  private handlers: ChangeStreamHandler[] = [];
  private isRunning = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private db: Db,
    private heartbeatCollectionName: string,
    private resumeTokenCollectionName: string,
    private options: ChangeStreamOptions & {
      collectionsToIgnore?: string[];
    }
  ) {
    this.resumeTokenCollection = db.collection(this.resumeTokenCollectionName);
    this.heartbeatCollection = db.collection(this.heartbeatCollectionName);
  }

  registerHandler(handler: ChangeStreamHandler) {
    this.handlers.push(handler);
  }

  /**
   * This is a simple background task to upsert a document into the heartbeat collection.
   * It simply updates the heartbeat timestamp every minute to trigger a change and thus
   * get a fresh resume token for the database.
   */
  private async startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.heartbeatCollection.replaceOne(
          {
            dbName: this.db.databaseName,
          },
          {
            dbName: this.db.databaseName,
            heartbeatTimestamp: new Date(),
          },
          { upsert: true }
        );

        console.info(`Updated heartbeat for ${this.db.databaseName}`);
      } catch (error) {
        console.error("Failed to update heartbeat", error as Error);
      }
    }, 60000);
  }

  /**
   * This is an internal handler for handling the heartbeat collection.
   * We only need a log to printed to acknowledge the change.
   * The resume token will be updated after the handler is called.
   */
  private registerHeartbeatHandler() {
    const handler: ChangeStreamHandler = async (options) => {
      if (
        (options.change.operationType === "insert" ||
          options.change.operationType === "replace") &&
        options.change.ns.coll === this.heartbeatCollectionName
      ) {
        // we don't need to do anything special. just a log is enough
        console.info(`Handling heartbeat change`);
      }
    };

    this.registerHandler(handler);
  }

  async start() {
    if (this.isRunning) {
      console.warn("Change stream is already running");
      return;
    }

    try {
      this.isRunning = true;

      // Get the latest resume token if it exists
      const resumeToken = await this.resumeTokenCollection.findOne({
        dbName: this.db.databaseName,
      });

      if (resumeToken) {
        this.options.resumeAfter = resumeToken.resumeToken;
        console.info(
          `Resuming from token: ${JSON.stringify(resumeToken.resumeToken)}`
        );
      }

      // Create the change stream
      this.changeStream = this.db.watch([], this.options);

      // Start the heartbeat and register the heartbeat handler
      await this.startHeartbeat();
      this.registerHeartbeatHandler();

      console.info(
        `Started change stream for database: ${this.db.databaseName}`
      );

      // Process changes
      for await (const change of this.changeStream) {
        try {
          // If the change is a resume token change we can skip it.
          // If we don't, the resume token will be updated, which will trigger a new change,
          // which will update the resume token, and so on in an infinite loop.
          if (
            (change.operationType === "insert" ||
              change.operationType === "update" ||
              change.operationType === "delete" ||
              change.operationType === "replace") &&
            (change.ns.coll === this.resumeTokenCollectionName ||
              this.options.collectionsToIgnore?.includes(change.ns.coll))
          ) {
            console.info(`Skipping change for collection: ${change.ns.coll}`);
            continue;
          }

          console.info(
            `Received change for ${this.db.databaseName}. Operation type: ${change.operationType}. `
          );

          // Process all handlers
          for (const handler of this.handlers) {
            try {
              await handler({
                change,
                db: this.db,
              });
            } catch (error) {
              console.error(
                `Handler failed for change: ${change.operationType}`,
                error as Error
              );
              // Continue processing other handlers even if one fails
            }
          }

          // Only update the resume token after all handlers have completed successfully.
          await this.resumeTokenCollection.replaceOne(
            {
              dbName: this.db.databaseName,
            },
            {
              dbName: this.db.databaseName,
              resumeToken: change._id,
              updatedAt: new Date(),
            },
            {
              upsert: true,
            }
          );

          console.info({
            message: `Processed change for ${this.db.databaseName}. Operation type: ${change.operationType}`,
          });
        } catch (error) {
          console.error("Failed to process change", error as Error);
          // Continue processing other changes even if one fails
        }
      }
    } catch (error) {
      console.error("Change stream error", error as Error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop() {
    this.isRunning = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.changeStream) {
      await this.changeStream.close();
      this.changeStream = null;
    }

    console.info("Change stream stopped");
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
