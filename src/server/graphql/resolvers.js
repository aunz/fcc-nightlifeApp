import { randomBytes } from 'crypto'

import getBusinessFromYelp from '~/server/yelp'
import {
  createAuthUser, getAndUpdateUserFromToken, updateUser, deleteToken,
  userGotoVenue,
  getGoing, getUserGoing,
} from '~/server/db/dbFunctions'

const authWithGitHub = require('~/server/OAuth').default()

const { GH_CLIENT_ID } = process.env

export default {
  Query: {
    async getBars(_, { location }) {
      if (!location) throw inputError()
      // const businesses = require('~/tmp/1.json').businesses
      const businesses = await getBusinessFromYelp(location)
      getGoing(businesses.map(e => e.id)).forEach(e => {
        businesses.forEach(b => {
          if (b.id === e.id) b.going = e.c
        })
      })

      return businesses
    },
    getClientId() {
      return GH_CLIENT_ID
    },
    getUserGoing(_, { ids, token }) {
      if (!ids.length) throw inputError()
      const user = getAndUpdateUserFromToken(token)
      if (!user) throw inputError()
      // return new Promise(res => setTimeout(res, 5000))
      return getUserGoing(user.id, ids)
    }
  },
  Mutation: {
    async login(_, { provider, code }) {
      if (!provider || !code) throw inputError()

      // need to protect these from spam
      if (provider === 'GH') {
        const { id, name } = await authWithGitHub(code)
        const uid = createAuthUser('gh', id, { gh_name: name })
        const token = (await randomBytes(21)).toString('base64') // a random token to be sent to client
        const user = { id: uid, token, gh_name: name }
        updateUser(user)
        return user
      }
      if (provider === 'TOKEN') {
        const user = getAndUpdateUserFromToken(code)
        if (!user) throw inputError()
        user.token = code
        return user
      }

      throw inputError()
    },
    async logout(_, { token }) {
      if (!token) return undefined
      return deleteToken(token)
    },
    async userGotoVenue(_, { id, token, negate = false }) {
      if (!id || !token) inputError()
      const user = getAndUpdateUserFromToken(token)
      if (!user) throw inputError()
      return userGotoVenue(user.id, id, negate)
    },
  },
}


function inputError() {
  return new Error('Input Error')
}
