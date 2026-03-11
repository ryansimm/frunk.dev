/* global process */
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai'; 



dotenv.config()

//const API_KEY = process.env.OPENROUTER_API_KEY
const PORT = process.env.PORT || 5000
const MONGO_URI = 'mongodb://localhost:27017';

// Google AI 
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const JSON_RESPONSE_MODELS = [
    process.env.GEMINI_MODEL,
    'gemini-2.0-flash',
    'gemini-1.5-flash'
].filter(Boolean);

function extractJsonFromModelResponse(rawText) {
    const content = (rawText || '').replace(/```json\n?|\n?```/g, '').trim();

    try {
        return JSON.parse(content);
    } catch {
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
            throw new Error('AI response did not contain JSON');
        }

        const jsonCandidate = content.slice(firstBrace, lastBrace + 1);
        return JSON.parse(jsonCandidate);
    }
}

async function generateJsonWithFallback(prompt, modelNames) {
    let lastError;

    for (const modelName of modelNames) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const json = extractJsonFromModelResponse(text);
            return { json, modelName };
        } catch (error) {
            lastError = error;
            console.warn(`Model failed (${modelName}):`, error.message);
        }
    }

    throw lastError || new Error('No AI model available');
}

function getFallbackMcqQuestion(topic, difficulty) {
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

function getFallbackAdaptiveQuestion(difficulty, questionNumber) {
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

function normalizeCodeForTemplateComparison(code) {
    return (code || '')
        .replace(/#.*$/gm, '')
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();
}

function isSubmissionNearTemplate(userCode, codeTemplate) {
    if (!codeTemplate) {
        return false;
    }

    const normalizedUser = normalizeCodeForTemplateComparison(userCode);
    const normalizedTemplate = normalizeCodeForTemplateComparison(codeTemplate);

    if (!normalizedUser || !normalizedTemplate) {
        return false;
    }

    return normalizedUser === normalizedTemplate;
}

function stripTemplateScaffoldArtifacts(userCode, codeTemplate) {
    if (!codeTemplate) {
        return userCode || '';
    }

    const templateLineSet = new Set(
        (codeTemplate || '')
            .split('\n')
            .map((line) => line.trim().toLowerCase())
            .filter(Boolean)
    );

    const scaffoldTokens = new Set(['# your code here', '#your code here', 'pass']);

    return (userCode || '')
        .split('\n')
        .filter((line) => {
            const normalized = line.trim().toLowerCase();
            if (!normalized) {
                return true;
            }

            const isScaffoldLine = scaffoldTokens.has(normalized) && templateLineSet.has(normalized);
            return !isScaffoldLine;
        })
        .join('\n');
}

function getCorrectnessScoreFloor(difficulty) {
    const level = (difficulty || 'easy').toLowerCase();
    if (level === 'hard') return 92;
    if (level === 'medium') return 88;
    return 84;
}

function buildDetailedFeedback({ feedback, score, difficulty, issues, strengths, isCorrect }) {
    const normalizedFeedback = (feedback || '').trim();
    const looksGeneric = !normalizedFeedback
        || normalizedFeedback.length < 120
        || /good effort|needs improvement|not yet strong enough|try again/i.test(normalizedFeedback);

    if (!looksGeneric) {
        return normalizedFeedback;
    }

    const topStrengths = (strengths || []).slice(0, 2);
    const topIssues = (issues || []).slice(0, 3);

    const base = [
        `Difficulty: ${(difficulty || 'unknown').toUpperCase()}.`,
        `Score: ${score}/100.`
    ];

    if (isCorrect) {
        base.push('Your solution passes the current quality checks and is marked correct.');
    } else {
        base.push('Your solution is not marked correct yet based on the current checks.');
    }

    if (topStrengths.length > 0) {
        base.push(`What works well: ${topStrengths.join(' ')}`);
    }

    if (topIssues.length > 0) {
        base.push(`Main gaps to address: ${topIssues.join(' ')}`);
    }

    if (!isCorrect) {
        base.push('Next step: update the core logic first, then re-run with edge cases (empty input, single item, and repeated values where relevant).');
    }

    return base.join(' ');
}

function getFallbackEvaluation(userCode, codeTemplate, difficulty) {
    const code = (userCode || '').trim();
    const nonTemplateCode = stripTemplateScaffoldArtifacts(code, codeTemplate).trim();
    const hasCode = code.length > 0;
    const hasDef = /\bdef\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(code);
    const hasReturn = /\breturn\b/.test(code);
    const hasPlaceholder = /\bpass\b|todo|your code here/i.test(nonTemplateCode);
    const hasControlFlow = /\bfor\b|\bwhile\b|\bif\b|\belif\b|\btry\b/.test(code);
    const hasUsefulOps = /\bsort\b|\bsorted\b|\bappend\b|\bcount\b|\bdict\b|\bset\b|\blen\b/.test(code);
    const hasComprehension = /\[[^\]]+\bfor\b[^\]]+\]|\{[^}]+\bfor\b[^}]+\}/.test(code);
    const hasErrorHandling = /\btry\b[\s\S]*\bexcept\b/.test(code);
    const isEasy = (difficulty || 'easy').toLowerCase() === 'easy';
    const isTemplateOnly = isSubmissionNearTemplate(code, codeTemplate);

    const issues = [];
    const strengths = [];

    if (!hasCode) {
        return {
            isCorrect: false,
            score: 0,
            feedback: 'No code was submitted. Add a full solution and submit again.',
            issues: ['No code submitted.'],
            strengths: [],
            fallback: true
        };
    }

    let score = 0;

    if (hasDef) {
        strengths.push('Provides a function-based solution format.');
    } else {
        issues.push('Missing a clear function definition.');
    }

    if (hasReturn) {
        score += 8;
        strengths.push('Includes a return statement.');
    } else {
        issues.push('Missing return logic for final output.');
    }

    if (code.length >= 140) {
        score += 14;
        strengths.push('Shows substantial implementation detail.');
    } else if (code.length >= 90) {
        score += 8;
    } else {
        issues.push('Solution is very short and may be incomplete.');
    }

    if (hasControlFlow) {
        score += 10;
        strengths.push('Uses control flow to handle logic paths.');
    }

    if (hasUsefulOps || hasComprehension) {
        score += 8;
        strengths.push('Uses meaningful Python operations/data handling.');
    }

    if (hasErrorHandling) {
        score += 5;
        strengths.push('Includes basic error handling.');
    }

    if (hasPlaceholder) {
        score = Math.min(score, 12);
        issues.push('Contains placeholder or incomplete logic (e.g., pass/TODO).');
    }

    if (isTemplateOnly) {
        score = Math.min(score, 15);
        issues.push('Submission is still almost the same as the provided template scaffold.');
    }

    if (!isEasy && !hasControlFlow && code.length < 160) {
        score = Math.min(score, 35);
        issues.push('Missing clear algorithmic steps beyond structure/template.');
    }

    if (!isEasy && !hasUsefulOps && !hasComprehension) {
        score = Math.min(score, 55);
        issues.push('Implementation lacks concrete data-processing logic.');
    }

    score = Math.max(0, Math.min(100, score));
    const isCorrect = score >= 88 && issues.length === 0 && hasDef && hasReturn && !hasPlaceholder && (isEasy || hasControlFlow);
    const feedback = buildDetailedFeedback({
        feedback: isCorrect
            ? 'Solution appears complete under fallback structural checks.'
            : 'Solution needs stronger implementation detail under fallback checks.',
        score,
        difficulty,
        issues,
        strengths,
        isCorrect
    });

    return {
        isCorrect,
        score,
        feedback,
        issues,
        strengths,
        fallback: true
    };
}

