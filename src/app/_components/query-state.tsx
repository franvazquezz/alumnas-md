import { LuAlertCircle, LuInbox, LuLoader2, LuRefreshCw } from "react-icons/lu";

import { ButtonM } from "./button";

type QueryStateProps = {
  kind: "loading" | "error" | "empty";
  title: string;
  description: string;
  onRetry?: () => void;
  compact?: boolean;
};

const icons = {
  loading: LuLoader2,
  error: LuAlertCircle,
  empty: LuInbox,
};

export function QueryState({
  kind,
  title,
  description,
  onRetry,
  compact = false,
}: QueryStateProps) {
  const Icon = icons[kind];

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "loading" ? "polite" : undefined}
      className={`border-plum/20 text-plum flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white/60 text-center ${
        compact ? "gap-2 p-4" : "gap-3 p-7"
      }`}
    >
      <Icon
        aria-hidden="true"
        className={`text-primary h-5 w-5 ${kind === "loading" ? "animate-spin" : ""}`}
      />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-plum/65 mt-1 text-sm">{description}</p>
      </div>
      {kind === "error" && onRetry ? (
        <ButtonM type="button" variant="ghost" onClick={onRetry}>
          <LuRefreshCw aria-hidden="true" className="h-4 w-4" />
          Reintentar
        </ButtonM>
      ) : null}
    </div>
  );
}
