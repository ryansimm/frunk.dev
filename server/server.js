import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import axios from 'axios';
import { MongoClient, ObjectId } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai'; 



dotenv.config()

const API_KEY = process.env.OPENROUTER_API_KEY
const PORT = process.env.PORT || 5000
const MONGO_URI = 'mongodb://localhost:27017';

// Google AI 
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

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
            aptitudeCompleted: false
        };

        const result = await db.collection('users').insertOne(user);
        
        res.json({ 
            success: true, 
            userId: result.insertedId.toString(),
            user: { email, name }
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
                aptitudeCompleted: user.aptitudeCompleted || false
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
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

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
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
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

        const result = await model.generateContent(prompt);
        const content = result.response.text();
        
        // Parse JSON response (handle potential markdown code blocks)
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

        const insertResult = await db.collection('questions').insertOne(dbEntry); 

        res.json({ 
            ...questionData,
            id: insertResult.insertedId, 
            responseTime
        });

    } catch (error) {
        console.error('Question generation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate question',
            details: error.message //Error handling to return AI error details 
        });
    }
});

connectToDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});