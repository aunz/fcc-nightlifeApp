import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'

import styles from './Bars.local.css'
import { btn } from '~/client/styles/index'

export default class extends Component {
  constructor(props) {
    super(props)
    this.state = {
      location: '',
      loadingSearchTerm: false,
      loadingUserGoing: false,
      errorMessage: '',
      bars: [],
      loggedInUser: undefined,
    }
    if (process.env.APP_ENV === 'server') return
    const { client, LOGGED_IN_USER } = require('~/client/apolloClient')

    // 1) init location
    const { get, set } = require('idb-keyval')
    get('location').then(location => {
      if (!location) return fetch('https://json.geoiplookup.io/').then(r => r.json()).then(r => r.city).catch(() => {})
      return location
    }).then(location => {
      if (location) {
        set('location', location)
        if (this.unmounted) return
        if (this.mounted) this.setState({ location })
        else this.state.location = location
        this.search()
      }
    }).catch(() => {})

    // 2) watch the user logging in
    this.watchUserLoggingIn = client.watchQuery({
      query: LOGGED_IN_USER,
      fetchPolicy: 'cache-only',
    }).subscribe({
      next: ({ data: { loggedInUser } }) => {
        if (this.unmounted) return
        this.setState({ loggedInUser })
        if (!loggedInUser || !loggedInUser.token) return
        this.getUserGoing()
      }
    })
  }
  componentDidMount() {
    this.mounted = true
  }
  componentWillUnmount() {
    this.unmounted = true
    this.watchUserLoggingIn.unsubscribe()
    this.watchUserLoggingIn = null
  }
  onChange = e => {
    this.setState({ location: e.currentTarget.value })
  }
  getUserGoing(ids) {
    if (process.env.APP_ENV === 'server') return
    ids = ids || this.state.bars.filter(el => el.userGoing === null).map(el => el.id)
    if (!ids.length) return

    const token = this.state.loggedInUser && this.state.loggedInUser.token
    if (!token) return

    const { client, GET_USER_GOING, BAR_F1 } = require('~/client/apolloClient')

    this.setState({ loadingUserGoing: true })
    client.query({
      query: GET_USER_GOING,
      variables: { ids, token },
      fetchPolicy: 'no-cache',
    }).then(({ data: { getUserGoing } }) => {
      ids.forEach(id => {
        const fragment = {
          id: 'Bar:' + id,
          fragment: BAR_F1
        }
        const f = client.readFragment(fragment)
        fragment.data = {
          ...f,
          userGoing: getUserGoing.includes(id)
        }
        client.writeFragment(fragment)
      })

      this.setState({
        bars: this.state.bars.map(el => {
          if (!ids.includes(el.id)) return el
          return {
            ...el,
            userGoing: getUserGoing.includes(el.id)
          }
        })
      })
    }).catch(e => {
      console.log('Error loading user going', e)
      this.setState({ errorMessage: 'Oops, something went wrong' })
    }).then(() => {
      this.setState({ loadingUserGoing: false })
    })
  }
  search = e => {
    if (process.env.APP_ENV === 'server') return
    if (e) e.preventDefault()

    const location = this.state.location.trim()
    if (!location) return

    this.setState({ errorMessage: '', loadingSearchTerm: true })

    const { client, GET_BARS } = require('~/client/apolloClient')
    client.query({
      query: GET_BARS,
      variables: { location },
    }).then(({ data: { getBars } }) => {
      this.setState({ bars: getBars })
      this.getUserGoing()
      require('idb-keyval').set('location', location)
    }).catch(err => {
      console.log('Something wrong getBars', err)
      console.dir(err)
      const errorMessage = /LOCATION_NOT_FOUND$/.test(err.message) ?
        `The location "${location}" cannot be found, try something else` :
        'Oops, something went wrong!'

      this.setState({ errorMessage })
    }).then(() => {
      this.setState({ loadingSearchTerm: false })
    })
  }

