export type SafeJsonParseResult =
  | {
      success: true;
      data: any;
    }
  | {
      success: false;
      error: unknown;
    };

export function safeJsonParse(json: string): SafeJsonParseResult {
  try {
    return {
      success: true,
      data: JSON.parse(json),
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}
