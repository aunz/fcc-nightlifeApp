import test from 'tape'
import { graphql, buildSchema } from 'graphql'


import { schema } from './index'
import db from '~/server/db/sqlite'

db.exec(require('~/server/db/createTable/dropTable.sql'))
db.exec(require('~/server/db/createTable/createTable.sql'))

// graphql(schema, query).then(r => console.log(r))
// .catch(e => console.error('\n\nERROR\n\n', e))

const s = { skip: true } // eslint-disable-line

