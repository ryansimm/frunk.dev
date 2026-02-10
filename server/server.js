import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import axios from 'axios';

dotenv.config()

const API_KEY = process.env.OPENROUTER_API_KEY
const PORT = process.env.PORT || 5000

const app = express();
app.use(cors());
app.use(express.json());

// Enpoint 1: AI Feedback
app.post('/api/feedback', async (req, res) => {
    //get feedback from OpenRouter API
})

//Endpoint 2: Genearate the question based upon aptitude score and level
app.post('/api/generate-question', async (req, res) => {
    // Generate a specific question for the user
})
app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${PORT}`);
});
