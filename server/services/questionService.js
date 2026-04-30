/**
 * References:
 * https://www.geeksforgeeks.org/python/python-programming-examples/
 * https://www.w3schools.com/python/python_exercises.asp
 * https://www.freecodecamp.org/news/python-projects-for-beginners/
 * https://stackoverflow.com/questions/18270523/how-do-i-randomly-select-an-item-from-a-list
 *
 * Covers: the Python question exmples grouped by difficulty, the fallback and static question banks 
 * if AI fails, random selection and cycling of questions, adaptive difficulty progression logic
 */

export function getFallbackMcqQuestion(topic, difficulty) {
    const normalisedDifficulty = (difficulty || 'medium').toLowerCase();

    // Basic MCQ fallback used when AI generation is unavailable
    return {
        question: `Which statement best describes ${topic} in Python at a ${normalisedDifficulty} level?`,
        options: [
            `${topic} is only used in web development`,
            `${topic} helps structure and solve problems in Python programs`,
            `${topic} cannot be tested with code`,
            `${topic} is unrelated to Python syntax or logic`
        ],
        correctAnswer: `${topic} helps structure and solve problems in Python programs`,
        explanation: `${topic} is a practical programming concept used to build and reason about Python solutions.`,
        questionType: 'mcq'
    };
}

export function getFallbackKnowledgeQuestion(topic, difficulty) {
    const normalisedDifficulty = (difficulty || 'medium').toLowerCase();
    const normalisedTopic = (topic || '').toLowerCase();
    
    // Topic-specific fallback questions to improve clarity over generic ones
    const topicQuestions = {
        'python basics': {
            easy: [
                { question: 'Describe the basic syntax and data types you would use to store and manipulate information in Python.', correctKeywords: ['variable', 'data type', 'string', 'integer', 'syntax', 'assign'] },
                { question: 'What are the fundamental control structures in Python and when would you use each one?', correctKeywords: ['if', 'for', 'while', 'loop', 'condition', 'control'] },
                { question: 'Explain what a function is and why it is useful in writing reusable code.', correctKeywords: ['reusable', 'organise', 'modular', 'parameter', 'return', 'call'] }
            ],
            medium: [
                { question: 'Compare procedural programming (step-by-step) with functional programming concepts in Python.', correctKeywords: ['procedure', 'function', 'side-effect', 'pure', 'parameters', 'return'] },
                { question: 'How do Python\'s built-in data types (list, dict, tuple, set) differ in terms of mutability and use cases?', correctKeywords: ['mutable', 'immutable', 'ordered', 'unique', 'key-value', 'use case'] },
                { question: 'Describe how error handling with try/except helps make Python programs more robust.', correctKeywords: ['exception', 'error', 'try', 'except', 'robust', 'graceful'] }
            ],
            hard: [
                { question: 'Analyse how Python\'s object-oriented features (classes, inheritance, polymorphism) improve code organisation.', correctKeywords: ['OOP', 'class', 'inheritance', 'polymorphism', 'encapsulation', 'abstraction'] },
                { question: 'Explain the differences between shallow and deep copying in Python and when each matters.', correctKeywords: ['shallow', 'deep', 'reference', 'independent', 'mutable', 'copy'] },
                { question: 'Design a strategy for optimising Python code performance and explain trade-offs between readability and speed.', correctKeywords: ['optimise', 'performance', 'algorithm', 'readability', 'trade-off', 'efficiency'] }
            ]
        },
        'functions': {
            easy: [
                { question: 'Explain what a function is and describe its main components (parameters, body, return).', correctKeywords: ['definition', 'parameter', 'body', 'return', 'argument', 'call'] },
                { question: 'How do function parameters and return values work together to make functions reusable?', correctKeywords: ['parameter', 'argument', 'return', 'reusable', 'input', 'output'] },
                { question: 'Why is it better to use functions instead of writing the same code multiple times?', correctKeywords: ['reuse', 'DRY', 'maintainability', 'duplication', 'organise', 'modular'] }
            ],
            medium: [
                { question: 'Compare different ways to pass data to functions: positional args, keyword args, *args, **kwargs. When would you use each?', correctKeywords: ['positional', 'keyword', 'args', 'kwargs', 'flexibility', 'clarity'] },
                { question: 'Explain scope and how local vs global variables work within functions.', correctKeywords: ['scope', 'local', 'global', 'namespace', 'visibility', 'lifetime'] },
                { question: 'Describe lambda functions and compare them to regular functions.', correctKeywords: ['lambda', 'anonymous', 'concise', 'single expression', 'map', 'filter'] }
            ],
            hard: [
                { question: 'Analyse how function decorators work and design a use case where decorators improve code organisation.', correctKeywords: ['decorator', 'wrapper', 'higher-order', 'modification', 'reusable', 'elegant'] },
                { question: 'Explain closures and their role in functional programming patterns in Python.', correctKeywords: ['closure', 'nested', 'enclosure', 'state', 'functional', 'first-class'] },
                { question: 'Design a recursive function and explain how to optimise it using techniques like memoization.', correctKeywords: ['recursive', 'base case', 'memoization', 'cache', 'optimisation', 'call stack'] }
            ]
        }
    };

    // Find closest matching topic, otherwise default to basics
    const topicKey = Object.keys(topicQuestions).find(key => normalisedTopic.includes(key)) || 'python basics';
    
    const level = normalisedDifficulty;
    const pool = topicQuestions[topicKey]?.[level] || topicQuestions[topicKey]?.['medium'] || topicQuestions['python basics'].medium;
    
    // Randomly pick a question from the pool
    const selected = pool[Math.floor(Math.random() * pool.length)];

    return {
        questionType: 'knowledge',
        question: selected.question,
        correctKeywords: selected.correctKeywords,
        explanation: `This is a knowledge-based question. For full marks, your answer should demonstrate understanding of the topic's key concepts, usage patterns, and practical applications.`
    };
}

