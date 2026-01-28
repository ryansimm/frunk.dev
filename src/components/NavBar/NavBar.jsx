import React from 'react'
import './NavBar.css'
import logo from '../../assets/logo.png'


const NavBar = () => {
  return (
    <nav className = "container">
        <img src = {logo} alt = "University Crest" className = "logo"/>
        <ul>
            <li>Home</li>
            <li>How To Use</li>
            <li>About AI</li>
            <li>Programming</li>
            <li><button className="button">Feedback</button></li>
        </ul>
    </nav>
  )
}

export default NavBar
