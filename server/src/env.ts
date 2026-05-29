import "./load-env.js";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_CORS_ORIGIN: z.string().default("http://localhost:8080"),
  JWT_SECRET: z.string().min(12),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_PEPPER: z.string().min(32),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  CLAUDE_MODEL: z.string().default("claude-3-5-sonnet-latest"),
});

export const env = envSchema.parse(process.env);

export const corsOrigins = env.API_CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
