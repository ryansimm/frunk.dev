import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar/NavBar'
import Body from './components/Body/Body'
import Sections from './components/Sections/Sections'
import AptitudeTest from './components/AptitudeTest/AptitudeTest'
import UserProfile from './components/UserProfile/UserProfile'
import { getAptitudeResults } from './utils/levelSystem'
import { apiService } from './services/api'

const AppContent = () => {
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
        const freshBalance = Number(tokenData.tokenBalance || 0)

        setTokenBalance(freshBalance)
        localStorage.setItem('user', JSON.stringify({
          ...parsedUser,
          tokenBalance: freshBalance
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
  }

  return (
    <div>
      <NavBar userLevel={userLevel} tokenBalance={tokenBalance} />
      <Routes>
        <Route path="/" element={
          <>
            <Body />
            <div className="container"><Sections /></div>
          </>
        } />
        <Route path="/aptitude-test" element={
          <AptitudeTest onTestComplete={handleTestComplete} />
        } />
        <Route path="/profile" element={<UserProfile />} />
      </Routes>
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