  render() {
    const { location, errorMessage, bars, loggedInUser } = this.state
    const loading = this.state.loadingSearchTerm || this.state.loadingUserGoing
    const token = loggedInUser && loggedInUser.token
    return (
      <Fragment>
        <form
          className="flex mx-auto "
          style={{ maxWidth: '40rem' }}
          onSubmit={this.search}
        >
          <input
            className={styles['search-bar'] + ' flex-auto block p1 outline-none bg-transparent border border-white appearance-none center'}
            value={location}
            onChange={this.onChange}
            type="search"
            placeholder="Type a city here"
            autoFocus // eslint-disable-line
          />
          <input
            className={styles['search-submit'] + ' ml1 bg-transparent border-none outline-none pointer ' + (loading ? 'animate-spin' : '')}
            style={{ fontFamily: 'fontello' }}
            disabled={loading}
            type="submit"
            value={loading ? '\ue839' : '\ue800'}
          />
        </form>
        <div className="flex my1 justify-center items-center italic">
          <ErrorMessage errorMessage={errorMessage} onClick={() => { this.setState({ errorMessage: '' }) }} />
        </div>
        <div className="flex flex-wrap my2 justify-center items-center center">
          {bars.map(bar => <Bar key={bar.id} bar={bar} token={token} />)}
        </div>
      </Fragment>
    )
  }
}


class Bar extends Component {
  static propTypes = {
    bar: PropTypes.object.isRequired, // eslint-disable-line
    token: PropTypes.string, // when token is undefined, it's still logggin in, when token is null, it's no user
  }
  state = {
    loading: false,
    errorMessage: '',
    going: this.props.bar.going || 0,
    userGoing: false,
  }
  onClick = () => {
    if (process.env.APP_ENV === 'server') return
    const { token, bar: { id } } = this.props
    if (!token) {
      const login = document.getElementById('login')
      if (!login) return
      login.click()
      return
    }

    const { client, USER_GOTO_VENUE, BAR_F1 } = require('~/client/apolloClient')

    const userGoing = this.state.userGoing || this.props.bar.userGoing

    this.setState({ loading: true })
    client.mutate({
      mutation: USER_GOTO_VENUE,
      variables: { id, token, negate: userGoing },
      fetchPolicy: 'no-cache',
    }).then(({ data: { userGotoVenue } }) => {
      if (!userGotoVenue) return
      const fragment = {
        id: 'Bar:' + id,
        fragment: BAR_F1
      }
      const f = client.readFragment(fragment)
      const going = f.going + (userGoing ? -1 : 1)
      fragment.data = {
        ...f,
        going,
        userGoing: !userGoing,
      }
      client.writeFragment(fragment)
      this.setState({ going, userGoing: !userGoing })
    }).catch(e => {
      console.log('Error userGoing to venue', e)
      this.setState({ errorMessage: 'Oops there is an error' })
    }).then(() => {
      this.setState({ loading: false })
    })
  }
  render() {
    const { id, name, url, rating, price, image_url, location, } = this.props.bar
    const { token } = this.props
    const classNameBar = styles['card'] + ' flex flex-column m2 p1 border border-color1-l bg-color1-l'
    const { errorMessage, going } = this.state
    const loading = token === undefined || this.state.loading
    const userGoing = this.state.userGoing || this.props.bar.userGoing
    return (
      <div
        key={id}
        className={classNameBar}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener"
          className="text-decoration-none"
        >
          <h3 className={styles['name'] + ' my0 center'}>{name}</h3>
        </a>
        <div>
          <b className="mr1 yellow h3">★</b>
          <span>{rating}</span>
          <span className="ml3">{price}</span>
        </div>
        <img src={image_url} alt="" className={styles['image']} />
        <span className="mt1">{locationToString(location)}</span>
        <div
          className="flex justify-between mt-auto pt1 px1 border-top border-silver "
          style={{ marginLeft: '-0.5rem', marginRight: '-0.5rem' }}
        >
          <span>{going} going</span>
          {errorMessage ?
            <ErrorMessage errorMessage={errorMessage} onClick={() => { this.setState({ errorMessage: '' }) }} /> :
            loading ?
              <span className="icon-spin6 animate-spin " /> :
              <button
                className={btn + ' bold pointer p0'}
                onClick={this.onClick}
                disabled={loading}
              >
                {token ? (userGoing ? 'You are going' : 'Count me in') : 'Login'}
              </button>
          }
        </div>
      </div>
    )
  }
}

function ErrorMessage({ errorMessage, onClick }) {
  return errorMessage && (
    <Fragment>
      <span className="red">{errorMessage}</span>
      <button
        className={btn + ' p0 bold '}
        onClick={onClick}
      >
        ✖
      </button>
    </Fragment>
  )
}

function locationToString(location) {
  const sep = ' '
  return location.address1 + sep + location.address2 + sep + location.address3 + sep + location.city
}
