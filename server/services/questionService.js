export function getFallbackMcqQuestion(topic, difficulty) {
    const normalizedDifficulty = (difficulty || 'medium').toLowerCase();
    return {
        question: `Which statement best describes ${topic} in Python at a ${normalizedDifficulty} level?`,
        options: [
            `${topic} is only used in web development`,
            `${topic} helps structure and solve problems in Python programs`,
            `${topic} cannot be tested with code`,
            `${topic} is unrelated to Python syntax or logic`
        ],
        correctAnswer: `${topic} helps structure and solve problems in Python programs`,
        explanation: `${topic} is a practical programming concept used to build and reason about Python solutions.`
    };
}

export function getFallbackAdaptiveQuestion(difficulty, questionNumber) {
    const level = (difficulty || 'medium').toLowerCase();

    const byDifficulty = {
        easy: {
            question: 'Write a function that returns the sum of all even numbers in a list.',
            codeTemplate: 'def sum_even(numbers):\n    # Your code here\n    pass',
            hints: ['Use a loop or sum with a condition.', 'Check each number with n % 2 == 0.'],
            testCases: [
                { input: '[1, 2, 3, 4]', expected: '6' },
                { input: '[5, 7, 9]', expected: '0' }
            ]
        },
        medium: {
            question: 'Write a function that returns the most frequent character in a string (ignore spaces).',
            codeTemplate: 'def most_frequent_char(text):\n    # Your code here\n    pass',
            hints: ['You can use a dictionary to count frequencies.', 'Skip whitespace characters.'],
            testCases: [
                { input: '"banana"', expected: '"a"' },
                { input: '"a b b c"', expected: '"b"' }
            ]
        },
        hard: {
            question: 'Write a function that returns the first non-repeating character in a string, or None if none exists.',
            codeTemplate: 'def first_non_repeating(text):\n    # Your code here\n    pass',
            hints: ['Count occurrences first, then scan in original order.', 'Return None when every char repeats.'],
            testCases: [
                { input: '"swiss"', expected: '"w"' },
                { input: '"aabb"', expected: 'None' }
            ]
        }
    };

    const selected = byDifficulty[level] || byDifficulty.medium;

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
