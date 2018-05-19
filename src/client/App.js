import React, { Component, Fragment } from 'react'
import Login from './components/Login'
import Bars from './components/Bars'


export default class extends Component {
  render() {
    return (
      <Fragment>
        <div className="my2 center"><Login /></div>
        <Bars />
      </Fragment>
    )
  }
}

