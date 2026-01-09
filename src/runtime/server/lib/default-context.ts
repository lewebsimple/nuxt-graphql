import type { H3Event } from "h3";

// Default context factory for GraphQL server
export const createContext = async (event: H3Event) => ({ event });

// Default GraphQL context type
export type GraphQLContext = Awaited<ReturnType<typeof createContext>>;
