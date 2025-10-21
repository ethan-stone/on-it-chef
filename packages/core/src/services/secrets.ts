export interface SecretMap {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  MONGO_URL: string;
  GEMINI_API_KEY: string;
  REVENUE_CAT_WEBHOOK_AUTH_HEADER: string;
  REVENUE_CAT_REST_API_KEY: string;
  REVENUE_CAT_PROJECT_ID: string;
}

export interface SecretService {
  get<K extends keyof SecretMap>(key: K): Promise<SecretMap[K]>;
}

export class EnvSecretService implements SecretService {
  async get<K extends keyof SecretMap>(key: K): Promise<SecretMap[K]> {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required secret: ${key}`);
    }
    return value;
  }
}
