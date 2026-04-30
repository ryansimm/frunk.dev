/**
 * References:
 * https://expressjs.com/en/starter/basic-routing.html
 * https://www.mongodb.com/docs/drivers/node/current/quick-start/
 * https://www.npmjs.com/package/dotenv
 * https://stackoverflow.com/questions/23425980/how-to-use-cors-in-node-js-with-express
 *
 * Covering the express server setup and the routing, connecting Node.js
 * backend to database. Environemnt variable configuration using dotenv.
 * Enabling CORS for frontend and backend communication
 */
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';

// Database connection helpers
import { connectToDB, getDb } from './db/mongo.js';

// AI service utilities
import { JSON_RESPONSE_MODELS, generateJsonWithFallback, generateTextWithFallback, generateTextWithModel } from './services/aiService.js';

// Question generation + fallback logic
import { getFallbackAdaptiveQuestion, getFallbackMcqQuestion, getFallbackKnowledgeQuestion, resolveNextDifficulty } from './services/questionService.js';

// Evaluation + scoring logic
import { calculateTokenAward, getFallbackEvaluation, normaliseEvaluationResult } from './services/evaluationService.js';

// Utility helpers for user ID handling
import { isValidObjectId, parseOptionalUserId, toObjectId } from './utils/userUtils.js';

// Route modules
import { createSystemRoutes } from './routes/systemRoutes.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createLearningRoutes } from './routes/learningRoutes.js';
import { createAptitudeRoutes } from './routes/aptitudeRoutes.js';

// Load environment variables in development mode
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const PORT = process.env.PORT || 5000;

const app = express();

// Enable CORS so frontend can communicate with backend
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

async function startServer() {
    try {
        // Connect to MongoDB
        await connectToDB();
        const db = getDb();

        // Register all API route groups under /api
        app.use('/api', createSystemRoutes({ db }));
        app.use('/api', createAuthRoutes({ db }));

        // Learning routes (question generation + feedback)
        app.use('/api', createLearningRoutes({
            db,
            generateTextWithModel,
            generateTextWithFallback,
            generateJsonWithFallback,
            jsonModels: JSON_RESPONSE_MODELS,
            getFallbackMcqQuestion,
            getFallbackKnowledgeQuestion,
            getFallbackAdaptiveQuestion,
            parseOptionalUserId
        }));

        // Aptitude test routes (adaptive questions + evaluation)
        app.use('/api', createAptitudeRoutes({
            db,
            generateJsonWithFallback,
            jsonModels: JSON_RESPONSE_MODELS,
            getFallbackAdaptiveQuestion,
            resolveNextDifficulty,
            normaliseEvaluationResult,
            calculateTokenAward,
            getFallbackEvaluation,
            parseOptionalUserId,
            isValidObjectId,
            toObjectId
        }));

        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Error connecting to database:', error);
        process.exit(1);
    }
}

// Entry point
startServer();