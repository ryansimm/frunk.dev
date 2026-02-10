import React from 'react'
import './Sections.css'
import ai_image from '../../assets/ai-image.png'
/*import How2Use_image from '../../assets/how2use-image.png' --- imports for images however not obtained these as of yet */
/*import prog_image from '../../assets/prog-image.png' --- imports for images however not obtained these as of yet */  

const Sections = () => {
  return (
    <div className ="sections">
        <div className ="section">
            <img src = {ai_image} alt ="Img for About the AI"/>
        </div>
        <div className ="section">
            <img src = "" alt ="Img for How to Use"/>
        </div>
        <div className ="section">
            <img src = "" alt ="Img for Programming"/>
        </div>
    </div>
  )
}

export default Sections