"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

export function StudioSwitcher() {
  const [switching, setSwitching] = useState(false);
  const { data } = api.administration.navigation.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const switchStudio = api.administration.switchStudio.useMutation({
    onSuccess: () => window.location.reload(),
    onSettled: () => setSwitching(false),
  });

  if (!data || data.studios.length === 0) return null;

  return (
    <label className="text-plum/70 flex items-center gap-2 text-xs font-semibold">
      Taller
      <select
        aria-label="Taller activo"
        value={data.activeStudioId ?? ""}
        disabled={switching || data.studios.length < 2}
        onChange={(event) => {
          setSwitching(true);
          switchStudio.mutate({ studioId: Number(event.target.value) });
        }}
        className="border-plum/20 text-plum rounded-xl border bg-white/80 px-3 py-2 text-sm"
      >
        {data.studios.map((studio) => (
          <option key={studio.id} value={studio.id}>
            {studio.name}
          </option>
        ))}
      </select>
    </label>
  );
}