function normalizeEvaluationResult(evaluationData, userCode, codeTemplate, difficulty) {
    const code = (userCode || '').trim();
    const nonTemplateCode = stripTemplateScaffoldArtifacts(code, codeTemplate).trim();
    const hasDef = /\bdef\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(code);
    const hasReturn = /\breturn\b/.test(code);
    const hasPlaceholder = /\bpass\b|todo|your code here/i.test(nonTemplateCode);
    const isVeryShort = nonTemplateCode.length < 40;
    const hasControlFlow = /\bfor\b|\bwhile\b|\bif\b|\belif\b|\btry\b/.test(code);
    const hasDataOps = /\bsort\b|\bsorted\b|\bappend\b|\bcount\b|\bdict\b|\bset\b|\blen\b|\bany\b|\ball\b|\benumerate\b|\bzip\b/.test(code);
    const hasComprehension = /\[[^\]]+\bfor\b[^\]]+\]|\{[^}]+\bfor\b[^}]+\}/.test(code);
    const isEasy = (difficulty || 'easy').toLowerCase() === 'easy';
    const isTemplateOnly = isSubmissionNearTemplate(code, codeTemplate);

    let score = Number.isFinite(Number(evaluationData?.score)) ? Number(evaluationData.score) : 0;
    score = Math.max(0, Math.min(100, score));

    const issues = Array.isArray(evaluationData?.issues)
        ? evaluationData.issues.filter(Boolean)
        : [];
    const strengths = Array.isArray(evaluationData?.strengths)
        ? evaluationData.strengths.filter(Boolean)
        : [];

    if (!hasDef) {
        score = Math.min(score, 45);
        issues.push('Missing clear function definition.');
    }

    if (!hasReturn) {
        score = Math.min(score, 55);
        issues.push('Missing explicit return statement.');
    }

    if (hasPlaceholder) {
        score = Math.min(score, 25);
        issues.push('Contains placeholder/incomplete code (pass/TODO).');
    }

    if (isVeryShort) {
        score = Math.min(score, 35);
        issues.push('Code is too short to demonstrate a complete solution.');
    }

    if (isTemplateOnly) {
        score = Math.min(score, 20);
        issues.push('Submission mostly matches scaffold/template without implementation depth.');
    }

    if (!isEasy && !hasControlFlow && code.length < 160) {
        score = Math.min(score, 45);
        issues.push('Insufficient algorithmic logic detected for this solution.');
    }

    if (!isEasy && !hasDataOps && !hasComprehension) {
        score = Math.min(score, 70);
        issues.push('Limited concrete data-processing operations detected.');
    }

    if (issues.length >= 2) {
        score = Math.min(score, 62);
    }

    if (issues.length >= 4) {
        score = Math.min(score, 50);
    }

    if (!Array.isArray(evaluationData?.strengths) || evaluationData.strengths.length === 0) {
        score = Math.min(score, 78);
    }

    const modelMarkedCorrect = Boolean(evaluationData?.isCorrect);

    if (modelMarkedCorrect) {
        score = Math.max(score, getCorrectnessScoreFloor(difficulty));
    }

    const isCorrect = modelMarkedCorrect && !isTemplateOnly && hasDef && hasReturn && !hasPlaceholder;

    const finalFeedback = buildDetailedFeedback({
        feedback: evaluationData?.feedback,
        score,
        difficulty,
        issues,
        strengths,
        isCorrect
    });

    return {
        isCorrect,
        score,
        feedback: finalFeedback,
        issues,
        strengths
    };
}

