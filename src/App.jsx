import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar/NavBar'
import Body from './components/Body/Body'
import Sections from './components/Sections/Sections'
import AptitudeTest from './components/AptitudeTest/AptitudeTest'
import UserProfile from './components/UserProfile/UserProfile'
import { getAptitudeResults } from './utils/levelSystem'

const AppContent = () => {
  const [userLevel, setUserLevel] = useState(() => {
    const results = getAptitudeResults()
    return results?.level || null
  })

  const handleTestComplete = (results) => {
    setUserLevel(results.level)
  }

  return (
    <div>
      <NavBar userLevel={userLevel} />
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