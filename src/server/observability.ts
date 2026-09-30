import { randomUUID } from "node:crypto";

const REQUEST_ID_HEADER = "x-request-id";
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

type LogLevel = "info" | "error";
type LogValue = string | number | boolean | null | undefined;

export type ServerLogFields = Record<string, LogValue>;

export const resolveRequestId = (headers: Headers) => {
  const supplied = headers.get(REQUEST_ID_HEADER)?.trim();
  return supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
};

export const requestIdHeader = REQUEST_ID_HEADER;

export const createServerLogEntry = (
  level: LogLevel,
  event: string,
  fields: ServerLogFields,
) => ({
  timestamp: new Date().toISOString(),
  level,
  service: "alumnas-md",
  event,
  ...fields,
});

export const writeServerLog = (
  level: LogLevel,
  event: string,
  fields: ServerLogFields,
) => {
  const line = JSON.stringify(createServerLogEntry(level, event, fields));
  if (level === "error") {
    console.error(line);
    return;
  }
  console.info(line);
};
