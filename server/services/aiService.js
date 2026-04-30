/**
 * References:
 * https://ai.google.dev/api/generate-content
 * https://ai.google.dev/gemini-api/docs/structured-output
 * https://www.raymondcamden.com/2024/04/17/json-results-with-google-gemini-generative-ai-api-calls
 * https://medium.com/@pvnsripati/prompt-engineering-in-action-examples-using-google-gemini-node-js-a75253f852e1
 *
 * Covers:
 * - Gemini API content generation
 * - Generating/parsing JSON responses from Gemini
 * - Using fallback models when a model call fails
 * - Node.js integration with Google Gemini
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

// Removes duplicate model names while keeping the preferred order
function uniqueModels(models = []) {
    const seen = new Set();
    const ordered = [];

    for (const model of models) {
        const value = String(model || '').trim().replace(/^models\//, '');

        if (!value || seen.has(value)) {
            continue;
        }

        seen.add(value);
        ordered.push(value);
    }

    return ordered;
}

// Builds the model fallback list, including any model set in the environment
function buildPreferredModelList() {
    const configured = (process.env.GEMINI_MODEL || '').replace(/^models\//, '');

    return uniqueModels([
        'gemini-2.5-flash',
        configured,
        'gemini-2.0-flash',
        'gemini-2.0-flash-001',
        'gemini-flash-latest'
    ]);
}

// Creates the Gemini client using the API key from the environment
function getGenAIClient() {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY is not configured');
    }

    return new GoogleGenerativeAI(apiKey);
}

// Model lists used for JSON and text generation
export const JSON_RESPONSE_MODELS = buildPreferredModelList();

export const TEXT_RESPONSE_MODELS = buildPreferredModelList();

// Attempts to clean and parse JSON returned by the model
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

// Tries each Gemini model until one returns valid JSON
export async function generateJsonWithFallback(prompt, modelNames = JSON_RESPONSE_MODELS) {
    let lastError;

    console.log(`Trying ${modelNames.length} models for JSON generation:`, modelNames);

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

    console.error('All models failed. Last error:', lastError?.message);

    throw lastError || new Error('No AI model available');
}

// Basic text generation using one selected Gemini model
export async function generateTextWithModel(prompt, modelName = 'gemini-2.5-flash') {
    const genAI = getGenAIClient();
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);

    return result.response.text();
}

// Tries each Gemini model until one returns usable text
export async function generateTextWithFallback(prompt, modelNames = TEXT_RESPONSE_MODELS) {
    let lastError;

    console.log(`Trying ${modelNames.length} models for text generation:`, modelNames);

    for (const modelName of modelNames) {
        try {
            console.log(`  ↳ Attempting text model: ${modelName}...`);

            const genAI = getGenAIClient();
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const text = result.response.text();

            if (!String(text || '').trim()) {
                throw new Error('Model returned empty text response');
            }

            console.log(`  ✅ Text generation success with ${modelName}`);

            return { text, modelName };
        } catch (error) {
            lastError = error;
            console.warn(`  ❌ Text model ${modelName} failed:`, error.message);
        }
    }

    console.error('All text models failed. Last error:', lastError?.message);

    throw lastError || new Error('No text AI model available');
}