import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}\nCheck your .env file.`
    );
  }
  return value.trim();
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),

  DATABASE_URL: requireEnv("DATABASE_URL"),

  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  // Email — Resend is the primary provider
  RESEND_API_KEY: process.env.RESEND_API_KEY?.trim() || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "CHATZO <onboarding@resend.dev>",

  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // Meta & WhatsApp Cloud API Configurations
  META_APP_ID: process.env.META_APP_ID || "",
  META_APP_SECRET: process.env.META_APP_SECRET || "",
  META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN || "",
  META_REDIRECT_URI: process.env.META_REDIRECT_URI || "",
  META_GRAPH_VERSION: process.env.META_GRAPH_VERSION || "v20.0",
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || "",
  WHATSAPP_TOKEN_ENCRYPTION_KEY: process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY || "default_token_encryption_key_32_c",
};
