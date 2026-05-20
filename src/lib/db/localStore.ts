import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CHECKPOINT_MERGE_THRESHOLD_SECONDS } from "@/lib/config";
import { findNearestDecisionPoint, normalizeTimestampSeconds } from "@/lib/domain/checkpoints";
import type { ActionType, AnnotationVerdict, DecisionPoint } from "@/lib/types";

type LocalUser = {
  id: string;
  email: string;
};

type LocalSession = {
  id: string;
  presenter_user_id: string;
  share_slug: string;
  presenter_slug: string;
  youtube_url: string;
  youtube_video_id: string;
  decklist_text: string;
  hand_block_enabled: boolean;
  hand_block_x: number;
  hand_block_y: number;
  hand_block_width: number;
  hand_block_height: number;
};

type LocalDecisionPoint = {
  id: string;
  session_id: string;
  timestamp_seconds: number;
  source: DecisionPoint["source"];
};

type LocalAnnotation = {
  id: string;
  session_id: string;
  decision_point_id: string;
  user_id: string;
  original_timestamp_seconds: number;
  action_type: ActionType;
  action_text: string;
  arguments_text: string;
  locked_at: string;
};

type LocalVerdict = {
  annotation_id: string;
  verdict: AnnotationVerdict;
};

type LocalParticipant = {
  session_id: string;
  user_id: string;
  role: "presenter" | "reviewer";
};

type LocalMerge = {
  session_id: string;
  from_decision_point_id: string;
  to_decision_point_id: string;
  merged_by_user_id: string;
};

type LocalDb = {
  users: LocalUser[];
  review_sessions: LocalSession[];
  session_participants: LocalParticipant[];
  decision_points: LocalDecisionPoint[];
  annotations: LocalAnnotation[];
  annotation_verdicts: LocalVerdict[];
  decision_point_merges: LocalMerge[];
};

type CreateLocalPayload = {
  presenterEmail: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  decklistText: string;
  handBlockEnabled: boolean;
  handBlockX: number;
  handBlockY: number;
  handBlockWidth: number;
  handBlockHeight: number;
};

const emptyDb = (): LocalDb => ({
  users: [],
  review_sessions: [],
  session_participants: [],
  decision_points: [],
  annotations: [],
  annotation_verdicts: [],
  decision_point_merges: []
});

function localStorePath() {
  return process.env.LOCAL_DEV_DB_PATH ?? join(process.cwd(), ".data", "dev-db.json");
}

async function readDb(): Promise<LocalDb> {
  try {
    return JSON.parse(await readFile(localStorePath(), "utf8")) as LocalDb;
  } catch {
    return emptyDb();
  }
}

async function writeDb(db: LocalDb) {
  const path = localStorePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(db, null, 2));
}

function upsertUser(db: LocalDb, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let user = db.users.find((candidate) => candidate.email === normalizedEmail);

  if (!user) {
    user = { id: randomUUID(), email: normalizedEmail };
    db.users.push(user);
  }

  return user;
}

function upsertParticipant(db: LocalDb, participant: LocalParticipant) {
  const existing = db.session_participants.find(
    (candidate) => candidate.session_id === participant.session_id && candidate.user_id === participant.user_id
  );

  if (existing) {
    existing.role = participant.role;
    return;
  }

  db.session_participants.push(participant);
}

export async function createLocalReviewSession({
  payload,
  createSlug
}: {
  payload: CreateLocalPayload;
  createSlug: () => string;
}) {
  const db = await readDb();
  const user = upsertUser(db, payload.presenterEmail);
  const shareSlug = createSlug();
  const presenterSlug = createSlug();
  const session: LocalSession = {
    id: randomUUID(),
    presenter_user_id: user.id,
    share_slug: shareSlug,
    presenter_slug: presenterSlug,
    youtube_url: payload.youtubeUrl,
    youtube_video_id: payload.youtubeVideoId,
    decklist_text: payload.decklistText,
    hand_block_enabled: payload.handBlockEnabled,
    hand_block_x: payload.handBlockX,
    hand_block_y: payload.handBlockY,
    hand_block_width: payload.handBlockWidth,
    hand_block_height: payload.handBlockHeight
  };

  db.review_sessions.push(session);
  upsertParticipant(db, { session_id: session.id, user_id: user.id, role: "presenter" });
  await writeDb(db);

  return {
    reviewerPath: `/session/${session.share_slug}`,
    presenterPath: `/presenter/${session.presenter_slug}`
  };
}

