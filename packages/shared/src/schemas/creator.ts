import { z } from "zod";
import { UsernameSchema } from "./username.js";

/**
 * Creator schemas — used by both the API controllers and the SDK.
 * All validation lives here so the wire format has a single source of truth.
 */

const AvatarUrlSchema = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), { message: "Avatar URL must be HTTPS." });

export const CreateCreatorSchema = z.object({
  name: z.string().min(1).max(80),
  username: UsernameSchema,
  email: z.string().email().max(254),
  bio: z.string().max(500).optional(),
  avatarUrl: AvatarUrlSchema.optional(),
  twitterHandle: z.string().max(50).optional(),
  githubHandle: z.string().max(50).optional(),
  websiteUrl: z.string().url().refine((u) => u.startsWith("https://")).optional(),
});
export type CreateCreator = z.infer<typeof CreateCreatorSchema>;

export const UpdateCreatorSchema = CreateCreatorSchema.partial();
export type UpdateCreator = z.infer<typeof UpdateCreatorSchema>;

export const CreatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  reputationScore: z.number().int(),
  twitterHandle: z.string().nullable().optional(),
  githubHandle: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Creator = z.infer<typeof CreatorSchema>;