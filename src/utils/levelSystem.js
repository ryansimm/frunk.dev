// Level classification based on aptitude test performance
export const LEVEL_THRESHOLDS = {
  BEGINNER: { min: 0, max: 40, label: 'Beginner'},
  INTERMEDIATE: { min: 41, max: 65, label: 'Intermediate'},
  ADVANCED: { min: 66, max: 85, label: 'Advanced'},
  PROFESSIONAL: { min: 86, max: 100, label: 'Professional'}
};

//Calculate user level based on score
// param {number} score - Score out of 100
// returns {object} Level object with label and score
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
// User's aptitude score
// Difficulty level for tasks
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
// User's test results object
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
// returns the stored results or null if none exist
export const getAptitudeResults = () => {
  const stored = localStorage.getItem('aptitudeResults');
  return stored ? JSON.parse(stored) : null;
};


//Clear the aptitude results
export const clearAptitudeResults = () => {
  localStorage.removeItem('aptitudeResults');
};
