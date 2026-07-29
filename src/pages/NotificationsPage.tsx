import {
  Bell,
  Building2,
  CheckCircle2,
  Copy,
  GraduationCap,
  LockKeyhole,
  Mail,
  Send,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/ui";
import {
  course,
  effectiveAt,
  maya,
  mayaRequirements,
  roomById,
} from "../data/demoData";
import { evaluateCompatibility } from "../domain/compatibilityEngine";
import { createNotificationMessages } from "../services/notifications";
import { useDemo } from "../state/DemoContext";

const audienceMeta = {
  instructor: { label: "Instructor notice", icon: GraduationCap, privacy: "Minimum necessary disclosure" },
  facilities: { label: "Facilities request", icon: Building2, privacy: "Requirement-level details only" },
  student: { label: "Student confirmation", icon: UserRound, privacy: "Personal status and next step" },
  administrator: { label: "Administrator recommendation", icon: Bell, privacy: "Operational decision support" },
} as const;

export function NotificationsPage() {
  const { notifications } = useDemo();
  const fallback = useMemo(
    () =>
      createNotificationMessages({
        student: maya,
        course,
        previousRoom: roomById("room-202"),
        newRoom: roomById("room-815"),
        proposedRoom: roomById("room-812"),
        result: evaluateCompatibility({
          requirements: mayaRequirements,
          roomFeatures: roomById("room-815").features,
          evaluatedAt: "2026-07-29T15:14:00.000Z",
        }),
        effectiveAt,
      }),
    [],
  );
  const messages = notifications.length ? notifications : fallback;
  const [activeId, setActiveId] = useState(messages[0]?.id ?? "");
  const [transport, setTransport] = useState<"email" | "in-app">("email");
  const [copied, setCopied] = useState(false);
  const active = messages.find((message) => message.id === activeId) ?? messages[0]!;
  const meta = audienceMeta[active.audience];
  const Icon = meta.icon;

  const copy = async () => {
    await navigator.clipboard?.writeText(`${active.subject}\n\n${active.body}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="NOTIFICATION PREVIEW"
        title="The right message for each role"
        description="Template-based messages work without an AI key and disclose only the information each recipient needs."
        actions={
          <div className="transport-toggle" aria-label="Preview transport">
            <button className={transport === "email" ? "active" : ""} onClick={() => setTransport("email")} type="button"><Mail size={15} /> Email</button>
            <button className={transport === "in-app" ? "active" : ""} onClick={() => setTransport("in-app")} type="button"><Bell size={15} /> In-app</button>
          </div>
        }
      />

      <div className="notification-layout">
        <nav className="notification-tabs" aria-label="Message audiences">
          {messages.map((message) => {
            const item = audienceMeta[message.audience];
            const TabIcon = item.icon;
            return (
              <button key={message.id} className={message.id === active.id ? "active" : ""} onClick={() => setActiveId(message.id)} type="button">
                <span className="notification-tab-icon"><TabIcon size={18} /></span>
                <span><strong>{item.label}</strong><small>{item.privacy}</small></span>
              </button>
            );
          })}
        </nav>

        <section className={`message-preview ${transport}`}>
          <div className="message-toolbar">
            <span className="preview-label">{transport === "email" ? "EMAIL PREVIEW" : "IN-APP PREVIEW"}</span>
            <button type="button" onClick={copy}><Copy size={15} /> {copied ? "Copied" : "Copy"}</button>
          </div>
          <div className="message-meta">
            <span className={`audience-avatar ${active.audience}`}><Icon size={19} /></span>
            <span><small>TO</small><strong>{meta.label}</strong></span>
            <span className="privacy-safe-chip"><LockKeyhole size={14} /> Privacy-safe</span>
          </div>
          <div className="subject-line"><small>SUBJECT</small><h2>{active.subject}</h2></div>
          <div className="message-body">
            {active.body.split(". ").map((sentence, index, all) => (
              <span key={`${sentence}-${index}`}>{sentence}{index < all.length - 1 ? ". " : ""}</span>
            ))}
          </div>
          <div className="message-actions">
            <button type="button" className="button button-primary"><Send size={16} /> Send via demo transport</button>
            <span><CheckCircle2 size={15} /> Console fallback active</span>
          </div>
        </section>
      </div>

      <section className="privacy-audit">
        <div><LockKeyhole size={20} /><span><strong>Disclosure check passed</strong><small>Instructor notice contains no diagnosis, student name, or complete accommodation profile.</small></span></div>
        <span className="status-badge status-success"><CheckCircle2 size={14} /> Verified by test</span>
      </section>
    </div>
  );
}
