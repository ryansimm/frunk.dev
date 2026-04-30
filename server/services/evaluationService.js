/**
 * https://medium.com/@manojkumartech/code-evaluation-using-ai-and-rule-based-systems-3b0d5b6f8c9d
 * https://medium.com/@rajat19/automated-code-review-using-static-analysis-in-javascript-1f0d3c5a7cbb
 * https://stackoverflow.com/questions/140131/check-if-a-string-contains-a-substring-in-javascript
 * https://stackoverflow.com/questions/1183903/regex-to-match-a-function-definition
 * These references cover heuristic based code evaluation (for the rule based scoring)
 * Detecting patterns in code, using regex and combining AI evaluation with fallback logic
 * Token/reward calculation based on the user performance.
 */
// Normalises code so it can be compared against a template without formatting differences
function normaliseCodeForTemplateComparison(code) {
    return (code || '')
        .replace(/#.*$/gm, '') // remove comments
        .replace(/\s+/g, '')   // remove whitespace
        .trim()
        .toLowerCase();
}

// Checks if user submission is basically unchanged from the template
function isSubmissionNearTemplate(userCode, codeTemplate) {
    if (!codeTemplate) {
        return false;
    }

    const normalisedUser = normaliseCodeForTemplateComparison(userCode);
    const normalisedTemplate = normaliseCodeForTemplateComparison(codeTemplate);

    if (!normalisedUser || !normalisedTemplate) {
        return false;
    }

    return normalisedUser === normalisedTemplate;
}

// Removes placeholder/template lines like "pass" or "# your code here"
function stripTemplateScaffoldArtifacts(userCode, codeTemplate) {
    if (!codeTemplate) {
        return userCode || '';
    }

    const templateLineSet = new Set(
        (codeTemplate || '')
            .split('\n')
            .map((line) => line.trim().toLowerCase())
            .filter(Boolean)
    );

    const scaffoldTokens = new Set(['# your code here', '#your code here', 'pass']);

    return (userCode || '')
        .split('\n')
        .filter((line) => {
            const normalised = line.trim().toLowerCase();

            if (!normalised) {
                return true;
            }

            const isScaffoldLine =
                scaffoldTokens.has(normalised) &&
                templateLineSet.has(normalised);

            return !isScaffoldLine;
        })
        .join('\n');
}

// Sets a minimum score threshold for correct answers based on difficulty
function getCorrectnessScoreFloor(difficulty) {
    const level = (difficulty || 'easy').toLowerCase();
    if (level === 'hard') return 92;
    if (level === 'medium') return 88;
    return 84;
}

function clampScore(score) {
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(numericScore)));
}

function normaliseStringList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => String(item || '').trim())
        .filter(Boolean);
}

export function normaliseEvaluationResult(rawEvaluationData, userCode, codeTemplate, difficulty) {
    const fallbackEvaluation = getFallbackEvaluation(userCode, codeTemplate, difficulty);
    const raw = rawEvaluationData && typeof rawEvaluationData === 'object' ? rawEvaluationData : {};

    const score = clampScore(raw.score ?? fallbackEvaluation.score);
    const isCorrect = typeof raw.isCorrect === 'boolean'
        ? raw.isCorrect
        : score >= getCorrectnessScoreFloor(difficulty);

    const feedback = String(raw.feedback || fallbackEvaluation.feedback || '')
        .trim() || fallbackEvaluation.feedback;

    const issues = normaliseStringList(raw.issues);
    const strengths = normaliseStringList(raw.strengths);

    return {
        isCorrect,
        score,
        feedback,
        issues: issues.length > 0 ? issues : fallbackEvaluation.issues,
        strengths: strengths.length > 0 ? strengths : fallbackEvaluation.strengths,
        difficulty: (difficulty || 'unknown').toLowerCase(),
        rawEvaluationData,
        fallback: !rawEvaluationData
    };
}

export function calculateTokenAward({ evaluationData, difficulty, userCode }) {
    const safeDifficulty = (difficulty || 'easy').toLowerCase();
    const score = clampScore(evaluationData?.score);
    const isCorrect = Boolean(evaluationData?.isCorrect);
    const codeLength = String(userCode || '').trim().length;

    const baseByDifficulty = {
        easy: 6,
        medium: 8,
        hard: 10
    };

    const difficultyFactor = {
        easy: 1,
        medium: 1.4,
        hard: 1.8
    };

    const base = baseByDifficulty[safeDifficulty] ?? baseByDifficulty.easy;
    const difficultyMultiplier = difficultyFactor[safeDifficulty] ?? difficultyFactor.easy;
    const scoreFactor = Math.max(0.25, score / 100);
    const completenessFactor = codeLength >= 180 ? 1.15 : codeLength >= 100 ? 1 : 0.85;
    const correctnessFactor = isCorrect ? 1 : 0.5;

    const tokenAward = Math.max(1, Math.round(base * difficultyMultiplier * scoreFactor * completenessFactor * correctnessFactor));

    return {
        tokenAward,
        tokenBreakdown: {
            base,
            difficultyMultiplier,
            scoreFactor,
            completenessFactor,
            correctnessFactor,
            score,
            isCorrect
        }
    };
}

