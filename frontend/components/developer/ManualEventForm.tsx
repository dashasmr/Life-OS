"use client";

import { FormEvent, useState } from "react";
import { API_URL, describeFetchFailure, EventType } from "@/lib/api";
import { ui } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const EVENT_TYPES: EventType[] = [
  "work_started",
  "focus_started",
  "focus_ended",
  "focus_session_completed",
  "pomodoro_completed",
  "task_completed",
  "income_added",
  "expense_added",
  "cleaning_done"
];

export function ManualEventForm() {
  const [eventType, setEventType] = useState<EventType>("work_started");
  const [payloadText, setPayloadText] = useState('{"note":"manual event"}');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setError("Invalid JSON.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: eventType, source: "web", payload })
      });
      if (!response.ok) {
        setError("Failed to create event");
        toast.error("Failed to create event");
        return;
      }
      setPayloadText('{"note":"manual event"}');
      toast.success("Event created");
    } catch (err: unknown) {
      const msg = describeFetchFailure(err);
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error ? <p className="text-sm text-lifeos-danger">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <FormField id="manual-event-type" label="Event type">
          <Select value={eventType} onValueChange={(value) => setEventType(value as EventType)}>
            <SelectTrigger id="manual-event-type" className="w-full">
              <SelectValue placeholder="Choose type" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <div className="self-end">
          <Button className={ui.primaryButton} type="submit">
            Add event
          </Button>
        </div>
      </div>

          <FormField id="manual-event-payload" label="Payload JSON" error={error === "Invalid JSON." ? error : undefined}>
        <Textarea
          id="manual-event-payload"
          className="min-h-28 font-mono text-lifeos-fg"
          value={payloadText}
          onChange={(ev) => setPayloadText(ev.target.value)}
          spellCheck={false}
        />
      </FormField>
    </form>
  );
}
