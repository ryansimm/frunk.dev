import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './GameHome.css'
import logo from '../../assets/logo.png'

const STATS_KEY = 'garagePerformanceStats'
const PERFORMANCE_KEYS = ['Acceleration', 'Handling', 'Braking', 'Top Speed']
const DEFAULT_STATS = {
  Acceleration: 50,
  Handling: 50,
  Braking: 50,
  'Top Speed': 50
}

const TRACKS = [
  { id: 1, name: 'Python Valley', difficulty: 'Easy' },
  { id: 2, name: 'Logic Loop', difficulty: 'Medium' },
  { id: 3, name: 'Algorithm Alpine', difficulty: 'Hard' },
  { id: 4, name: 'Data Desert', difficulty: 'Expert' },
  { id: 5, name: 'Syntax Springs', difficulty: 'Easy' },
  { id: 6, name: 'Debug Drive', difficulty: 'Medium' }
]

const CARS = [
  { id: 1, name: 'Jett Stream', level: 'Beginner' },
]

const readPerformanceStats = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) || '{}')
    return {
      Acceleration: Number(raw?.Acceleration ?? DEFAULT_STATS.Acceleration),
      Handling: Number(raw?.Handling ?? DEFAULT_STATS.Handling),
      Braking: Number(raw?.Braking ?? DEFAULT_STATS.Braking),
      'Top Speed': Number(raw?.['Top Speed'] ?? DEFAULT_STATS['Top Speed'])
    }
  } catch {
    return DEFAULT_STATS
  }
}

const GameHome = () => {
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0)
  const [selectedCar] = useState(CARS[0])
  const performanceStats = useMemo(() => readPerformanceStats(), [])
  const navigate = useNavigate()
  const selectedTrack = TRACKS[selectedTrackIndex]

  const handlePreviousTrack = () => {
    setSelectedTrackIndex((prevIndex) => (
      (prevIndex - 1 + TRACKS.length) % TRACKS.length
    ))
  }

  const handleNextTrack = () => {
    setSelectedTrackIndex((prevIndex) => (
      (prevIndex + 1) % TRACKS.length
    ))
  }

  const previousTrack = TRACKS[(selectedTrackIndex - 1 + TRACKS.length) % TRACKS.length]
  const nextTrack = TRACKS[(selectedTrackIndex + 1) % TRACKS.length]

  return (
    <div className="game-home-container">
      <div className="game-home-card">
        {/* Action Buttons */}
        <div className="action-buttons-section">
          <button 
            className="action-btn earn-btn"
            onClick={() => navigate('/challenges')}
          >
            Earn Tokens
          </button>
          <button
            className="action-btn"
            onClick={() => navigate('/garage')}
          >
            Enter Garage
          </button>
        </div>

        <div className="game-content">
          <div className="track-section">
            <h2>Select Track</h2>
            <div className="track-selector-layout">
              <div className="track-wheel-controls">
                <button className="carousel-nav" onClick={handlePreviousTrack}>
                  {'<'}
                </button>

                <div className="track-wheel" aria-live="polite">
                  <button className="track-wheel-item adjacent" onClick={handlePreviousTrack}>
                    <div className="track-logo">
                      <img src={logo} alt={previousTrack.name} />
                    </div>
                    <h3>{previousTrack.name}</h3>
                  </button>

                  <div className="track-wheel-item selected">
                    <div className="track-logo">
                      <img src={logo} alt={selectedTrack.name} />
                    </div>
                    <h3>{selectedTrack.name}</h3>
                    <p className={`difficulty ${selectedTrack.difficulty.toLowerCase()}`}>
                      {selectedTrack.difficulty}
                    </p>
                  </div>

                  <button className="track-wheel-item adjacent" onClick={handleNextTrack}>
                    <div className="track-logo">
                      <img src={logo} alt={nextTrack.name} />
                    </div>
                    <h3>{nextTrack.name}</h3>
                  </button>
                </div>

                <button className="carousel-nav" onClick={handleNextTrack}>
                  {'>'}
                </button>
              </div>

              <div className="track-info">
                <h3>{selectedTrack.name}</h3>
                <p>Difficulty: <span className={`difficulty ${selectedTrack.difficulty.toLowerCase()}`}>{selectedTrack.difficulty}</span></p>
              </div>
            </div>
          </div>

          {/* Right Side - Car Section */}
          <div className="car-section">
            <h2>Your Car</h2>
            
            <div className="car-display">
              <div className="car-placeholder">
                <img src={logo} alt={selectedCar.name} />
              </div>
            </div>

            <div className="car-info">
              <h3>{selectedCar.name}</h3>
              <div className="car-stats-list">
                {PERFORMANCE_KEYS.map((statKey) => (
                  <div key={statKey} className="car-stat-row">
                    <div className="car-stat-meta">
                      <span>{statKey}</span>
                      <strong>{performanceStats[statKey]}</strong>
                    </div>
                    <div className="car-stat-track" aria-hidden="true">
                      <div
                        className="car-stat-fill"
                        style={{ width: `${performanceStats[statKey]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="car-action-row">
              <button 
                className="customize-btn"
                onClick={() => navigate('/garage')}
              >
                Customise Car
              </button>
              <button 
                className="action-btn race-btn start-race-btn"
                onClick={() => {
                  localStorage.setItem('gameSelection', JSON.stringify({
                    track: selectedTrack,
                    car: selectedCar,
                    startedAt: new Date().toISOString()
                  }))
                  navigate('/race')
                }}
              >
                Start Race
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameHome
