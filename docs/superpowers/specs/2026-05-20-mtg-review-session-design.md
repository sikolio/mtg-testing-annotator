# MTG Review Session MVP Design

## Purpose

Build a web application for Magic: The Gathering teams to review gameplay videos by independently recording the plays they would make from the information available at specific moments. The first version focuses on shareable private review sessions, persistent data, a realistic reviewer flow that preserves information boundaries, and a presenter mode for comparing reviews.

## Scope

The MVP includes:

- Session creation by a presenter using an email address.
- YouTube video embedding by URL.
- Plain-text decklist storage and display.
- One static hand-hidden-block overlay per session.
- Private reviewer and presenter links.
- Email-backed user records without real authentication.
- Reviewer annotations with locked play details.
- A delayed verdict flow for whether the video made the same play.
- Community checkpoints generated from prior annotations.
- Presentation mode that aggregates choices anonymously by default.

Out of scope for the MVP:

- Discord authentication.
- Supabase Auth.
- Uploaded videos.
- Parsed decklist card rows.
- Dynamic or time-ranged hand-hidden-block overlays.
- Full MTG rules validation.

## Architecture

Use a Vercel-ready Next.js application with Supabase Postgres as the persistent backend.

The app has three primary surfaces:

1. Session creation: the presenter enters an email, a YouTube URL, a decklist, and optional static hand-hidden-block settings. The creator becomes the presenter for that session.
2. Reviewer mode: a reviewer opens a private link, enters an email, watches the video, and submits locked annotations at decision points.
3. Presentation mode: the presenter opens a review view, steps through decision points, compares grouped choices, and can reveal reviewer identities when needed.

No real authentication is required in the MVP. Entering an email creates or reuses a user record. The data model should leave room for future Supabase Auth or Discord identity fields.

## Data Model

### users

Stores email-backed accounts.

Fields:

- `id`
- `email`
- `display_name`
- `discord_id` nullable future field
- `supabase_auth_user_id` nullable future field
- `created_at`
- `updated_at`

### review_sessions

Stores the session configuration.

Fields:

- `id`
- `presenter_user_id`
- `share_slug`
- `presenter_slug`
- `youtube_url`
- `youtube_video_id`
- `decklist_text`
- `hand_block_enabled`
- `hand_block_x`
- `hand_block_y`
- `hand_block_width`
- `hand_block_height`
- `created_at`
- `updated_at`

The hand block values are normalized percentages relative to the video area so they can scale across screen sizes.

### session_participants

Tracks users who have joined a session.

Fields:

- `id`
- `session_id`
- `user_id`
- `role`
- `created_at`

Roles are lightweight for the MVP: `presenter` and `reviewer`.

### decision_points

Represents canonical timestamps where reviewers should make or compare decisions.

Fields:

- `id`
- `session_id`
- `timestamp_seconds`
- `source`
- `created_at`
- `updated_at`

Sources include `manual_annotation`, `merged`, and future presenter-created values.

### annotations

Stores the reviewer play commitment.

Fields:

- `id`
- `session_id`
- `decision_point_id`
- `user_id`
- `original_timestamp_seconds`
- `action_type`
- `action_text`
- `arguments_text`
- `aggregation_cluster_id` nullable
- `aggregated_action_label` nullable
- `aggregation_version` nullable
- `aggregated_at` nullable
- `locked_at`
- `created_at`

The locked fields are `original_timestamp_seconds`, `action_type`, `action_text`, and `arguments_text`. After `locked_at` is set, these values are not editable through the UI or API.
Aggregation metadata is presenter-generated session analysis. It may be refreshed later, but it never overwrites reviewer-authored text.

Action types in MVP:

- `play_land`
- `cast_spell`
- `attack`
- `block`
- `activate_ability`
- `pass`
- `other`

### annotation_verdicts

Stores the reviewer verdict after seeing subsequent video information.

Fields:

- `id`
- `annotation_id`
- `verdict`
- `created_at`
- `updated_at`

Verdict values:

- `same_play`
- `different_play`
- `unclear`

Verdicts may be updated, but locked annotation play details may not.

### decision_point_merges

Preserves merge history when nearby decision points are treated as the same strategic moment.

Fields:

- `id`
- `session_id`
- `from_decision_point_id`
- `to_decision_point_id`
- `merged_by_user_id`
- `created_at`

The app should keep original annotation timestamps even when their decision points are merged.

## Reviewer Flow

The reviewer opens a private session link and enters an email. The app creates or reuses a `users` row and records the reviewer as a participant.

The reviewer screen shows:

- YouTube video embed.
- Static hand-hidden-block overlay if enabled.
- Plain-text decklist.
- Current decision or annotation panel.
- Checkpoint/timeline context.

A reviewer can start an annotation by:

- manually pausing the video,
- clicking an Add annotation control, which pauses the video,
- reaching a community checkpoint created from prior annotations.

At a decision point, the reviewer chooses an action type and writes the play details and reasoning. When they click Commit and continue:

1. The annotation is saved.
2. The timestamp, action type, action text, and arguments lock immediately.
3. Playback resumes.
4. The decision point becomes available as a community checkpoint for future reviewers.

