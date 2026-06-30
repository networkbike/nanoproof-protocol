import { z } from "zod";

/**
 * Reserved usernames — cannot be registered by Creators.
 * Loaded from the runtime via env or kept inline for MVP.
 */
export const RESERVED_USERNAMES = new Set([
  "admin", "api", "dashboard", "signup", "signin", "nanoproof",
  "support", "about", "docs", "pricing", "status", "settings",
  "creator", "creators", "wallet", "wallets", "source", "sources",
  "citation", "citations", "payment", "payments", "treasury",
  "app", "auth", "login", "logout", "static", "public",
]);

export const UsernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/, {
    message: "Username must be 3-30 chars, lowercase, start/end alphanumeric.",
  })
  .refine((u) => !RESERVED_USERNAMES.has(u), {
    message: "Username is reserved.",
  });