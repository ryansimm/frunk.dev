import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './NavBar.css'
import logo from '../../assets/logo.png'


const NavBar = ({ userLevel, tokenBalance = 0, isAuthenticated, isAdmin, onLogout }) => {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleNavigate = (path) => {
    navigate(path)
    setIsMenuOpen(false)
  }

  const handleLogout = () => {
    onLogout()
    setIsMenuOpen(false)
  }

  return (
    <nav className = "container-2" data-user-level={userLevel || ''}>
        <button onClick={() => handleNavigate('/')}><img src = {logo} alt = "Logo" className = "logo"/></button>
        <button
          className="nav-menu-toggle"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
        
        <ul className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
            {!isAuthenticated && (
              <li><button className="nav-action" onClick={() => handleNavigate('/login')}>Login</button></li>
            )}

            {isAuthenticated && (
              <>
                <li><button className="nav-action" onClick={() => handleNavigate('/game-home')}>Race</button></li>
                <li><button className="nav-action" onClick={() => handleNavigate('/garage')}>Garage</button></li>
                <li><button className="nav-action" onClick={() => handleNavigate('/challenges')}>Challenges</button></li>
                <li><button className="nav-action" onClick={() => handleNavigate('/profile')}>Profile</button></li>
                {isAdmin && <li><button className="nav-action" onClick={() => handleNavigate('/admin/users/create')}>Admin</button></li>}
                <li><span className="token-display">Tokens: {tokenBalance}</span></li>
                <li><button className="nav-action" onClick={handleLogout}>Logout</button></li>
              </>
            )}
        </ul>
    </nav>
  )
}

export default NavBar