function resolveDifficultyMultiplier(difficulty) {
    const level = (difficulty || 'easy').toLowerCase();
    if (level === 'hard') return 1.5;
    if (level === 'medium') return 1.2;
    return 1;
}

function calculateTokenAward({ evaluationData, difficulty, userCode }) {
    const score = Number.isFinite(Number(evaluationData?.score)) ? Number(evaluationData.score) : 0;
    const issuesCount = Array.isArray(evaluationData?.issues) ? evaluationData.issues.length : 0;
    const strengthsCount = Array.isArray(evaluationData?.strengths) ? evaluationData.strengths.length : 0;
    const isCorrect = Boolean(evaluationData?.isCorrect);
    const code = (userCode || '').trim();

    const hasErrorHandling = /\btry\b[\s\S]*\bexcept\b/i.test(code);
    const hasEfficientPatterns = /(\{.*for.*in.*\}|\[.*for.*in.*\]|\bset\(|\bdict\(|\bany\(|\ball\(|\benumerate\(|\bzip\()/i.test(code);
    const isLikelyOverlyLong = code.length > 800;

    const baseFromScore = Math.round((score / 100) * 14);
    const correctnessBonus = isCorrect ? 4 : 0;
    const difficultyScaled = Math.round((baseFromScore + correctnessBonus) * resolveDifficultyMultiplier(difficulty));
    const qualityBonus = Math.min(3, strengthsCount);
    const issuePenalty = Math.min(5, issuesCount);
    const efficiencyBonus = hasEfficientPatterns ? 2 : 0;
    const errorHandlingBonus = hasErrorHandling ? 1 : 0;
    const lengthPenalty = isLikelyOverlyLong ? 2 : 0;

    const raw = difficultyScaled + qualityBonus + efficiencyBonus + errorHandlingBonus - issuePenalty - lengthPenalty;
    const tokenAward = Math.max(0, Math.min(30, raw));

    return {
        tokenAward,
        tokenBreakdown: {
            baseFromScore,
            correctnessBonus,
            difficultyMultiplier: resolveDifficultyMultiplier(difficulty),
            qualityBonus,
            efficiencyBonus,
            errorHandlingBonus,
            issuePenalty,
            lengthPenalty
        }
    };
}

function parseOptionalUserId(userId) {
    if (!userId || userId === 'anonymous') {
        return null;
    }

    if (!ObjectId.isValid(userId)) {
        return null;
    }

    return new ObjectId(userId);
}

const app = express();
app.use(cors());
app.use(express.json());


// MongoDB Connection
let db;
const client = new MongoClient(MONGO_URI);

async function connectToDB() {
    try {
        await client.connect();
        db = client.db('ai_platform');
        console.log('Connected to database');
    } catch (error) {
        console.error('Error connecting to database:', error);
        process.exit(1);
    }
}

// Test endpoint
app.get('/api/test', async (req, res) => {
    try {
        const result = await db.collection('test').insertOne({
            message: 'Backend is working!',
            timestamp: new Date()
        });
        res.json({ 
            success: true, 
            message: 'Database connected!', 
            id: result.insertedId 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Endpoint 1 : User Registration 
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    try {
        // Check if user exists
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create new user
        const user = {
            email,
            password, // TODO: Hash this in production with bcrypt
            name,
            createdAt: new Date(),
            aptitudeCompleted: false,
            tokenBalance: 0,
            totalTokensEarned: 0
        };

        const result = await db.collection('users').insertOne(user);
        
        res.json({ 
            success: true, 
            userId: result.insertedId.toString(),
            user: { email, name, tokenBalance: 0 }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Endpoint 2: User Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    try {
        const user = await db.collection('users').findOne({ email, password });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({ 
            success: true, 
            userId: user._id.toString(),
            user: { 
                email: user.email, 
                name: user.name,
                aptitudeCompleted: user.aptitudeCompleted || false,
                tokenBalance: user.tokenBalance || 0
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Endpoint 3: AI Feedback
app.post('/api/feedback', async (req, res) => {
    const { userAnswer, correctAnswer, questionText, userId } = req.body;
    
    // Validation
    if (!userAnswer || !questionText) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const startTime = Date.now();

    try {
        // import the model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // single prompt with all info to generate feedback
        const prompt = `You are a supportive tutor providing constructive, specific feedback on student answers to coding based questions. Be encouraging but honest. Point out what they did well and where they can improve. Most specifically, do not provide students with a quick fix with generative code, but instead guide them to find the solution themselves. Always provide actionable advice for improvement.

Question: ${questionText}

Student Answer: ${userAnswer}

Correct Answer: ${correctAnswer || 'Not provided'}

Provide specific, constructive feedback.`;

        const result = await model.generateContent(prompt);
        const feedback = result.response.text();
        const responseTime = Date.now() - startTime;

        // Log interaction to database
        await db.collection('feedback_logs').insertOne({
            userId: userId || 'anonymous',
            questionText,
            userAnswer,
            correctAnswer,
            feedback,
            model: 'gemini-3-flash-preview', 
            responseTime,
            timestamp: new Date()
        });

        res.json({ 
            feedback,
            responseTime 
        });

    } catch (error) {
        // Error handling
        console.error('Feedback error:', error);
        res.status(500).json({ 
            error: 'Failed to generate feedback',
            details: error.message
        });
    }
});

// Endpoint 4: Generate Question
app.post('/api/generate-question', async (req, res) => {
    const { topic, difficulty, userId } = req.body;

    // Validation
    if (!topic || !difficulty) {
        return res.status(400).json({ error: 'Missing topic or difficulty' });
    }

    const startTime = Date.now();

    try {
        // Import the model
        // Single prompt to generate a question with all required info
        const prompt = `You are a question generator. Create educational questions with multiple choice options. Always respond with valid JSON only, no additional text.

Generate a ${difficulty} difficulty multiple-choice question about "${topic}". 

Return ONLY valid JSON in this exact format:
{
  "question": "The question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option text",
  "explanation": "Why this is the correct answer"
}`;

        const { json: questionData, modelName } = await generateJsonWithFallback(prompt, JSON_RESPONSE_MODELS);

        const responseTime = Date.now() - startTime;

        // Store in database
        const dbEntry = {
            userId: userId || 'anonymous',
            topic,
            difficulty,
            ...questionData,
            model: modelName,
            createdAt: new Date(),
            responseTime
        };

        const insertResult = await db.collection('questions').insertOne(dbEntry); 

        res.json({ 
            ...questionData,
            id: insertResult.insertedId, 
            responseTime
        });

    } catch (error) {
        console.error('Question generation error:', error);
        const fallbackQuestion = getFallbackMcqQuestion(topic, difficulty);
        res.json({
            ...fallbackQuestion,
            responseTime: Date.now() - startTime,
            fallback: true,
            details: error.message
        });
    }
});

// Endpoint 5 : adaptive style coding questions based on performance
app.post('/api/generate-adaptive-question', async (req, res) => {
    const { questionNumber, lastAnswerCorrect, currentDifficulty, userId } = req.body;

    const startTime = Date.now();
    let nextDifficulty = currentDifficulty || 'medium';

    try {
        // Determine next difficulty level
        if (questionNumber > 1) {
            if (lastAnswerCorrect && currentDifficulty === 'easy') {
                nextDifficulty = 'medium';
            } else if (lastAnswerCorrect && currentDifficulty === 'medium') {
                nextDifficulty = 'hard';
            } else if (!lastAnswerCorrect && currentDifficulty === 'hard') {
                nextDifficulty = 'medium';
            } else if (!lastAnswerCorrect && currentDifficulty === 'medium') {
                nextDifficulty = 'easy';
            }
        }

        const prompt = `You are creating a Python coding challenge for an adaptive aptitude test. Generate a ${nextDifficulty} difficulty question.

Difficulty guidelines:
- EASY: Basic syntax, simple loops, basic functions (beginner level)
- MEDIUM: Functions with parameters, list operations, string manipulation, conditionals (intermediate level)
- HARD: Algorithms, recursion, classes, complex data structures (advanced level)

Generate question #${questionNumber} of 12.

Return ONLY valid JSON in this exact format:
{
  "question": "Clear problem description with example input/output",
  "codeTemplate": "def function_name():\\n    # Your code here\\n    pass",
  "difficulty": "${nextDifficulty}",
  "hints": ["Hint 1", "Hint 2"],
  "testCases": [
    {"input": "example input", "expected": "expected output"},
    {"input": "edge case", "expected": "expected output"}
  ]
}

Make the question engaging and practical. Include clear examples.`;

        const { json: questionData, modelName } = await generateJsonWithFallback(prompt, JSON_RESPONSE_MODELS);

        const responseTime = Date.now() - startTime;

        // Store question in database
        const dbEntry = {
            userId: userId || 'anonymous',
            questionNumber,
            difficulty: nextDifficulty,
            ...questionData,
            model: modelName,
            createdAt: new Date(),
            responseTime
        };

        const insertResult = await db.collection('aptitude_questions').insertOne(dbEntry);

        res.json({ 
            ...questionData,
            id: insertResult.insertedId,
            questionNumber,
            responseTime
        });

    } catch (error) {
        console.error('Adaptive question error:', error);
        const fallbackQuestion = getFallbackAdaptiveQuestion(nextDifficulty || currentDifficulty || 'medium', questionNumber);
        res.json({ 
            ...fallbackQuestion,
            responseTime: Date.now() - startTime,
            details: error.message
        });
    }
});

// Evaluate code submission for aptitude test
app.post('/api/evaluate-aptitude-code', async (req, res) => {
    const { userCode, question, difficulty, testCases, userId, codeTemplate } = req.body;

    const startTime = Date.now();

    try {
        const prompt = `You are evaluating a Python coding submission for an aptitude test.

Difficulty Level: ${difficulty}
Question: ${question}

Student's Code:
\`\`\`python
${userCode}
\`\`\`

Test Cases: ${JSON.stringify(testCases)}

Evaluate the code and respond with ONLY valid JSON:
{
  "isCorrect": true/false,
  "score": 0-100,
    "feedback": "Detailed constructive feedback (4-7 sentences) referencing the submitted logic quality, likely failing edge cases, and one concrete next fix",
  "issues": ["Issue 1", "Issue 2"] or [],
  "strengths": ["Strength 1"] or []
}

Strict grading rubric (very important):
- 90-100: Fully correct, robust, handles edge cases, clean logic.
- 75-89: Mostly correct but has minor edge-case or quality gaps.
- 50-74: Partially correct, significant missing logic.
- 1-49: Incorrect/incomplete logic.
- 0: Empty or irrelevant submission.

Rules:
- If code only keeps scaffold placeholders like "# your code here" and "pass" without real added logic, score must be <= 25 and isCorrect=false.
- If placeholders are only inherited from the provided template and the user adds correct logic, do not penalize for those scaffold lines.
- If required logic is missing or test cases would fail, isCorrect=false.
- Do not award high scores for boilerplate structure alone.
- Feedback must be specific and technical (avoid generic encouragement-only phrases).
- Be strict and conservative with scoring.`;

    const { json: rawEvaluationData } = await generateJsonWithFallback(prompt, JSON_RESPONSE_MODELS);
    const evaluationData = normalizeEvaluationResult(rawEvaluationData, userCode, codeTemplate, difficulty);
    const { tokenAward, tokenBreakdown } = calculateTokenAward({
        evaluationData,
        difficulty,
        userCode
    });

        const responseTime = Date.now() - startTime;
        let tokenBalance = null;

        const parsedUserId = parseOptionalUserId(userId);
        if (parsedUserId) {
            const userUpdate = await db.collection('users').findOneAndUpdate(
                { _id: parsedUserId },
                {
                    $inc: {
                        tokenBalance: tokenAward,
                        totalTokensEarned: tokenAward
                    }
                },
                { returnDocument: 'after' }
            );

            tokenBalance = userUpdate?.value?.tokenBalance ?? null;
        }

        // Store submission
        await db.collection('aptitude_submissions').insertOne({
            userId: userId || 'anonymous',
            question,
            difficulty,
            userCode,
            evaluation: evaluationData,
            tokenAward,
            tokenBreakdown,
            tokenBalanceAfterSubmission: tokenBalance,
            timestamp: new Date(),
            responseTime
        });

        res.json({ 
            ...evaluationData,
            tokenAward,
            tokenBalance,
            responseTime
        });

    } catch (error) {
        console.error('Code evaluation error:', error);
        const fallbackEvaluation = getFallbackEvaluation(userCode, codeTemplate, difficulty);
        const { tokenAward, tokenBreakdown } = calculateTokenAward({
            evaluationData: fallbackEvaluation,
            difficulty,
            userCode
        });
        let tokenBalance = null;

        const parsedUserId = parseOptionalUserId(userId);
        if (parsedUserId) {
            const userUpdate = await db.collection('users').findOneAndUpdate(
                { _id: parsedUserId },
                {
                    $inc: {
                        tokenBalance: tokenAward,
                        totalTokensEarned: tokenAward
                    }
                },
                { returnDocument: 'after' }
            );

            tokenBalance = userUpdate?.value?.tokenBalance ?? null;
        }
        res.json({ 
            ...fallbackEvaluation,
            tokenAward,
            tokenBalance,
            tokenBreakdown,
            responseTime: Date.now() - startTime,
            details: error.message
        });
    }
});

// Save aptitude test summary results
app.post('/api/aptitude-results', async (req, res) => {
    const { userId, results } = req.body;

    if (!results) {
        return res.status(400).json({ error: 'Missing results payload' });
    }

    try {
        const parsedUserId = parseOptionalUserId(userId);
        const payload = {
            userId: userId || 'anonymous',
            ...results,
            createdAt: new Date()
        };

        await db.collection('aptitude_results').insertOne(payload);

        let tokenBalance = null;

        if (parsedUserId) {
            const userUpdate = await db.collection('users').findOneAndUpdate(
                { _id: parsedUserId },
                {
                    $set: {
                        aptitudeCompleted: true,
                        latestAptitudeScore: results.score,
                        latestAptitudeLevel: results.level,
                        latestAptitudeAt: new Date()
                    }
                },
                { returnDocument: 'after' }
            );

            tokenBalance = userUpdate?.value?.tokenBalance ?? null;
        }

        res.json({
            success: true,
            tokenBalance
        });
    } catch (error) {
        console.error('Failed to save aptitude results:', error);
        res.status(500).json({ error: 'Failed to save aptitude results' });
    }
});

// Fetch current token balance for a user
app.get('/api/users/:userId/tokens', async (req, res) => {
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }

    try {
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { tokenBalance: 1, totalTokensEarned: 1 } }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            tokenBalance: user.tokenBalance || 0,
            totalTokensEarned: user.totalTokensEarned || 0
        });
    } catch (error) {
        console.error('Failed to fetch token balance:', error);
        res.status(500).json({ error: 'Failed to fetch token balance' });
    }
});

connectToDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});