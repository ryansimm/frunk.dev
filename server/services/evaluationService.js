function normalizeCodeForTemplateComparison(code) {
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

    const normalizedUser = normalizeCodeForTemplateComparison(userCode);
    const normalizedTemplate = normalizeCodeForTemplateComparison(codeTemplate);

    if (!normalizedUser || !normalizedTemplate) {
        return false;
    }

    return normalizedUser === normalizedTemplate;
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
            const normalized = line.trim().toLowerCase();
            if (!normalized) {
                return true;
            }

            const isScaffoldLine = scaffoldTokens.has(normalized) && templateLineSet.has(normalized);
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

function getFallbackCorrectnessScoreFloor(difficulty) {
    const level = (difficulty || 'easy').toLowerCase();
    if (level === 'hard') return 85;
    if (level === 'medium') return 80;
    return 75;
}

function buildDetailedFeedback({ feedback, score, difficulty, issues, strengths, isCorrect }) {
    const normalizedFeedback = (feedback || '').trim();
    const looksGeneric = !normalizedFeedback
        || normalizedFeedback.length < 120
        || /good effort|needs improvement|not yet strong enough|try again/i.test(normalizedFeedback);

    if (!looksGeneric) {
        return normalizedFeedback;
    }

    const topStrengths = (strengths || []).slice(0, 2);
    const topIssues = (issues || []).slice(0, 3);

    const base = [
        `Difficulty: ${(difficulty || 'unknown').toUpperCase()}.`,
        `Score: ${score}/100.`
    ];

    if (isCorrect) {
        base.push('Your solution passes the current quality checks and is marked correct.');
    } else {
        base.push('Your solution is not marked correct yet based on the current checks.');
    }

    if (topStrengths.length > 0) {
        base.push(`What works well: ${topStrengths.join(' ')}`);
    }

    if (topIssues.length > 0) {
        base.push(`Main gaps to address: ${topIssues.join(' ')}`);
    }

    if (!isCorrect) {
        base.push('Next step: update the core logic first, then re-run with edge cases (empty input, single item, and repeated values where relevant).');
    }

    return base.join(' ');
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
    const hasBlockingIssue = !hasDef || !hasReturn || hasPlaceholder || isTemplateOnly;
    const isCorrect = !hasBlockingIssue
        && score >= getFallbackCorrectnessScoreFloor(difficulty)
        && (isEasy || hasControlFlow || hasUsefulOps || hasComprehension);

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

export function normalizeEvaluationResult(evaluationData, userCode, codeTemplate, difficulty) {
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
        score = Math.min(score, 45);
        issues.push('Missing clear function definition.');
    }

    if (!hasReturn) {
        score = Math.min(score, 55);
        issues.push('Missing explicit return statement.');
    }

    if (hasPlaceholder) {
        score = Math.min(score, 25);
        issues.push('Contains placeholder/incomplete code (pass/TODO).');
    }

    if (isVeryShort) {
        score = Math.min(score, 35);
        issues.push('Code is too short to demonstrate a complete solution.');
    }

    if (isTemplateOnly) {
        score = Math.min(score, 20);
        issues.push('Submission mostly matches scaffold/template without implementation depth.');
    }

    if (!isEasy && !hasControlFlow && code.length < 160) {
        score = Math.min(score, 45);
        issues.push('Insufficient algorithmic logic detected for this solution.');
    }

    if (!isEasy && !hasDataOps && !hasComprehension) {
        score = Math.min(score, 70);
        issues.push('Limited concrete data-processing operations detected.');
    }

    if (issues.length >= 2) {
        score = Math.min(score, 62);
    }

    if (issues.length >= 4) {
        score = Math.min(score, 50);
    }

    if (!Array.isArray(evaluationData?.strengths) || evaluationData.strengths.length === 0) {
        score = Math.min(score, 78);
    }

    const modelMarkedCorrect = Boolean(evaluationData?.isCorrect);

    if (modelMarkedCorrect) {
        score = Math.max(score, getCorrectnessScoreFloor(difficulty));
    }

    const isCorrect = modelMarkedCorrect && !isTemplateOnly && hasDef && hasReturn && !hasPlaceholder;

    const finalFeedback = buildDetailedFeedback({
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
