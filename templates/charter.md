# Product Charter: <product name>

- Status: draft
- Owner: <name>
- Date: <yyyy-mm-dd>

<!-- This is one level above the per-feature Intent -> Spec -> Plan loop
     in docs/framework.md. It exists once per product/project (not once
     per feature) and is the entry point for a greenfield start. It
     answers "why does this product exist" so that each feature's
     /intent doesn't have to re-justify itself from scratch. -->

## Vision
<!-- One paragraph: what this product is and why it should exist. -->

## Target users
<!-- Who this is for, and what they do today without it. -->

## Success metrics
<!-- How you'll know this product is working, concretely and measurably. -->

## Scope for v1
<!-- What's in for the first shippable version. -->

## Explicitly out of scope for v1
<!-- What you're deliberately deferring, so scope doesn't creep. -->

## Initial feature breakdown
<!-- The first set of features, each small enough to run through its
     own /intent -> /spec -> /plan -> /implement -> /review -> /ship
     loop independently. One line each; slug should be kebab-case. -->
- `<slug-1>`: <one line>
- `<slug-2>`: <one line>

## Tech stack & architecture
<!-- Decided once here so every feature's plan builds on the same
     foundation instead of re-choosing. Write "TBD" plus an open question
     rather than guessing.
     - Frontend: framework / platform (e.g. React web, iOS, none — CLI/API only)
     - Backend: language / runtime / framework
     - Datastore: database, cache, file storage
     - API style: REST / GraphQL / gRPC / events; auth approach
     - Hosting & deployment: cloud, containers, CI/CD -->

## Design system
<!-- The visual and interaction rules every feature's UX section follows.
     - Component library / design kit (or "none — plain HTML", "CLI output conventions")
     - Brand & visual rules: colors, typography, tone of copy
     - Accessibility target (e.g. WCAG 2.1 AA)
     - Supported devices / browsers / screen sizes -->

## Constraints
<!-- Timeline, team size, budget, must-use infra, compliance
     requirements. -->

## Approval
<!-- A charter is not approved until a human signs off here. -->
- Approved by: <name>, <date>
