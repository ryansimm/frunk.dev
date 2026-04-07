import React from 'react'
import { Link } from 'react-router-dom'
import './Body.css' 
import start from '../../assets/start.png'

const Body = ({ hasCompletedAptitude }) => {
  return (
    <div className ="background container">
      <div className = "body-text">
        <h1>Coding made clearer</h1>
        <p>In a world where AI is front and centre, coding skills are more importnant that ever.
          The purpose of this space is to help you develop your skills making use of AI without it doing
          the work for you.</p>

          <div className="home-actions">
            <Link to="/game-home" className="button-link">
              <button className='button-start'>
                <span className="button-text">Start Racing</span>
                <img src={start} alt="chequered flag" className="flag-icon" />
              </button>
            </Link>

            <Link to="/challenges" className="button-link">
              <button className='button-start'>
                <span className="button-text">Enter Challenges</span>
                <img src={start} alt="chequered flag" className="flag-icon" />
              </button>
            </Link>
          </div>

          <p className="home-garage-link-wrap">
            <Link to="/garage" className="home-garage-link">Go to The Garage</Link>
          </p>
      </div>
    </div>
  )
}

export default Body