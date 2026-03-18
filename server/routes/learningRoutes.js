import express from 'express';

export function createLearningRoutes({ db, generateTextWithModel, generateJsonWithFallback, jsonModels, getFallbackMcqQuestion, getFallbackKnowledgeQuestion, getFallbackAdaptiveQuestion, parseOptionalUserId }) {
    const router = express.Router();

    const stripMarkdown = (text = '') => String(text)
        .replace(/`+/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#+\s?/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const limitWords = (text = '', maxWords = 12) => {
        const words = stripMarkdown(text).split(' ').filter(Boolean);
        return words.slice(0, maxWords).join(' ');
    };

    const normalizeFreeCodeQuestion = (generatedData = {}) => {
        const firstTest = Array.isArray(generatedData.testCases) && generatedData.testCases.length > 0
            ? generatedData.testCases[0]
            : { input: 'example', expected: 'result' };

        const baseQuestion = stripMarkdown(generatedData.question || 'Write a Python function to solve this problem.');
        const conciseQuestion = baseQuestion.slice(0, 180);
        const withExample = conciseQuestion.includes('Example:')
            ? conciseQuestion
            : `${conciseQuestion} Example: ${String(firstTest.input)} -> ${String(firstTest.expected)}`.slice(0, 180);

        const hints = Array.isArray(generatedData.hints) ? generatedData.hints : [];
        const normalizedHints = [
            limitWords(hints[0] || 'Break the problem into small steps.', 12),
            limitWords(hints[1] || 'Test with a simple example first.', 12)
        ];

        const testCases = Array.isArray(generatedData.testCases)
            ? generatedData.testCases.slice(0, 2).map((testCase) => ({
                input: String(testCase?.input ?? '').slice(0, 80),
                expected: String(testCase?.expected ?? '').slice(0, 80)
            }))
            : [
                { input: 'example', expected: 'result' },
                { input: 'another_example', expected: 'another_result' }
            ];

        return {
            ...generatedData,
            question: withExample,
            codeTemplate: generatedData.codeTemplate || 'def solution():\n    # Your code here\n    pass',
            hints: normalizedHints,
            testCases,
            explanation: limitWords(generatedData.explanation || 'Solve it step by step and return the final result.', 18)
        };
    };

    router.post('/feedback', async (req, res) => {
        const { userAnswer, correctAnswer, questionText, userId, questionType } = req.body;

        if (!userAnswer || !questionText) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const startTime = Date.now();

        try {
            let prompt;

            if (questionType === 'knowledge') {
                prompt = `You are a supportive tutor grading a student's response to a conceptual/knowledge-based question about Python programming.

Question: ${questionText}

Student Answer: ${userAnswer}

Evaluate their understanding based on:
1. Did they demonstrate understanding of the concept?
2. Did they provide practical examples or reasoning?
3. Is their explanation clear and accurate?

Provide constructive feedback highlighting strengths and areas for improvement. Be encouraging.`;
            } else if (questionType === 'freeCode') {
                prompt = `You are a supportive tutor providing constructive feedback on a coding solution. Focus on the logic and correctness of the code. Be encouraging but honest. Point out what they did well and where they can improve. Most specifically, do not provide students with quick fixes with generative code, but instead guide them to find the solution themselves. Always provide actionable advice for improvement.

Question: ${questionText}

Student Code: ${userAnswer}

Correct/Expected Code: ${correctAnswer || 'Not provided'}

Provide specific, constructive feedback on their code.`;
            } else {
                // MCQ default
                prompt = `You are a supportive tutor providing constructive feedback. The student selected an answer to a multiple choice question.

Question: ${questionText}

Student Answer: ${userAnswer}

Correct Answer: ${correctAnswer}

Provide specific, constructive feedback explaining why their answer was correct or incorrect, and what they should study to improve.`;
            }

            const feedback = await generateTextWithModel(prompt, 'gemini-2.0-flash');
            const responseTime = Date.now() - startTime;

            await db.collection('feedback_logs').insertOne({
                userId: userId || 'anonymous',
                questionType: questionType || 'mcq',
                questionText,
                userAnswer,
                correctAnswer,
                feedback,
                model: 'gemini-2.0-flash',
                responseTime,
                timestamp: new Date()
            });

            res.json({ feedback, responseTime });
        } catch (error) {
            console.error('Feedback error:', error);
            res.status(500).json({
                error: 'Failed to generate feedback',
                details: error.message
            });
        }
    });

    router.post('/challenge-token-award', async (req, res) => {
        const { userId, questionType = 'mcq', difficulty = 'easy', isCorrect = false, questionText = '' } = req.body;

        const normalizedType = (questionType || 'mcq').toLowerCase();
        const normalizedDifficulty = (difficulty || 'easy').toLowerCase();

        const baseByType = {
            mcq: 3,
            knowledge: 4,
            freecode: 5
        };

        const difficultyMultiplier = {
            easy: 1,
            medium: 1.5,
            hard: 2
        };

        const base = baseByType[normalizedType] ?? baseByType.mcq;
        const difficultyFactor = difficultyMultiplier[normalizedDifficulty] ?? difficultyMultiplier.easy;
        const correctnessFactor = isCorrect ? 1 : 0.4;
        const tokenAward = Math.max(1, Math.round(base * difficultyFactor * correctnessFactor));

        let tokenBalance = null;

        try {
            const parsedUserId = parseOptionalUserId ? parseOptionalUserId(userId) : null;
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

            await db.collection('challenge_token_awards').insertOne({
                userId: userId || 'anonymous',
                questionType: normalizedType,
                difficulty: normalizedDifficulty,
                isCorrect: Boolean(isCorrect),
                tokenAward,
                tokenBalance,
                questionText: String(questionText || '').slice(0, 300),
                createdAt: new Date()
            });

            return res.json({ tokenAward, tokenBalance });
        } catch (error) {
            console.error('Challenge token award error:', error);
            return res.status(500).json({ error: 'Failed to award challenge tokens' });
        }
    });

    router.post('/generate-question', async (req, res) => {
        const { topic, difficulty, userId, questionType = 'mcq', askedTopics = [] } = req.body;

        if (!topic || !difficulty) {
            return res.status(400).json({ error: 'Missing topic or difficulty' });
        }

        const startTime = Date.now();
        let usedFallback = false;

        try {
            let prompt;
            let questionData;

            // Build exclusion clause if there are previously asked topics
            const avoidClause = askedTopics.length > 0
                ? `\n\nIMPORTANT: These topics have already been covered in their aptitude test, so create something DIFFERENT: ${askedTopics.join(', ')}. Make sure this new question covers a fresh angle or concept.`
                : '';

            if (questionType === 'freeCode') {
                // Generate free-code question with code template, hints, and test cases
                                prompt = `You are a Python question generator. Create a concise coding challenge. Always respond with valid JSON only, no additional text.

Generate a ${difficulty} difficulty free-response coding question about "${topic}".${avoidClause}

Keep the output brief and clear:
- "question": maximum 2 short sentences, under 180 characters total.
- Use plain language. No long context, no story, no extra constraints.
- Include exactly one simple example in the question text.
- "hints": exactly 2 hints, each under 12 words.
- "explanation": maximum 1 short sentence.
- "testCases": 2 small test cases only.

Return ONLY valid JSON in this exact format:
{
  "question": "The coding challenge description with example input/output",
  "codeTemplate": "def solution():\\n    # Your code here\\n    pass",
  "hints": ["Hint 1", "Hint 2"],
  "testCases": [{"input": "example_arg1", "expected": "example_output"}],
  "explanation": "Explanation of the solution approach"
}`;

                console.log('📝 Attempting to generate freeCode question via AI...', { topic, difficulty });
                const { json: generatedData, modelName: model } = await generateJsonWithFallback(prompt, jsonModels);
                console.log('✅ Successfully generated freeCode question', { model });
                const normalizedData = normalizeFreeCodeQuestion(generatedData);
                questionData = {
                    ...normalizedData,
                    questionType: 'freeCode',
                    model
                };
            } else if (questionType === 'knowledge') {
                // Generate knowledge-based question
                prompt = `You are a Python instructor creating conceptual questions to test deep understanding (not syntax). Always respond with valid JSON only, no additional text.

Generate a ${difficulty} difficulty knowledge-based question about "${topic}". Ask the student to explain concepts, compare ideas, or analyze usage patterns.${avoidClause}

Return ONLY valid JSON in this exact format:
{
  "question": "A conceptual question that requires explanation (2-3 sentences)",
  "correctKeywords": ["keyword1", "keyword2", "keyword3"],
  "explanation": "What a good answer should include"
}`;

                console.log('📝 Attempting to generate knowledge question via AI...', { topic, difficulty });
                const { json: generatedData, modelName: model } = await generateJsonWithFallback(prompt, jsonModels);
                console.log('✅ Successfully generated knowledge question', { model });
                questionData = {
                    ...generatedData,
                    questionType: 'knowledge',
                    model
                };
            } else {
                // MCQ (default)
                prompt = `You are a question generator. Create educational questions with multiple choice options. Always respond with valid JSON only, no additional text.

Generate a ${difficulty} difficulty multiple-choice question about "${topic}".${avoidClause}

Return ONLY valid JSON in this exact format:
{
  "question": "The question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option text",
  "explanation": "Why this is the correct answer"
}`;

                console.log('📝 Attempting to generate MCQ via AI...', { topic, difficulty });
                const { json: generatedData, modelName: model } = await generateJsonWithFallback(prompt, jsonModels);
                console.log('✅ Successfully generated MCQ', { model });
                questionData = {
                    ...generatedData,
                    questionType: 'mcq',
                    model
                };
            }

            const responseTime = Date.now() - startTime;

            const dbEntry = {
                userId: userId || 'anonymous',
                topic,
                difficulty,
                questionType,
                ...questionData,
                createdAt: new Date(),
                responseTime,
                generatedByAI: !usedFallback
            };

            const insertResult = await db.collection('questions').insertOne(dbEntry);

            console.log('✨ Successfully generated AI question:', { topic, questionType, usedFallback: false, responseTime });

            res.json({
                ...questionData,
                id: insertResult.insertedId,
                responseTime,
                generatedByAI: true
            });
        } catch (error) {
            console.error('❌ Question generation error:', {
                message: error.message,
                stack: error.stack,
                topic,
                difficulty,
                questionType
            });

            // Fallback based on question type
            let fallbackQuestion;
            if (req.body.questionType === 'freeCode') {
                fallbackQuestion = getFallbackAdaptiveQuestion(difficulty, 1);
                fallbackQuestion.questionType = 'freeCode';
            } else if (req.body.questionType === 'knowledge') {
                fallbackQuestion = getFallbackKnowledgeQuestion(topic, difficulty);
                fallbackQuestion.questionType = 'knowledge';
            } else {
                fallbackQuestion = getFallbackMcqQuestion(topic, difficulty);
                fallbackQuestion.questionType = 'mcq';
            }

            usedFallback = true;
            console.log('📦 Using fallback question for topic:', topic, 'type:', req.body.questionType, 'error:', error.message);

            res.json({
                ...fallbackQuestion,
                responseTime: Date.now() - startTime,
                fallback: true,
                fallbackReason: error.message
            });
        }
    });

    return router;
}
