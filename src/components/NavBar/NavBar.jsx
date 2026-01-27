import React from 'react'
import './NavBar.css'
import crest from '../../assets/crest.jpg'
import {Link} from 'react-router-dom'

const NavBar = () => {
  return (
    <nav className = "container">
        <img src = {crest} alt = "University Crest" className = "logo"/>
        <ul>
            <li>Home</li>
            <li>How To Use</li>
            <li>About AI</li>
            <li>Programming</li>
            <li><button className="btn">Feedback</button></li>
        </ul>
    </nav>
  )
}

export default NavBar
