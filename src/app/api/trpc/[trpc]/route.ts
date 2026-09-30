import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { requestIdHeader, resolveRequestId } from "~/server/observability";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest, resHeaders: Headers) => {
  const requestId = resolveRequestId(req.headers);
  resHeaders.set(requestIdHeader, requestId);
  return createTRPCContext({
    headers: req.headers,
    requestId,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ resHeaders }) => createContext(req, resHeaders),
  });

export { handler as GET, handler as POST };
