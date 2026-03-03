import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AptitudeTest.css';
import { getUserLevel } from '../../utils/levelSystem';
import { apiService } from '../../services/api';

const TOTAL_QUESTIONS = 12;

const AptitudeTest = () => {
  const navigate = useNavigate();
  const [user] = useState(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return null;
    }
    return JSON.parse(userData);
  });
  
  // Test state
  const [testStarted, setTestStarted] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  
  // Question state
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentDifficulty, setCurrentDifficulty] = useState('easy');
  
  // Answer state
  const [userCode, setUserCode] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [answered, setAnswered] = useState(false);
  
  // Progress tracking
  const [questionHistory, setQuestionHistory] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  
  // Loading states
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [evaluatingCode, setEvaluatingCode] = useState(false);

  const updateStoredTokenBalance = (tokenBalance) => {
    if (!Number.isFinite(tokenBalance)) {
      return;
    }

    const userData = localStorage.getItem('user');
    if (!userData) {
      return;
    }

    const parsedUser = JSON.parse(userData);
    const updatedUser = {
      ...parsedUser,
      tokenBalance
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    window.dispatchEvent(new CustomEvent('tokenBalanceUpdated', { detail: { tokenBalance } }));
  };

  const handleStartTest = async () => {
    setTestStarted(true);
    await loadNextQuestion(1, null, 'easy');
  };

  const loadNextQuestion = async (questionNumber, lastCorrect, difficulty) => {
    setLoadingQuestion(true);
    setEvaluation(null);
    setAnswered(false);
    
    try {
      const data = await apiService.generateAdaptiveQuestion(
        questionNumber,
        lastCorrect,
        difficulty,
        user?.userId
      );
      
      setCurrentQuestion(data);
      setCurrentDifficulty(data.difficulty);
      setUserCode(data.codeTemplate || '');
      setCurrentQuestionNumber(questionNumber);
    } catch (error) {
      console.error('Failed to load question:', error);
      alert('Failed to load question. Please try again.');
    }
    
    setLoadingQuestion(false);
  };

  const handleSubmitCode = async () => {
    if (!userCode.trim()) {
      alert('Please write some code before submitting.');
      return;
    }

    setEvaluation(null);
    setEvaluatingCode(true);
    
    try {
      const data = await apiService.evaluateAptitudeCode(
        userCode,
        currentQuestion.question,
        currentDifficulty,
        currentQuestion.testCases || [],
        user?.userId
      );

      setEvaluation(data);
      setAnswered(true);

      // Track result
      const questionResult = {
        questionNumber: currentQuestionNumber,
        difficulty: currentDifficulty,
        isCorrect: data.isCorrect,
        score: data.score,
        tokenAward: data.tokenAward || 0
      };
      
      setQuestionHistory([...questionHistory, questionResult]);
      
      if (data.isCorrect) {
        setCorrectAnswers(prev => prev + 1);
      }

      if (Number.isFinite(data.tokenBalance)) {
        updateStoredTokenBalance(data.tokenBalance);
      }
      
    } catch (error) {
      console.error('Failed to evaluate code:', error);
      alert('Failed to evaluate code. Please try again.');
    }
    
    setEvaluatingCode(false);
  };

  const handleNextQuestion = async () => {
    if (currentQuestionNumber >= TOTAL_QUESTIONS) {
      completeTest();
    } else {
      await loadNextQuestion(
        currentQuestionNumber + 1,
        evaluation.isCorrect,
        currentDifficulty
      );
    }
  };

  const handleSkipQuestion = async () => {
    if (evaluatingCode || answered) {
      return;
    }

    const questionResult = {
      questionNumber: currentQuestionNumber,
      difficulty: currentDifficulty,
      isCorrect: false,
      score: 0,
      skipped: true
    };

    const updatedHistory = [...questionHistory, questionResult];
    setQuestionHistory(updatedHistory);

    if (currentQuestionNumber >= TOTAL_QUESTIONS) {
      await completeTest(updatedHistory);
      return;
    }

    await loadNextQuestion(
      currentQuestionNumber + 1,
      false,
      currentDifficulty
    );
  };

  const completeTest = async (finalQuestionHistory = questionHistory) => {
    setTestComplete(true);
    
    // Calculate final score
    const totalScore = Math.round((correctAnswers / TOTAL_QUESTIONS) * 100);
    const level = getUserLevel(totalScore);
    
    const results = {
      score: totalScore,
      level: level.label,
      correctAnswers,
      totalQuestions: TOTAL_QUESTIONS,
      questionHistory: finalQuestionHistory
    };
    
    // Save to MongoDB
    try {
      const saveResponse = await apiService.saveAptitudeResults(user?.userId, results);

      if (Number.isFinite(saveResponse?.tokenBalance)) {
        updateStoredTokenBalance(saveResponse.tokenBalance);
      }
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  };

  const handleTabKey = (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = event.target.selectionStart;
      const end = event.target.selectionEnd;
      const newCode = userCode.substring(0, start) + '  ' + userCode.substring(end);
      setUserCode(newCode);
      setTimeout(() => {
        event.target.selectionStart = event.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Test intro screen
  if (!testStarted) {
    return (
      <div className="aptitude-test-container">
        <div className="test-intro">
          <h1>Python Coding Aptitude Test</h1>
          <p>AI-powered adaptive assessment to determine your skill level</p>
          
          <div className="test-info">
            <div className="info-item">
              <h3>AI-Generated</h3>
              <p>Each question is uniquely created for you by AI</p>
            </div>
            <div className="info-item">
              <h3>Adaptive Difficulty</h3>
              <p>Questions adjust based on your performance</p>
            </div>
            <div className="info-item">
              <h3>Free Coding</h3>
              <p>{TOTAL_QUESTIONS} hands-on coding exercises</p>
            </div>
            <div className="info-item">
              <h3>⏱Flexible Timing</h3>
              <p>No time limit - please take your time to think</p>
            </div>
          </div>

          <div className="how-it-works">
            <h3>How It Works:</h3>
            <ol>
              <li>Complete {TOTAL_QUESTIONS} coding questions</li>
              <li>Write actual Python code for each challenge</li>
              <li>Get instant AI feedback on your solutions</li>
              <li>Questions adapt - they will get harder if you're doing well, or easier if you're struggling</li>
              <li>Receive your skill level at the end</li>
            </ol>
          </div>
          
          <button className="button-start-test" onClick={handleStartTest}>
            Start Aptitude Test
          </button>
        </div>
      </div>
    );
  }

  // Test complete screen
  if (testComplete) {
    const totalScore = Math.round((correctAnswers / TOTAL_QUESTIONS) * 100);
    const level = getUserLevel(totalScore);
    
    return (
      <div className="aptitude-test-container">
        <div className="test-results">
          <h1>Test Complete!</h1>
          <div className="results-card">
            <p className="score-text">Score: {totalScore}%</p>
            <h2>{level.label}</h2>
            <p>{correctAnswers} out of {TOTAL_QUESTIONS} questions correct</p>
            
            <div className="difficulty-breakdown">
              <h3>Performance Breakdown:</h3>
              <div className="breakdown-stats">
                <div className="stat">
                  <span className="difficulty-badge difficulty-easy">Easy</span>
                  <span>{questionHistory.filter(q => q.difficulty === 'easy').length} questions</span>
                </div>
                <div className="stat">
                  <span className="difficulty-badge difficulty-medium">Medium</span>
                  <span>{questionHistory.filter(q => q.difficulty === 'medium').length} questions</span>
                </div>
                <div className="stat">
                  <span className="difficulty-badge difficulty-hard">Hard</span>
                  <span>{questionHistory.filter(q => q.difficulty === 'hard').length} questions</span>
                </div>
              </div>
            </div>

            <p className="level-description">
              Your personalized coding challenges will be tailored to your {level.label.toLowerCase()} level.
            </p>
            
            <button onClick={() => navigate('/')} className="continue-button">
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading question screen
  if (loadingQuestion) {
    return (
      <div className="aptitude-test-container">
        <div className="loading-container">
          <h2>Generating Question {currentQuestionNumber} of {TOTAL_QUESTIONS}...</h2>
          <div className="spinner"></div>
          <p>The AI is creating a personalized coding challenge for you</p>
        </div>
      </div>
    );
  }

  // Main question screen
  const progress = (currentQuestionNumber / TOTAL_QUESTIONS) * 100;

  return (
    <div className="aptitude-test-container">
      <div className="test-header">
        <div className="test-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="score-display">
          Correct: {correctAnswers}/{currentQuestionNumber - (answered ? 0 : 1)}
        </div>
      </div>

      <div className="question-container">
        <div className="question-header">
          <span className="difficulty-badge">
            Q{currentQuestionNumber}/{TOTAL_QUESTIONS}
          </span>
          <span className={`difficulty-badge difficulty-${currentDifficulty}`}>
            {currentDifficulty.toUpperCase()}
          </span>
        </div>

        <h2 className="question-text">{currentQuestion?.question}</h2>

        {currentQuestion?.hints && (
          <details className="hints">
            <summary>Hints (click to reveal)</summary>
            <ul>
              {currentQuestion.hints.map((hint, i) => (
                <li key={i}>{hint}</li>
              ))}
            </ul>
          </details>
        )}

        <div className="test-content-grid">
          <div className="code-editor-section">
            <label>Your Solution:</label>
            <textarea
              onKeyDown={handleTabKey}
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              disabled={answered || evaluatingCode}
              className="code-editor"
              placeholder="Write your Python code here..."
              rows={15}
            />

            {!answered && (
              <div className="action-buttons">
                <button 
                  className="submit-button" 
                  onClick={handleSubmitCode}
                  disabled={evaluatingCode}
                >
                  {evaluatingCode ? 'AI is Evaluating...' : 'Submit Solution'}
                </button>
                <button
                  className="skip-button"
                  onClick={handleSkipQuestion}
                  disabled={evaluatingCode || loadingQuestion}
                >
                  Skip Question
                </button>
              </div>
            )}
          </div>

          <div className="feedback-panel">
            <h3>Feedback</h3>

            {evaluatingCode && (
              <div className="evaluation-pending">
                <h4>Evaluating your solution...</h4>
                <p>Checking correctness, edge cases, and code quality now.</p>
              </div>
            )}

            {!evaluatingCode && !evaluation && (
              <div className="feedback-empty">
                <p>Submit your code to see detailed feedback here.</p>
              </div>
            )}

            {evaluation && (
              <div className={`evaluation-result ${evaluation.isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="result-header">
                  <h3>
                    {evaluation.isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                  </h3>
                  <span className="score-badge">Score: {evaluation.score}/100</span>
                </div>
                
                <div className="feedback">
                  <h4>Feedback:</h4>
                  <p>{evaluation.feedback}</p>
                </div>

                {evaluation.strengths && evaluation.strengths.length > 0 && (
                  <div className="strengths">
                    <h4>Strengths:</h4>
                    <ul>
                      {evaluation.strengths.map((strength, i) => (
                        <li key={i}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.issues && evaluation.issues.length > 0 && (
                  <div className="issues">
                    <h4>Areas to Improve:</h4>
                    <ul>
                      {evaluation.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button 
                  className="next-button" 
                  onClick={handleNextQuestion}
                >
                  {currentQuestionNumber === TOTAL_QUESTIONS ? 'See Results' : 'Next Question →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AptitudeTest;