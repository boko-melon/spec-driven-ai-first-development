# Trigger Evals Reference

## Should-Trigger Query Rules

Vary along these axes:

| Axis | Explanation |
|---|---|
| Phrasing | Formal, casual, typos, abbreviations |
| Explicitness | Some name the domain directly, others describe the need without naming it |
| Detail | Mix terse prompts with context-heavy ones (file paths, column names, backstory) |
| Complexity | Single-step tasks alongside multi-step workflows where the skill's task is buried in a larger chain |

**Most valuable**: queries where the skill would help but the connection isn't obvious from the query alone. If the query asks for exactly what the skill does, any reasonable description would trigger — that's too easy.

---

## Should-Not-Trigger Query Rules

Write **near-misses** — queries that share keywords or concepts but need something different.

| Quality | Example (for a testing skill) |
|---|---|
| Weak negative (too easy) | "What's the weather today?" |
| Strong negative (near-miss) | "Can you review this test plan document and fix the formatting?" |

Near-misses share vocabulary with the skill's domain but require a fundamentally different capability.

---

## Full Example

A complete `trigger-evals.json` for a CSV analysis skill:

```json
[
  { "query": "I've got a spreadsheet in ~/data/q4_results.xlsx with revenue in col C and expenses in col D — can you add a profit margin column and highlight anything under 10%?", "should_trigger": true },
  { "query": "hey can you summarize whats in this csv? its our Q3 sales numbers by region", "should_trigger": true },
  { "query": "My boss wants a chart showing the trend in column B over time. File is at /tmp/metrics.csv", "should_trigger": true },
  { "query": "theres duplicate rows in our customer export, need to dedup by email and keep the most recent entry", "should_trigger": true },
  { "query": "Can you check if revenue is correlated with marketing spend? I have both in a TSV at data/combined.tsv", "should_trigger": true },
  { "query": "I need to clean up this messy data file before importing — lots of inconsistent date formats and trailing whitespace", "should_trigger": true },
  { "query": "pull out all rows where status is 'pending' and amount is over 1000, save to a new file", "should_trigger": true },
  { "query": "we have monthly sales data going back 3 years, want to see seasonality patterns. file is sales_history.xlsx", "should_trigger": true },
  { "query": "compare these two csvs and tell me what changed between last month and this month", "should_trigger": true },
  { "query": "whats the quickest way to convert this json file to yaml", "should_trigger": false },
  { "query": "I need to update the formulas in my Excel budget spreadsheet — the VLOOKUP in cell G12 is broken", "should_trigger": false },
  { "query": "can you write a python script that reads a csv and uploads each row to our postgres database", "should_trigger": false },
  { "query": "Help me set up a cron job that backs up our database to S3 every night", "should_trigger": false },
  { "query": "write a REST API endpoint that accepts CSV uploads and stores them in MongoDB", "should_trigger": false },
  { "query": "I need to parse this Apache access log and find the top 10 IPs by request count", "should_trigger": false },
  { "query": "can you build a React component that displays a data table with sorting and filtering", "should_trigger": false },
  { "query": "my pandas script is throwing a MemoryError on a 50GB file, how do I chunk it?", "should_trigger": false },
  { "query": "write unit tests for my CsvParser class", "should_trigger": false },
  { "query": "I want to set up a Grafana dashboard showing real-time metrics from our CSV pipeline", "should_trigger": false }
]
```

## Why These Work

**Should-trigger positives**:
- Mix of casual/formal tone ("hey can you", "Can you check if")
- Include file paths, column names, business context
- Some don't mention "CSV" at all ("messy data file", "spreadsheet")
- Range from simple (filter rows) to complex (seasonality analysis)

**Should-not-trigger negatives**:
- Share keywords: "CSV", "data", "spreadsheet", "pandas"
- But need fundamentally different capabilities: database ETL, API building, debugging, UI components
- Not obviously irrelevant — each shares some vocabulary with data analysis

---

## Smaller Example (for a "write-tests" skill)

```json
[
  { "query": "I just built a new price formatter util in src/lib/formatPrice.ts — can you make sure it handles edge cases?", "should_trigger": true },
  { "query": "need tests for the checkout flow, its got like 4 different discount code paths", "should_trigger": true },
  { "query": "whats the best way to verify this hook doesnt break when the API returns a 500", "should_trigger": true },
  { "query": "can you review this test plan document and fix the bullet point formatting?", "should_trigger": false },
  { "query": "I need to update the Jest config to add a new module path alias", "should_trigger": false },
  { "query": "write a python script that reads test results from junit xml and posts them to slack", "should_trigger": false }
]
```

---

## Realism Tips

Real user prompts contain context that generic queries lack. Include:

- File paths (`~/Downloads/report_final_v2.xlsx`, `src/components/Header.tsx`)
- Personal context ("my manager asked me to…", "we're shipping Friday")
- Specific details (column names, company names, data values)
- Casual language, abbreviations, occasional typos

---

## Checklist

- [ ] ≥ 16 queries (8+ positive, 8+ negative)
- [ ] Should-trigger queries include at least 2 where the connection isn't obvious
- [ ] Should-not-trigger queries are near-misses, not obviously irrelevant
- [ ] Queries vary in phrasing, explicitness, detail, and complexity
