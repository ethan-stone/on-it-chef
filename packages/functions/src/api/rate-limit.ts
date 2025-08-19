import {
  RateLimitCheckArgs,
  RateLimitCheckResult,
  RateLimiter,
} from "@on-it-chef/core/services/rate-limiter";
import { HonoEnv } from "./app";
import { Context } from "hono";
import { HTTPException } from "./errors";

/**
 * Checks the rate limit for a given entity.
 *
 * @param c - The Hono context.
 * @param rateLimiter - The rate limiter to use.
 * @param args - The arguments to pass to the rate limiter.
 * @returns The rate limit check result. Throws an HTTPException if the rate limit is exceeded.
 */
export async function checkRateLimit(
  c: Context<HonoEnv>,
  rateLimiter: RateLimiter,
  args: RateLimitCheckArgs
): Promise<RateLimitCheckResult> {
  const logger = c.get("logger");

  const rateLimitCheckResult = await rateLimiter.check(args);

  if (!rateLimitCheckResult.passed) {
    logger.info("Rate limit exceeded", {
      entityId: args.entityId,
      maxRequests: args.maxRequests,
      remaining: rateLimitCheckResult.remaining,
      reset: rateLimitCheckResult.reset,
    });
  } else {
    logger.info("Rate limit check passed", {
      entityId: args.entityId,
      maxRequests: args.maxRequests,
      remaining: rateLimitCheckResult.remaining,
      reset: rateLimitCheckResult.reset,
    });
  }

  c.res.headers.append(
    "on-it-chef-rate-limit-remaining",
    rateLimitCheckResult.remaining.toString()
  );
  c.res.headers.append(
    "on-it-chef-rate-limit-reset",
    rateLimitCheckResult.reset.toISOString()
  );

  if (!rateLimitCheckResult.passed) {
    throw new HTTPException({
      type: "RATELIMIT_EXCEEDED",
      message: "Rate limit exceeded. Please try again later.",
    });
  }

  return rateLimitCheckResult;
}
