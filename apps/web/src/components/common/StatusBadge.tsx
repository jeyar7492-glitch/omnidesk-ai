import React from "react";

interface StatusBadgeProps {
  status: "online" | "offline" | "pending" | "warning" | "danger" | "info" | "purple";
  label: string;
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, pulse = true, className = "" }) => {
  const badgeClass =
    status === "online"
      ? "badge-online"
      : status === "warning" || status === "pending"
      ? "badge-warning"
      : status === "danger"
      ? "badge-danger"
      : status === "purple"
      ? "badge-purple"
      : "badge-info";

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      <span className={`dot ${pulse ? "pulse-animation" : ""}`} />
      {label}
    </span>
  );
};
