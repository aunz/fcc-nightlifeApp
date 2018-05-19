import ApolloClient from 'apollo-boost'
import gql from 'graphql-tag'

export const client = new ApolloClient({
  clientState: {
    resolvers: {
      Bar: {
        userGoing() {
          return null
        }
      }
    },
  },
  cacheRedirects: {}
})


export const LOGGED_IN_USER = gql`{ loggedInUser { id, gh_name, token } }`

export const GET_CLIENT_ID = gql`{ getClientId }`

export const GET_BARS = gql`query ($location: String!) {
  getBars(location: $location) {
    id
    name
    url
    rating
    price
    image_url
    location {
      address1
      address2
      address3
      city
    }
    going
    userGoing @client
  }
}`

export const GET_USER_GOING = gql`query ($ids: [String!]!, $token: String!) {
  getUserGoing(ids: $ids, token: $token) @connection(key: "userGoing")
}`

export const BAR_F1 = gql`fragment f on Bar { userGoing, going }`


export const LOGIN = gql`mutation ($provider: String!, $code: String!) {
  login(provider: $provider, code: $code) {
      id,
      gh_name,
      token
    }
}`

export const LOGOUT = gql`mutation ($token: String!) { logout(token: $token) }`

export const USER_GOTO_VENUE = gql`mutation ($id: String!, $token: String!, $negate: Boolean) {
  userGotoVenue(id: $id, token: $token, negate: $negate)
}`
