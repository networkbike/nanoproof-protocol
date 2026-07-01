// Re-exports + local type aliases — kept as a barrel so the agent package
// has a single import surface for the research sub-package.
export type { ResolvedSource, CitationMatch } from "../types/agent.js";
export { tokenize } from "../core/tokenize.js";
export type { DemoSource, DemoCreator } from "../data/demo-sources.js";
