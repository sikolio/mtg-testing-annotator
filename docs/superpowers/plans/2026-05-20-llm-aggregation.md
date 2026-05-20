# LLM Aggregation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add presenter-seeded whole-session LLM aggregation that groups equivalent annotations per decision point without changing reviewer-authored text.

**Architecture:** Keep the reviewer submission path unchanged. Add server-side aggregation metadata to annotations, a small OpenAI-backed aggregation service with a deterministic fallback, and trigger a whole-session aggregation pass when presenter mode loads before rendering grouped choices.

**Tech Stack:** Next.js App Router, Supabase, local JSON dev store, OpenAI JavaScript SDK, Zod, Vitest

---

### Task 1: Extend annotation types, storage, and grouping metadata

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db/localStore.ts`
- Modify: `supabase/migrations/0004_add_annotation_aggregation.sql`
- Test: `src/lib/domain/presentation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("prefers stored aggregation clusters over action type grouping", () => {
  const groups = groupAnnotationsForPresentation([
    {
      ...annotations[0],
      aggregationClusterId: "cluster-1",
      aggregatedActionLabel: "Kill Ragavan now"
    },
    {
      ...annotations[1],
      aggregationClusterId: "cluster-1",
      aggregatedActionLabel: "Kill Ragavan now"
    }
  ]);

  expect(groups).toHaveLength(1);
  expect(groups[0].label).toBe("Kill Ragavan now");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/domain/presentation.test.ts`
Expected: FAIL because `label` and aggregation fields do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add optional aggregation fields to `Annotation` in `src/lib/types.ts`, thread them through the local store types in `src/lib/db/localStore.ts`, add a migration that creates nullable annotation columns, and update `groupAnnotationsForPresentation` to prefer `aggregationClusterId` plus `aggregatedActionLabel` before falling back to `decisionPointId + actionType`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/domain/presentation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/db/localStore.ts src/lib/domain/presentation.ts src/lib/domain/presentation.test.ts supabase/migrations/0004_add_annotation_aggregation.sql
git commit -m "feat: add annotation aggregation metadata"
```

### Task 2: Add the OpenAI aggregation service with deterministic fallback

**Files:**
- Create: `src/lib/aggregation.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Test: `src/lib/aggregation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("clusters equivalent annotations from the model response", async () => {
  const result = await aggregateDecisionPointAnnotations({
    decisionPointId: "dp-1",
    annotations: [
      makeAnnotation("a-1", "Bolt Ragavan"),
      makeAnnotation("a-2", "Kill Ragavan")
    ],
    client: fakeClientReturning({
      clusters: [
        {
          id: "cluster-1",
          label: "Kill Ragavan",
          annotationIds: ["a-1", "a-2"]
        }
      ]
    })
  });

  expect(result.assignments).toEqual([
    { annotationId: "a-1", clusterId: "cluster-1", label: "Kill Ragavan" },
    { annotationId: "a-2", clusterId: "cluster-1", label: "Kill Ragavan" }
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/aggregation.test.ts`
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/aggregation.ts` with:
- an OpenAI client factory guarded by `OPENAI_API_KEY`
- a Zod schema for cluster output
- `aggregateDecisionPointAnnotations(...)`
- deterministic fallback grouping by action type when the API key is missing or the model call fails

Also add the `openai` dependency and document `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env.example`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/aggregation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/aggregation.ts src/lib/aggregation.test.ts
git commit -m "feat: add annotation aggregation service"
```

### Task 3: Seed aggregation from presenter mode load and persist results

**Files:**
- Create: `src/lib/actions/aggregationActions.ts`
- Modify: `src/app/presenter/[presenterSlug]/page.tsx`
- Modify: `src/lib/db/localStore.ts`
- Test: `src/lib/actions/aggregationActions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("persists aggregation assignments for each stale decision point in the session", async () => {
  const result = await ensureSessionAggregation({
    sessionId: "session-1",
    annotations: [
      makeAnnotation("a-1", { decisionPointId: "dp-1", aggregationVersion: undefined }),
      makeAnnotation("a-2", { decisionPointId: "dp-1", aggregationVersion: undefined })
    ],
    aggregateDecisionPoint: async () => ({
      assignments: [
        { annotationId: "a-1", clusterId: "cluster-1", label: "Kill Ragavan" },
        { annotationId: "a-2", clusterId: "cluster-1", label: "Kill Ragavan" }
      ]
    }),
    persistAssignments: persistSpy
  });

  expect(persistSpy).toHaveBeenCalledTimes(1);
  expect(result.updatedDecisionPointIds).toEqual(["dp-1"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/actions/aggregationActions.test.ts`
Expected: FAIL because the action does not exist.

- [ ] **Step 3: Write minimal implementation**

Add `ensureSessionAggregation(...)` to:
- group annotations by decision point
- skip current-version clusters
- aggregate stale points
- persist `aggregation_cluster_id`, `aggregated_action_label`, `aggregation_version`, and `aggregated_at`

Wire presenter page to call it before fetching/rendering annotations in Supabase mode, and add local-store persistence helpers for development mode.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/actions/aggregationActions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/aggregationActions.ts src/lib/actions/aggregationActions.test.ts src/lib/db/localStore.ts src/app/presenter/[presenterSlug]/page.tsx
git commit -m "feat: seed aggregation on presenter load"
```

### Task 4: Surface aggregated labels in presenter mode and verify end to end

**Files:**
- Modify: `src/components/PresenterWorkspace.tsx`
- Modify: `src/components/PresenterWorkspace.test.tsx`
- Modify: `src/lib/domain/presentation.ts`
- Test: `src/components/PresenterWorkspace.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
it("shows the aggregated label for a grouped presenter choice", () => {
  render(
    <PresenterWorkspace
      session={session}
      decisionPoints={decisionPoints}
      annotations={[
        {
          ...annotations[0],
          aggregationClusterId: "cluster-1",
          aggregatedActionLabel: "Kill Ragavan"
        }
      ]}
    />
  );

  expect(screen.getByText(/Kill Ragavan/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/PresenterWorkspace.test.tsx`
Expected: FAIL because presenter UI still renders action type as the group heading.

- [ ] **Step 3: Write minimal implementation**

Update presenter grouping display to show the aggregated label when available, otherwise fall back to the formatted action type heading.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/PresenterWorkspace.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PresenterWorkspace.tsx src/components/PresenterWorkspace.test.tsx src/lib/domain/presentation.ts
git commit -m "feat: show aggregated labels in presenter mode"
```

### Task 5: Full verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the setup**

Add a short section to `README.md` covering `OPENAI_API_KEY`, `OPENAI_MODEL`, and the fact that presenter mode seeds aggregation for the session.

- [ ] **Step 2: Run targeted tests**

Run: `npm test -- src/lib/domain/presentation.test.ts src/lib/aggregation.test.ts src/lib/actions/aggregationActions.test.ts src/components/PresenterWorkspace.test.tsx`
Expected: PASS

- [ ] **Step 3: Run full verification**

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: PASS (rerun once if the known `.next/types` race appears)

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add llm aggregation setup"
```
