import React from 'react'
import NavBar from './components/NavBar/NavBar'
import Body from './components/Body/Body'
import Sections from './components/Sections/Sections'

const App = () => {
  return (
    <div>
      <NavBar/>
      <Body/>
      <div className="container"><Sections/></div>
    </div>
  )
}

export default App