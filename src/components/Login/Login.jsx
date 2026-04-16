import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../../services/api'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const hasAuth = Boolean(localStorage.getItem('authToken') && localStorage.getItem('user'))
    if (hasAuth) {
      navigate('/profile')
    }
  }, [navigate])

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await apiService.login(email.trim(), password)
      localStorage.setItem('authToken', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      window.dispatchEvent(new Event('authStateChanged'))
      navigate('/profile')
    } catch (loginError) {
      setError(loginError?.response?.data?.error || loginError?.message || 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <h1>Welcome Back</h1>
        <p>Login to access your personal profile and aptitude results.</p>

        <form onSubmit={handleLoginSubmit} className="login-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
