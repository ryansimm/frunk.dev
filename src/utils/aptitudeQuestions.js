// Aptitude test questions desinged so that the q's get progressively more difficult
// Question types vart, there are multi-choice, code-debugging, code-completion q's

export const aptitudeQuestions = [
  // Beginner Questions (1-3)
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
    id: 2,
    difficulty: 'beginner',
    type: 'multiple-choice',
    question: 'Which keyword is used to create a function in Python?',
    options: ['function', 'func', 'def', 'define'],
    correctAnswer: 2,
    explanation: 'Python uses the "def" keyword to define functions. "function", "func", and "define" are not valid Python keywords.'
  },
  {
    id: 3,
    difficulty: 'beginner',
    type: 'code-completion',
    question: 'Complete the code to create a list:\n\nmy_list = ___',
    options: ['[1, 2, 3]', '{1, 2, 3}', '(1, 2, 3)', '"1, 2, 3"'],
    correctAnswer: 0,
    explanation: 'Lists in Python are created using square brackets []. Curly braces create sets, parentheses create tuples, and quotes create strings.'
  },

  // Intermediate Questions (4-7)
  {
    id: 4,
    difficulty: 'intermediate',
    type: 'code-debugging',
    question: 'Find the error in this code:\n\ndef greet(name):\n    print("Hello, " + name)\n\ngreet(123)',
    options: [
      'Cannot add string and integer - should convert: print("Hello, " + str(name))',
      'greet() requires 2 arguments',
      'The function definition is wrong',
      'print() requires multiple arguments'
    ],
    correctAnswer: 0,
    explanation: 'In Python, you cannot concatenate a string with an integer. You must convert the integer to a string using str().'
  },
  {
    id: 5,
    difficulty: 'intermediate',
    type: 'multiple-choice',
    question: 'What does this code output?\n\nfor i in range(3):\n    print(i)',
    options: ['0 1 2', '1 2 3', '0 1 2 3', '3'],
    correctAnswer: 0,
    explanation: 'range(3) generates 0, 1, 2. The loop prints each value on a new line, so output is 0, then 1, then 2.'
  },
  {
    id: 6,
    difficulty: 'intermediate',
    type: 'code-completion',
    question: 'Complete the function that returns the sum of all numbers in a list:\n\ndef sum_list(numbers):\n    total = 0\n    for num in numbers:\n        ___\n    return total',
    options: [
      'total = total + num',
      'return total + num',
      'total += num',
      'num += total'
    ],
    correctAnswer: 2,
    explanation: '+= is the compound assignment operator. "total += num" is equivalent to "total = total + num" and is more concise.'
  },
  {
    id: 7,
    difficulty: 'intermediate',
    type: 'multiple-choice',
    question: 'What is the correct way to check if a key exists in a dictionary?',
    options: [
      'if dict.has_key("key"):',
      'if "key" in dict:',
      'if dict["key"]:',
      'if dict.exists("key"):'
    ],
    correctAnswer: 1,
    explanation: 'Use the "in" operator to check if a key exists in a dictionary. has_key() was removed in Python 3.'
  },

  // Advanced Questions(8-10)
  {
    id: 8,
    difficulty: 'advanced',
    type: 'code-debugging',
    question: 'What\'s the issue with this list comprehension?\n\nresult = [x*2 for x in range(10) if x % 2 = 0]',
    options: [
      'Syntax error: should use == instead of = for comparison',
      'List comprehensions cannot have if statements',
      'The if statement must come before the for statement',
      'range(10) cannot be used with list comprehensions'
    ],
    correctAnswer: 0,
    explanation: 'Single = is assignment, == is comparison. In a conditional, you must use == to compare values.'
  },
  {
    id: 9,
    difficulty: 'advanced',
    type: 'multiple-choice',
    question: 'What does this code output?\n\ndef func(a=[]):\n    a.append(1)\n    return a\n\nprint(func())\nprint(func())',
    options: [
      '[1]\n[1]',
      '[1]\n[1, 1]',
      '[1]\n[1, 1, 1]',
      'Error: mutable default argument'
    ],
    correctAnswer: 1,
    explanation: 'This is a common Python gotcha! Default mutable arguments are shared across function calls. The list is created once and reused, so it accumulates values.'
  },
  {
    id: 10,
    difficulty: 'advanced',
    type: 'code-completion',
    question: 'Complete the decorator that measures function execution time:\n\nimport time\n\ndef timer(func):\n    def wrapper(*args, **kwargs):\n        start = time.time()\n        result = func(*args, **kwargs)\n        ___\n        return result\n    return wrapper',
    options: [
      'print(time.time() - start)',
      'print(f"Execution time: {time.time() - start}s")',
      'elapsed = time.time() - start\nprint(f"Execution time: {elapsed}s")',
      'return time.time() - start'
    ],
    correctAnswer: 1,
    explanation: 'The decorator should print the elapsed time. time.time() - start calculates duration, and an f-string formats it nicely.'
  },

  // Pro questions (11-12)
  {
    id: 11,
    difficulty: 'professional',
    type: 'free-code',
    question: 'Write a function that implements binary search on a sorted list and returns the index of the target value or -1 if not found:',
    codeTemplate: `def binary_search(arr, target):
    # Your implementation here
    pass`,
    testCases: [
      { input: 'arr=[1,3,5,7,9], target=5', expectedContains: ['left', 'right', 'mid'] },
      { input: 'arr=[1,2,4,8,16], target=8', expectedContains: ['left', 'right'] },
      { input: 'arr=[1,2,3], target=5', expectedContains: ['return -1'] }
    ],
    explanation: 'Binary search requires understanding of divide-and-conquer algorithms and pointer/index manipulation.'
  },
  {
    id: 12,
    difficulty: 'professional',
    type: 'code-debugging',
    question: 'Find all issues in this async function:\n\nasync def fetch_data(urls):\n    results = []\n    for url in urls:\n        data = await fetch(url)\n        results.append(data)\n    return results',
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

/**
 * Get questions by difficulty level
 * @param {string} difficulty - 'beginner', 'intermediate', 'advanced', 'professional'
 * @returns {array} Array of questions
 */
export const getQuestionsByDifficulty = (difficulty) => {
  return aptitudeQuestions.filter(q => q.difficulty === difficulty);
};

/**
 * Get a random question of specified difficulty
 * @param {string} difficulty - Difficulty level
 * @returns {object} Random question
 */
export const getRandomQuestion = (difficulty) => {
  const questions = getQuestionsByDifficulty(difficulty);
  return questions[Math.floor(Math.random() * questions.length)];
};

/**
 * Calculate score for an answer
 * @param {boolean} isCorrect - Whether answer is correct
 * @param {string} difficulty - Question difficulty
 * @returns {number} Points awarded
 */
export const calculatePoints = (isCorrect, difficulty) => {
  if (!isCorrect) return 0;
  
  const difficultyPoints = {
    'beginner': 5,
    'intermediate': 10,
    'advanced': 15,
    'professional': 20
  };
  
  return difficultyPoints[difficulty] || 0;
};
