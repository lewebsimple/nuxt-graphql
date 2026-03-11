import { defineEventHandler } from "h3";
import { createContext } from "#graphql/context";

export default defineEventHandler(async (event) => {
  return createContext(event);
});
