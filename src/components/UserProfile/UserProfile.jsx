import React, { useState, useEffect } from 'react'
import { apiService } from '../../services/api'
import './UserProfile.css'

const UserProfile = () => {
  const [user, setUser] = useState(null)
  const [results, setResults] = useState(null)
  const [progressStats, setProgressStats] = useState({ attempted: 0, correct: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await apiService.getCurrentUserProfile()
        setUser(profileData.user)
        setResults(profileData.latestResult)
        setProgressStats(profileData.progressStats || { attempted: 0, correct: 0 })
      } catch (loadError) {
        setError(loadError?.response?.data?.error || 'Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  if (isLoading) {
    return (
      <div className="user-profile-container">
        <p>Loading your profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="user-profile-container">
        <p>{error}</p>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="user-profile-container">
        <h2>{user?.name || 'Your'} Profile</h2>
        <div className="profile-card">
          <p className="profile-email">{user?.email}</p>
          <p>No aptitude test completed yet.</p>
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-label">Questions Attempted:</span>
              <span className="stat-value">{progressStats.attempted}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Correct Answers:</span>
              <span className="stat-value">{progressStats.correct}</span>
            </div>
          </div>
        </div>
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
        <p className="profile-email">{user?.email}</p>
        <div className="profile-level" style={{ color: levelColors[results.level] }}>
          <h3>{results.level} Level</h3>
          <p>{results.score}% Proficiency</p>
        </div>
        <div className="profile-stats">
          <div className="stat">
            <span className="stat-label">Questions Attempted:</span>
            <span className="stat-value">{progressStats.attempted}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Correct Answers:</span>
            <span className="stat-value">{progressStats.correct}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
