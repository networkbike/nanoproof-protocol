import { z } from "zod";

export const CitationKindSchema = z.enum(["DIRECT", "INDIRECT", "SUPPORTING", "REFERENCE", "CONTEXT"]);
export type CitationKind = z.infer<typeof CitationKindSchema>;

export const SimulateCitationSchema = z.object({
  sourceId: z.string(),
  responseId: z.string().min(1).max(200),
  snippet: z.string().min(1).max(2000),
  kind: CitationKindSchema.default("DIRECT"),
});
export type SimulateCitation = z.infer<typeof SimulateCitationSchema>;

export const CitationSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  responseId: z.string().nullable().optional(),
  snippet: z.string(),
  kind: CitationKindSchema,
  matchScore: z.string(),
  confidence: z.string(),
  contributionFraction: z.string(),
  payoutAmountUsdc: z.string(),
  status: z.string(),
  recordedAt: z.string(),
});
export type Citation = z.infer<typeof CitationSchema>;