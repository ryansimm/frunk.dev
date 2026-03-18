import axios from "axios";


const API_BASE_URL = "http://localhost:5000/api";

const getAuthToken = () => localStorage.getItem('authToken') || '';

const authHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

//registering a new user or logging in an existing user
export const apiService ={
    // Admin-only route used to create user accounts.
    createUserAsAdmin: async (name, email, password) => {
        try{
            const response = await axios.post(`${API_BASE_URL}/auth/register`,{
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
    // login an existing user
    login: async (email, password) => {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password
        });

        return response.data;
    },

    // signup a new user account
    signup: async (name, email, password) => {
        const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
            name,
            email,
            password
        });

        return response.data;
    },

    getCurrentUserProfile: async () => {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: authHeaders()
        });
        return response.data;
    },

    checkAdminStatus: async () => {
        const response = await axios.get(`${API_BASE_URL}/auth/admin/status`, {
            headers: authHeaders()
        });
        return response.data;
    },

    // Generate adaptive question
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

    // Evaluate aptitude test code
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

    saveAptitudeResults: async (userId, results) => {
        const response = await axios.post(`${API_BASE_URL}/aptitude-results`, {
            userId,
            results
        });
        return response.data;
    },

    getUserTokenBalance: async (userId) => {
        const response = await axios.get(`${API_BASE_URL}/users/${userId}/tokens`);
        return response.data;
    },

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

    awardChallengeTokens: async ({ userId, questionType, difficulty, isCorrect, questionText }) => {
        const response = await axios.post(`${API_BASE_URL}/challenge-token-award`, {
            userId,
            questionType,
            difficulty,
            isCorrect,
            questionText
        });
        return response.data;
    }
};
