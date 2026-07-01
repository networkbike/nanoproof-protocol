import type { CitationMatch } from "../types/agent.js";
import { pickTemplate } from "../prompts/templates.js";

/**
 * Compose a templated AI-style answer that cites the matched sources
 * inline. The cited sources are appended as Markdown-style links so the
 * downstream /v1/citations/detect call can extract them.
 *
 * For the Lepton demo the LLM call is replaced with a deterministic
 * template pick. The "agent-ness" of the demo is the citation+payment
 * pipeline, not the prose.
 */
export function synthesizeAnswer(question: string, matches: CitationMatch[]): string {
  if (matches.length === 0) {
    return [
      `I searched the NanoProof registry but couldn't find a relevant source for: "${question}".`,
      `Try a question about Bitcoin restaking, SatLayer, Babylon, Arc, or the creator economy.`,
    ].join("\n");
  }

  const template = pickTemplate(matches);
  const body = template.render({ question, matches });
  return body;
}
