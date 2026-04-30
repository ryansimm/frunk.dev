// Aptitude test questions designed to get progressively more difficult
// Question types vary between MCQ, code completion, debugging, and free-code tasks

export const aptitudeQuestions = [
  // Beginner questions
  {
    id: 1,
    difficulty: 'beginner',
    type: 'multiple-choice',
    question: 'What is the output of this code?\n\nprint(5 + 3)',
    options: ['5', '3', '8', '53'],
    correctAnswer: 2,
    explanation: 'The + operator adds numbers. 5 + 3 = 8. Note: "53" would be concatenation of strings, not addition.'
  },


  {
    id: 12,
    difficulty: 'professional',
    type: 'code-debugging',
    question: 'Find the issues or improvements in this async function:\n\nasync def fetch_data(urls):\n    results = []\n    for url in urls:\n        data = await fetch(url)\n        results.append(data)\n    return results',
    options: [
      'No major issues - this is correct',
      'Should use asyncio.gather() for parallel requests instead of sequential',
      'The await keyword should not be used in a loop',
      'Requires error handling with try-except'
    ],
    correctAnswer: 1,
    explanation: 'While not an error, this code fetches sequentially. For better performance, use asyncio.gather() or create tasks concurrently with better error handling patterns.'
  }
];

// Get questions by difficulty level
export const getQuestionsByDifficulty = (difficulty) => {
  return aptitudeQuestions.filter(q => q.difficulty === difficulty);
};

// Get a random question of specified difficulty
export const getRandomQuestion = (difficulty) => {
  const questions = getQuestionsByDifficulty(difficulty);
  return questions[Math.floor(Math.random() * questions.length)];
};

// Calculate score based on correctness and difficulty
export const calculatePoints = (isCorrect, difficulty) => {
  if (!isCorrect) return 0;

  const difficultyPoints = {
    beginner: 5,
    intermediate: 10,
    advanced: 15,
    professional: 20
  };

  return difficultyPoints[difficulty] || 0;
};