import type { CitationMatch } from "../types/agent.js";

export interface AnswerTemplate {
  id: string;
  matches(matches: CitationMatch[]): boolean;
  render(ctx: { question: string; matches: CitationMatch[] }): string;
}

const inlineLink = (m: CitationMatch | undefined): string =>
  m ? `[${m.source.title}](${m.source.url})` : "[source]";
const contrib = (m: CitationMatch | undefined): string => (m ? `${m.contributionPct}%` : "—");
const author = (m: CitationMatch | undefined): string => (m ? m.source.creatorName : "the source");

const templates: AnswerTemplate[] = [
  {
    id: "bitcoin-restaking",
    matches: (m) => m.some((c) => c.source.url.includes("satlayer") || c.source.url.includes("babylon")),
    render: ({ matches }) => [
      `## Summary`,
      ``,
      `Bitcoin restaking lets BTC's L1 finality secure additional services (AVSs) without bridging the asset off-chain. The two canonical references are ${inlineLink(matches[0])} (${author(matches[0])}, ${contrib(matches[0])}) and ${inlineLink(matches[1])} (${author(matches[1])}, ${contrib(matches[1])}).`,
      ``,
      matches.length > 2 ? `For the meta-layer perspective, ${inlineLink(matches[2])} (${contrib(matches[2])}) ties it all together.` : "",
      ``,
      `> Sources used in this answer are registered with the NanoProof Protocol. Each citation triggers an automatic USDC micropayment to the author — see the Attribution + Settlement panels.`,
    ].filter(Boolean).join("\n"),
  },
  {
    id: "arc-payments",
    matches: (m) => m.some((c) => c.source.url.includes("arc.io")),
    render: ({ matches }) => [
      `## Summary`,
      ``,
      `For USDC-denominated agent payments, ${inlineLink(matches[0])} (${author(matches[0])}, ${contrib(matches[0])}) describes Arc as a purpose-built L1 with native stablecoin gas. Pairing this with a citation-based settlement layer like NanoProof closes the loop: an agent that cites a registered source on Arc settles the corresponding USDC in sub-cent fees.`,
      ``,
      `> This answer is itself a settlement event — the panel below shows the atomic USDC amounts flowing to each cited creator.`,
    ].join("\n"),
  },
  {
    id: "creator-economy",
    matches: (m) => m.some((c) => c.source.url.includes("creatorconomy")),
    render: ({ matches }) => [
      `## Summary`,
      ``,
      `The ad-driven creator economy fails because it rewards attention, not contribution. ${inlineLink(matches[0])} (${author(matches[0])}, ${contrib(matches[0])}) argues that per-piece citation pricing on stablecoin rails flips the model: a creator is paid every time their work is referenced, regardless of whether the reader ever sees a page view.`,
      ``,
      `NanoProof operationalizes this thesis — see the Attribution + Settlement panels.`,
    ].join("\n"),
  },
  {
    id: "generic",
    matches: () => true,
    render: ({ matches }) => [
      `## Summary`,
      ``,
      matches.map((m, i) => `${i + 1}. ${inlineLink(m)} by **${author(m)}** (contribution: ${contrib(m)}).`).join("\n"),
      ``,
      `Each of the above citations is registered with NanoProof. The panel below shows the per-creator attribution and the testnet USDC settlement that runs after this answer is generated.`,
    ].join("\n"),
  },
];

export function pickTemplate(matches: CitationMatch[]): AnswerTemplate {
  for (const t of templates) if (t.matches(matches)) return t;
  const fallback = templates[templates.length - 1];
  if (!fallback) throw new Error("No templates registered");
  return fallback;
}
