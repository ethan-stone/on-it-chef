export const logger = {
  info: (message: string) => {
    const timestamp = new Date().toISOString();
    console.info(`[${timestamp}] INFO ${message}`);
  },
  error: (message: string, error: unknown) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR ${message}`);
  },
  warn: (message: string) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN ${message}`);
  },
  debug: (message: string) => {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] DEBUG ${message}`);
  },
};
