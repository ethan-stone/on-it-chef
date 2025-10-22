export async function withQueryLogging<T>(
  operationName: string,
  collection: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(`[DB] ${collection}.${operationName} (${duration} ms)`);
    return result;
  } catch (err) {
    const duration = (performance.now() - start).toFixed(2);
    console.error(
      `[DB ERROR] ${collection}.${operationName} failed after ${duration} ms`,
      err
    );
    throw err;
  }
}
