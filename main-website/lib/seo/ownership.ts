// ─────────────────────────────────────────────────────────────────────────────
// Reviewed intent overlaps — the machine-readable half of
// docs/SEO_PHASE_3_FINAL_REPORT.md §3.
//
// `findOverlaps` + `overlapClusters` (lib/seo/intent.ts) detect pages that
// compete for the same search intent. Every cluster detected on the live site
// must appear here with a decision, and every cluster here must still be
// detected: linkgraph.live.test.ts fails on a NEW overlap (someone published a
// competing page) and on a STALE one (a merge or rewrite happened — update
// this list with it).
//
// Recording a cluster is not endorsing it. The decision column is the
// recommendation from Phase 3; nothing here has been merged or redirected.
// ─────────────────────────────────────────────────────────────────────────────

export type OwnershipDecision =
  | 'KEEP BOTH'
  | 'REWRITE INTENT'
  | 'MERGE'
  | 'REDIRECT'
  | 'NOINDEX'
  | 'CHANGE INTERNAL TARGETING'
  | 'MANUAL REVIEW';

export interface ReviewedOverlap {
  /** The page that should own the intent. */
  primary: string;
  /** Every page in the cluster, primary included. */
  members: string[];
  decision: OwnershipDecision;
  note: string;
}

export const REVIEWED_OVERLAPS: readonly ReviewedOverlap[] = [
  /* ── Comparisons published twice ─────────────────────────────────────── */
  {
    primary: '/compare/power-bi-vs-excel',
    members: ['/compare/power-bi-vs-excel', '/blog/excel-vs-power-bi-which-should-you-learn-first', '/blog/power-bi-vs-excel-when-to-use-each-tool'],
    decision: 'CHANGE INTERNAL TARGETING',
    note: 'The /compare page owns the comparison. Both posts reach it only through the footer: give each a contextual link to it, and merge the "when to use each" post after a GSC check.',
  },
  {
    primary: '/compare/data-science-vs-data-analytics',
    members: ['/compare/data-science-vs-data-analytics', '/compare/data-analyst-vs-data-scientist', '/blog/data-science-vs-data-analytics-which-career-is-right-for-you'],
    decision: 'REWRITE INTENT',
    note: 'Two /compare pages ask one question. Keep the field comparison as the owner and refocus the analyst-vs-scientist page on the job roles (duties, hiring, pay). The blog post supports the owner.',
  },
  {
    primary: '/compare/data-engineering-vs-data-science',
    members: ['/compare/data-engineering-vs-data-science', '/blog/data-engineering-vs-data-science-roles-compared'],
    decision: 'CHANGE INTERNAL TARGETING',
    note: 'The /compare page owns it; the post reaches it only through the footer. Add a contextual link; merge only if GSC shows the post earns no queries of its own.',
  },
  {
    primary: '/compare/power-bi-vs-tableau',
    members: ['/compare/power-bi-vs-tableau', '/blog/power-bi-vs-tableau-a-detailed-2026-comparison'],
    decision: 'CHANGE INTERNAL TARGETING',
    note: 'As above: contextual link from the post to the /compare page. The three-way Power BI vs Tableau vs Looker post is a different query and is not in this cluster.',
  },
  {
    primary: '/blog/bigquery-vs-snowflake-vs-redshift-a-comparison',
    members: [
      '/blog/bigquery-vs-snowflake-vs-redshift-a-comparison',
      '/blog/cloud-data-warehouses-compared-snowflake-vs-bigquery-vs-redshift',
      '/blog/redshift-vs-snowflake-vs-bigquery-a-comparison',
    ],
    decision: 'MERGE',
    note: 'Three posts compare the same three warehouses in a different order. Keep one, 308 the others once GSC confirms which earns the impressions.',
  },
  {
    primary: '/blog/orchestration-airflow-vs-dagster-vs-prefect',
    members: ['/blog/orchestration-airflow-vs-dagster-vs-prefect', '/blog/pipeline-orchestration-airflow-vs-prefect-vs-dagster'],
    decision: 'MANUAL REVIEW',
    note: 'Same three tools, Data Engineering vs MLOps category. Merge, or rewrite the MLOps copy around ML-pipeline orchestration.',
  },

  /* ── The same informational question twice ───────────────────────────── */
  {
    primary: '/blog/power-bi-interview-questions-top-40-with-answers',
    members: ['/blog/power-bi-interview-questions-top-40-with-answers', '/blog/power-bi-interview-questions-with-detailed-answers'],
    decision: 'MERGE',
    note: 'Topic-category copy wins over the generic interview-questions bucket, as for the five pairs merged earlier. Confirm with GSC, then 308.',
  },
  {
    primary: '/blog/azure-data-factory-interview-questions-and-answers',
    members: ['/blog/azure-data-factory-interview-questions-and-answers', '/blog/azure-data-factory-adf-interview-questions'],
    decision: 'MERGE',
    note: 'Same rule as the Power BI pair: the Azure Data Factory category copy owns it; the interview-questions bucket copy is the merge candidate.',
  },
  {
    primary: '/blog/python-interview-questions-top-50-with-answers',
    members: ['/blog/python-interview-questions-top-50-with-answers', '/blog/python-interview-questions-for-data-roles'],
    decision: 'REWRITE INTENT',
    note: 'Keep the general Python set as owner. The "for data roles" post becomes standard-library coding tasks from data interviews (Phase 4 pilot rewrite, awaiting review); pandas and NumPy questions already have their own posts.',
  },
  {
    primary: '/blog/data-analyst-roadmap-2026-skills-tools-and-timeline',
    members: ['/blog/data-analyst-roadmap-2026-skills-tools-and-timeline', '/blog/how-to-become-a-data-analyst-with-no-experience'],
    decision: 'KEEP BOTH',
    note: 'Roadmap vs career-switch-with-no-experience: related but different questions. Cross-link them.',
  },
  {
    primary: '/blog/data-engineering-roadmap-2026-a-complete-guide',
    members: ['/blog/data-engineering-roadmap-2026-a-complete-guide', '/blog/how-to-become-a-data-engineer-in-2026'],
    decision: 'KEEP BOTH',
    note: 'Roadmap vs how-to-become: keep both angles distinct and cross-linked.',
  },
  {
    primary: '/blog/adf-pipelines-explained-building-your-first-pipeline',
    members: ['/blog/adf-pipelines-explained-building-your-first-pipeline', '/blog/building-an-etl-pipeline-with-adf-step-by-step'],
    decision: 'MANUAL REVIEW',
    note: 'Both walk through building an ADF pipeline. Merge, or keep the second strictly about ETL design.',
  },
  {
    primary: '/blog/langgraph-tutorial-building-stateful-ai-agents',
    members: ['/blog/langgraph-tutorial-building-stateful-ai-agents', '/blog/building-ai-agents-with-langgraph-a-hands-on-tutorial'],
    decision: 'MANUAL REVIEW',
    note: 'Two LangGraph agent tutorials in the same category. Merge is likely; needs an editor to confirm neither covers something the other does not.',
  },

  /* ── Commercial / local ───────────────────────────────────────────────── */
  {
    primary: '/training-in-hyderabad',
    members: ['/training-in-hyderabad', '/'],
    decision: 'REWRITE INTENT',
    note: 'The homepage title names Ameerpet, the locality /training-in-hyderabad owns (SEO_KEYWORD_MAP §4). Rewrite the homepage title to the city-level intent — a copy change awaiting approval.',
  },
];
