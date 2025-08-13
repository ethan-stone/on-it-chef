import { CloudWatchLogsEvent } from "aws-lambda";
import { gunzipSync } from "zlib";
import { z } from "zod";

// Define the schema for a log event that contains a metric
const LogMetricEventSchema = z.object({
  level: z.literal("info"),
  type: z.literal("metric"),
  timestamp: z.number(),
  metric: z.discriminatedUnion("name", [
    z.object({
      name: z.literal("recipe.version.created"),
      userId: z.string(),
      recipeId: z.string(),
      recipeVersionId: z.string(),
      timestamp: z.number(), // This timestamp is from the original log event
    }),
  ]),
});

type LogMetricEvent = z.infer<typeof LogMetricEventSchema>;

/**
 * Parses and processes CloudWatch Log events to extract custom metrics.
 * @param {object} event - The Lambda event object.
 * @param {string} event.awslogs.data - Base64 and gzipped log data.
 */
export const main = async (event: CloudWatchLogsEvent) => {
  let payload;
  try {
    const compressedPayload = Buffer.from(event.awslogs.data, "base64");
    payload = JSON.parse(gunzipSync(compressedPayload).toString("utf8"));
  } catch (error) {
    console.error("Failed to decompress or parse log data:", error);
    // Depending on your error handling, you might want to throw or return here.
    // For now, we'll log and return, as not to reprocess this bad payload.
    return;
  }

  const metricsToProcess: LogMetricEvent[] = [];

  for (const logEvent of payload.logEvents) {
    // CloudWatch log messages are strings, but our logger stores JSON in the second argument.
    // We need to parse the message. For structured logging, typically the message itself
    // might be part of the JSON, or the JSON is just supplementary data.
    // Based on your Logger implementation:
    // logFn(message, JSON.stringify(f));
    // This means the logEvent.message will be "YOUR_MESSAGE_HERE { ...JSON_FIELDS... }"
    // Or if `message` is truly just the first argument to console.log, then `logEvent.message`
    // will be "YOUR_MESSAGE_HERE" and the `logEvent.extractedFields` or `logEvent.message` if it's
    // JSON directly, needs to be parsed.

    // Given your logger `logFn(message, JSON.stringify(f));`
    // CloudWatch logs the message as the first argument, and then stringifies the second
    // argument. We are relying on the fact that your `Logger` outputs
    // `JSON.stringify(f)` as the *second* argument to `console.log`.
    // CloudWatch often concatenates these into a single string.
    // If the log line is: `Your message {"level":"info", "type":"metric", ...}`
    // We need to extract the JSON part.

    // A more robust way, assuming your logger always outputs JSON for the second argument
    // and it ends up being parsable from the log message itself, is to try and parse
    // the entire logEvent.message or look for the JSON part.
    // However, if the `message` from `logEvent` is just the initial string, and the
    // structured data is somehow separate or part of the "extractedFields", we need to adapt.

    // Let's assume the logEvent.message contains the stringified JSON that your logger generates.
    // This is a common pattern for structured logs in CloudWatch.
    // Example: "Metric recorded: {"level":"info","type":"metric","timestamp":1678886400000,"metric":{"name":"recipe.version.created","userId":"user123","recipeId":"recipeABC","recipeVersionId":"verXYZ"}}"
    // We need to parse the JSON portion of the log message.

    // A simple regex or string parsing to find the JSON object.
    // This assumes the JSON object is at the end of the log message.
    const logDataString = logEvent.message;
    const jsonStartIndex = logDataString.indexOf("{");
    if (jsonStartIndex === -1) {
      // No JSON found in this log message, skip it.
      continue;
    }

    const potentialJson = logDataString.substring(jsonStartIndex);
    const parsedLogData = JSON.parse(potentialJson);

    const validatedMetricEvent = LogMetricEventSchema.safeParse(parsedLogData); // Zod will validate structure

    if (validatedMetricEvent.success) {
      metricsToProcess.push(validatedMetricEvent.data);
    } else {
      console.warn(
        `Skipping log event due to parsing or validation error: ${validatedMetricEvent.error}`
      );
    }
  }

  for (const metricEvent of metricsToProcess) {
    console.log(metricEvent.metric);
  }
};
