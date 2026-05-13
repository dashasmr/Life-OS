import type { FinanceKind, TaskEnergyType, TaskPriority, TaskStatus } from "@/lib/api";

/** Serializable replay payloads — kept in localStorage until the API accepts them. */
export type PendingMutation =
  | {
      id: string;
      createdAt: number;
      kind: "patch_task_status";
      taskId: string;
      status: TaskStatus;
    }
  | {
      id: string;
      createdAt: number;
      kind: "post_task";
      body: {
        title: string;
        priority: TaskPriority;
        due_date: string | null;
        energy_type: TaskEnergyType | null;
      };
    }
  | {
      id: string;
      createdAt: number;
      kind: "post_finance_transaction";
      body: {
        kind: FinanceKind;
        amount: number;
        category: string;
        note: string | null;
      };
    }
  | {
      id: string;
      createdAt: number;
      kind: "cleaning_done";
      zoneId: string;
    }
  | {
      id: string;
      createdAt: number;
      kind: "focus_start";
      body: {
        label: string | null;
        task_id: string | null;
      };
    }
  | {
      id: string;
      createdAt: number;
      kind: "focus_stop";
      sessionId: string;
    };

export type PendingMutationInput =
  | { kind: "patch_task_status"; taskId: string; status: TaskStatus }
  | {
      kind: "post_task";
      body: {
        title: string;
        priority: TaskPriority;
        due_date: string | null;
        energy_type: TaskEnergyType | null;
      };
    }
  | {
      kind: "post_finance_transaction";
      body: {
        kind: FinanceKind;
        amount: number;
        category: string;
        note: string | null;
      };
    }
  | { kind: "cleaning_done"; zoneId: string }
  | {
      kind: "focus_start";
      body: {
        label: string | null;
        task_id: string | null;
      };
    }
  | { kind: "focus_stop"; sessionId: string };

export type SendMutationResult =
  | { mode: "sent"; response: Response }
  | { mode: "queued"; id: string };
