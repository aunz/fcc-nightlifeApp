import fetch from 'node-fetch'

const { YELP_CLIENT_API_KEY } = process.env
if (!YELP_CLIENT_API_KEY) throw new Error('Need yelp client api key')

export default function (location) {
  return fetch('https://api.yelp.com/v3/businesses/search?categories=nightlife&limit=50&location=' + location, {
    headers: {
      Authorization: 'Bearer ' + YELP_CLIENT_API_KEY
    }
  }).then(r => r.json())
    .then(r => {
      if (r.error) throw new Error('LOCATION_NOT_FOUND')
      return r.businesses
    })
}

// { error:
//  { code: 'LOCATION_NOT_FOUND',
//    description: 'Could not execute search, try specifying a more exact location.' } }
