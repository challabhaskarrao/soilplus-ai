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

export function calculateSalinityIndex(ecValue) {
    if (ecValue < 1.0) return { level: 'Non-saline', status: 'Optimal for sensitive crops', ec: ecValue };
    if (ecValue <= 2.5) return { level: 'Slightly Saline', status: 'Yield of sensitive crops may be restricted', ec: ecValue };
    if (ecValue <= 4.0) return { level: 'Moderately Saline', status: 'Yield of many crops restricted', ec: ecValue };
    return { level: 'Severely Saline', status: 'Only tolerant crops produce acceptable yields', ec: ecValue };
}

export function evaluateSoilAeration(density, compactionIndex) {
    if (density > 1.6 || compactionIndex > 80) return { porosity: 'Poor', aerationStatus: 'Compacted - Aeration Required', density };
    if (density >= 1.3) return { porosity: 'Moderate', aerationStatus: 'Good Aeration', density };
    return { porosity: 'High', aerationStatus: 'Well Aerated / Loose Soil', density };
}

export function estimateIrrigationThreshold(cropType, soilType, currentMoisture) {
    const baseThresholds = {
        sandy: 35,
        loam: 45,
        clay: 55
    };
    const minThreshold = baseThresholds[soilType?.toLowerCase()] || 40;
    const needsIrrigation = currentMoisture < minThreshold;
    const deficit = Math.max(0, minThreshold - currentMoisture);

    return {
        crop: cropType || 'General',
        soilType: soilType || 'Loam',
        currentMoisture,
        minThreshold,
        needsIrrigation,
        waterDeficitPercent: +deficit.toFixed(1),
        recommendation: needsIrrigation 
            ? `Irrigation required. Current moisture (${currentMoisture}%) is below minimum threshold (${minThreshold}%).`
            : `Soil moisture level is adequate.`
    };
}




