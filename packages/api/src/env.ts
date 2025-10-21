import { z } from "zod";

export const envSchema = z.object({
  ENVIRONMENT: z.enum(["development", "production"]),
});

export type Env = z.infer<typeof envSchema>;
