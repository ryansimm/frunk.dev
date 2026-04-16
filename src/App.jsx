import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar/NavBar'
import Body from './components/Body/Body'
import Sections from './components/Sections/Sections'
import AptitudeTest from './components/AptitudeTest/AptitudeTest'
import UserProfile from './components/UserProfile/UserProfile'
import Login from './components/Login/Login'
import Challenges from './components/Challenges/Challenges'
import GameHome from './components/GameHome/GameHome'
import TheGarage from './components/TheGarage/TheGarage'
import RaceView from './components/RaceView/RaceView'
import AdminCreateUser from './components/AdminCreateUser/AdminCreateUser'
import { getAptitudeResults } from './utils/levelSystem'
import { apiService } from './services/api'

console.log("KEY:", import.meta.env.VITE_GOOGLE_API_KEY);

const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

const AdminRoute = ({ isAuthenticated, isAdmin, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('authToken') && localStorage.getItem('user'))
  })

  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      return userData?.role === 'admin'
    } catch {
      return false
    }
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
    const syncAuthState = () => {
      const hasAuth = Boolean(localStorage.getItem('authToken') && localStorage.getItem('user'))
      setIsAuthenticated(hasAuth)

      if (!hasAuth) {
        setTokenBalance(0)
        setHasCompletedAptitude(false)
        setIsAdmin(false)
        return
      }

      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}')
        setTokenBalance(Number(userData?.tokenBalance || 0))
        setHasCompletedAptitude(Boolean(userData?.aptitudeCompleted))
        setIsAdmin(userData?.role === 'admin')
      } catch {
        setTokenBalance(0)
        setHasCompletedAptitude(false)
        setIsAdmin(false)
      }
    }

    const handleStorageChange = () => {
      syncAuthState()
    }

    const handleAuthChange = () => {
      syncAuthState()
    }

    syncAuthState()

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('authStateChanged', handleAuthChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authStateChanged', handleAuthChange)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

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
        setIsAdmin(profileData?.user?.role === 'admin')
        localStorage.setItem('user', JSON.stringify({
          ...parsedUser,
          role: profileData?.user?.role || parsedUser.role,
          tokenBalance: freshBalance,
          aptitudeCompleted
        }))
      } catch (error) {
        console.error('Failed to sync token balance:', error)
      }
    }

    syncTokenBalance()
  }, [isAuthenticated])

  useEffect(() => {
    const onTokenUpdate = (event) => {
      const nextBalance = Number(event?.detail?.tokenBalance)
      if (!Number.isFinite(nextBalance)) {
        return
      }

      setTokenBalance(nextBalance)

      const userData = localStorage.getItem('user')
      if (!userData) {
        return
      }

      const parsedUser = JSON.parse(userData)
      localStorage.setItem('user', JSON.stringify({
        ...parsedUser,
        tokenBalance: nextBalance
      }))
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
    setIsAdmin(false)
    setIsAuthenticated(false)
  }

  return (
    <div className="app-shell">
      <NavBar
        userLevel={userLevel}
        tokenBalance={tokenBalance}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
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
          <Route path="/game-home" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <GameHome />
            </ProtectedRoute>
          } />
          <Route path="/garage" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <TheGarage />
            </ProtectedRoute>
          } />
          <Route path="/race" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RaceView />
            </ProtectedRoute>
          } />
          <Route path="/admin/users/create" element={
            <AdminRoute isAuthenticated={isAuthenticated} isAdmin={isAdmin}>
              <AdminCreateUser />
            </AdminRoute>
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