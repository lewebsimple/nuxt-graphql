import type { H3Event } from "h3";

export const createContext = (event: H3Event) => ({ event });
export type GraphQLContext = { event: H3Event };
