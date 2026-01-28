import React from 'react'
import './NavBar.css'
import logo from '../../assets/logo.png'


const NavBar = () => {
  return (
    <nav className = "container-2">
        <img src = {logo} alt = "Logo" className = "logo"/>
        <ul>
            <li><button className="button">Feedback</button></li>
        </ul>
    </nav>
  )
}

export default NavBar
