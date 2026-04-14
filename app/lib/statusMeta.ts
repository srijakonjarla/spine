export const STATUS_LABEL: Record<string, string> = {
  reading: "currently reading",
  finished: "read",
  "want-to-read": "want to read",
  "did-not-finish": "did not finish",
};

export const STATUS_SYMBOL: Record<string, string> = {
  reading: "○",
  finished: "●",
  "want-to-read": "○",
  "did-not-finish": "×",
};

export const STATUS_COLOR: Record<string, string> = {
  reading: "text-terra",
  finished: "text-sage",
  "want-to-read": "text-[var(--fg-muted)]",
  "did-not-finish": "text-[var(--fg-faint)]",
};

export const STATUS_ORDER = ["reading", "want-to-read", "finished", "did-not-finish"] as const;

// statuses that get truncated on the shelf overview
export const TRUNCATED_STATUSES = new Set(["want-to-read", "finished"]);
export const TRUNCATE_LIMIT = 10;
