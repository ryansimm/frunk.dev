import React from 'react'
import './NavBar.css'
import crest from '../../assets/crest.jpg'

const NavBar = () => {
  return (
    <nav>
        <img src = {crest}></img>
        <ul>
            <li>Home</li>
            <li>How To Use</li>
            <li>About AI</li>
            <li>Programming</li>
            <li>Feedback</li>
        </ul>
    </nav>
  )
}

export default NavBar
