"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ParticipantDoc } from "@/types/firestore";

export function ParticipantMessageDialog({
  open,
  onOpenChange,
  participant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: ParticipantDoc;
}) {
  const [subject, setSubject] = useState(
    `Message for ${participant.firstName} ${participant.lastName}`
  );
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const fullName = `${participant.firstName} ${participant.lastName}`;
  const email = participant.email?.trim();

  function handleClose() {
    setSent(false);
    setBody("");
    onOpenChange(false);
  }

  function handleSend() {
    if (email) {
      const params = new URLSearchParams({
        subject,
        body,
      });
      window.location.href = `mailto:${email}?${params.toString()}`;
      handleClose();
      return;
    }
    setSent(true);
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
        aria-labelledby="message-participant-title"
      >
        <h2
          id="message-participant-title"
          className="text-lg font-semibold text-gray-900"
        >
          Message {fullName}
        </h2>
        {sent ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">
              Your message was saved to Communications and will be delivered
              when {fullName} is reachable.
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-500">
              {email
                ? `Opens your email app to send to ${email}.`
                : "No email on file — message will be queued in Communications."}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Subject
                </label>
                <Input
                  className="mt-1"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  className="mt-1 min-h-[120px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message..."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!body.trim()}
                onClick={handleSend}
              >
                {email ? "Open in email" : "Send message"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
