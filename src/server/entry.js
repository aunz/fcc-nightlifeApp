if (process.env.NODE_ENV === 'production') {
  // make sure tables exist
  const db = require('./db/sqlite').default
  db.prepare('select 1 from "user" limit 1').get()
  db.prepare('select 1 from "venue" limit 1').get()
}


require('dotenv').config()
require('./app')
