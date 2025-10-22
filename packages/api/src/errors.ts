import { Context } from "hono";
import { HTTPException as HonoHTTPException } from "hono/http-exception";
import { z } from "@hono/zod-openapi";
import { generateErrorMessage } from "zod-error";
import { HonoEnv } from "./app";
import { ILogger } from "./logger";

export const ErrorType = z.enum([
  "NOT_FOUND",
  "BAD_REQUEST",
  "FORBIDDEN",
  "UNAUTHORIZED",
  "RATELIMIT_EXCEEDED",
  "CONFLICT",
  "INTERNAL_SERVER_ERROR",
]);

export const ErrorCode = z.enum([
  "SUBSCRIPTION_EXPIRED",
  "RECIPE_VERSIONS_LIMIT_REACHED",
  "NO_ACCESS",
]);

export function createErrorSchema(
  types: [z.infer<typeof ErrorType>, ...z.infer<typeof ErrorType>[]]
) {
  return z.object({
    type: z.enum(types).openapi({
      example: types[0],
      description:
        "A string that can be used programatically to determine the type of error. Usually corresponds to the HTTP status code.",
    }),
    code: ErrorCode.openapi({
      example: ErrorCode.enum.SUBSCRIPTION_EXPIRED,
      description:
        "A string that can be used programatically to determine the code of the error.",
    }),
    message: z.string().openapi({
      description: "A human-readable message for the error",
    }),
  });
}

export const errorResponseSchemas = {
  400: {
    description: "Bad Request",
    content: {
      "application/json": {
        schema: createErrorSchema(["BAD_REQUEST"]).openapi("ErrorBadRequest"),
      },
    },
  },
  401: {
    description: "Unauthorized",
    content: {
      "application/json": {
        schema: createErrorSchema(["UNAUTHORIZED"]).openapi(
          "ErrorUnauthorized"
        ),
      },
    },
  },
  403: {
    description: "Forbidden",
    content: {
      "application/json": {
        schema: createErrorSchema(["FORBIDDEN"]).openapi("ErrorForbidden"),
      },
    },
  },
  404: {
    description: "Not Found",
    content: {
      "application/json": {
        schema: createErrorSchema(["NOT_FOUND"]).openapi("ErrorNotFound"),
      },
    },
  },
  409: {
    description: "Conflict",
    content: {
      "application/json": {
        schema: createErrorSchema(["CONFLICT"]).openapi("ErrorConflict"),
      },
    },
  },
  429: {
    description: "Too many requests",
    content: {
      "application/json": {
        schema: createErrorSchema(["RATELIMIT_EXCEEDED"]).openapi(
          "ErrorTooManyRequests"
        ),
      },
    },
  },
  500: {
    description: "Internal Server Error",
    content: {
      "application/json": {
        schema: createErrorSchema(["INTERNAL_SERVER_ERROR"]).openapi(
          "ErrorInternalServerError"
        ),
      },
    },
  },
};

export const ErrorSchema = z.object({
  type: ErrorType.openapi({
    example: "INTERNAL_SERVER_ERROR",
    description:
      "A string that can be used programatically to determine the type of error",
  }),
  message: z.string().openapi({
    description: "A human-readable message for the error",
  }),
});

export type ErrorResponse = z.infer<typeof ErrorSchema>;

function typeToStatus(type: z.infer<typeof ErrorType>) {
  switch (type) {
    case "UNAUTHORIZED":
      return 401;
    case "RATELIMIT_EXCEEDED":
      return 429;
    case "NOT_FOUND":
      return 404;
    case "BAD_REQUEST":
      return 400;
    case "FORBIDDEN":
      return 403;
    case "CONFLICT":
      return 409;
    case "INTERNAL_SERVER_ERROR":
      return 500;
  }
}

export class HTTPException extends HonoHTTPException {
  public readonly type: z.infer<typeof ErrorType>;
  public readonly code: z.infer<typeof ErrorCode> | undefined;

  constructor(args: {
    type: z.infer<typeof ErrorType>;
    message: string;
    code?: z.infer<typeof ErrorCode>;
  }) {
    super(typeToStatus(args.type), { message: args.message });
    this.type = args.type;
    this.code = args.code;
  }
}

export function handleZodError(
  parseResult:
    | { success: true; data: any }
    | { success: false; error: z.ZodError },
  ctx: Context<HonoEnv>
) {
  if (!parseResult.success) {
    const logger = ctx.get("logger");

    const readableMessage = generateErrorMessage(parseResult.error.issues);

    logger.info(`Invalid request body. Reason: ${readableMessage}`);

    return ctx.json<ErrorResponse>(
      {
        type: "BAD_REQUEST",
        message: readableMessage,
      },
      400
    );
  }
}

export function handleError(err: Error, ctx: Context<HonoEnv>): Response {
  const logger = ctx.get("logger");

  if (err instanceof HTTPException) {
    return ctx.json<ErrorResponse>(
      {
        type: err.type,
        message: err.message,
      },
      err.status
    );
  }

  logger.error("An internal server error occurred", {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
  });

  return ctx.json<ErrorResponse>(
    {
      type: "INTERNAL_SERVER_ERROR",
      message: "An internal server error occurred",
    },
    500
  );
}

type HttpMap = Record<
  string,
  {
    type: z.infer<typeof ErrorType>;
    message: string;
    code?: z.infer<typeof ErrorCode>;
  }
>;

export function handleServiceResult<T, E extends string>(
  result: { ok: boolean; value?: T; error?: E },
  logger: ILogger,
  mappings: HttpMap
): T {
  if (result.ok) {
    logger.info("Service call successful");

    return result.value as T;
  }

  const map = mappings[result.error as string];

  if (!map) {
    logger.error("Service call failed with unknown error", {
      error: {
        message: "Service call failed with unknown error",
        stack: new Error().stack,
      },
    });

    throw new HTTPException({
      type: "INTERNAL_SERVER_ERROR",
      message: "Unexpected error in service call",
    });
  }

  logger.error("Service call failed with known error", {
    error: {
      message: "Service call failed with known error",
    },
  });

  throw new HTTPException({
    type: map.type,
    message: map.message,
    code: map.code,
  });
}
