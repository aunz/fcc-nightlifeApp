import { parse, stringify } from 'querystring'
import React, { Component, Fragment } from 'react'

import { btn } from '~/client/styles'

export default class extends Component {
  constructor(props) {
    super(props)
    if (process.env.APP_ENV === 'server') return

    this.state = {
      loggedInUser: undefined,
      loading: false,
    }

    const { client, LOGIN, LOGGED_IN_USER } = require('~/client/apolloClient')
    const { get, set, del } = require('idb-keyval')

    const loginThenStore = (provider, code) => {
      this.setState({ loading: true })
      return client.mutate({
        mutation: LOGIN,
        variables: { provider, code },
        fetchPolicy: 'no-cache',
      }).then(({ data: { login } = {} }) => {
        if (!login || !login.token) {
          throw new Error('Error logging in')
        }
        this.setState({ loggedInUser: login })
        client.writeQuery({
          query: LOGGED_IN_USER,
          data: { loggedInUser: login }
        })
        return set('loggedInUser', login)
      }).catch(() => {
        del('loggedInUser')
        this.setState({ error: 'Login failed' })
      }).then(() => {
        this.setState({ loading: false })
      })
    }

    const href = window.location.href.split('?')
    const { code, state, ...restHref } = parse(href[1])

    // 1) check indexDB loggedInUser
    if (!code && !state) {
      get('loggedInUser').then(loggedInUser => {
        if (loggedInUser && loggedInUser.token) return loginThenStore('TOKEN', loggedInUser.token)
        client.writeQuery({
          query: LOGGED_IN_USER,
          data: { loggedInUser: { id: null, __typename: 'LoggedInUser', gh_name: null, token: null } }
        })
        return undefined
      })
      return
    }

    // 2) if there is a code or state in href (returned by GitHub)
    get('csrfToken')
      .then(token => code && state === token && loginThenStore('GH', code))
      .catch(() => {})
      .then(() => { del('csrfToken') })

    // 3) clean up the url, remove any querystring code or state returned by GitHub
    const newQs = stringify(restHref) // new query string
    const newUrl = href[0] + (newQs ? ('?' + newQs) : '')
    window.history.replaceState(null, null, newUrl)
  }
  logout = () => {
    if (process.env.APP_ENV === 'server') return

    const { client, LOGOUT } = require('~/client/apolloClient')
    const { token } = this.state.loggedInUser
    require('idb-keyval').del('loggedInUser')
    client.mutate({
      mutation: LOGOUT,
      variables: { token }
    }).then(() => {})
      .catch(() => {})
      .then(() => { window.location.reload() })
  }
  render() {
    if (process.env.APP_ENV === 'server') return null
    const { loading, error, loggedInUser } = this.state

    if (loading) return <span className="icon-spin6 animate-spin" />
    if (error) return (
      <Fragment>
        <span>{error}</span>
        <button
          className={btn + ' bold circle red'}
          onClick={() => { this.setState({ error: undefined }) }}
        >
          ✖
        </button>
      </Fragment>
    )
    if (loggedInUser) {
      return (
        <Fragment>
          <span id="loggedInUser">Hi, {loggedInUser.gh_name || 'Mysterion'}!</span>
          <button
            id="logout"
            className={'ml2 icon-logout pointer absolute ' + btn}
            onClick={this.logout}
          />
        </Fragment>
      )
    }
    return (
      <a
        id="login" // this id is linked to integration test
        href="/"
        rel="noopener nofollow"
        className="text-decoration-none"
        onClick={e => {
          if (process.env.APP_ENV === 'server') return

          // create a csrf token before sending off to GitHub
          e.preventDefault()

          const { client, GET_CLIENT_ID } = require('~/client/apolloClient')
          const { set } = require('idb-keyval')

          const query = client.query({ query: GET_CLIENT_ID })
          const csrfToken = Array.from(window.crypto.getRandomValues(new Uint8Array(21)))
            .map(d => ('0' + d.toString(16)).slice(-2))
            .join('')

          query.then(({ data: { getClientId } }) => {
            set('csrfToken', csrfToken).then(() => {
              window.location.href = 'https://github.com/login/oauth/authorize?' + stringify({
                client_id: getClientId,
                redirect_uri: window.location.origin + window.location.pathname,
                state: csrfToken,
              })
            })
          })
        }}
      >
        Login with <b>GitHub</b>
      </a>
    )
  }
}

