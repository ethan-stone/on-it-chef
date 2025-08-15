export const logger = {
  info: (message: string) => {
    const timestamp = new Date().toISOString();
    console.info(`[${timestamp}] ${message}`);
  },
  error: (message: string, error: unknown) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ${message}`);
  },
  warn: (message: string) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ${message}`);
  },
  debug: (message: string) => {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] ${message}`);
  },
};
