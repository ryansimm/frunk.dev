import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './AptitudeTest.css'
import { aptitudeQuestions, calculatePoints } from '../../utils/aptitudeQuestions'
import { saveAptitudeResults, getUserLevel } from '../../utils/levelSystem'

const AptitudeTest = ({ onTestComplete }) => {
  const navigate = useNavigate()
  const [testStarted, setTestStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(300)
  const [testComplete, setTestComplete] = useState(false)
  const [userCode, setUserCode] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')

  // Timer effect
  useEffect(() => {
    if (!testStarted || testComplete) return
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          completeTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [testStarted, testComplete])

  // Auto-fill template for free-code questions
  useEffect(() => {
    const question = getCurrentQuestion()
    setUserCode(question?.type === 'free-code' ? question.codeTemplate : '')
  }, [currentQuestionIndex])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentQuestion = () => aptitudeQuestions[currentQuestionIndex]

  const handleStartTest = () => {
    setTestStarted(true)
    setTimeRemaining(300)
  }

  const handleAnswerSelect = (answerIndex) => {
    if (answered) return
    setSelectedAnswer(answerIndex)
    setAnswered(true)

    const question = getCurrentQuestion()
    const isCorrect = answerIndex === question.correctAnswer

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1)
      setFeedbackMessage('Correct: ' + question.explanation)
    } else {
      setFeedbackMessage('Incorrect: ' + question.explanation)
    }
  }

  const handleCodeSubmit = () => {
    if (!userCode.trim()) {
      setFeedbackMessage('Please write some code before submitting.')
      return
    }

    const question = getCurrentQuestion()
    let isCorrect = false

    if (question.id === 11) {
      const hasRequiredElements = 
        userCode.includes('left') && 
        userCode.includes('right') &&
        userCode.includes('mid') &&
        userCode.includes('while')
      isCorrect = hasRequiredElements
    }

    setAnswered(true)
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1)
      setFeedbackMessage('Correct: Good implementation. Includes key binary search elements.')
    } else {
      setFeedbackMessage('Your code is missing key components. Binary search needs: left pointer, right pointer, mid calculation, and while loop.')
    }
  }

  const handleTabKey = (event) => {
    if (event.key === 'Tab') {
      event.preventDefault()
      const start = event.target.selectionStart
      const end = event.target.selectionEnd
      const newCode = userCode.substring(0, start) + '\t' + userCode.substring(end)
      setUserCode(newCode)
      setTimeout(() => {
        event.target.selectionStart = event.target.selectionEnd = start + 1
      }, 0)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < aptitudeQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setAnswered(false)
      setUserCode('')
      setFeedbackMessage('')
    } else {
      completeTest()
    }
  }

  const completeTest = () => {
    setTestComplete(true)
    const totalScore = Math.round((correctAnswers / aptitudeQuestions.length) * 100)
    const level = getUserLevel(totalScore)
    
    const results = {
      score: totalScore,
      level: level.label,
      correctAnswers,
      totalQuestions: aptitudeQuestions.length
    }
    
    saveAptitudeResults(results)
    if (onTestComplete) onTestComplete(results)
  }

  if (!testStarted) {
    return (
      <div className="aptitude-test-container">
        <div className="test-intro">
          <h1>Python Aptitude Test</h1>
          <p>This test will assess your Python skills and personalize your learning experience.</p>
          <div className="test-info">
            <div className="info-item">
              <h3>Format</h3>
              <p>Multiple choice, code completion, debugging, and free-coding questions</p>
            </div>
            <div className="info-item">
              <h3>Duration</h3>
              <p>Maximum 5 minutes</p>
            </div>
            <div className="info-item">
              <h3>Questions</h3>
              <p>{aptitudeQuestions.length} questions with progressive difficulty</p>
            </div>
            <div className="info-item">
              <h3>Purpose</h3>
              <p>To match you with appropriate coding challenges</p>
            </div>
          </div>
          <button className="button-start-test" onClick={handleStartTest}>
            Start Test
          </button>
        </div>
      </div>
    )
  }

  if (testComplete) {
    const totalScore = Math.round((correctAnswers / aptitudeQuestions.length) * 100)
    const level = getUserLevel(totalScore)
    
    return (
      <div className="aptitude-test-container">
        <div className="test-results">
          <h1>Test Complete</h1>
          <div className="results-card" style={{ borderColor: level.color }}>
            <p className="score-text">Score: {totalScore}%</p>
            <h2>{level.label}</h2>
            <p>{correctAnswers} out of {aptitudeQuestions.length} correct</p>
            <p>Your personalized coding tasks will be tailored to match your {level.label.toLowerCase()} level.</p>
            <button onClick={() => navigate('/')} className="continue-button">
              Continue to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const question = getCurrentQuestion()
  const progress = ((currentQuestionIndex + 1) / aptitudeQuestions.length) * 100

  return (
    <div className="aptitude-test-container">
      <div className="test-header">
        <div className="test-progress">
          <p>Question {currentQuestionIndex + 1} of {aptitudeQuestions.length}</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <span className={`test-timer ${timeRemaining < 60 ? 'time-warning' : ''}`}>
          Time {formatTime(timeRemaining)}
        </span>
      </div>

      <div className="question-container">
        <span className={`difficulty-badge difficulty-${question.difficulty}`}>
          {question.difficulty.toUpperCase()}
        </span>

        <h2 className="question-text">{question.question}</h2>

        {question.type === 'free-code' ? (
          <div className="code-answer">
            <textarea
              onKeyDown={handleTabKey}
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              disabled={answered}
              className="code-editor"
            />
            <button 
              className="submit-button" 
              onClick={handleCodeSubmit}
              disabled={answered}
            >
              Submit Code
            </button>
          </div>
        ) : (
          <div className="options">
            {question.options.map((option, index) => (
              <button
                key={index}
                className={`option ${selectedAnswer === index ? 'selected' : ''} ${
                  answered && index === question.correctAnswer ? 'correct' : ''
                } ${answered && selectedAnswer === index && selectedAnswer !== question.correctAnswer ? 'incorrect' : ''}`}
                onClick={() => handleAnswerSelect(index)}
                disabled={answered}
              >
                <span>{String.fromCharCode(65 + index)}. {option}</span>
              </button>
            ))}
          </div>
        )}

        {feedbackMessage && (
          <div className={`feedback ${feedbackMessage.startsWith('✓') ? 'correct' : 'incorrect'}`}>
            {feedbackMessage}
          </div>
        )}

        {answered && (
          <button 
            className="next-button" 
            onClick={handleNextQuestion}
          >
            {currentQuestionIndex === aptitudeQuestions.length - 1 ? 'Complete Test' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  )
}

export default AptitudeTest
