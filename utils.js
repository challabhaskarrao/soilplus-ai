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
