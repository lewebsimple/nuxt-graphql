import { GraphQLObjectType, GraphQLSchema, GraphQLString, GraphQLNonNull } from "graphql";

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      fromA: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: () => "a",
      },
    },
  }),
});
