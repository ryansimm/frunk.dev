import React from 'react'
import './Sections.css'
import ai_image from '../../assets/ai-image.png'
import how2UseImage from '../../assets/How2Use.png'
import garagePlayImage from '../../assets/GaragePlay.png'

const SECTION_ITEMS = [
  {
    id: 'about-ai',
    image: ai_image,
    alt: 'Img for About the AI',
    title: 'About The AI',
    description: 'This project makes use of Gemini 2.5 Flash and is prompt based. Gemini has be promted to provide the highest quality feedback to users for all questions without completing the issue for them.'
  },
  {
    id: 'how-to-use',
    image: how2UseImage,
    alt: 'Img for How to Use',
    title :'Challenges',
    description: 'Initially complete the aptitude test, then move on and complete challenges in order to garner tokens to make upgrades.'
  },
  {
    id: 'garage-play',
    image: garagePlayImage,
    alt: 'Img for Garage Play',
    title : 'The Garage',
    description: 'Head to The Garage in order to customise your racecar! Before heading into the racing and choosing a track!'
  }
]

const Sections = () => {
  return (
    <section className="sections-fade">
      <div className ="sections">
        {SECTION_ITEMS.map((item) => (
          <article key={item.id} className="section" tabIndex={0}>
            <img src={item.image} alt={item.alt} />
            <div className="section-hover-box" role="note">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default Sections