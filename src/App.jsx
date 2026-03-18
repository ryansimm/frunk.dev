import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar/NavBar'
import Body from './components/Body/Body'
import Sections from './components/Sections/Sections'
import AptitudeTest from './components/AptitudeTest/AptitudeTest'
import UserProfile from './components/UserProfile/UserProfile'
import Login from './components/Login/Login'
import Challenges from './components/Challenges/Challenges'
import { getAptitudeResults } from './utils/levelSystem'
import { apiService } from './services/api'

console.log("KEY:", import.meta.env.VITE_GOOGLE_API_KEY);

const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('authToken') && localStorage.getItem('user'))
  })

  const [hasCompletedAptitude, setHasCompletedAptitude] = useState(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      return false
    }

    const parsedUser = JSON.parse(userData)
    return Boolean(parsedUser.aptitudeCompleted)
  })

  const [tokenBalance, setTokenBalance] = useState(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      return 0
    }

    const parsedUser = JSON.parse(userData)
    return Number(parsedUser.tokenBalance || 0)
  })

  const [userLevel, setUserLevel] = useState(() => {
    const results = getAptitudeResults()
    return results?.level || null
  })

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(Boolean(localStorage.getItem('authToken') && localStorage.getItem('user')))
    }

    const handleAuthChange = () => {
      setIsAuthenticated(Boolean(localStorage.getItem('authToken') && localStorage.getItem('user')))
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('authStateChanged', handleAuthChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authStateChanged', handleAuthChange)
    }
  }, [])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      return
    }

    const parsedUser = JSON.parse(userData)
    if (!parsedUser.userId) {
      return
    }

    const syncTokenBalance = async () => {
      try {
        const tokenData = await apiService.getUserTokenBalance(parsedUser.userId)
        const profileData = await apiService.getCurrentUserProfile()
        const freshBalance = Number(tokenData.tokenBalance || 0)
        const aptitudeCompleted = Boolean(profileData?.user?.aptitudeCompleted || profileData?.latestResult)

        setTokenBalance(freshBalance)
        setHasCompletedAptitude(aptitudeCompleted)
        localStorage.setItem('user', JSON.stringify({
          ...parsedUser,
          tokenBalance: freshBalance,
          aptitudeCompleted
        }))
      } catch (error) {
        console.error('Failed to sync token balance:', error)
      }
    }

    syncTokenBalance()
  }, [])

  useEffect(() => {
    const onTokenUpdate = (event) => {
      const nextBalance = Number(event?.detail?.tokenBalance || 0)
      setTokenBalance(nextBalance)
    }

    window.addEventListener('tokenBalanceUpdated', onTokenUpdate)
    return () => window.removeEventListener('tokenBalanceUpdated', onTokenUpdate)
  }, [])

  const handleTestComplete = (results) => {
    setUserLevel(results.level)
    setHasCompletedAptitude(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('authStateChanged'))
    setTokenBalance(0)
    setUserLevel(null)
    setHasCompletedAptitude(false)
    setIsAuthenticated(false)
  }

  return (
    <div className="app-shell">
      <NavBar
        userLevel={userLevel}
        tokenBalance={tokenBalance}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
      />
      <main className="app-content">
        <Routes>
          <Route path="/" element={
            <>
              <Body hasCompletedAptitude={hasCompletedAptitude} />
              <div className="container"><Sections /></div>
            </>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/aptitude-test" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AptitudeTest onTestComplete={handleTestComplete} />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <UserProfile />
            </ProtectedRoute>
          } />
          <Route path="/challenges" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Challenges />
            </ProtectedRoute>
          } />
          <Route path="*" element={
            <Navigate to={isAuthenticated ? '/' : '/login'} replace />
          } />
        </Routes>
      </main>
    </div>
  )
}

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App