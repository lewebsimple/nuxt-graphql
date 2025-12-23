import type { H3Event } from "h3";

export async function createContext(_event: H3Event) {
  return {};
}

export type GraphQLContext = Awaited<ReturnType<typeof createContext>>;
