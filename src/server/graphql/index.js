import { graphqlExpress } from 'apollo-server-express'
import bodyParser from 'body-parser'
import { makeExecutableSchema } from 'graphql-tools'

import typeDefs from './typeDefs.gql'
import resolvers from './resolvers'

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

export default [
  bodyParser.json(),
  graphqlExpress(function (req, res) {
    return {
      schema,
      context: { req, res },
      formatError(error) {
        const { originalError } = error
        if (originalError && originalError.name === 'SqliteError') {
          error.message = 'Internal Server Error'
          res.status(500)
        }
        return error
      },
    }
  })
]
