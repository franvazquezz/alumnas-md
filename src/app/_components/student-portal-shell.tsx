import { type ReactNode } from "react";

import { AccountActions } from "~/app/_components/account-actions";
import { StudioSwitcher } from "~/app/_components/studio-switcher";

type StudentPortalShellProps = {
  studioName?: string | null;
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function StudentPortalShell({
  studioName,
  eyebrow = "Portal del estudiante",
  title,
  description,
  children,
}: StudentPortalShellProps) {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-primary text-sm font-bold tracking-[0.2em] uppercase">
            {studioName ?? "Gestión de talleres"}
          </p>
          <p className="text-plum/55 mt-2 text-xs font-bold tracking-[0.15em] uppercase">
            {eyebrow}
          </p>
          <h1 className="text-plum mt-1 text-3xl font-black">{title}</h1>
          <p className="text-plum/70 mt-2 max-w-2xl">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <StudioSwitcher />
          <AccountActions />
        </div>
      </header>

      <div className="mt-8">{children}</div>
    </main>
  );
}
