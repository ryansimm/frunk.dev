import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AptitudeTest.css';
import { getUserLevel } from '../../utils/levelSystem';
import { apiService } from '../../services/api';
import logo from '../../assets/logo.png';

const TOTAL_QUESTIONS = 12;
const SESSION_VERSION = 1;

const getSessionStorageKey = (userId) => `aptitude_test_session_v${SESSION_VERSION}_${userId || 'anonymous'}`;

const loadAptitudeSession = (userId) => {
  try {
    const raw = localStorage.getItem(getSessionStorageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearAptitudeSession = (userId) => {
  localStorage.removeItem(getSessionStorageKey(userId));
};

const AptitudeTest = ({ onTestComplete }) => {
  const navigate = useNavigate();
  const [user] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  const [savedSession] = useState(() => loadAptitudeSession(user?.userId));
  
  // Test state
  const [testStarted, setTestStarted] = useState(Boolean(savedSession?.testStarted));
  const [testComplete, setTestComplete] = useState(Boolean(savedSession?.testComplete));
  
  // Question state
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(Number(savedSession?.currentQuestionNumber || 1));
  const [currentQuestion, setCurrentQuestion] = useState(savedSession?.currentQuestion || null);
  const [currentDifficulty, setCurrentDifficulty] = useState(savedSession?.currentDifficulty || 'easy');
  
  // Answer state
  const [userCode, setUserCode] = useState(savedSession?.userCode || '');
  const [evaluation, setEvaluation] = useState(savedSession?.evaluation || null);
  const [answered, setAnswered] = useState(Boolean(savedSession?.answered));
  
  // Progress tracking
  const [questionHistory, setQuestionHistory] = useState(Array.isArray(savedSession?.questionHistory) ? savedSession.questionHistory : []);
  const [correctAnswers, setCorrectAnswers] = useState(Number(savedSession?.correctAnswers || 0));
  const [askedTopics, setAskedTopics] = useState(Array.isArray(savedSession?.askedTopics) ? savedSession.askedTopics : []);

  // Pending next-question advance (set after evaluation so user can read feedback first)
  const [pendingNext, setPendingNext] = useState(savedSession?.pendingNext || null);

  // Loading states
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [evaluatingCode, setEvaluatingCode] = useState(false);

  useEffect(() => {
    if (!testStarted) {
      return;
    }

    if (testComplete) {
      clearAptitudeSession(user?.userId);
      return;
    }

    const payload = {
      testStarted,
      testComplete,
      currentQuestionNumber,
      currentQuestion,
      currentDifficulty,
      userCode,
      evaluation,
      answered,
      questionHistory,
      correctAnswers,
      askedTopics,
      pendingNext,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(getSessionStorageKey(user?.userId), JSON.stringify(payload));
  }, [
    user?.userId,
    testStarted,
    testComplete,
    currentQuestionNumber,
    currentQuestion,
    currentDifficulty,
    userCode,
    evaluation,
    answered,
    questionHistory,
    correctAnswers,
    askedTopics,
    pendingNext
  ]);

  const updateStoredTokenBalance = (tokenBalance) => {
    if (tokenBalance === null || tokenBalance === undefined || tokenBalance === '') {
      return;
    }

    const normalisedTokenBalance = Number(tokenBalance);
    if (!Number.isFinite(normalisedTokenBalance)) {
      return;
    }

    const userData = localStorage.getItem('user');
    if (!userData) {
      return;
    }

    const parsedUser = JSON.parse(userData);
    const updatedUser = {
      ...parsedUser,
      tokenBalance: normalisedTokenBalance
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    window.dispatchEvent(new CustomEvent('tokenBalanceUpdated', { detail: { tokenBalance: normalisedTokenBalance } }));
  };

  const handleStartTest = async () => {
    clearAptitudeSession(user?.userId);
    setTestStarted(true);
    setTestComplete(false);
    setCurrentQuestionNumber(1);
    setCurrentQuestion(null);
    setCurrentDifficulty('easy');
    setUserCode('');
    setEvaluation(null);
    setAnswered(false);
    setQuestionHistory([]);
    setCorrectAnswers(0);
    setAskedTopics([]);
    setPendingNext(null);
    await loadNextQuestion(1, null, 'easy', []);
  };

  const loadNextQuestion = async (questionNumber, lastCorrect, difficulty, topicsOverride) => {
    setLoadingQuestion(true);
    setEvaluation(null);
    setAnswered(false);
    const topicsToAvoid = topicsOverride !== undefined ? topicsOverride : askedTopics;
    
    try {
      const data = await apiService.generateAdaptiveQuestion(
        questionNumber,
        lastCorrect,
        difficulty,
        user?.userId,
        topicsToAvoid
      );
      
      setCurrentQuestion(data);
      setCurrentDifficulty(data.difficulty);
      setUserCode(data.codeTemplate || '');
      setCurrentQuestionNumber(questionNumber);
      // Record this question so the next call can avoid its topic
      setAskedTopics(prev => [...prev, (data.question || '').substring(0, 100)]);
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
        user?.userId,
        currentQuestion.codeTemplate || ''
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

      const previousQuestionResult = questionHistory.find(
        (entry) => entry.questionNumber === currentQuestionNumber
      );

      const nextQuestionHistory = previousQuestionResult
        ? questionHistory.map((entry) => (
          entry.questionNumber === currentQuestionNumber ? questionResult : entry
        ))
        : [...questionHistory, questionResult];

      setQuestionHistory(nextQuestionHistory);

      const wasPreviouslyCorrect = Boolean(previousQuestionResult?.isCorrect);
      const isNowCorrect = Boolean(data.isCorrect);
      const nextCorrectAnswers = isNowCorrect
        ? (wasPreviouslyCorrect ? correctAnswers : correctAnswers + 1)
        : (wasPreviouslyCorrect ? Math.max(0, correctAnswers - 1) : correctAnswers);

      if (!wasPreviouslyCorrect && isNowCorrect) {
        setCorrectAnswers(prev => prev + 1);
      } else if (wasPreviouslyCorrect && !isNowCorrect) {
        setCorrectAnswers(prev => Math.max(0, prev - 1));
      }

      const latestBalanceRaw = data?.tokenBalance;
      if (latestBalanceRaw !== null && latestBalanceRaw !== undefined && latestBalanceRaw !== '') {
        const latestBalance = Number(latestBalanceRaw);
        if (Number.isFinite(latestBalance)) {
          updateStoredTokenBalance(latestBalance);
        }
      }

      // Store what to do next so the user can read feedback before advancing
      setPendingNext({ nextQuestionHistory, nextCorrectAnswers, isCorrect: data.isCorrect });
      
    } catch (error) {
      console.error('Failed to evaluate code:', error);
      alert('Failed to evaluate code. Please try again.');
    }
    
    setEvaluatingCode(false);
  };

  const handleRetryQuestion = () => {
    setAnswered(false);
    setEvaluation(null);
    setPendingNext(null);
    setUserCode(currentQuestion?.codeTemplate || '');
  };

  const handleNextQuestion = async () => {
    if (!pendingNext) return;
    const { nextQuestionHistory, nextCorrectAnswers, isCorrect } = pendingNext;
    setPendingNext(null);
    if (currentQuestionNumber >= TOTAL_QUESTIONS) {
      await completeTest(nextQuestionHistory, nextCorrectAnswers);
    } else {
      await loadNextQuestion(
        currentQuestionNumber + 1,
        isCorrect,
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

    const previousQuestionResult = questionHistory.find(
      (entry) => entry.questionNumber === currentQuestionNumber
    );

    const updatedHistory = previousQuestionResult
      ? questionHistory.map((entry) => (
        entry.questionNumber === currentQuestionNumber ? questionResult : entry
      ))
      : [...questionHistory, questionResult];

    if (previousQuestionResult?.isCorrect) {
      setCorrectAnswers(prev => Math.max(0, prev - 1));
    }

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

  const handleEndTestEarly = async () => {
    if (evaluatingCode || loadingQuestion || currentQuestionNumber < 5) {
      return;
    }

    const confirmed = window.confirm(
      'End the aptitude test now? Your score will be based on the questions completed so far.'
    );

    if (!confirmed) {
      return;
    }

    await completeTest(questionHistory);
  };

  const completeTest = async (
    finalQuestionHistory = questionHistory,
    finalCorrectAnswers = correctAnswers
  ) => {
    setTestComplete(true);
    
    // Calculate final score
    const totalScore = Math.round((finalCorrectAnswers / TOTAL_QUESTIONS) * 100);
    const level = getUserLevel(totalScore);
    
    const results = {
      score: totalScore,
      level: level.label,
      correctAnswers: finalCorrectAnswers,
      totalQuestions: TOTAL_QUESTIONS,
      questionHistory: finalQuestionHistory
    };

    onTestComplete?.(results);
    
    // Save to MongoDB
    try {
      const saveResponse = await apiService.saveAptitudeResults(user?.userId, results);

      const latestBalanceRaw = saveResponse?.tokenBalance;
      if (latestBalanceRaw !== null && latestBalanceRaw !== undefined && latestBalanceRaw !== '') {
        const latestBalance = Number(latestBalanceRaw);
        if (Number.isFinite(latestBalance)) {
          updateStoredTokenBalance(latestBalance);
        }
      }
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  };

  const handleTabKey = (event) => {
    const INDENT = '    ';

    if (event.key === 'Enter') {
      event.preventDefault();
      const start = event.target.selectionStart;
      const end = event.target.selectionEnd;
      const before = userCode.substring(0, start);
      const after = userCode.substring(end);
      const currentLineStart = before.lastIndexOf('\n') + 1;
      const currentLine = before.substring(currentLineStart);
      const leadingWhitespace = currentLine.match(/^\s*/)?.[0] || '';
      const shouldIncreaseIndent = /:\s*$/.test(currentLine.trim());
      const nextIndent = shouldIncreaseIndent ? `${leadingWhitespace}${INDENT}` : leadingWhitespace;
      const insertText = `\n${nextIndent}`;
      const newCode = `${before}${insertText}${after}`;

      setUserCode(newCode);
      setTimeout(() => {
        const cursorPos = start + insertText.length;
        event.target.selectionStart = cursorPos;
        event.target.selectionEnd = cursorPos;
      }, 0);
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    event.preventDefault();
    const start = event.target.selectionStart;
    const end = event.target.selectionEnd;
    const hasSelection = start !== end;

    if (hasSelection) {
      const selectionStartLine = userCode.lastIndexOf('\n', start - 1) + 1;
      const selectionEndLineBreak = userCode.indexOf('\n', end);
      const selectionEndLine = selectionEndLineBreak === -1 ? userCode.length : selectionEndLineBreak;
      const selectedBlock = userCode.substring(selectionStartLine, selectionEndLine);
      const selectedLines = selectedBlock.split('\n');

      let adjustedLines;
      if (event.shiftKey) {
        adjustedLines = selectedLines.map((line) => {
          if (line.startsWith(INDENT)) return line.slice(INDENT.length);
          if (line.startsWith('  ')) return line.slice(2);
          return line.replace(/^\s/, '');
        });
      } else {
        adjustedLines = selectedLines.map((line) => `${INDENT}${line}`);
      }

      const replacement = adjustedLines.join('\n');
      const newCode = `${userCode.substring(0, selectionStartLine)}${replacement}${userCode.substring(selectionEndLine)}`;
      setUserCode(newCode);

      setTimeout(() => {
        const selectionDelta = replacement.length - selectedBlock.length;
        event.target.selectionStart = selectionStartLine;
        event.target.selectionEnd = end + selectionDelta;
      }, 0);
      return;
    }

    if (event.shiftKey) {
      const lineStart = userCode.lastIndexOf('\n', start - 1) + 1;
      const linePrefix = userCode.substring(lineStart, start);
      let charsToRemove = 0;

      if (linePrefix.endsWith(INDENT)) {
        charsToRemove = INDENT.length;
      } else {
        const whitespaceMatch = linePrefix.match(/\s+$/);
        if (whitespaceMatch) {
          charsToRemove = Math.min(whitespaceMatch[0].length, INDENT.length);
        }
      }

      if (charsToRemove > 0) {
        const newCode = `${userCode.substring(0, start - charsToRemove)}${userCode.substring(end)}`;
        setUserCode(newCode);
        setTimeout(() => {
          const cursorPos = start - charsToRemove;
          event.target.selectionStart = cursorPos;
          event.target.selectionEnd = cursorPos;
        }, 0);
      }
      return;
    }

    const newCode = `${userCode.substring(0, start)}${INDENT}${userCode.substring(end)}`;
    setUserCode(newCode);
    setTimeout(() => {
      const cursorPos = start + INDENT.length;
      event.target.selectionStart = cursorPos;
      event.target.selectionEnd = cursorPos;
    }, 0);
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
              Your personalised coding challenges will be tailored to your {level.label.toLowerCase()} level.
            </p>
            
            <button
              onClick={() => {
                clearAptitudeSession(user?.userId);
                navigate('/challenges');
              }}
              className="continue-button"
            >
              Continue to Challenges
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
          <p>The AI is creating a personalised coding challenge for you</p>
        </div>
      </div>
    );
  }

  // Main question screen
  const progress = (currentQuestionNumber / TOTAL_QUESTIONS) * 100;

  return (
    <div className="aptitude-test-container">
      <div className="test-header">
        <div className="test-header-left">
          <button
            type="button"
            className="home-logo-button"
            onClick={() => navigate('/')}
            aria-label="Return to home"
            title="Return to home"
          >
            <img src={logo} alt="Home" className="home-logo-image" />
          </button>

          <div className="test-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
        <div className="score-display">
          Correct: {correctAnswers}/{currentQuestionNumber - (answered ? 0 : 1)}
        </div>
      </div>

      <div className="end-test-wrapper">
        {currentQuestionNumber < 5 && (
          <p className="end-test-note">End Test Early becomes available after Question 5.</p>
        )}

        {currentQuestionNumber >= 5 && (
          <button
            className="end-test-button"
            onClick={handleEndTestEarly}
            disabled={evaluatingCode || loadingQuestion}
          >
            End Test Early
          </button>
        )}
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
          <div className="question-hints">
            <strong>Hints:</strong> {currentQuestion.hints.join(' | ')}
          </div>
        )}

        {currentQuestion?.testCases && currentQuestion.testCases.length > 0 && (
          <div className="question-test-cases">
            <strong>Test Cases:</strong>
            {currentQuestion.testCases.map((testCase, idx) => (
              <div key={idx} className="test-case">
                <span>Input: {testCase.input}</span>
                <span>Expected: {testCase.expected}</span>
              </div>
            ))}
          </div>
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
                
                {evaluation.feedback && (
                  <div className="feedback">
                    <h4>Feedback:</h4>
                    <p>{evaluation.feedback}</p>
                  </div>
                )}

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

                <div className="action-buttons">
                  <button
                    className="retry-button"
                    onClick={handleRetryQuestion}
                    disabled={loadingQuestion}
                  >
                    Retry Question
                  </button>
                  <button
                    className="next-button"
                    onClick={handleNextQuestion}
                    disabled={loadingQuestion}
                  >
                    {loadingQuestion ? 'Loading...' : (currentQuestionNumber === TOTAL_QUESTIONS ? 'See Results' : 'Next Question →')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AptitudeTest;