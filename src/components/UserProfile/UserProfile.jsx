import React, { useState, useEffect } from 'react'
import { getAptitudeResults } from '../../utils/levelSystem'
import './UserProfile.css'

const UserProfile = () => {
  const [results, setResults] = useState(null)

  useEffect(() => {
    const stored = getAptitudeResults()
    setResults(stored)
  }, [])

  if (!results) {
    return (
      <div className="user-profile-container">
        <p>No aptitude test completed yet.</p>
      </div>
    )
  }

  const levelColors = {
    'Beginner': '#4CAF50',
    'Intermediate': '#2196F3',
    'Advanced': '#FF9800',
    'Professional': '#9C27B0'
  }

  return (
    <div className="user-profile-container">
      <h2>Your Profile</h2>
      <div className="profile-card">
        <div className="profile-level" style={{ color: levelColors[results.level] }}>
          <h3>{results.level} Level</h3>
          <p>{results.score}% Proficiency</p>
        </div>
        <div className="profile-stats">
          <div className="stat">
            <span className="stat-label">Correct Answers:</span>
            <span className="stat-value">{results.correctAnswers}/{results.totalQuestions}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Test Date:</span>
            <span className="stat-value">{new Date(results.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
