// Soil AI calculation utilities
export function calculateNPKRatio(nitrogen, phosphorus, potassium) {
    return { N: nitrogen, P: phosphorus, K: potassium };
}

export function getSoilHealthScore(ph, moisture) {
    if (ph >= 6.0 && ph <= 7.5 && moisture >= 40) return 'Optimal';
    return 'Needs Attention';
}

export function validateSoilInput(data) {
    return data && typeof data.ph === 'number' && data.ph >= 0 && data.ph <= 14;
}

export function formatFertilizerRecommendation(crop, deficit) {
    return `For ${crop}, recommended NPK adjustment: ${deficit.N}g N, ${deficit.P}g P, ${deficit.K}g K.`;
}

export function getMoistureStatus(level) {
    if (level < 20) return 'Dry';
    if (level <= 60) return 'Moist';
    return 'Wet';
}

export function calculateSoilOrganicMatterIndex(somPercentage) {
    if (somPercentage >= 4.0) return { category: 'High', status: 'Optimal Organic Retention' };
    if (somPercentage >= 2.0) return { category: 'Moderate', status: 'Adequate Soil Structure' };
    return { category: 'Low', status: 'Requires Organic Amendment' };
}

export function evaluateFrostRisk(ambientTemp, humidity) {
    if (ambientTemp <= 2.0 && humidity >= 80) return { riskLevel: 'CRITICAL', message: 'High probability of frost formation. Activate micro-sprinklers.' };
    if (ambientTemp <= 5.0) return { riskLevel: 'MODERATE', message: 'Cold weather warning. Monitor nocturnal temperature drops.' };
    return { riskLevel: 'LOW', message: 'No immediate frost risk.' };
}

