import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import axios from 'axios';
import { MongoClient } from 'mongodb';

dotenv.config()

const API_KEY = process.env.OPENROUTER_API_KEY
const PORT = process.env.PORT || 5000
const MONGO_URI = 'mongodb://localhost:27017';

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

// Endpoint 1: AI Feedback
app.post('/api/feedback', async (req, res) => {
    const { userAnswer, correctAnswer, questionText, userId } = req.body;
    
    // Validation
    if (!userAnswer || !questionText) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const startTime = Date.now();

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'openai/gpt-oss-120b:free',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a supportive tutor providing constructive, specific feedback on student answers to coding based questions. Be encouraging but honest. Point out what they did well and where they can improve. Most specifically, do not provide students with a quick fix with generatitive code, but instead guide them to find the solution themselves. Always provide actionable advice for improvement.'
                    },
                    {
                        role: 'user',
                        content: `Question: ${questionText}\n\nStudent Answer: ${userAnswer}\n\nCorrect Answer: ${correctAnswer || 'Not provided'}\n\nProvide specific, constructive feedback.`
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:5000',
                    'X-Title': 'frunk.dev (AI Tutoring Platform)'
                }
            }
        );

        const feedback = response.data.choices[0].message.content;
        const responseTime = Date.now() - startTime;

        // Log interaction to database
        await db.collection('feedback_logs').insertOne({
            userId: userId || 'anonymous',
            questionText,
            userAnswer,
            correctAnswer,
            feedback,
            model: 'openai/gpt-oss-120b:free',
            responseTime,
            timestamp: new Date()
        });

        res.json({ 
            feedback,
            responseTime 
        });

    } catch (error) {
        console.error('Feedback error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to generate feedback',
            details: error.response?.data?.error || error.message
        });
    }
});

// Endpoint 2: Generate Question
app.post('/api/generate-question', async (req, res) => {
    const { topic, difficulty, userId } = req.body;

    // Validation
    if (!topic || !difficulty) {
        return res.status(400).json({ error: 'Missing topic or difficulty' });
    }

    const startTime = Date.now();

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'openai/gpt-oss-120b:free',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a question generator. Create educational questions with multiple choice options. Always respond with valid JSON only, no additional text.'
                    },
                    {
                        role: 'user',
                        content: `Generate a ${difficulty} difficulty multiple-choice question about "${topic}". 
                        
Return ONLY valid JSON in this exact format:
{
  "question": "The question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option text",
  "explanation": "Why this is the correct answer"
}`
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:5000',
                    'X-Title': 'AI Tutoring Platform'
                }
            }
        );

        const content = response.data.choices[0].message.content;
        
        // Parse the JSON response 
        let questionData;
        try {
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            questionData = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('JSON parse error:', content);
            throw new Error('AI returned invalid JSON');
        }

        const responseTime = Date.now() - startTime;

        // Store in database
        const dbEntry = {
            userId: userId || 'anonymous',
            topic,
            difficulty,
            ...questionData,
            createdAt: new Date(),
            responseTime
        };

        const result = await db.collection('questions').insertOne(dbEntry);

        res.json({ 
            ...questionData,
            id: result.insertedId,
            responseTime
        });

    } catch (error) {
        console.error('Question generation error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to generate question',
            details: error.response?.data?.error || error.message
        });
    }
});

// Start server and connect to DB
connectToDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

