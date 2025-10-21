export interface SecretMap {
  clerkSecretKey: string;
  clerkPublishableKey: string;
  clerkWebhookSecret: string;
  mongoUrl: string;
  geminiApiKey: string;
  revenueCatWebhookAuthHeader: string;
  revenueCatRestApiKey: string;
  revenueCatProjectId: string;
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
