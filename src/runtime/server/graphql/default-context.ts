import type { H3Event } from "h3";

// Default context factory for GraphQL server
export const createContext = (event: H3Event) => ({ event });

// Default GraphQL context type
export type GraphQLContext = { event: H3Event };