At the next pause or checkpoint, if the reviewer has a committed annotation without a verdict, the app first prompts for the verdict: same play, different play, or unclear. The reviewer cannot create a new annotation until the pending verdict is recorded.

Existing reviewer annotations are never shown in reviewer mode. Community checkpoints use neutral copy such as "Decision point reached."

## Community Checkpoints

All prior annotation timestamps become suggested checkpoints for later reviewers. The app de-duplicates timestamps within two seconds into a shared decision point. The two-second threshold is defined in app configuration so it can be tuned later, and the presenter can manually merge nearby decision points in presentation mode.

Reviewers may indicate that their annotation belongs to an existing nearby decision point when prompted. This links their annotation to the same canonical decision point while preserving their original timestamp.

## Presentation Mode

The presenter opens a dedicated presentation link for the session. The view shows:

- video player,
- decklist,
- decision point rail sorted by timestamp,
- grouped review choices for the selected point.

For each decision point, the presenter can:

- jump the video to that timestamp,
- step forward and backward through decision points,
- see grouped reviewer choices anonymously by default,
- expand groups to read play details and arguments,
- reveal reviewer emails with an explicit control,
- see verdict counts for same play, different play, and unclear,
- merge nearby decision points that represent the same decision.

Presentation mode seeds aggregation for the whole session on first load. The app scans all session annotations, groups them by decision point, and runs one LLM aggregation pass per decision point that has missing or stale aggregation data.

For each decision point, the LLM receives the raw reviewer play text and returns:

- a cluster assignment for each annotation,
- a short canonical label for each cluster,
- no edits to reviewer-authored action text or arguments.

The app persists the returned cluster metadata onto the source annotations. Presenter mode prefers these stored clusters for grouping and falls back to deterministic grouping by decision point plus action type when aggregation is unavailable or fails.

Aggregation scope is always one decision point at a time, even when that decision point was created from nearby merged timestamps. This keeps grouping local to the actual strategic moment being discussed.

Aggregation runs for the whole session when presenter mode loads, not lazily per selected decision point. This keeps presenter navigation fast after the initial seed and avoids recomputing clusters on each checkpoint change.

Aggregation freshness is controlled by `aggregation_version`. When the prompt, model, or output contract changes, the app can mark prior clusters stale by bumping the version and re-running aggregation. A later presenter control can trigger this refresh manually.

## Aggregation Pipeline

The aggregation flow is intentionally presenter-seeded rather than reviewer-blocking.

1. Reviewer annotations are saved normally with no LLM dependency.
2. When presenter mode loads, the app checks all annotations in the session for missing or stale aggregation metadata.
3. For each affected decision point, the app calls the aggregation service once with that point's annotations.
4. The service writes `aggregation_cluster_id`, `aggregated_action_label`, `aggregation_version`, and `aggregated_at` back to the annotations.
5. Presenter UI renders grouped choices from the stored metadata.

The first presenter load may briefly render deterministic fallback groups before refreshed aggregation results are written. Once saved, later presenter visits should use the stored clusters immediately.

## UI Requirements

The app should feel like a focused review tool, not a marketing site.

Session creation:

- compact form for presenter email, YouTube URL, decklist text, and hand block settings,
- confirmation view with reviewer and presenter links.

Reviewer screen:

- video-first layout,
- decklist and annotation panel available beside or below the video depending on viewport,
- clear Add annotation control,
- action type select,
- text fields for play details and arguments,
- Commit and continue button,
- pending verdict prompt that takes priority over new annotations.

Presentation screen:

- video and decklist remain accessible,
- decision point rail for stepping through the session,
- grouped options panel for reviewer choices,
- anonymous by default,
- reveal identity control limited to presentation mode.

## Error Handling

- Invalid YouTube URLs show a form-level validation error.
- Unknown private links show a not-found state.
- Duplicate emails reuse the existing user record.
- Attempts to edit locked annotation fields are rejected server-side.
- If a reviewer reaches a checkpoint while a verdict is pending, the verdict prompt is shown first.
- If the YouTube player cannot load, the screen shows the original URL and a retry affordance.

## Testing Strategy

Unit tests:

- YouTube URL parsing.
- Decision point de-duplication and merge behavior.
- Annotation locking rules.
- Presentation grouping logic.
- Aggregation result parsing and annotation metadata persistence.
- Fallback grouping when aggregation is missing or fails.

Integration tests:

- Creating a review session.
- Joining by email.
- Committing an annotation and locking play details.
- Requiring a verdict at the next pause before another annotation.
- Creating community checkpoints from annotations.
- Aggregating anonymous presentation choices across the full session on presenter load.
- Revealing reviewer identity in presentation mode.

## Future Extensions

- Discord authentication tied back to existing email-backed users.
- Supabase Auth.
- Supabase Storage or Vercel Blob for uploaded videos and screenshots.
- Parsed decklist views.
- Dynamic and time-ranged hand-hidden-block overlays.
- Manual presenter refresh and review of aggregated play labels.
- Presenter-curated required checkpoints.
- Comment threads on decision points.
