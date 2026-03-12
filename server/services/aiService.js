import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export const JSON_RESPONSE_MODELS = [
    process.env.GEMINI_MODEL,
    'gemini-2.0-flash',
    'gemini-1.5-flash'
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

    for (const modelName of modelNames) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const json = extractJsonFromModelResponse(text);
            return { json, modelName };
        } catch (error) {
            lastError = error;
            console.warn(`Model failed (${modelName}):`, error.message);
        }
    }

    throw lastError || new Error('No AI model available');
}

export async function generateTextWithModel(prompt, modelName = 'gemini-2.0-flash') {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text();
}
