import React, { Component } from 'react'
import { Link } from 'react-router-dom'

export default class extends Component {
  render() {
    return (
      <header>
        <Link to="/" className="block p1 text-decoration-none center">
          <h2 className="m0">Nightlife Coordination App</h2>
          <h6 className="m0">―a FreeCodeCamp Project</h6>
        </Link>
      </header>
    )
  }
}