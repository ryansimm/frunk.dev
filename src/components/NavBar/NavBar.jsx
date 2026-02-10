import React from 'react'
import { useNavigate } from 'react-router-dom'
import './NavBar.css'
import logo from '../../assets/logo.png'


const NavBar = ({ userLevel }) => {
  const navigate = useNavigate()

  return (
    <nav className = "container-2">
        <button onClick={() => navigate('/')}><img src = {logo} alt = "Logo" className = "logo"/></button>
        
        <ul>
            <li><button className="button" onClick={() => navigate('/profile')}>Profile</button></li>
            <li><button className="button">Feedback</button></li>
        </ul>
    </nav>
  )
}

export default NavBar
