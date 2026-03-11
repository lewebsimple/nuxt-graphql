import { GraphQLObjectType, GraphQLSchema, GraphQLString, GraphQLNonNull } from "graphql";

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      fromB: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: () => "b",
      },
    },
  }),
});