export function getFallbackAdaptiveQuestion(difficulty, questionNumber) {
    const level = (difficulty || 'medium').toLowerCase();

    // Predefined fallback coding questions grouped by difficulty
    const byDifficulty = {
        easy: [
            {
                question: 'Write a function that returns the sum of all even numbers in a list.\n\nExample: sum_even([1, 2, 3, 4]) → 6',
                codeTemplate: 'def sum_even(numbers):\n    # Your code here\n    pass',
                hints: ['Use a loop or sum with a condition.', 'Check each number with n % 2 == 0.'],
                testCases: [{ input: '[1, 2, 3, 4]', expected: '6' }]
            }
        ],
        medium: [
            {
                question: 'Write a function that returns the most frequent character in a string (ignore spaces).\n\nExample: most_frequent("hello world") → "l"',
                codeTemplate: 'def most_frequent_char(text):\n    # Your code here\n    pass',
                hints: ['Use a dictionary to count frequencies.', 'Skip whitespace characters.'],
                testCases: [{ input: '"banana"', expected: '"a"' }]
            }
        ],
        hard: [
            {
                question: 'Write a recursive function that computes the nth Fibonacci number.\n\nExample: fib(6) → 8',
                codeTemplate: 'def fib(n):\n    # Your code here\n    pass',
                hints: ['Base cases: fib(0)=0 and fib(1)=1.', 'Each number is the sum of the two preceding ones.'],
                testCases: [{ input: '6', expected: '8' }]
            }
        ]
    };

    const pool = byDifficulty[level] || byDifficulty.medium;

    // Cycles questions so repeated fallbacks are not identical
    const selected = pool[(questionNumber - 1) % pool.length];

    return {
        question: selected.question,
        codeTemplate: selected.codeTemplate,
        difficulty: level,
        hints: selected.hints,
        testCases: selected.testCases,
        fallback: true,
        questionNumber
    };
}

// Adjusts difficulty depending on previous performance
export function resolveNextDifficulty(questionNumber, lastAnswerCorrect, currentDifficulty) {
    let nextDifficulty = currentDifficulty || 'medium';

    if (questionNumber <= 1) {
        return nextDifficulty;
    }

    if (lastAnswerCorrect && currentDifficulty === 'easy') {
        nextDifficulty = 'medium';
    } else if (lastAnswerCorrect && currentDifficulty === 'medium') {
        nextDifficulty = 'hard';
    } else if (!lastAnswerCorrect && currentDifficulty === 'hard') {
        nextDifficulty = 'medium';
    } else if (!lastAnswerCorrect && currentDifficulty === 'medium') {
        nextDifficulty = 'easy';
    }

    return nextDifficulty;
}