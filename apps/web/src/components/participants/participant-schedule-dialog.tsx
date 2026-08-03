"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ParticipantDoc } from "@/types/firestore";

export function ParticipantScheduleDialog({
  open,
  onOpenChange,
  participant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: ParticipantDoc;
}) {
  const router = useRouter();
  const [eventType, setEventType] = useState("practice");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [notes, setNotes] = useState("");
  const [scheduled, setScheduled] = useState(false);

  if (!open) return null;

  const fullName = `${participant.firstName} ${participant.lastName}`;

  function handleClose() {
    setScheduled(false);
    onOpenChange(false);
  }

  function handleSchedule() {
    if (!date) return;
    setScheduled(true);
  }

  function viewSchedules() {
    const params = new URLSearchParams({
      participantId: participant.id,
      date,
      type: eventType,
    });
    router.push(`/schedules?${params.toString()}`);
    handleClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-participant-title"
      >
        <h2
          id="schedule-participant-title"
          className="text-lg font-semibold text-gray-900"
        >
          Schedule with {fullName}
        </h2>
        {scheduled ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium capitalize">{eventType}</span>{" "}
              scheduled for {date} at {time} with {fullName}.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button type="button" onClick={viewSchedules}>
                View schedules
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-500">
              Create a practice, evaluation, or meeting on the calendar.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Event type
                </label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="practice">Practice</option>
                  <option value="evaluation">Evaluation</option>
                  <option value="meeting">Meeting</option>
                  <option value="game">Game</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Time
                  </label>
                  <Input
                    type="time"
                    className="mt-1"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  className="mt-1 min-h-[80px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional details..."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" disabled={!date} onClick={handleSchedule}>
                Schedule event
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
