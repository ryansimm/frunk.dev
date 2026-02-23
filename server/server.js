import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import axios from 'axios';
import { MongoClient, ObjectId } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai'; 



dotenv.config()

//const API_KEY = process.env.OPENROUTER_API_KEY
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

// Endpoint 5 : adaptive style coding questions based on performance
app.post('/api/generate-adaptive-question', async (req, res) => {
    const { questionNumber, lastAnswerCorrect, currentDifficulty, userId } = req.body;

    const startTime = Date.now();

    try {
        // Determine next difficulty level
        let nextDifficulty = currentDifficulty || 'medium';
        
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

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

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

        const result = await model.generateContent(prompt);
        const content = result.response.text();
        
        let questionData;
        try {
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            questionData = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('JSON parse error:', content);
            throw new Error('AI returned invalid JSON');
        }

        const responseTime = Date.now() - startTime;

        // Store question in database
        const dbEntry = {
            userId: userId || 'anonymous',
            questionNumber,
            difficulty: nextDifficulty,
            ...questionData,
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
        res.status(500).json({ 
            error: 'Failed to generate question',
            details: error.message
        });
    }
});

// Evaluate code submission for aptitude test
app.post('/api/evaluate-aptitude-code', async (req, res) => {
    const { userCode, question, difficulty, testCases, userId } = req.body;

    const startTime = Date.now();

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

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
  "feedback": "Brief constructive feedback (2-3 sentences)",
  "issues": ["Issue 1", "Issue 2"] or [],
  "strengths": ["Strength 1"] or []
}

Criteria:
- Does it solve the problem correctly?
- Would it pass the test cases?
- Is the logic sound?
- Any syntax errors?

Be strict but fair. Only mark as correct if it genuinely solves the problem.`;

        const result = await model.generateContent(prompt);
        const content = result.response.text();
        
        let evaluationData;
        try {
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            evaluationData = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('JSON parse error:', content);
            throw new Error('AI returned invalid JSON');
        }

        const responseTime = Date.now() - startTime;

        // Store submission
        await db.collection('aptitude_submissions').insertOne({
            userId: userId || 'anonymous',
            question,
            difficulty,
            userCode,
            evaluation: evaluationData,
            timestamp: new Date(),
            responseTime
        });

        res.json({ 
            ...evaluationData,
            responseTime
        });

    } catch (error) {
        console.error('Code evaluation error:', error);
        res.status(500).json({ 
            error: 'Failed to evaluate code',
            details: error.message
        });
    }
});

connectToDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});