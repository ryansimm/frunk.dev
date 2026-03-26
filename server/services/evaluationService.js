function normaliseCodeForTemplateComparison(code) {
    return (code || '')
        .replace(/#.*$/gm, '')
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();
}

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

            const isScaffoldLine = scaffoldTokens.has(normalised) && templateLineSet.has(normalised);
            return !isScaffoldLine;
        })
        .join('\n');
}

function getCorrectnessScoreFloor(difficulty) {
    const level = (difficulty || 'easy').toLowerCase();
    if (level === 'hard') return 92;
    if (level === 'medium') return 88;
    return 84;
}

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

export function getFallbackEvaluation(userCode, codeTemplate, difficulty) {
    const code = (userCode || '').trim();
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

    if (hasPlaceholder) {
        score = Math.min(score, 12);
        issues.push('Contains placeholder or incomplete logic (e.g., pass/TODO).');
    }

    if (isTemplateOnly) {
        score = Math.min(score, 15);
        issues.push('Submission is still almost the same as the provided template scaffold.');
    }

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

export function normaliseEvaluationResult(evaluationData, userCode, codeTemplate, difficulty) {
    const code = (userCode || '').trim();
    const nonTemplateCode = stripTemplateScaffoldArtifacts(code, codeTemplate).trim();
    const hasDef = /\bdef\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(code);
    const hasReturn = /\breturn\b/.test(code);
    const hasPlaceholder = /\bpass\b|todo|your code here/i.test(nonTemplateCode);
    const isVeryShort = nonTemplateCode.length < 40;
    const hasControlFlow = /\bfor\b|\bwhile\b|\bif\b|\belif\b|\btry\b/.test(code);
    const hasDataOps = /\bsort\b|\bsorted\b|\bappend\b|\bcount\b|\bdict\b|\bset\b|\blen\b|\bany\b|\ball\b|\benumerate\b|\bzip\b/.test(code);
    const hasComprehension = /\[[^\]]+\bfor\b[^\]]+\]|\{[^}]+\bfor\b[^}]+\}/.test(code);
    const isEasy = (difficulty || 'easy').toLowerCase() === 'easy';
    const isTemplateOnly = isSubmissionNearTemplate(code, codeTemplate);

    let score = Number.isFinite(Number(evaluationData?.score)) ? Number(evaluationData.score) : 0;
    score = Math.max(0, Math.min(100, score));

    const issues = Array.isArray(evaluationData?.issues)
        ? evaluationData.issues.filter(Boolean)
        : [];
    const strengths = Array.isArray(evaluationData?.strengths)
        ? evaluationData.strengths.filter(Boolean)
        : [];

    if (!hasDef) {
        issues.push('Uses a non-standard function structure for this question format.');
    }

    if (!hasReturn) {
        issues.push('May rely on side effects/printing instead of explicit return values.');
    }

    if (hasPlaceholder) {
        issues.push('Contains placeholder/incomplete code (pass/TODO).');
    }

    if (isVeryShort) {
        issues.push('Very short implementation; check edge cases carefully.');
    }

    if (isTemplateOnly) {
        issues.push('Submission mostly matches scaffold/template.');
    }

    if (!isEasy && !hasControlFlow && code.length < 160) {
        issues.push('Limited visible algorithmic control flow for this difficulty.');
    }

    if (!isEasy && !hasDataOps && !hasComprehension) {
        issues.push('Limited visible data-processing operations for this difficulty.');
    }

    if (score < 90 && issues.length < 2) {
        issues.push('Add explicit handling for edge cases (empty input, single-item input, and repeated values) and verify expected outputs for each.');
    }

    if (score < 90 && issues.length < 2) {
        issues.push('Improve correctness confidence by testing additional cases and tightening logic around boundary conditions.');
    }

    if (score >= 90 && score < 100 && issues.length === 0) {
        issues.push('For a higher score, refine readability and include clearer handling/comments for tricky edge-case branches.');
    }

    if (!Array.isArray(evaluationData?.strengths) || evaluationData.strengths.length === 0) {
        score = Math.min(score, 78);
    }

    const feedbackText = String(evaluationData?.feedback || '').toLowerCase();
    const feedbackSuggestsImprovements = /\b(improv|should|could|consider|missing|issue|fix|edge case|not handle)\b/.test(feedbackText);

    // A perfect score must not include corrective guidance.
    if (score === 100 && (issues.length > 0 || feedbackSuggestsImprovements)) {
        score = 99;
    }

    const modelMarkedCorrect = Boolean(evaluationData?.isCorrect);

    if (modelMarkedCorrect) {
        score = Math.max(score, getCorrectnessScoreFloor(difficulty));
    }

    // Enforce a minimum correctness threshold by score.
    const isCorrect = modelMarkedCorrect || score >= 40;

    const isPerfectSubmission = score === 100 && issues.length === 0;
    const finalFeedback = isPerfectSubmission
        ? ''
        : buildDetailedFeedback({
            feedback: evaluationData?.feedback,
            score,
            difficulty,
            issues,
            strengths,
            isCorrect
        });

    return {
        isCorrect,
        score,
        feedback: finalFeedback,
        issues,
        strengths
    };
}

function resolveDifficultyMultiplier(difficulty) {
    const level = (difficulty || 'easy').toLowerCase();
    if (level === 'hard') return 1.5;
    if (level === 'medium') return 1.2;
    return 1;
}

export function calculateTokenAward({ evaluationData, difficulty, userCode }) {
    const score = Number.isFinite(Number(evaluationData?.score)) ? Number(evaluationData.score) : 0;
    const issuesCount = Array.isArray(evaluationData?.issues) ? evaluationData.issues.length : 0;
    const strengthsCount = Array.isArray(evaluationData?.strengths) ? evaluationData.strengths.length : 0;
    const isCorrect = Boolean(evaluationData?.isCorrect);
    const code = (userCode || '').trim();

    const hasErrorHandling = /\btry\b[\s\S]*\bexcept\b/i.test(code);
    const hasEfficientPatterns = /(\{.*for.*in.*\}|\[.*for.*in.*\]|\bset\(|\bdict\(|\bany\(|\ball\(|\benumerate\(|\bzip\()/i.test(code);
    const isLikelyOverlyLong = code.length > 800;

    const baseFromScore = Math.round((score / 100) * 14);
    const correctnessBonus = isCorrect ? 4 : 0;
    const difficultyScaled = Math.round((baseFromScore + correctnessBonus) * resolveDifficultyMultiplier(difficulty));
    const qualityBonus = Math.min(3, strengthsCount);
    const issuePenalty = Math.min(5, issuesCount);
    const efficiencyBonus = hasEfficientPatterns ? 2 : 0;
    const errorHandlingBonus = hasErrorHandling ? 1 : 0;
    const lengthPenalty = isLikelyOverlyLong ? 2 : 0;

    const raw = difficultyScaled + qualityBonus + efficiencyBonus + errorHandlingBonus - issuePenalty - lengthPenalty;
    const tokenAward = Math.max(0, Math.min(30, raw));

    return {
        tokenAward,
        tokenBreakdown: {
            baseFromScore,
            correctnessBonus,
            difficultyMultiplier: resolveDifficultyMultiplier(difficulty),
            qualityBonus,
            efficiencyBonus,
            errorHandlingBonus,
            issuePenalty,
            lengthPenalty
        }
    };
}
