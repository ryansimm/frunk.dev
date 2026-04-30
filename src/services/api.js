/**
 * References:
 * https://axios-http.com/docs/intro
 * https://axios-http.com/docs/api_intro
 * https://stackoverflow.com/questions/43051291/attach-authorization-header-for-all-axios-requests
 * https://vitejs.dev/guide/env-and-mode.html
 *
 * Coversing exactly how to make HHTP requests using Axios, how to 
 * structure the API service layers in frontend applications, how to attach 
 * authenitcation tokens to requests , and how to use the environment variabels
 * in Vite (using import.meta.env)
 */
import axios from "axios";

// Base URL switches depending on environment (local dev vs deployed backend)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV
    ? "http://localhost:5000/api"
    : "https://honours-project-backend.onrender.com/api");

// Retrieves stored auth token from localStorage
const getAuthToken = () => {
    const directToken = localStorage.getItem('authToken') || '';

    if (directToken) {
        return directToken;
    }

    try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        return storedUser?.accessToken || storedUser?.token || '';
    } catch {
        return '';
    }
};

// Builds headers including token for authenticated requests
const authHeaders = () => {
    const token = getAuthToken();

    return token ? {
        Authorization: `Bearer ${token}`,
        authorisation: `Bearer ${token}`, // fallback for different backend handling
        'x-access-token': token
    } : {};
};

// Centralised API service for all frontend-backend communication
export const apiService = {

    // Admin-only route to create user accounts
    createUserAsAdmin: async (name, email, password) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, {
                name,
                email,
                password
            }, {
                headers: authHeaders()
            });

            return response.data;
        } catch (error) {
            console.error("Registration error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.error || "Registration failed");
        }
    },

    // Log in an existing user
    login: async (email, password) => {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password
        });

        return response.data;
    },

    // Sign up a new user account
    signup: async (name, email, password) => {
        const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
            name,
            email,
            password
        });

        return response.data;
    },

    // Fetch current authenticated user's profile
    getCurrentUserProfile: async () => {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: authHeaders()
        });

        return response.data;
    },

    // Check if the current user has admin privileges
    checkAdminStatus: async () => {
        const response = await axios.get(`${API_BASE_URL}/auth/admin/status`, {
            headers: authHeaders()
        });

        return response.data;
    },

    // Generate adaptive aptitude test question
    generateAdaptiveQuestion: async (questionNumber, lastAnswerCorrect, currentDifficulty, userId, askedTopics = []) => {
        const response = await axios.post(`${API_BASE_URL}/generate-adaptive-question`, {
            questionNumber,
            lastAnswerCorrect,
            currentDifficulty,
            userId,
            askedTopics
        });

        return response.data;
    },

    // Evaluate submitted code for aptitude test
    evaluateAptitudeCode: async (userCode, question, difficulty, testCases, userId, codeTemplate) => {
        const response = await axios.post(`${API_BASE_URL}/evaluate-aptitude-code`, {
            userCode,
            question,
            difficulty,
            testCases,
            userId,
            codeTemplate
        });

        return response.data;
    },

    // Save final aptitude test results
    saveAptitudeResults: async (userId, results) => {
        const response = await axios.post(`${API_BASE_URL}/aptitude-results`, {
            userId,
            results
        });

        return response.data;
    },

    // Fetch user's token balance and stats
    getUserTokenBalance: async (userId) => {
        const response = await axios.get(`${API_BASE_URL}/users/${userId}/tokens`);
        return response.data;
    },

    // Generate learning question (MCQ / knowledge / coding)
    generateLearningQuestion: async (topic, difficulty, userId, questionType = 'mcq', askedTopics = []) => {
        const response = await axios.post(`${API_BASE_URL}/generate-question`, {
            topic,
            difficulty,
            userId,
            questionType,
            askedTopics
        });

        return response.data;
    },

    // Get AI-generated feedback for a user answer
    getLearningFeedback: async ({ userAnswer, correctAnswer, questionText, userId, questionType = 'mcq' }) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/feedback`, {
                userAnswer,
                correctAnswer,
                questionText,
                userId,
                questionType
            });

            console.log('Feedback API response:', response.data);

            return response.data;
        } catch (error) {
            console.error('Feedback API error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error || error.message || 'Failed to get feedback');
        }
    },

    // Award tokens after completing a challenge
    awardChallengeTokens: async ({ userId, questionType, difficulty, isCorrect, questionText }) => {
        const response = await axios.post(`${API_BASE_URL}/challenge-token-award`, {
            userId,
            questionType,
            difficulty,
            isCorrect,
            questionText
        });

        return response.data;
    },

    // Spend tokens (e.g., purchasing upgrades/items)
    spendTokens: async ({ amount, reason = 'purchase', itemId = '', itemName = '' }) => {
        const response = await axios.post(`${API_BASE_URL}/auth/spend-tokens`, {
            amount,
            reason,
            itemId,
            itemName
        }, {
            headers: authHeaders()
        });

        return response.data;
    }
};