import React from 'react'
import './Body.css' 
import start from '../../assets/start.png'

const Body = () => {
  return (
    <div className ="background container">
      <div className = "body-text">
        <h1>Coding made clearer</h1>
        <p>In a world where AI is front and centre, coding skills are more importnant that ever.
          The purpose of this space is to help you develop your skills making use of AI without it doing
          the work for you.</p>
          <button className = 'button-start'>
            <span className = "button-text">Get Started</span>
            <img src = {start} alt="chequered flag" className = "flag-icon"/>
            </button>
      </div>
    </div>
  )
}

export default Body