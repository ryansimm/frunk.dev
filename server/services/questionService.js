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
        easy: [
            {
                question: 'Write a function that returns the sum of all even numbers in a list.\n\nExample: sum_even([1, 2, 3, 4]) → 6',
                codeTemplate: 'def sum_even(numbers):\n    # Your code here\n    pass',
                hints: ['Use a loop or sum with a condition.', 'Check each number with n % 2 == 0.'],
                testCases: [{ input: '[1, 2, 3, 4]', expected: '6' }, { input: '[5, 7, 9]', expected: '0' }]
            },
            {
                question: 'Write a function that reverses a string without using the built-in reverse.\n\nExample: reverse_string("hello") → "olleh"',
                codeTemplate: 'def reverse_string(s):\n    # Your code here\n    pass',
                hints: ['You can build a new string character by character.', 'Try iterating backwards with a loop.'],
                testCases: [{ input: '"hello"', expected: '"olleh"' }, { input: '"abc"', expected: '"cba"' }]
            },
            {
                question: 'Write a function that counts how many times a given character appears in a string.\n\nExample: count_char("banana", "a") → 3',
                codeTemplate: 'def count_char(text, char):\n    # Your code here\n    pass',
                hints: ['Loop through each character in the string.', 'Compare each character to the target.'],
                testCases: [{ input: '"banana", "a"', expected: '3' }, { input: '"hello", "l"', expected: '2' }]
            },
            {
                question: 'Write a function that returns True if a number is prime, False otherwise.\n\nExample: is_prime(7) → True',
                codeTemplate: 'def is_prime(n):\n    # Your code here\n    pass',
                hints: ['A prime has no divisors other than 1 and itself.', 'You only need to check divisors up to sqrt(n).'],
                testCases: [{ input: '7', expected: 'True' }, { input: '4', expected: 'False' }]
            }
        ],
        medium: [
            {
                question: 'Write a function that returns the most frequent character in a string (ignore spaces).\n\nExample: most_frequent("hello world") → "l"',
                codeTemplate: 'def most_frequent_char(text):\n    # Your code here\n    pass',
                hints: ['Use a dictionary to count frequencies.', 'Skip whitespace characters.'],
                testCases: [{ input: '"banana"', expected: '"a"' }, { input: '"a b b c"', expected: '"b"' }]
            },
            {
                question: 'Write a function that flattens a list one level deep.\n\nExample: flatten([[1, 2], [3, 4]]) → [1, 2, 3, 4]',
                codeTemplate: 'def flatten(nested):\n    # Your code here\n    pass',
                hints: ['Iterate over each sublist.', 'Extend a result list with each inner list.'],
                testCases: [{ input: '[[1, 2], [3, 4]]', expected: '[1, 2, 3, 4]' }, { input: '[[1], [2, 3], [4]]', expected: '[1, 2, 3, 4]' }]
            },
            {
                question: 'Write a function that groups words in a list by their first letter.\n\nExample: group_by_first(["ant", "bee", "ape"]) → {"a": ["ant", "ape"], "b": ["bee"]}',
                codeTemplate: 'def group_by_first(words):\n    # Your code here\n    pass',
                hints: ['Use a dictionary keyed by the first character.', 'Append each word to its matching list.'],
                testCases: [{ input: '["ant", "bee", "ape"]', expected: '{"a": ["ant", "ape"], "b": ["bee"]}' }]
            },
            {
                question: 'Write a function that removes duplicate values from a list while preserving order.\n\nExample: remove_dupes([1, 2, 2, 3, 1]) → [1, 2, 3]',
                codeTemplate: 'def remove_dupes(items):\n    # Your code here\n    pass',
                hints: ['A set can track what you have already seen.', 'Only add an item to results if it is not in the seen set.'],
                testCases: [{ input: '[1, 2, 2, 3, 1]', expected: '[1, 2, 3]' }, { input: '[4, 4, 4]', expected: '[4]' }]
            }
        ],
        hard: [
            {
                question: 'Write a function that returns the first non-repeating character in a string, or None if all repeat.\n\nExample: first_unique("swiss") → "w"',
                codeTemplate: 'def first_non_repeating(text):\n    # Your code here\n    pass',
                hints: ['Count occurrences first, then scan in original order.', 'Return None when every char repeats.'],
                testCases: [{ input: '"swiss"', expected: '"w"' }, { input: '"aabb"', expected: 'None' }]
            },
            {
                question: 'Write a function that implements binary search and returns the index of the target, or -1 if not found.\n\nExample: binary_search([1,3,5,7,9], 5) → 2',
                codeTemplate: 'def binary_search(arr, target):\n    # Your code here\n    pass',
                hints: ['Use left and right pointers.', 'Compare to the midpoint and halve the search space.'],
                testCases: [{ input: '[1,3,5,7,9], 5', expected: '2' }, { input: '[1,2,3], 9', expected: '-1' }]
            },
            {
                question: 'Write a recursive function that computes the nth Fibonacci number.\n\nExample: fib(6) → 8',
                codeTemplate: 'def fib(n):\n    # Your code here\n    pass',
                hints: ['Base cases: fib(0)=0 and fib(1)=1.', 'Each number is the sum of the two preceding ones.'],
                testCases: [{ input: '6', expected: '8' }, { input: '0', expected: '0' }]
            },
            {
                question: 'Write a function that merges two sorted lists into a single sorted list.\n\nExample: merge_sorted([1,3,5], [2,4,6]) → [1,2,3,4,5,6]',
                codeTemplate: 'def merge_sorted(a, b):\n    # Your code here\n    pass',
                hints: ['Use two pointers advancing through each list.', 'Always pick the smaller current element.'],
                testCases: [{ input: '[1,3,5], [2,4,6]', expected: '[1,2,3,4,5,6]' }, { input: '[1], [2,3]', expected: '[1,2,3]' }]
            }
        ]
    };

    const pool = byDifficulty[level] || byDifficulty.medium;
    // Use questionNumber to cycle through pool variants so repeated fallbacks differ
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
