import express from 'express';

export function createLearningRoutes({ db, generateTextWithModel, generateJsonWithFallback, jsonModels, getFallbackMcqQuestion }) {
    const router = express.Router();

    router.post('/feedback', async (req, res) => {
        const { userAnswer, correctAnswer, questionText, userId } = req.body;

        if (!userAnswer || !questionText) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const startTime = Date.now();

        try {
            const prompt = `You are a supportive tutor providing constructive, specific feedback on student answers to coding based questions. Be encouraging but honest. Point out what they did well and where they can improve. Most specifically, do not provide students with a quick fix with generative code, but instead guide them to find the solution themselves. Always provide actionable advice for improvement.

Question: ${questionText}

Student Answer: ${userAnswer}

Correct Answer: ${correctAnswer || 'Not provided'}

Provide specific, constructive feedback.`;

            const feedback = await generateTextWithModel(prompt, 'gemini-2.0-flash');
            const responseTime = Date.now() - startTime;

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

            res.json({ feedback, responseTime });
        } catch (error) {
            console.error('Feedback error:', error);
            res.status(500).json({
                error: 'Failed to generate feedback',
                details: error.message
            });
        }
    });

    router.post('/generate-question', async (req, res) => {
        const { topic, difficulty, userId } = req.body;

        if (!topic || !difficulty) {
            return res.status(400).json({ error: 'Missing topic or difficulty' });
        }

        const startTime = Date.now();

        try {
            const prompt = `You are a question generator. Create educational questions with multiple choice options. Always respond with valid JSON only, no additional text.

Generate a ${difficulty} difficulty multiple-choice question about "${topic}".

Return ONLY valid JSON in this exact format:
{
  "question": "The question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option text",
  "explanation": "Why this is the correct answer"
}`;

            const { json: questionData, modelName } = await generateJsonWithFallback(prompt, jsonModels);
            const responseTime = Date.now() - startTime;

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

    return router;
}
