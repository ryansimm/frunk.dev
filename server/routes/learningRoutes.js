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

    const limitChars = (text = '', maxChars = 180) => {
        const cleaned = stripMarkdown(text);
        if (cleaned.length <= maxChars) {
            return cleaned;
        }

        return `${cleaned.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
    };

    const normaliseFreeCodeQuestion = (generatedData = {}) => {
        const firstTest = Array.isArray(generatedData.testCases) && generatedData.testCases.length > 0
            ? generatedData.testCases[0]
            : { input: 'example', expected: 'result' };

        const baseQuestion = stripMarkdown(generatedData.question || 'Write a Python function to solve this problem.');
        const conciseQuestion = limitChars(baseQuestion, 170);
        const withExample = conciseQuestion.includes('Example:')
            ? conciseQuestion
            : limitChars(`${conciseQuestion} Example: ${String(firstTest.input)} -> ${String(firstTest.expected)}`, 180);

        const hints = Array.isArray(generatedData.hints) ? generatedData.hints : [];
        const normalisedHints = [
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
            hints: normalisedHints,
            testCases,
            explanation: limitWords(generatedData.explanation || 'Solve it step by step and return the final result.', 18)
        };
    };

    const normaliseKnowledgeQuestion = (generatedData = {}) => {
        const keywords = Array.isArray(generatedData.correctKeywords)
            ? generatedData.correctKeywords
                .map((keyword) => limitChars(keyword, 24))
                .filter(Boolean)
                .slice(0, 6)
            : [];

        return {
            ...generatedData,
            question: limitChars(generatedData.question || 'Explain the concept and give one practical example.', 180),
            correctKeywords: keywords.length > 0 ? keywords : ['concept', 'example', 'usage'],
            explanation: limitChars(generatedData.explanation || 'A good answer should define the concept and explain when to use it.', 150)
        };
    };

    const normaliseMcqQuestion = (generatedData = {}) => {
        const options = Array.isArray(generatedData.options)
            ? generatedData.options.slice(0, 4).map((option) => limitChars(option, 90))
            : [];

        const normalisedOptions = options.length === 4
            ? options
            : [
                'Option A',
                'Option B',
                'Option C',
                'Option D'
            ];

        const normalisedCorrectAnswer = normalisedOptions.includes(generatedData.correctAnswer)
            ? generatedData.correctAnswer
            : normalisedOptions[0];

        return {
            ...generatedData,
            question: limitChars(generatedData.question || 'Choose the best answer.', 170),
            options: normalisedOptions,
            correctAnswer: normalisedCorrectAnswer,
            explanation: limitChars(generatedData.explanation || 'This option best matches Python behavior for the concept.', 140)
        };
    };

    const parseKeywordList = (value = '') => String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const getAnswerExcerpt = (answer = '', maxChars = 90) => {
        const cleaned = stripMarkdown(answer);
        if (cleaned.length <= maxChars) {
            return cleaned;
        }

        return `${cleaned.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
    };

    const buildFallbackFeedback = ({ questionType, userAnswer, correctAnswer, questionText }) => {
        const answer = String(userAnswer || '').trim();
        const normalisedType = (questionType || 'mcq').toLowerCase();

        if (normalisedType === 'knowledge') {
            const keywords = parseKeywordList(correctAnswer).map((item) => item.toLowerCase());
            const answerLower = answer.toLowerCase();
            const matched = keywords.filter((keyword) => answerLower.includes(keyword));
            const missed = keywords.filter((keyword) => !answerLower.includes(keyword)).slice(0, 2);
            const excerpt = getAnswerExcerpt(answer, 110) || 'No clear explanation provided yet.';

            if (keywords.length > 0) {
                const matchedText = matched.length > 0 ? matched.slice(0, 2).join(', ') : 'none yet';
                const missedText = missed.length > 0 ? missed.join(', ') : 'edge cases and practical application';
                return `Good effort. From your answer ("${excerpt}"), you covered ${matched.length}/${keywords.length} key ideas. Strongest concepts: ${matchedText}. To improve, explicitly include: ${missedText}, then connect them to one concrete Python use case.`;
            }

            return `Good effort. From your answer ("${excerpt}"), add a clearer definition, one concrete Python example, and a short explanation of when this concept should be used.`;
        }

        if (normalisedType === 'freecode') {
            const hasFunction = /\bdef\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(answer);
            const hasReturn = /\breturn\b/.test(answer);
            const hasControlFlow = /\bfor\b|\bwhile\b|\bif\b|\belif\b/.test(answer);

            const strengths = [];
            const improvements = [];

            if (hasFunction) strengths.push('uses a function definition');
            if (hasReturn) strengths.push('returns a value');
            if (hasControlFlow) strengths.push('includes control flow');

            if (!hasFunction) improvements.push('wrap logic in a clear function signature');
            if (!hasReturn) improvements.push('return the final computed value');
            if (!hasControlFlow) improvements.push('add explicit logic for conditions or iteration');

            const strengthsText = strengths.length > 0
                ? `Your code ${strengths.join(', ')}.`
                : 'Your submission is a good start.';
            const improvementsText = improvements.length > 0
                ? `Next step: ${improvements.join('; ')}.`
                : 'Next step: test against edge cases (empty input, minimal input, repeated values).';

            return `${strengthsText} ${improvementsText}`;
        }

        const isCorrectMcq = String(userAnswer || '').trim() && String(correctAnswer || '').trim() && String(userAnswer).trim() === String(correctAnswer).trim();
        if (isCorrectMcq) {
            return 'Correct answer. Nice work identifying the right option. To go further, explain why each other option is less accurate.';
        }

        return `Not quite yet. Re-read the key concept in: ${String(questionText || 'this topic')}. Then compare each option to Python behavior before selecting your final answer.`;
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
                const parsedKeywords = parseKeywordList(correctAnswer);
                const answerLower = String(userAnswer || '').toLowerCase();
                const matchedKeywords = parsedKeywords.filter((keyword) => answerLower.includes(keyword.toLowerCase()));
                const missingKeywords = parsedKeywords.filter((keyword) => !answerLower.includes(keyword.toLowerCase()));
                const answerExcerpt = getAnswerExcerpt(userAnswer, 140);

                prompt = `You are a supportive tutor grading a student's response to a conceptual/knowledge-based question about Python programming.

Question: ${questionText}

Student Answer: ${userAnswer}

Expected key concepts: ${parsedKeywords.length > 0 ? parsedKeywords.join(', ') : 'Not provided'}
Matched concepts in student answer: ${matchedKeywords.length > 0 ? matchedKeywords.join(', ') : 'None detected'}
Missing concepts: ${missingKeywords.length > 0 ? missingKeywords.join(', ') : 'None obvious'}
Student answer excerpt: ${answerExcerpt || 'N/A'}

Evaluate their understanding based on:
1. Did they demonstrate understanding of the concept?
2. Did they provide practical examples or reasoning?
3. Is their explanation clear and accurate?

Feedback requirements:
- Address the student directly using "you".
- Mention at least one specific phrase/concept from their answer.
- Include exactly 2 strengths and 2 targeted improvements.
- Suggest one concrete next practice action tied to missing concepts.
- Keep total length under 120 words and avoid generic praise.`;
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

            let feedback = '';
            let usedFallback = false;
            let modelUsed = 'gemini-2.0-flash';

            try {
                feedback = await generateTextWithModel(prompt, modelUsed);
            } catch (modelError) {
                usedFallback = true;
                modelUsed = 'local-fallback';
                console.warn('Feedback model failed, using fallback feedback:', modelError.message);
                feedback = buildFallbackFeedback({ questionType, userAnswer, correctAnswer, questionText });
            }

            const responseTime = Date.now() - startTime;

            try {
                await db.collection('feedback_logs').insertOne({
                    userId: userId || 'anonymous',
                    questionType: questionType || 'mcq',
                    questionText,
                    userAnswer,
                    correctAnswer,
                    feedback,
                    model: modelUsed,
                    fallback: usedFallback,
                    responseTime,
                    timestamp: new Date()
                });
            } catch (dbError) {
                console.warn('Failed to write feedback log:', dbError.message);
            }

            res.json({ feedback, responseTime, fallback: usedFallback });
        } catch (error) {
            console.error('Feedback error:', error);
            const fallbackFeedback = buildFallbackFeedback({ questionType, userAnswer, correctAnswer, questionText });
            res.json({
                feedback: fallbackFeedback,
                responseTime: Date.now() - startTime,
                fallback: true
            });
        }
    });

    router.post('/challenge-token-award', async (req, res) => {
        const { userId, questionType = 'mcq', difficulty = 'easy', isCorrect = false, questionText = '' } = req.body;

        const normalisedType = (questionType || 'mcq').toLowerCase();
        const normalisedDifficulty = (difficulty || 'easy').toLowerCase();

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

        const base = baseByType[normalisedType] ?? baseByType.mcq;
        const difficultyFactor = difficultyMultiplier[normalisedDifficulty] ?? difficultyMultiplier.easy;
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

                tokenBalance = userUpdate?.value?.tokenBalance ?? userUpdate?.tokenBalance ?? null;
            }

            await db.collection('challenge_token_awards').insertOne({
                userId: userId || 'anonymous',
                questionType: normalisedType,
                difficulty: normalisedDifficulty,
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

        console.log(`\n📌 [CHALLENGE QUESTION] Generating ${questionType} (${difficulty}) on topic: "${topic}"`);
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
                const normalisedData = normaliseFreeCodeQuestion(generatedData);
                questionData = {
                    ...normalisedData,
                    questionType: 'freeCode',
                    model
                };
            } else if (questionType === 'knowledge') {
                // Generate knowledge-based question
                                prompt = `You are a Python instructor creating conceptual questions to test deep understanding (not syntax). Always respond with valid JSON only, no additional text.

Generate a ${difficulty} difficulty knowledge-based question about "${topic}". Ask the student to explain concepts, compare ideas, or analyse usage patterns.${avoidClause}

Keep output concise:
- "question": max 180 characters, 1-2 short sentences.
- "correctKeywords": 3-6 short items.
- "explanation": max 140 characters.

Return ONLY valid JSON in this exact format:
{
  "question": "A conceptual question that requires explanation (2-3 sentences)",
  "correctKeywords": ["keyword1", "keyword2", "keyword3"],
  "explanation": "What a good answer should include"
}`;

                console.log('📝 Attempting to generate knowledge question via AI...', { topic, difficulty });
                const { json: generatedData, modelName: model } = await generateJsonWithFallback(prompt, jsonModels);
                console.log('✅ Successfully generated knowledge question', { model });
                const normalisedData = normaliseKnowledgeQuestion(generatedData);
                questionData = {
                    ...normalisedData,
                    questionType: 'knowledge',
                    model
                };
            } else {
                // MCQ (default)
                prompt = `You are a question generator. Create educational questions with multiple choice options. Always respond with valid JSON only, no additional text.

Generate a ${difficulty} difficulty multiple-choice question about "${topic}".${avoidClause}

Keep output concise:
- "question": max 170 characters.
- each option: max 90 characters.
- "explanation": max 140 characters.

Return ONLY valid JSON in this exact format:
{
  "question": "The question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option text",
  "explanation": "Why this is the correct answer"
}`;

                console.log('📝 Attempting to generate MCQ via AI...', { topic, difficulty });
                const { json: generatedData, modelName: model } = await generateJsonWithFallback(prompt, jsonModels);
                console.log('✅ Successfully generated MCQ', { model, responseTime: `${Date.now() - startTime}ms` });
                const normalisedData = normaliseMcqQuestion(generatedData);
                questionData = {
                    ...normalisedData,
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

            console.log('✨ Successfully generated AI question:', { topic, questionType, usedFallback: false, responseTime, model: questionData.model });

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
