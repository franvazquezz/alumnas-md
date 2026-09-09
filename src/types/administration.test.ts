import { describe, expect, it } from "vitest";

import {
  shiftCreateInput,
  studioCreateInput,
  timeInput,
} from "./administration";

describe("configuración de talleres", () => {
  it("acepta horarios válidos configurables", () => {
    expect(timeInput.parse("08:15")).toBe("08:15");
    expect(timeInput.parse("21:45")).toBe("21:45");
    expect(shiftCreateInput.parse({ startTime: "13:20" }).startTime).toBe(
      "13:20",
    );
  });

  it("rechaza horarios fuera del formato de 24 horas", () => {
    expect(timeInput.safeParse("24:00").success).toBe(false);
    expect(timeInput.safeParse("9:30").success).toBe(false);
  });

  it("permite generar el slug cuando se crea un taller", () => {
    expect(
      studioCreateInput.parse({ name: "Taller Norte" }).slug,
    ).toBeUndefined();
  });
});
