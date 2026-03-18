import express from 'express';

export function createAptitudeRoutes({
    db,
    generateJsonWithFallback,
    jsonModels,
    getFallbackAdaptiveQuestion,
    resolveNextDifficulty,
    normalizeEvaluationResult,
    calculateTokenAward,
    getFallbackEvaluation,
    parseOptionalUserId,
    isValidObjectId,
    toObjectId
}) {
    const router = express.Router();

    router.post('/generate-adaptive-question', async (req, res) => {
        const { questionNumber, lastAnswerCorrect, currentDifficulty, userId, askedTopics = [] } = req.body;

        const startTime = Date.now();
        const nextDifficulty = resolveNextDifficulty(questionNumber, lastAnswerCorrect, currentDifficulty);

        const avoidClause = askedTopics.length > 0
            ? `\n\nIMPORTANT: Do NOT reuse or closely resemble any of these already-asked topics: ${askedTopics.join(', ')}. Pick a completely different concept.`
            : '';

        try {
            const prompt = `You are creating a Python coding challenge for an adaptive aptitude test. Generate a UNIQUE ${nextDifficulty} difficulty question.

Difficulty guidelines:
- EASY: Basic syntax, simple loops, basic functions (beginner level)
- MEDIUM: Functions with parameters, list operations, string manipulation, conditionals (intermediate level)
- HARD: Algorithms, recursion, classes, complex data structures (advanced level)

This is question #${questionNumber} of 12. Each question must cover a DIFFERENT Python concept or problem type. Vary the problem style — use different data structures, algorithms, and problem domains each time.${avoidClause}

Return ONLY valid JSON in this exact format:
{
  "question": "Clear problem description with example input/output",
  "codeTemplate": "def function_name():\\n    # Your code here\\n    pass",
  "hints": ["Hint 1", "Hint 2"],
  "testCases": [
    {"input": "example input", "expected": "expected output"},
    {"input": "edge case", "expected": "expected output"}
  ]
}`;

            const { json: questionData, modelName } = await generateJsonWithFallback(prompt, jsonModels);
            const responseTime = Date.now() - startTime;

            // Always use server-computed difficulty — never trust the AI-returned value
            const safeQuestion = { ...questionData, difficulty: nextDifficulty };

            const dbEntry = {
                userId: userId || 'anonymous',
                questionNumber,
                ...safeQuestion,
                model: modelName,
                createdAt: new Date(),
                responseTime
            };

            const insertResult = await db.collection('aptitude_questions').insertOne(dbEntry);

            res.json({
                ...safeQuestion,
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

    router.post('/evaluate-aptitude-code', async (req, res) => {
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
    "feedback": "Detailed constructive feedback (4-7 sentences) referencing logic quality, output behavior, and at least one concrete next fix to increase score",
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
- Determine isCorrect ONLY from behavioral correctness against the required output/test cases.
- If output is correct for the required behavior, set isCorrect=true even if code style/format is simple.
- Do NOT set isCorrect=false just for code length, style, naming, or preferred structure.
- If code only keeps scaffold placeholders like "# your code here" and "pass" without real added logic, score must be <= 25 and isCorrect=false.
- If placeholders are only inherited from the provided template and the user adds correct logic, do not penalize for those scaffold lines.
- If required logic is missing or test cases would fail, isCorrect=false.
- Do not award high scores for boilerplate structure alone.
- Feedback must be specific and technical (avoid generic encouragement-only phrases).
- If score is below 90, include at least 2 specific improvement items in "issues" describing exactly what to change for a better score.
- If score is 90 or above, include at least 1 optional improvement item unless the solution is truly perfect.
- Be strict and conservative with scoring.`;

            const { json: rawEvaluationData } = await generateJsonWithFallback(prompt, jsonModels);
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

    router.post('/aptitude-results', async (req, res) => {
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

    router.get('/users/:userId/tokens', async (req, res) => {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ error: 'Invalid userId' });
        }

        try {
            const user = await db.collection('users').findOne(
                { _id: toObjectId(userId) },
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

    return router;
}
