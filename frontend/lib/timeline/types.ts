export type TimelineRow = {
  id: string;
  /** ms since epoch for stable sort */
  atMs: number;
  /** e.g. "09:10" */
  timeLabel: string;
  /** Human-readable action, never raw snake_case type */
  headline: string;
  /** Optional second line, e.g. "(€12 · food)" */
  detail: string | null;
};