// Builds structured feedback string for frontend display
function buildDetailedFeedback({ feedback, score, difficulty, issues, strengths, isCorrect }) {
    const normalisedFeedback = (feedback || '').trim();
    const topStrengths = (strengths || []).slice(0, 3);
    const topIssues = (issues || []).slice(0, 3);

    const summary = normalisedFeedback || (isCorrect
        ? 'Your output matches the expected behavior for this question.'
        : 'Your output does not fully match the expected behavior yet.');

    const positiveLines = topStrengths.length > 0
        ? topStrengths
        : ['Your approach shows progress toward the required output.'];

    const negativeLines = topIssues.length > 0
        ? topIssues
        : ['No major issues were detected in this submission.'];

    return [
        `Overall: ${isCorrect ? 'Correct' : 'Incorrect'}`,
        `Difficulty: ${(difficulty || 'unknown').toUpperCase()}`,
        `Score: ${score}/100`,
        `Summary: ${summary}`,
        'Positives:',
        ...positiveLines.map((line) => `- ${line}`),
        'Needs improvement:',
        ...negativeLines.map((line) => `- ${line}`)
    ].join('\n');
}

// Fallback evaluation used when AI evaluation is unavailable
export function getFallbackEvaluation(userCode, codeTemplate, difficulty) {
    const code = (userCode || '').trim();

    // Remove template placeholders before analysing
    const nonTemplateCode = stripTemplateScaffoldArtifacts(code, codeTemplate).trim();

    const hasCode = code.length > 0;
    const hasDef = /\bdef\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(code);
    const hasReturn = /\breturn\b/.test(code);
    const hasPlaceholder = /\bpass\b|todo|your code here/i.test(nonTemplateCode);
    const hasControlFlow = /\bfor\b|\bwhile\b|\bif\b|\belif\b|\btry\b/.test(code);
    const hasUsefulOps = /\bsort\b|\bsorted\b|\bappend\b|\bcount\b|\bdict\b|\bset\b|\blen\b/.test(code);
    const hasComprehension = /\[[^\]]+\bfor\b[^\]]+\]|\{[^}]+\bfor\b[^}]+\}/.test(code);
    const hasErrorHandling = /\btry\b[\s\S]*\bexcept\b/.test(code);

    const isEasy = (difficulty || 'easy').toLowerCase() === 'easy';
    const isTemplateOnly = isSubmissionNearTemplate(code, codeTemplate);

    const issues = [];
    const strengths = [];

    if (!hasCode) {
        return {
            isCorrect: false,
            score: 0,
            feedback: 'No code was submitted. Add a full solution and submit again.',
            issues: ['No code submitted.'],
            strengths: [],
            fallback: true
        };
    }

    let score = 0;

    // Basic scoring based on structure + features
    if (hasDef) {
        score += 20;
        strengths.push('Provides a function-based solution format.');
    } else {
        issues.push('Missing a clear function definition.');
    }

    if (hasReturn) {
        score += 20;
        strengths.push('Includes a return statement.');
    } else {
        issues.push('Missing return logic for final output.');
    }

    // Length heuristic (rough completeness check)
    if (code.length >= 180) {
        score += 20;
        strengths.push('Shows substantial implementation detail.');
    } else if (code.length >= 110) {
        score += 12;
    } else if (code.length >= 70) {
        score += 6;
    } else {
        issues.push('Solution is very short and may be incomplete.');
    }

    if (hasControlFlow) {
        score += 15;
        strengths.push('Uses control flow to handle logic paths.');
    }

    if (hasUsefulOps || hasComprehension) {
        score += 15;
        strengths.push('Uses meaningful Python operations/data handling.');
    }

    if (hasErrorHandling) {
        score += 5;
        strengths.push('Includes basic error handling.');
    }

    // Penalise incomplete/template solutions
    if (hasPlaceholder) {
        score = Math.min(score, 12);
        issues.push('Contains placeholder or incomplete logic (e.g., pass/TODO).');
    }

    if (isTemplateOnly) {
        score = Math.min(score, 15);
        issues.push('Submission is still almost the same as the provided template scaffold.');
    }

    // Harder questions require more logic
    if (!isEasy && !hasControlFlow && code.length < 160) {
        score = Math.min(score, 35);
        issues.push('Missing clear algorithmic steps beyond structure/template.');
    }

    if (!isEasy && !hasUsefulOps && !hasComprehension) {
        score = Math.min(score, 55);
        issues.push('Implementation lacks concrete data-processing logic.');
    }

    score = Math.max(0, Math.min(100, score));
    const isCorrect = score >= 40;

    const feedback = buildDetailedFeedback({
        feedback: isCorrect
            ? 'Solution appears complete under fallback structural checks.'
            : 'Solution needs stronger implementation detail under fallback checks.',
        score,
        difficulty,
        issues,
        strengths,
        isCorrect
    });

    return {
        isCorrect,
        score,
        feedback,
        issues,
        strengths,
        fallback: true
    };
}