import { stringify } from 'querystring'
import fetch from 'node-fetch'

export default function (
  client_id = process.env.GH_CLIENT_ID || (throw new Error('GH Client ID is required')),
  client_secret = process.env.GH_CLIENT_SECRET || (throw new Error('GH Client SECRET is required')),
) {
  const urlCode = 'https://github.com/login/oauth/access_token?' + stringify({
    client_id,
    client_secret,
  }) + '&code='

  const urlToken = 'https://api.github.com/user?access_token='

  return async function (code) {
    if (process.env.NODE_ENV === 'development' && /^test/i.test(code)) return { id: code, gh_name: 'gh_name' + code }

    const access_token_response = await fetch(urlCode + code, {
      method: 'post',
      headers: { Accept: 'application/json' },
    }).then(body => body.json()) // the body.status === 200 even there is an error in the authorization code

    if (access_token_response.error) {
      if (process.env.NODE_ENV === 'development') console.log(access_token_response.error)
      throw new Error(access_token_response.error)
    }

    const resource_response = await fetch(urlToken + access_token_response.access_token)
    if (!resource_response.ok) throw new Error('GitHub: access token invalid')

    const user = await resource_response.json()
    if (!user.id) throw new Error('GitHub: cannot retrieve user id') // something wrong

    return user
  }
}