export async function joinLocalReviewSession({ shareSlug, email }: { shareSlug: string; email?: string }) {
  const db = await readDb();
  const session = db.review_sessions.find((candidate) => candidate.share_slug === shareSlug);

  if (!session) {
    return null;
  }

  let user: LocalUser | undefined;
  if (email) {
    user = upsertUser(db, email);
    upsertParticipant(db, { session_id: session.id, user_id: user.id, role: "reviewer" });
    await writeDb(db);
  }

  return {
    session,
    user,
    decisionPoints: db.decision_points
      .filter((point) => point.session_id === session.id)
      .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
  };
}

export async function getLocalPresenterSession(presenterSlug: string) {
  const db = await readDb();
  const session = db.review_sessions.find((candidate) => candidate.presenter_slug === presenterSlug);

  if (!session) {
    return null;
  }

  const verdictByAnnotation = new Map(db.annotation_verdicts.map((verdict) => [verdict.annotation_id, verdict.verdict]));
  const userById = new Map(db.users.map((user) => [user.id, user]));

  return {
    session,
    decisionPoints: db.decision_points
      .filter((point) => point.session_id === session.id)
      .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds),
    annotations: db.annotations
      .filter((annotation) => annotation.session_id === session.id)
      .map((annotation) => ({
        ...annotation,
        reviewer_email: userById.get(annotation.user_id)?.email,
        verdict: verdictByAnnotation.get(annotation.id)
      }))
  };
}

export async function commitLocalAnnotation(input: {
  sessionId: string;
  userId: string;
  timestampSeconds: number;
  actionType: ActionType;
  actionText: string;
  argumentsText: string;
}) {
  const db = await readDb();
  const normalizedTimestamp = normalizeTimestampSeconds(input.timestampSeconds);
  const nearest = findNearestDecisionPoint(
    db.decision_points
      .filter((point) => point.session_id === input.sessionId)
      .map((point) => ({
        id: point.id,
        sessionId: point.session_id,
        timestampSeconds: point.timestamp_seconds,
        source: point.source
      })),
    normalizedTimestamp,
    CHECKPOINT_MERGE_THRESHOLD_SECONDS
  );

  let decisionPointId = nearest?.id;
  if (!decisionPointId) {
    decisionPointId = randomUUID();
    db.decision_points.push({
      id: decisionPointId,
      session_id: input.sessionId,
      timestamp_seconds: normalizedTimestamp,
      source: "manual_annotation"
    });
  }

  const annotation: LocalAnnotation = {
    id: randomUUID(),
    session_id: input.sessionId,
    decision_point_id: decisionPointId,
    user_id: input.userId,
    original_timestamp_seconds: normalizedTimestamp,
    action_type: input.actionType,
    action_text: input.actionText,
    arguments_text: input.argumentsText,
    locked_at: new Date().toISOString()
  };

  db.annotations.push(annotation);
  await writeDb(db);

  return {
    id: annotation.id,
    decision_point_id: annotation.decision_point_id,
    locked_at: annotation.locked_at
  };
}

export async function submitLocalVerdict(input: { annotationId: string; verdict: AnnotationVerdict }) {
  const db = await readDb();
  const existing = db.annotation_verdicts.find((candidate) => candidate.annotation_id === input.annotationId);

  if (existing) {
    existing.verdict = input.verdict;
  } else {
    db.annotation_verdicts.push({ annotation_id: input.annotationId, verdict: input.verdict });
  }

  await writeDb(db);
}

export async function mergeLocalDecisionPoints(input: {
  sessionId: string;
  fromDecisionPointId: string;
  toDecisionPointId: string;
  mergedByUserId: string;
}) {
  const db = await readDb();
  db.annotations = db.annotations.map((annotation) =>
    annotation.decision_point_id === input.fromDecisionPointId
      ? { ...annotation, decision_point_id: input.toDecisionPointId }
      : annotation
  );
  db.decision_point_merges.push({
    session_id: input.sessionId,
    from_decision_point_id: input.fromDecisionPointId,
    to_decision_point_id: input.toDecisionPointId,
    merged_by_user_id: input.mergedByUserId
  });
  await writeDb(db);
}
