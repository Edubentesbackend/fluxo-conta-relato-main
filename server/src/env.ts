import "./load-env.js";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(8080),
  API_CORS_ORIGIN: z.string().default(""),
  JWT_SECRET: z.string().min(12),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_PEPPER: z.string().min(32),
});

export const env = envSchema.parse(process.env);

export const corsOrigins = env.API_CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
