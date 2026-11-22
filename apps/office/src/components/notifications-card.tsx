"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type Status = "checking" | "unsupported" | "unconfigured" | "blocked" | "off" | "on" | "busy";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready);
}

export function NotificationsCard() {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return setStatus("unsupported");
      }
      const { publicKey } = (await (await fetch("/api/push/subscription")).json()) as {
        publicKey: string | null;
      };
      if (!publicKey) return setStatus("unconfigured");
      if (Notification.permission === "denied") return setStatus("blocked");
      const existing = await (await registration()).pushManager.getSubscription();
      setStatus(existing ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  async function turnOn() {
    setStatus("busy");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus(permission === "denied" ? "blocked" : "off");
      const { publicKey } = (await (await fetch("/api/push/subscription")).json()) as {
        publicKey: string;
      };
      const reg = await registration();
      const subscription =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error();
      setStatus("on");
    } catch {
      setError("Couldn't turn notifications on for this device.");
      setStatus("off");
    }
  }

  async function turnOff() {
    setStatus("busy");
    const subscription = await (await registration()).pushManager.getSubscription();
    if (subscription) {
      await fetch("/api/push/subscription", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});
      await subscription.unsubscribe().catch(() => {});
    }
    setStatus("off");
  }

  const note: Partial<Record<Status, string>> = {
    unsupported:
      "This browser can't receive notifications. On iPhone, add the app to your Home Screen first, then open it from there.",
    unconfigured: "Notifications aren't set up on the server yet.",
    blocked:
      "Notifications are blocked for this site. Allow them in your browser or phone settings, then come back.",
  };

  return (
    <section
      className="glass rise space-y-3 rounded-[1.75rem] p-5"
      style={{ animationDelay: "90ms" }}
    >
      <h2 className="eyebrow flex items-center gap-1.5">
        <Bell size={12} /> Notifications
      </h2>
      <p className="text-sm leading-relaxed text-[var(--ink-2)]">
        Get a nudge on this device when there&rsquo;s a new message, an event invitation or
        something to review. To keep things discreet, the notification is a random everyday line
        like &ldquo;Your weekly summary is ready&rdquo;. It never says what the app is, who wrote or
        what it&rsquo;s about.
      </p>
      {note[status] ? <p className="text-sm text-[var(--ink-2)]">{note[status]}</p> : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {status === "on" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <span className="dot dot-in" /> On for this device
          </span>
          <button type="button" onClick={() => void turnOff()} className="btn btn-quiet btn-sm">
            <BellOff size={15} /> Turn off
          </button>
        </div>
      ) : status === "off" || status === "busy" ? (
        <button
          type="button"
          onClick={() => void turnOn()}
          disabled={status === "busy"}
          className="btn btn-primary"
        >
          <Bell size={16} /> {status === "busy" ? "Turning on…" : "Turn on for this device"}
        </button>
      ) : null}
    </section>
  );
}
