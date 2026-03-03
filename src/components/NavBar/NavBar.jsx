import React from 'react'
import { useNavigate } from 'react-router-dom'
import './NavBar.css'
import logo from '../../assets/logo.png'


const NavBar = ({ userLevel, tokenBalance = 0 }) => {
  const navigate = useNavigate()

  return (
    <nav className = "container-2" data-user-level={userLevel || ''}>
        <button onClick={() => navigate('/')}><img src = {logo} alt = "Logo" className = "logo"/></button>
        
        <ul>
            <li><button className="button" onClick={() => navigate('/profile')}>Profile</button></li>
            <li><span className="token-display">Tokens: {tokenBalance}</span></li>
        </ul>
    </nav>
  )
}

export default NavBar
