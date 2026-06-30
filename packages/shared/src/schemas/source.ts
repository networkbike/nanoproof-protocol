import { z } from "zod";

export const SourceStatusSchema = z.enum([
  "DRAFT",
  "PENDING_VERIFICATION",
  "ACTIVE",
  "PAUSED",
  "REJECTED",
  "ARCHIVED",
]);
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

/** Atomic USDC = string of digits. 6 decimals. e.g. "1000" = $0.001. */
export const AtomicUsdcSchema = z
  .string()
  .regex(/^[0-9]+$/, "Must be a non-negative integer string (atomic USDC).");

export const CreateSourceSchema = z.object({
  creatorId: z.string(),
  url: z.string().url().refine((u) => u.startsWith("https://"), {
    message: "Source URL must be HTTPS.",
  }),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  license: z.string().default("all-rights-reserved"),
  citationPrice: AtomicUsdcSchema.default("1000"),
  minPayout: AtomicUsdcSchema.default("100"),
  periodCap: AtomicUsdcSchema.optional(),
});
export type CreateSource = z.infer<typeof CreateSourceSchema>;

export const SourceSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  url: z.string(),
  domain: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  license: z.string(),
  citationPrice: z.string(),
  minPayout: z.string(),
  periodCap: z.string().nullable().optional(),
  status: SourceStatusSchema,
  verifiedAt: z.string().nullable().optional(),
  citationCount: z.number().int(),
  earnedAtomic: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Source = z.infer<typeof SourceSchema>;