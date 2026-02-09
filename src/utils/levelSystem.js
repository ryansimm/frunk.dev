// Level classification based on aptitude test performance
export const LEVEL_THRESHOLDS = {
  BEGINNER: { min: 0, max: 40, label: 'Beginner', color: '#4CAF50' },
  INTERMEDIATE: { min: 41, max: 65, label: 'Intermediate', color: '#2196F3' },
  ADVANCED: { min: 66, max: 85, label: 'Advanced', color: '#FF9800' },
  PROFESSIONAL: { min: 86, max: 100, label: 'Professional', color: '#9C27B0' }
};

//Calculate user level based on score
// param {number} score - Score out of 100
// returns {object} Level object with label, color, and score
export const getUserLevel = (score) => {
  if (score <= LEVEL_THRESHOLDS.BEGINNER.max) {
    return { ...LEVEL_THRESHOLDS.BEGINNER, score };
  } else if (score <= LEVEL_THRESHOLDS.INTERMEDIATE.max) {
    return { ...LEVEL_THRESHOLDS.INTERMEDIATE, score };
  } else if (score <= LEVEL_THRESHOLDS.ADVANCED.max) {
    return { ...LEVEL_THRESHOLDS.ADVANCED, score };
  } else {
    return { ...LEVEL_THRESHOLDS.PROFESSIONAL, score };
  }
};

// Get task difficulty based on user level
// param {number} score - User's aptitude score
// returns {string} Difficulty level for tasks
export const getTaskDifficulty = (score) => {
  const level = getUserLevel(score);
  const difficultyMap = {
    'Beginner': 'easy',
    'Intermediate': 'medium',
    'Advanced': 'hard',
    'Professional': 'expert'
  };
  return difficultyMap[level.label];
};

//Store aptitude results to localStorage
// param {object} results - Test results object
export const saveAptitudeResults = (results) => {
  const data = {
    score: results.score,
    level: results.level,
    timestamp: new Date().toISOString(),
    correctAnswers: results.correctAnswers,
    totalQuestions: results.totalQuestions
  };
  localStorage.setItem('aptitudeResults', JSON.stringify(data));
};

// Get stored aptitude results
// returns {object|null} Stored results or null if none exist
export const getAptitudeResults = () => {
  const stored = localStorage.getItem('aptitudeResults');
  return stored ? JSON.parse(stored) : null;
};


//Clear the aptitude results
export const clearAptitudeResults = () => {
  localStorage.removeItem('aptitudeResults');
};
