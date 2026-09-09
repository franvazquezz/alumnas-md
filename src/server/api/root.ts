import { studentsRouter } from "~/server/api/routers/students";
import { administrationRouter } from "~/server/api/routers/administration";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  administration: administrationRouter,
  students: studentsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.students.list();
 *       ^? Student[]
 */
export const createCaller = createCallerFactory(appRouter);
