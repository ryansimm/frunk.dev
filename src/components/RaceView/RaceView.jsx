import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './RaceView.css'
import logo from '../../assets/logo.png'

const PERFORMANCE_KEYS = ['Acceleration', 'Handling', 'Braking', 'Top Speed']
const STATS_KEY = 'garagePerformanceStats'
const DEFAULT_STATS = {
  Acceleration: 50,
  Handling: 50,
  Braking: 50,
  'Top Speed': 50
}

const OPPONENTS = [
  { id: 'opponent-1', name: 'Pheonix Labs' },
  { id: 'opponent-2', name: 'Apex Labs' },
  { id: 'opponent-3', name: 'Neon Racing' }
]

const readGameSelection = () => {
  try {
    const selection = JSON.parse(localStorage.getItem('gameSelection') || '{}')
    const savedCarName = selection?.car?.name
    const carName = savedCarName === 'Swift Starter' ? 'Jett Stream' : savedCarName
    return {
      trackName: selection?.track?.name || 'Python Valley',
      trackDifficulty: selection?.track?.difficulty || 'Easy',
      carName: carName || 'Jett Stream'
    }
  } catch {
    return {
      trackName: 'Python Valley',
      trackDifficulty: 'Easy',
      carName: 'Jett Stream'
    }
  }
}

const readPerformanceStats = () => {
  try {
    const stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{}')
    return {
      Acceleration: Number(stats?.Acceleration ?? DEFAULT_STATS.Acceleration),
      Handling: Number(stats?.Handling ?? DEFAULT_STATS.Handling),
      Braking: Number(stats?.Braking ?? DEFAULT_STATS.Braking),
      'Top Speed': Number(stats?.['Top Speed'] ?? DEFAULT_STATS['Top Speed'])
    }
  } catch {
    return DEFAULT_STATS
  }
}

const getStatWeights = (difficulty) => {
  const normalised = String(difficulty || '').toLowerCase()

  if (normalised === 'expert') {
    return {
      Acceleration: 0.008,
      Handling: 0.015,
      Braking: 0.014,
      'Top Speed': 0.01
    }
  }

  if (normalised === 'hard') {
    return {
      Acceleration: 0.009,
      Handling: 0.013,
      Braking: 0.012,
      'Top Speed': 0.011
    }
  }

  if (normalised === 'medium') {
    return {
      Acceleration: 0.011,
      Handling: 0.008,
      Braking: 0.007,
      'Top Speed': 0.014
    }
  }

  return {
    Acceleration: 0.012,
    Handling: 0.004,
    Braking: 0.003,
    'Top Speed': 0.016
  }
}

const getOpponentProfiles = (difficulty) => {
  const normalised = String(difficulty || '').toLowerCase()

  const templates = {
    easy: [
      { Acceleration: 52, Handling: 51, Braking: 51, 'Top Speed': 53 },
      { Acceleration: 53, Handling: 52, Braking: 52, 'Top Speed': 54 },
      { Acceleration: 54, Handling: 53, Braking: 53, 'Top Speed': 55 }
    ],
    medium: [
      { Acceleration: 57, Handling: 55, Braking: 55, 'Top Speed': 58 },
      { Acceleration: 58, Handling: 56, Braking: 56, 'Top Speed': 59 },
      { Acceleration: 59, Handling: 57, Braking: 57, 'Top Speed': 60 }
    ],
    hard: [
      { Acceleration: 62, Handling: 61, Braking: 61, 'Top Speed': 63 },
      { Acceleration: 64, Handling: 62, Braking: 62, 'Top Speed': 64 },
      { Acceleration: 65, Handling: 63, Braking: 63, 'Top Speed': 65 }
    ],
    expert: [
      { Acceleration: 68, Handling: 67, Braking: 67, 'Top Speed': 69 },
      { Acceleration: 70, Handling: 68, Braking: 68, 'Top Speed': 70 },
      { Acceleration: 72, Handling: 69, Braking: 69, 'Top Speed': 71 }
    ]
  }

  return templates[normalised] || templates.easy
}

const getCarDuration = (stats, difficulty) => {
  const statWeights = getStatWeights(difficulty)
  const speedMultiplier = getDifficultyMultiplier(difficulty)

  let totalBoost = 0
  PERFORMANCE_KEYS.forEach((key) => {
    const statDelta = Number(stats[key] || DEFAULT_STATS[key]) - 50
    totalBoost += statDelta * statWeights[key]
  })

  const rawDuration = (8.8 * speedMultiplier) - totalBoost
  return Number(Math.min(10.5, Math.max(6.5, rawDuration)).toFixed(2))
}

const getDifficultyMultiplier = (difficulty) => {
  const normalised = String(difficulty || '').toLowerCase()
  if (normalised === 'expert') return 0.9
  if (normalised === 'hard') return 0.95
  if (normalised === 'medium') return 1
  return 1.05
}

const getVarianceWindow = (difficulty) => {
  const normalised = String(difficulty || '').toLowerCase()
  if (normalised === 'expert') return 0.34
  if (normalised === 'hard') return 0.28
  if (normalised === 'medium') return 0.22
  return 0.16
}

const getRandomInRange = (min, max) => (Math.random() * (max - min)) + min

