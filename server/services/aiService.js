/* global process */
import { GoogleGenerativeAI } from '@google/generative-ai';

function getGenAIClient() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY is not configured');
    }

    return new GoogleGenerativeAI(apiKey);
}

export const JSON_RESPONSE_MODELS = [
    (process.env.GEMINI_MODEL || '').replace(/^models\//, ''),
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-flash-latest'
].filter(Boolean);

function extractJsonFromModelResponse(rawText) {
    const content = (rawText || '').replace(/```json\n?|\n?```/g, '').trim();

    try {
        return JSON.parse(content);
    } catch {
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
            throw new Error('AI response did not contain JSON');
        }

        const jsonCandidate = content.slice(firstBrace, lastBrace + 1);
        return JSON.parse(jsonCandidate);
    }
}

export async function generateJsonWithFallback(prompt, modelNames = JSON_RESPONSE_MODELS) {
    let lastError;
    console.log(`🤖 Trying ${modelNames.length} models for JSON generation:`, modelNames);

    for (const modelName of modelNames) {
        try {
            console.log(`  ↳ Attempting: ${modelName}...`);
            const genAI = getGenAIClient();
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const json = extractJsonFromModelResponse(text);
            console.log(`  ✅ Success with ${modelName}`);
            return { json, modelName };
        } catch (error) {
            lastError = error;
            console.warn(`  ❌ ${modelName} failed:`, error.message);
        }
    }

    console.error('🚨 All models failed. Last error:', lastError?.message);
    throw lastError || new Error('No AI model available');
}

export async function generateTextWithModel(prompt, modelName = 'gemini-2.0-flash') {
    const genAI = getGenAIClient();
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text();
}
