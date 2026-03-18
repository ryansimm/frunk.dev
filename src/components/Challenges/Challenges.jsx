import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Challenges.css'
import { apiService } from '../../services/api'

const TOPICS = ['Python Basics', 'Functions', 'Lists', 'Dictionaries', 'Loops', 'OOP']

const resolveDifficultyFromLevel = (level) => {
  const normalized = (level || '').toLowerCase()
  if (normalized.includes('professional') || normalized.includes('advanced')) return 'hard'
  if (normalized.includes('intermediate')) return 'medium'
  return 'easy'
}

// Select random question type based on topic
// Python Basics: 50/50 mix
// Other topics: 80% free-code, 20% knowledge/mcq
const selectRandomQuestionType = (topic) => {
  if (topic === 'Python Basics') {
    // 50/50 mix for Python Basics
    const rand = Math.random()
    if (rand < 0.33) return 'freeCode'
    if (rand < 0.67) return 'knowledge'
    return 'mcq'
  } else {
    // 80% free-code, 20% other for specialized topics
    const rand = Math.random()
    if (rand < 0.8) return 'freeCode'
    if (rand < 0.9) return 'knowledge'
    return 'mcq'
  }
}

const Challenges = () => {
  const [topic, setTopic] = useState(TOPICS[0])
  const [recommendedDifficulty, setRecommendedDifficulty] = useState('medium')
  const [latestLevel, setLatestLevel] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [aptitudeReady, setAptitudeReady] = useState(false)
  const [askedTopics, setAskedTopics] = useState([])
  const [questionData, setQuestionData] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [codeAnswer, setCodeAnswer] = useState('')
  const [knowledgeAnswer, setKnowledgeAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [answerChecked, setAnswerChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [latestTokenAward, setLatestTokenAward] = useState(0)

  const userData = JSON.parse(localStorage.getItem('user') || '{}')

  // Load askedTopics from aptitude test session to avoid repeats
  const getAptitudeSessionKey = (userId) => `aptitude_test_session_v1_${userId || 'anonymous'}`

  const updateStoredTokenBalance = (tokenBalance) => {
    if (!Number.isFinite(tokenBalance)) {
      return
    }

    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      return
    }

    const parsedUser = JSON.parse(storedUser)
    const updatedUser = {
      ...parsedUser,
      tokenBalance
    }

    localStorage.setItem('user', JSON.stringify(updatedUser))
    window.dispatchEvent(new CustomEvent('tokenBalanceUpdated', { detail: { tokenBalance } }))
  }

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await apiService.getCurrentUserProfile()
        const completed = Boolean(profile?.user?.aptitudeCompleted || profile?.latestResult)
        const level = profile?.latestResult?.level || profile?.user?.latestAptitudeLevel || ''

        setAptitudeReady(completed)
        setLatestLevel(level)
        setRecommendedDifficulty(resolveDifficultyFromLevel(level))

        // Load askedTopics from completed aptitude test session
        if (completed && userData?.userId) {
          try {
            const sessionKey = getAptitudeSessionKey(userData.userId)
            const sessionData = localStorage.getItem(sessionKey)
            if (sessionData) {
              const session = JSON.parse(sessionData)
              const topics = Array.isArray(session?.askedTopics) ? session.askedTopics : []
              setAskedTopics(topics)
              console.log('Loaded askedTopics from aptitude session:', topics)
            }
          } catch (e) {
            console.warn('Could not load askedTopics:', e)
          }
        }
      } catch (error) {
        setFeedback(error?.message || 'Failed to load profile progress.')
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [userData?.userId])

  useEffect(() => {
    console.log('State updated:', { answerChecked, feedback: feedback?.substring(0, 50), isCorrect })
  }, [answerChecked, feedback, isCorrect])

  const handleGenerateQuestion = async () => {
    if (!aptitudeReady || isLoading) {
      return
    }

    setIsLoading(true)
    setFeedback('')
    setAnswerChecked(false)
    setSelectedAnswer('')
    setCodeAnswer('')
    setKnowledgeAnswer('')
    setIsCorrect(false)
    setLatestTokenAward(0)

    try {
      const questionType = selectRandomQuestionType(topic)
      const generated = await apiService.generateLearningQuestion(
        topic,
        recommendedDifficulty,
        userData.userId,
        questionType,
        askedTopics
      )
      console.log('Generated question:', { questionType, generated, excludedTopics: askedTopics })
      
      // Track this generated question to avoid repetition in this session
      if (generated?.question) {
        setAskedTopics(prev => [...prev, (generated.question || '').substring(0, 100)])
      }

      if (questionType === 'freeCode') {
        setCodeAnswer(generated?.codeTemplate || 'def solution():\n    # Your code here\n    pass')
      }
      
      setQuestionData(generated)
    } catch (error) {
      console.error('Question generation error details:', error)
      setFeedback(error?.message || 'Failed to generate challenge question.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckMcqAnswer = async () => {
    if (!questionData || !selectedAnswer) {
      console.error('Missing questionData or selectedAnswer')
      return
    }

    setIsSubmitting(true)
    setAnswerChecked(true)
    const correct = selectedAnswer === questionData.correctAnswer
    setIsCorrect(correct)
    console.log('MCQ Answer - Correct:', correct, 'Answer:', selectedAnswer, 'Expected:', questionData.correctAnswer)

    try {
      let tokenAward = 0
      console.log('Sending feedback request for MCQ...')
      const response = await apiService.getLearningFeedback({
        userAnswer: selectedAnswer,
        correctAnswer: questionData.correctAnswer,
        questionText: questionData.question,
        userId: userData.userId,
        questionType: 'mcq'
      })

      const tokenResponse = await apiService.awardChallengeTokens({
        userId: userData.userId,
        questionType: 'mcq',
        difficulty: recommendedDifficulty,
        isCorrect: correct,
        questionText: questionData.question
      })
      tokenAward = Number(tokenResponse?.tokenAward || 0)
      setLatestTokenAward(tokenAward)
      if (Number.isFinite(tokenResponse?.tokenBalance)) {
        updateStoredTokenBalance(Number(tokenResponse.tokenBalance))
      }

      console.log('Feedback response:', response)
      const feedbackText = `${response?.feedback || 'Good attempt!'}\n\nTokens earned: +${tokenAward}`
      setFeedback(feedbackText)
    } catch (error) {
      console.error('Feedback error:', error)
      setFeedback('Error: ' + (error?.message || 'Could not generate feedback right now.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCheckCodeAnswer = async () => {
    if (!questionData || !codeAnswer.trim()) {
      console.error('Missing questionData or codeAnswer')
      return
    }

    setIsSubmitting(true)
    setAnswerChecked(true)
    console.log('Submitting code answer...')

    try {
      // Evaluate the code answer
      console.log('Evaluating code...')
      const evaluation = await apiService.evaluateAptitudeCode(
        codeAnswer,
        questionData.question,
        recommendedDifficulty,
        questionData.testCases || [],
        userData.userId,
        questionData.codeTemplate
      )
      console.log('Evaluation result:', evaluation)

      // Determine correctness - same logic as aptitude test
      const correct = (evaluation.score >= 40) || evaluation.isCorrect
      setIsCorrect(correct)
      const tokenAward = Number(evaluation?.tokenAward || 0)
      setLatestTokenAward(tokenAward)
      if (Number.isFinite(evaluation?.tokenBalance)) {
        updateStoredTokenBalance(Number(evaluation.tokenBalance))
      }
      console.log('Code evaluation - Correct:', correct, 'Score:', evaluation.score)

      // Get AI feedback
      console.log('Getting feedback for code...')
      const feedbackResponse = await apiService.getLearningFeedback({
        userAnswer: codeAnswer,
        correctAnswer: JSON.stringify(questionData.testCases || []),
        questionText: questionData.question,
        userId: userData.userId,
        questionType: 'freeCode'
      })
      console.log('Feedback response:', feedbackResponse)
      const feedbackText = `${feedbackResponse?.feedback || 'Good attempt! Review the test cases and try again.'}\n\nTokens earned: +${tokenAward}`
      setFeedback(feedbackText)
    } catch (error) {
      console.error('Code evaluation error:', error)
      setFeedback('Error: ' + (error?.message || 'Could not evaluate code right now.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCheckKnowledgeAnswer = async () => {
    if (!questionData || !knowledgeAnswer.trim()) {
      console.error('Missing questionData or knowledgeAnswer')
      return
    }

    setIsSubmitting(true)
    setAnswerChecked(true)
    console.log('Submitting knowledge answer...')

    try {
      let tokenAward = 0
      // For knowledge questions, check if answer contains key keywords
      const answerLower = knowledgeAnswer.toLowerCase()
      const keywords = questionData.correctKeywords || []
      const keywordMatches = keywords.filter((keyword) =>
        answerLower.includes(keyword.toLowerCase())
      )
      
      // If at least 50% of keywords are present, consider it correct
      const correct = keywords.length > 0 && keywordMatches.length >= Math.ceil(keywords.length * 0.5)
      setIsCorrect(correct)
      console.log('Knowledge evaluation - Correct:', correct, 'Keywords found:', keywordMatches.length, 'of', keywords.length)

      // Get AI feedback
      console.log('Getting feedback for knowledge answer...')
      const feedbackResponse = await apiService.getLearningFeedback({
        userAnswer: knowledgeAnswer,
        correctAnswer: keywords.join(', ') || 'Demonstrate understanding of the concept',
        questionText: questionData.question,
        userId: userData.userId,
        questionType: 'knowledge'
      })

      const tokenResponse = await apiService.awardChallengeTokens({
        userId: userData.userId,
        questionType: 'knowledge',
        difficulty: recommendedDifficulty,
        isCorrect: correct,
        questionText: questionData.question
      })
      tokenAward = Number(tokenResponse?.tokenAward || 0)
      setLatestTokenAward(tokenAward)
      if (Number.isFinite(tokenResponse?.tokenBalance)) {
        updateStoredTokenBalance(Number(tokenResponse.tokenBalance))
      }

      console.log('Feedback response:', feedbackResponse)
      const feedbackText = `${feedbackResponse?.feedback || 'Great effort! Review your understanding and try again.'}\n\nTokens earned: +${tokenAward}`
      setFeedback(feedbackText)
    } catch (error) {
      console.error('Knowledge answer error:', error)
      setFeedback('Error: ' + (error?.message || 'Could not generate feedback right now.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const getHintText = () => {
    if (questionData?.questionType === 'freeCode' && questionData?.hints) {
      return questionData.hints.join(' | ')
    }
    return null
  }

  return (
    <div className="challenges-page">
      <div className="challenges-card">
        <h1>Next Step: Practice Challenges</h1>
        <p>Keep improving with practical coding challenges. Python Basics is a balanced mix, while specialized topics focus on hands-on code exercises.</p>

        {profileLoading && <p>Loading your challenge level...</p>}

        {!profileLoading && !aptitudeReady && (
          <div className="challenge-warning">
            <p>Complete your aptitude test first so we can personalize your challenge difficulty.</p>
            <Link to="/aptitude-test">Go to Aptitude Test</Link>
          </div>
        )}

        {!profileLoading && aptitudeReady && (
          <p className="challenge-meta">
            Difficulty is set automatically from your aptitude result ({latestLevel || 'Current level'}):
            <strong> {recommendedDifficulty.toUpperCase()}</strong>
          </p>
        )}

        <div className="challenge-controls">
          <label>
            Topic
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              {TOPICS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <button type="button" onClick={handleGenerateQuestion} disabled={isLoading || profileLoading || !aptitudeReady}>
            {isLoading ? 'Generating...' : 'Generate Challenge'}
          </button>
        </div>

        {questionData && (
          <div className="challenge-question-panel">
            <div className="challenge-type-badge">
              {questionData.questionType === 'freeCode' && 'Free Code'}
              {questionData.questionType === 'knowledge' && 'Subject Knowledge'}
              {questionData.questionType === 'mcq' && 'Multiple Choice'}
            </div>

            <h3>{questionData.question}</h3>

            {getHintText() && (
              <div className="challenge-hints">
                <strong>Hints:</strong> {getHintText()}
              </div>
            )}

            {/* MCQ Format */}
            {questionData.questionType === 'mcq' && (
              <>
                <div className="challenge-options">
                  {questionData.options?.map((option) => (
                    <label key={option} className="option-item">
                      <input
                        type="radio"
                        name="challenge-answer"
                        value={option}
                        checked={selectedAnswer === option}
                        onChange={(event) => setSelectedAnswer(event.target.value)}
                        disabled={answerChecked}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>

                <div className="challenge-actions">
                  <button
                    type="button"
                    onClick={handleCheckMcqAnswer}
                    disabled={!selectedAnswer || answerChecked || isSubmitting || isLoading}
                  >
                    {isSubmitting ? 'Checking...' : 'Check Answer'}
                  </button>
                  <button type="button" onClick={handleGenerateQuestion} disabled={isSubmitting || isLoading}>
                    {isLoading ? 'Generating...' : 'New Challenge'}
                  </button>
                </div>
              </>
            )}

            {/* Free Code Format */}
            {questionData.questionType === 'freeCode' && (
              <>
                <div className="code-editor-section">
                  <textarea
                    value={codeAnswer}
                    onChange={(event) => setCodeAnswer(event.target.value)}
                    placeholder="Write your Python code here..."
                    className="code-editor"
                    disabled={answerChecked}
                    rows={8}
                  />
                </div>

                {questionData.testCases && questionData.testCases.length > 0 && (
                  <div className="challenge-test-cases">
                    <strong>Test Cases:</strong>
                    {questionData.testCases.map((testCase, idx) => (
                      <div key={idx} className="test-case">
                        <span>Input: {testCase.input}</span>
                        <span>Expected: {testCase.expected}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="challenge-actions">
                  <button
                    type="button"
                    onClick={handleCheckCodeAnswer}
                    disabled={!codeAnswer.trim() || answerChecked || isSubmitting || isLoading}
                  >
                    {isSubmitting ? 'Evaluating...' : 'Submit Code'}
                  </button>
                  <button type="button" onClick={handleGenerateQuestion} disabled={isSubmitting || isLoading}>
                    {isLoading ? 'Generating...' : 'New Challenge'}
                  </button>
                </div>
              </>
            )}

            {/* Knowledge Format */}
            {questionData.questionType === 'knowledge' && (
              <>
                <textarea
                  value={knowledgeAnswer}
                  onChange={(event) => setKnowledgeAnswer(event.target.value)}
                  placeholder="Type your answer here... (3-4 sentences)"
                  className="knowledge-answer"
                  disabled={answerChecked}
                  rows={6}
                />

                <div className="challenge-actions">
                  <button
                    type="button"
                    onClick={handleCheckKnowledgeAnswer}
                    disabled={!knowledgeAnswer.trim() || answerChecked || isSubmitting || isLoading}
                  >
                    {isSubmitting ? 'Checking...' : 'Submit Answer'}
                  </button>
                  <button type="button" onClick={handleGenerateQuestion} disabled={isSubmitting || isLoading}>
                    {isLoading ? 'Generating...' : 'New Challenge'}
                  </button>
                </div>
              </>
            )}

            {answerChecked && (
              <div className={`challenge-result ${isCorrect ? 'correct' : 'incorrect'}`}>
                <strong>{isCorrect ? '✓ Correct!' : '✗ Not quite yet'}</strong>
                {latestTokenAward > 0 && <p>Tokens earned: +{latestTokenAward}</p>}
                {questionData?.questionType === 'mcq' && (
                  <>
                    <p>Your answer: {selectedAnswer}</p>
                    <p>Correct answer: {questionData.correctAnswer}</p>
                    <p>{questionData.explanation}</p>
                  </>
                )}
                {questionData?.questionType === 'freeCode' && (
                  <p>{questionData.explanation || 'Check your code logic against the test cases.'}</p>
                )}
                {questionData?.questionType === 'knowledge' && (
                  <p>Key concepts: {questionData.correctKeywords?.join(', ') || 'General understanding'}</p>
                )}
              </div>
            )}

            {feedback && (
              <div className="challenge-feedback">
                <h4>💡 AI Coaching Feedback</h4>
                <p>{feedback}</p>
              </div>
            )}

            {answerChecked && !feedback && (
              <div className="challenge-feedback">
                <p><em>Generating feedback...</em></p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Challenges