const withRaceVariance = (baseDuration, difficulty, handling = 50, braking = 50) => {
  const window = getVarianceWindow(difficulty)
  const stability = ((handling - 50) * 0.0025) + ((braking - 50) * 0.0015)
  const adjustedWindow = Math.max(0.05, window - stability)
  const randomOffset = getRandomInRange(-adjustedWindow, adjustedWindow)
  return Number(Math.min(10.5, Math.max(6.5, baseDuration + randomOffset)).toFixed(2))
}

const RaceView = () => {
  const [replayKey, setReplayKey] = useState(0)
  const [results, setResults] = useState([])

  const selection = useMemo(() => readGameSelection(), [])
  const performanceStats = useMemo(() => readPerformanceStats(), [])
  const statWeights = useMemo(() => getStatWeights(selection.trackDifficulty), [selection.trackDifficulty])
  const opponentProfiles = useMemo(() => (
    getOpponentProfiles(selection.trackDifficulty).map((stats, index) => ({
      ...OPPONENTS[index],
      stats,
      duration: getCarDuration(stats, selection.trackDifficulty),
      isPlayer: false,
      team: 'Opponent'
    }))
  ), [selection.trackDifficulty])

  const speedMultiplier = getDifficultyMultiplier(selection.trackDifficulty)
  const playerStatBoost = useMemo(() => {
    let total = 0

    PERFORMANCE_KEYS.forEach((key) => {
      const statDelta = performanceStats[key] - 50
      const bonus = statDelta * statWeights[key]
      total += bonus
    })

    return Number(total.toFixed(2))
  }, [performanceStats, statWeights])

  const rawPlayerDuration = (8.8 * speedMultiplier) - playerStatBoost
  const playerDuration = Number(Math.min(10.5, Math.max(6.5, rawPlayerDuration)).toFixed(2))

  const raceFinished = results.length > 0

  useEffect(() => {
    const racers = [
      {
        id: 'player',
        name: selection.carName,
        team: 'You',
        duration: withRaceVariance(
          playerDuration,
          selection.trackDifficulty,
          performanceStats.Handling,
          performanceStats.Braking
        ),
        isPlayer: true
      },
      ...opponentProfiles.map((opponent) => ({
        ...opponent,
        duration: withRaceVariance(
          opponent.duration,
          selection.trackDifficulty,
          opponent.stats.Handling,
          opponent.stats.Braking
        )
      }))
    ]

    const maxDuration = Math.max(...racers.map((r) => r.duration))
    const timeoutId = window.setTimeout(() => {
      const ranked = [...racers].sort((a, b) => a.duration - b.duration)
      setResults(ranked)
    }, (maxDuration + 0.35) * 1000)

    return () => window.clearTimeout(timeoutId)
  }, [opponentProfiles, performanceStats.Braking, performanceStats.Handling, playerDuration, replayKey, selection.carName, selection.trackDifficulty])

  return (
    <div className="race-view-page">
      <div className="race-view-card">
        <header className="race-header">
          <h1>Live Race View</h1>
          <p>Watch your customised car race against other vehicles.</p>
        </header>

        <div className="race-meta">
          <p><strong>Track:</strong> {selection.trackName} ({selection.trackDifficulty})</p>
          <p><strong>Your Car:</strong> {selection.carName}</p>
        </div>

        <section className="race-track" aria-label="Race simulation">
          <div className="track-banner">
            <span>Track Map:</span>
            <img src={logo} alt="Track logo" className="track-banner-logo" />
            <span>{selection.trackName}</span>
          </div>


          {!raceFinished && <p className="race-progress">Race in progress…</p>}

          {raceFinished && results.length > 0 && (
  <div className="results-wrap">
    <h3>Race Results</h3>

    <div className="podium">
      <div className="podium-place second">
        <span className="podium-rank">2</span>
        <span className="podium-name">{results[1]?.name || '-'}</span>
      </div>
      <div className="podium-place first">
        <span className="podium-rank">1</span>
        <span className="podium-name">{results[0]?.name || '-'}</span>
      </div>
      <div className="podium-place third">
        <span className="podium-rank">3</span>
        <span className="podium-name">{results[2]?.name || '-'}</span>
      </div>
    </div>

    <div className="leaderboard">
      <div className="leaderboard-header">
        <span>#</span>
        <span>Driver</span>
        <span>Team</span>
        <span>Time</span>
      </div>

      {results.map((racer, index) => (
        <div
          key={racer.id}
          className={`leaderboard-row ${racer.isPlayer ? 'player-row' : ''}`}
        >
          <span className="position">{index + 1}</span>
          <span className="name">{racer.name}</span>
          <span className="team">{racer.team}</span>
          <span className="time">{racer.duration.toFixed(2)}s</span>
        </div>
      ))}
    </div>
  </div>
)}


        </section>

        <div className="race-actions">
          <button
            type="button"
            className="race-action-button"
            onClick={() => {
              setResults([])
              setReplayKey((v) => v + 1)
            }}
          >
            Replay Race
          </button>
          <Link to="/game-home" className="race-link">Back to Track Selection</Link>
          <Link to="/garage" className="race-link">Open The Garage</Link>
        </div>
      </div>
    </div>
  )
}

export default RaceView
