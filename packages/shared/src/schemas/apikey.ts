import { z } from "zod";

export const ApiKeyScopeSchema = z.enum([
  "READ_CITATIONS",
  "WRITE_CITATIONS",
  "READ_PAYMENTS",
  "WRITE_PAYMENTS",
  "ADMIN",
]);
export type ApiKeyScope = z.infer<typeof ApiKeyScopeSchema>;

export const CreateApiKeySchema = z
  .object({
    name: z.string().min(1).max(80),
    creatorId: z.string().optional(),
    organizationId: z.string().optional(),
    scopes: z.array(ApiKeyScopeSchema).nonempty().default(["READ_CITATIONS"]),
    rateLimitPerMinute: z.number().int().min(1).max(10_000).default(600),
    rateLimitBurst: z.number().int().min(1).max(1_000).default(100),
    expiresAt: z.string().datetime().optional(),
  })
  .refine((d) => Boolean(d.creatorId) !== Boolean(d.organizationId), {
    message: "Provide exactly one of creatorId or organizationId.",
    path: ["creatorId"],
  });
export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;

export const ListApiKeysQuerySchema = z
  .object({
    creatorId: z.string().optional(),
    organizationId: z.string().optional(),
  })
  .refine((d) => Boolean(d.creatorId) !== Boolean(d.organizationId), {
    message: "Provide exactly one of creatorId or organizationId.",
  });
export type ListApiKeysQuery = z.infer<typeof ListApiKeysQuerySchema>;

export const RevokeApiKeySchema = z.object({
  reason: z.string().max(200).optional(),
});
export type RevokeApiKey = z.infer<typeof RevokeApiKeySchema>;

export const ApiKeySchema = z.object({
  id: z.string(),
  prefix: z.string(),
  last4: z.string(),
  name: z.string(),
  scopes: z.array(ApiKeyScopeSchema),
  isActive: z.boolean(),
  creatorId: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  createdAt: z.string(),
  expiresAt: z.string().nullable().optional(),
  lastUsedAt: z.string().nullable().optional(),
  callCount: z.number(),
  rateLimitPerMinute: z.number(),
});
export type ApiKey = z.infer<typeof ApiKeySchema>;
