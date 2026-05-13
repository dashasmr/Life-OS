import { API_URL } from "@/lib/api";

/** Logs completion of a habit support UI action into the event stream (work_started). */
export async function logHabitSupportActionDone(
  habitId: string,
  actionId: string,
  actionType: string,
  baseUrl: string = API_URL
): Promise<void> {
  await fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "work_started",
      source: "web",
      payload: {
        note: `habit_support_action:${actionType}`,
        habitId,
        actionId
      }
    })
  });
}
