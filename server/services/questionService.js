export function getFallbackMcqQuestion(topic, difficulty) {
    const normalisedDifficulty = (difficulty || 'medium').toLowerCase();
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
    
    // Topic-specific questions for better clarity
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
        },
        'lists': {
            easy: [
                { question: 'What is a list and how does it differ from other Python data structures like tuples?', correctKeywords: ['ordered', 'mutable', 'collection', 'index', 'tuple', 'immutable'] },
                { question: 'Describe common list operations like append, remove, and slicing.', correctKeywords: ['append', 'remove', 'insert', 'slice', 'method', 'operation'] },
                { question: 'When would you use a list instead of a string or tuple?', correctKeywords: ['mutable', 'modifiable', 'collection', 'change', 'ordered', 'organise'] }
            ],
            medium: [
                { question: 'Explain list comprehensions and how they make code more concise and readable.', correctKeywords: ['comprehension', 'concise', 'readable', 'filter', 'transform', 'efficient'] },
                { question: 'Compare nested lists (2D lists) with flat lists and discuss their memory and performance implications.', correctKeywords: ['nested', 'dimension', 'iteration', 'complexity', 'memory', 'performance'] },
                { question: 'How do list methods like sort() and sorted() differ, and what are the performance implications?', correctKeywords: ['sort', 'sorted', 'in-place', 'return', 'performance', 'time complexity'] }
            ],
            hard: [
                { question: 'Analyse the time and space complexity of various list operations (access, insert, delete, slice).', correctKeywords: ['time complexity', 'space complexity', 'O(n)', 'O(1)', 'insertion', 'deletion'] },
                { question: 'Explain how list slicing works internally and design efficient strategies for large data manipulation.', correctKeywords: ['slicing', 'shallow copy', 'view', 'efficiency', 'memory', 'large data'] },
                { question: 'Compare lists with other sequence types and explain when to use generators instead for memory efficiency.', correctKeywords: ['sequence', 'generator', 'lazy evaluation', 'memory', 'efficiency', 'yield'] }
            ]
        },
        'dictionaries': {
            easy: [
                { question: 'What is a dictionary and how is it different from a list?', correctKeywords: ['key-value', 'unordered', 'mapping', 'lookup', 'mutable', 'heterogeneous'] },
                { question: 'Explain how keys work in dictionaries and why they must be unique and hashable.', correctKeywords: ['hashable', 'immutable', 'unique', 'lookup', 'hash', 'collision'] },
                { question: 'List common dictionary operations and methods like get(), keys(), values().', correctKeywords: ['get', 'keys', 'values', 'items', 'method', 'safe access'] }
            ],
            medium: [
                { question: 'Compare dictionaries with lists for different use cases (when would you choose one over the other?).', correctKeywords: ['fast lookup', 'key-value', 'order matters', 'indexing', 'performance', 'semantic'] },
                { question: 'Explain nested dictionaries and how to safely access deeply nested values.', correctKeywords: ['nested', 'deep access', 'key error', 'safe', 'get method', 'structure'] },
                { question: 'Describe dictionary comprehension and how it compares to list comprehension.', correctKeywords: ['comprehension', 'concise', 'key', 'value', 'filter', 'transform'] }
            ],
            hard: [
                { question: 'Analyse the hashing mechanism in dictionaries and explain collision handling performance implications.', correctKeywords: ['hash', 'collision', 'algorithm', 'performance', 'load factor', 'O(1)'] },
                { question: 'Explain the difference between shallow and deep copying with dictionaries containing mutable values.', correctKeywords: ['shallow', 'deep', 'reference', 'independent', 'mutable', 'copy'] },
                { question: 'Design efficient dictionary-based solutions for problems like grouping data or counting occurrences.', correctKeywords: ['counting', 'grouping', 'defaultdict', 'efficiency', 'algorithm', 'optimisation'] }
            ]
        },
        'loops': {
            easy: [
                { question: 'Explain the difference between for loops and while loops and when to use each.', correctKeywords: ['for', 'while', 'iterate', 'condition', 'control', 'sequence'] },
                { question: 'Describe what break and continue do in loops.', correctKeywords: ['break', 'continue', 'exit', 'skip', 'control flow', 'iteration'] },
                { question: 'What is a loop and why is it useful in programming?', correctKeywords: ['repetition', 'automate', 'efficiency', 'collection', 'iterate', 'reduce'] }
            ],
            medium: [
                { question: 'Explain the enumerate() function and how it simplifies loops over collections.', correctKeywords: ['enumerate', 'index', 'value', 'tuple', 'iteration', 'convenience'] },
                { question: 'Compare nested loops with single loops and discuss performance implications.', correctKeywords: ['nested', 'time complexity', 'O(n²)', 'performance', 'readability'] },
                { question: 'Describe else clauses in for and while loops and when they are useful.', correctKeywords: ['else', 'executed', 'no break', 'search', 'found', 'not found'] }
            ],
            hard: [
                { question: 'Analyse loop performance and explain optimisation techniques like reducing iterations and avoiding costly operations.', correctKeywords: ['optimisation', 'performance', 'algorithm', 'complexity', 'O(n)', 'refactor'] },
                { question: 'Explain generator-based loops and lazy evaluation compared to traditional loops.', correctKeywords: ['generator', 'yield', 'lazy', 'memory efficient', 'iteration', 'performance'] },
                { question: 'Design loop-based algorithms for problems like searching, sorting, and filtering efficiently.', correctKeywords: ['algorithm', 'search', 'sort', 'filter', 'efficiency', 'pattern'] }
            ]
        },
        'oop': {
            easy: [
                { question: 'What is a class and how does it relate to objects in Python?', correctKeywords: ['blueprint', 'template', 'instance', 'attribute', 'method', 'object'] },
                { question: 'Explain what the __init__ method does and why it is important.', correctKeywords: ['constructor', 'initialise', 'attribute', 'instance', 'self', 'setup'] },
                { question: 'Describe the difference between class attributes and instance attributes.', correctKeywords: ['class attribute', 'instance attribute', 'shared', 'individual', 'self', 'class'] }
            ],
            medium: [
                { question: 'Explain inheritance and how it promotes code reuse and organisation.', correctKeywords: ['inheritance', 'parent', 'child', 'reuse', 'extend', 'hierarchy'] },
                { question: 'What is polymorphism and how does it allow different classes to be used interchangeably?', correctKeywords: ['polymorphism', 'override', 'method', 'interface', 'flexibility', 'duck typing'] },
                { question: 'Describe encapsulation and how private attributes (e.g., _attribute) improve class design.', correctKeywords: ['encapsulation', 'private', 'public', 'abstraction', 'hide', 'implementation'] }
            ],
            hard: [
                { question: 'Analyse how multiple inheritance works in Python and discuss potential issues like the diamond problem.', correctKeywords: ['multiple inheritance', 'diamond', 'MRO', 'method resolution', 'order'] },
                { question: 'Explain mixins and how they provide a better alternative to multiple inheritance for composing behavior.', correctKeywords: ['mixin', 'composition', 'behavior', 'flexible', 'reusable', 'multiple'] },
                { question: 'Design a robust OOP architecture with proper use of inheritance, composition, and design patterns.', correctKeywords: ['architecture', 'design pattern', 'composition', 'inheritance', 'abstract', 'interface'] }
            ]
        }
    };

    // Get topic-specific questions or fall back to generic
    const topicKey = Object.keys(topicQuestions).find(key => normalisedTopic.includes(key)) || 'python basics';
    
    const level = normalisedDifficulty;
    const pool = topicQuestions[topicKey]?.[level] || topicQuestions[topicKey]?.['medium'] || topicQuestions['python basics'].medium;
    
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
