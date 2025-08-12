import { Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import z from "zod";

const RateLimitWindow = z.object({
  id: z.string(),
  entityId: z.string(),
  windowStart: z.date(),
  windowEnd: z.date(),
  count: z.number(),
});

export type RateLimitWindow = z.infer<typeof RateLimitWindow>;

const MongoRateLimitWindow = RateLimitWindow.omit({
  id: true,
}).extend({
  _id: z.string(),
});

export type MongoRateLimitWindow = z.infer<typeof MongoRateLimitWindow>;

export type RateLimitCheckArgs = {
  entityId: string;
  maxRequests: number;
};

export type RateLimitCheckResult = {
  passed: boolean;
  remaining: number;
  count: number;
  reset: Date;
};

const WINDOW_DURATION_IN_MS = 1000 * 60;

export class RateLimiter {
  private dbName = "onItChef";
  private rateLimitWindowCollection: Collection<MongoRateLimitWindow>;

  constructor(private readonly client: MongoClient) {
    this.rateLimitWindowCollection = this.client
      .db(this.dbName)
      .collection("rateLimitWindows");
  }

  private uid() {
    return ulid();
  }

  async check(args: RateLimitCheckArgs): Promise<RateLimitCheckResult> {
    const { entityId, maxRequests } = args;

    const ms = Date.now();
    const windowStartMs =
      Math.floor(ms / WINDOW_DURATION_IN_MS) * WINDOW_DURATION_IN_MS;
    const windowStart = new Date(windowStartMs);
    const windowEnd = new Date(windowStartMs + WINDOW_DURATION_IN_MS);

    const window = await this.rateLimitWindowCollection.findOneAndUpdate(
      {
        entityId,
        windowStart,
        windowEnd,
      },
      {
        $inc: {
          count: 1,
        },
        $set: {
          windowStart,
          windowEnd,
        },
        $setOnInsert: {
          id: this.uid(),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    if (!window) {
      console.error("Rate limit window not found.");
      return {
        passed: false,
        remaining: 0,
        count: 0,
        reset: windowEnd,
      };
    }

    return {
      passed: window.count < maxRequests,
      remaining: Math.max(0, maxRequests - window.count),
      count: window.count,
      reset: windowEnd,
    };
  }
}
