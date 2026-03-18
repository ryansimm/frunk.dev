import React from 'react'
import { useNavigate } from 'react-router-dom'
import './NavBar.css'
import logo from '../../assets/logo.png'


const NavBar = ({ userLevel, tokenBalance = 0, isAuthenticated, onLogout }) => {
  const navigate = useNavigate()

  return (
    <nav className = "container-2" data-user-level={userLevel || ''}>
        <button onClick={() => navigate('/')}><img src = {logo} alt = "Logo" className = "logo"/></button>
        
        <ul>
            {!isAuthenticated && (
              <li><button className="nav-action" onClick={() => navigate('/login')}>Login</button></li>
            )}

            {isAuthenticated && (
              <>
                <li><button className="nav-action" onClick={() => navigate('/challenges')}>Challenges</button></li>
                <li><button className="nav-action" onClick={() => navigate('/profile')}>Profile</button></li>
                <li><span className="token-display">Tokens: {tokenBalance}</span></li>
                <li><button className="nav-action" onClick={onLogout}>Logout</button></li>
              </>
            )}
        </ul>
    </nav>
  )
}

export default NavBar
