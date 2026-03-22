# Examples

This directory contains runnable examples for `@dcyfr/ai-rag`.

## Files

- `basic-rag/index.ts` — Basic ingestion + retrieval flow.
- `semantic-search/index.ts` — Semantic vector search patterns.
- `qa-system/index.ts` — Context-aware Q&A assembly.
- `metadata-filtering/index.ts` — Metadata filter usage.
- `hybrid-search/index.ts` — Hybrid retrieval strategies.
- `advanced-rag/index.ts` — End-to-end production-style workflow.

## Prerequisites

- Install dependencies: `npm install`

## Run examples

From package root:

- `npm run example:basic-rag`
- `npm run example:semantic-search`
- `npm run example:qa-system`
- `npm run example:metadata-filtering`
- `npm run example:hybrid-search`
- `npm run example:advanced-rag`

## Type-check examples

- `npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --strict --esModuleInterop true --skipLibCheck true examples/metadata-filtering/index.ts examples/hybrid-search/index.ts examples/advanced-rag/index.ts`
