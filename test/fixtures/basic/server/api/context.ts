import { createContext } from "#graphql/context";
import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  return createContext(event);
});
