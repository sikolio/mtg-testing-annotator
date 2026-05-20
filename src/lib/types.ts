export const ACTION_TYPES = [
  "play_land",
  "cast_spell",
  "attack",
  "block",
  "activate_ability",
  "pass",
  "other"
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const VERDICTS = ["same_play", "different_play", "unclear"] as const;

export type AnnotationVerdict = (typeof VERDICTS)[number];

export type HandBlock = {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ReviewSession = {
  id: string;
  presenterUserId: string;
  shareSlug: string;
  presenterSlug: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  decklistText: string;
  opponentDecklistText: string;
  handBlocks: HandBlock[];
};

export type DecisionPoint = {
  id: string;
  sessionId: string;
  timestampSeconds: number;
  source: "manual_annotation" | "merged" | "presenter";
};

export type Annotation = {
  id: string;
  sessionId: string;
  decisionPointId: string;
  userId: string;
  reviewerEmail?: string;
  originalTimestampSeconds: number;
  rawActionText: string;
  actionType: ActionType;
  actionText: string;
  argumentsText: string;
  aggregationClusterId?: string;
  aggregatedActionLabel?: string;
  aggregationVersion?: string;
  aggregatedAt?: string;
  lockedAt: string | null;
  verdict?: AnnotationVerdict;
};
