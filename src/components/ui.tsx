import {
  AlertCircle,
  CheckCircle2,
  CircleHelp,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import type {
  CompatibilityStatus,
  RequirementResult,
} from "../domain/types";

export function StatusBadge({
  status,
  compact = false,
}: {
  status: CompatibilityStatus | "open" | "in_review" | "awaiting_verification" | "resolved";
  compact?: boolean;
}) {
  const content: Record<typeof status, { label: string; icon: LucideIcon; tone: string }> = {
    compatible: { label: "Ready", icon: CheckCircle2, tone: "success" },
    incompatible: { label: "Needs action", icon: AlertCircle, tone: "issue" },
    verification_required: { label: "Verify", icon: CircleHelp, tone: "warning" },
    open: { label: "Open", icon: AlertCircle, tone: "issue" },
    in_review: { label: "In review", icon: Clock3, tone: "info" },
    awaiting_verification: {
      label: "Awaiting verification",
      icon: CircleHelp,
      tone: "warning",
    },
    resolved: { label: "Resolved", icon: CheckCircle2, tone: "success" },
  };
  const item = content[status];
  const Icon = item.icon;
  return (
    <span className={`status-badge status-${item.tone}${compact ? " compact" : ""}`}>
      <Icon aria-hidden="true" size={compact ? 13 : 15} />
      {item.label}
    </span>
  );
}

export function RequirementList({
  items,
  state,
}: {
  items: RequirementResult[];
  state: "passed" | "failed" | "unknown";
}) {
  if (!items.length) {
    return <p className="empty-inline">None</p>;
  }
  const Icon =
    state === "passed" ? CheckCircle2 : state === "failed" ? AlertCircle : CircleHelp;
  return (
    <ul className={`requirement-list requirement-${state}`}>
      {items.map((item) => (
        <li key={item.featureType}>
          <Icon aria-hidden="true" size={18} />
          <span>
            <strong>{item.label}</strong>
            <small>{item.reason}</small>
            {item.stale && <em>Verification record is older than 180 days</em>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function RoomPill({ number, muted = false }: { number: string; muted?: boolean }) {
  return (
    <span className={`room-pill${muted ? " muted" : ""}`}>
      <span>RM</span>
      {number}
    </span>
  );
}

export function Meter({ score }: { score: number }) {
  return (
    <div
      className="meter"
      role="meter"
      aria-label={`Room ranking score: ${score} out of 100`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
    >
      <span style={{ width: `${score}%` }} />
    </div>
  );
}
