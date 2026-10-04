# Plan: <title>

- Status: draft
- Slug: <slug>
- Spec: [spec.md](./spec.md) (must be Status: approved)
- Date: <yyyy-mm-dd>

## Approach
<!-- The technical strategy in a paragraph or two. Written after exploring
     the actual codebase — not from assumption — and within the charter's
     Tech stack & architecture. -->

## Architecture
<!-- How the work splits across layers. Any layer this feature doesn't
     touch: "N/A — <reason>". -->

### API contract
<!-- The boundary frontend and backend both build against: endpoints or
     messages, request/response shapes, error codes, auth. Changing it
     during implementation means updating this plan first. -->

### Data model
<!-- Entities and fields, schema changes / migrations, data retention. -->

### Backend
<!-- Services/modules, where the business logic lives, integrations,
     background jobs. -->

### Frontend
<!-- Pages/components mapped to the spec's Screens / views, state
     management, how the design system is used, how each spec State
     (empty/loading/error/success) is rendered. -->

## Files / components touched
-

## Steps
<!-- Ordered contract-first, each small enough to review independently.
     Tag each with its layer: [DATA] [API] [BE] [FE] [TEST]. -->
1. [DATA]
2. [API]
3. [BE]
4. [FE]

## Test strategy
<!-- Every acceptance criterion in spec.md gets a row. Layer: unit-BE,
     unit-FE, contract (API boundary), integration, e2e/UI, manual. -->
| Acceptance criterion | Layer | Test |
|---|---|---|
| AC-1 | | |

## Risks & rollback
<!-- What could go wrong, how you'd detect it, how to revert. -->

## Explicitly out of scope
<!-- Things this plan deliberately does not do, even if related. -->

## Approval
- Approved by: <name>, <date>
