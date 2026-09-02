import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const cssDirectory = join(process.cwd(), ".next", "static", "css");

if (!existsSync(cssDirectory)) {
  throw new Error(
    "No se encontró CSS compilado. Ejecutá `pnpm build` primero.",
  );
}

const generatedCss = readdirSync(cssDirectory)
  .filter((fileName) => fileName.endsWith(".css"))
  .map((fileName) => readFileSync(join(cssDirectory, fileName), "utf8"))
  .join("\n");

const requiredTokens = [
  "--font-sans:var(--font-geist-sans),ui-sans-serif,system-ui,sans-serif",
  "--color-primary:#a30d0d",
  "--color-secondary:#bb8377",
  "--color-sand:#fff4ef",
  "--color-plum:#582b39",
  "--color-ink:#1b0b0d",
  ".bg-primary{",
  ".bg-sand{",
  ".text-plum{",
  ".text-ink{",
];

const missingTokens = requiredTokens.filter(
  (token) => !generatedCss.includes(token),
);

if (missingTokens.length > 0) {
  throw new Error(
    `El CSS generado no contiene el tema MD Cerámica: ${missingTokens.join(", ")}`,
  );
}

console.log("El CSS generado contiene el tema MD Cerámica.");
