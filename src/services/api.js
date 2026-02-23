import axios from "axios";
import {response } from "express";

const API_BASE_URL = "http://localhost:5000/api";

//registering a new user or logging in an existing user
export const apiService ={
    // register a new user
    register: async (name, email, password) => {
        try{
            const response = await axios.post(`${API_BASE_URL}/auth/register`,{
                name,
                email,
                password
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

    // Generate adaptive question
    generateAdaptiveQuestion: async (questionNumber, lastAnswerCorrect, currentDifficulty, userId) => {
        const response = await axios.post(`${API_BASE_URL}/generate-adaptive-question`, {
            questionNumber,
            lastAnswerCorrect,
            currentDifficulty,
            userId
    });
    return response.data;
    },

    // Evaluate aptitude test code
    evaluateAptitudeCode: async (userCode, question, difficulty, testCases, userId) => {
        const response = await axios.post(`${API_BASE_URL}/evaluate-aptitude-code`, {
            userCode,
            question,
            difficulty,
            testCases,
            userId
        });
        return response.data;
},
};
