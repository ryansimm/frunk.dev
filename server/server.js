/* global process */
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';

import { connectToDB, getDb } from './db/mongo.js';
import { JSON_RESPONSE_MODELS, generateJsonWithFallback, generateTextWithModel } from './services/aiService.js';
import { getFallbackAdaptiveQuestion, getFallbackMcqQuestion, resolveNextDifficulty } from './services/questionService.js';
import { calculateTokenAward, getFallbackEvaluation, normalizeEvaluationResult } from './services/evaluationService.js';
import { isValidObjectId, parseOptionalUserId, toObjectId } from './utils/userUtils.js';
import { createSystemRoutes } from './routes/systemRoutes.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createLearningRoutes } from './routes/learningRoutes.js';
import { createAptitudeRoutes } from './routes/aptitudeRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

async function startServer() {
    try {
        await connectToDB();
        const db = getDb();

        app.use('/api', createSystemRoutes({ db }));
        app.use('/api', createAuthRoutes({ db }));
        app.use('/api', createLearningRoutes({
            db,
            generateTextWithModel,
            generateJsonWithFallback,
            jsonModels: JSON_RESPONSE_MODELS,
            getFallbackMcqQuestion
        }));
        app.use('/api', createAptitudeRoutes({
            db,
            generateJsonWithFallback,
            jsonModels: JSON_RESPONSE_MODELS,
            getFallbackAdaptiveQuestion,
            resolveNextDifficulty,
            normalizeEvaluationResult,
            calculateTokenAward,
            getFallbackEvaluation,
            parseOptionalUserId,
            isValidObjectId,
            toObjectId
        }));

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Error connecting to database:', error);
        process.exit(1);
    }
}

startServer();
