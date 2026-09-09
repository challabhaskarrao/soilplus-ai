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

export function validateSensorHeartbeat(lastPingTimestamp, intervalSec = 30) {
    if (!lastPingTimestamp) return { isHealthy: false, status: 'NO_PING_RECEIVED' };
    const elapsedSec = (Date.now() - new Date(lastPingTimestamp).getTime()) / 1000;
    const isHealthy = elapsedSec <= intervalSec * 2;
    return {
        isHealthy,
        elapsedSec: +elapsedSec.toFixed(1),
        status: isHealthy ? 'HEALTHY' : 'STALE_HEARTBEAT'
    };
}

export function calculateNitrogenVolatilizationRisk(soilTemp, ph, moisture, applicationType = 'surface') {
    let riskFactor = 0;
    if (ph > 7.5) riskFactor += 35;
    else if (ph > 7.0) riskFactor += 15;

    if (soilTemp > 25) riskFactor += 30;
    else if (soilTemp > 18) riskFactor += 15;

    if (moisture < 30) riskFactor += 20;
    if (applicationType === 'surface') riskFactor += 15;

    riskFactor = Math.min(100, riskFactor);
    let riskLevel = 'LOW';
    if (riskFactor >= 70) riskLevel = 'CRITICAL';
    else if (riskFactor >= 40) riskLevel = 'MODERATE';

    return {
        soilTemp,
        ph,
        moisture,
        applicationType,
        volatilizationRiskFactor: riskFactor,
        riskLevel,
        mitigation: riskFactor >= 40 ? 'Incorporate fertilizer immediately or apply light irrigation (5-10mm).' : 'Optimal retention conditions.'
    };
}

export function calculateGrowingDegreeDays(tMax, tMin, baseTemp = 10) {
    const avgTemp = (tMax + tMin) / 2;
    return Math.max(0, +(avgTemp - baseTemp).toFixed(2));
}

export function estimateCropStage(cumulativeGDD, cropType = 'corn') {
    const stages = {
        corn: [
            { stage: 'Emergence', minGDD: 0, maxGDD: 120 },
            { stage: 'Vegetative V4-V8', minGDD: 121, maxGDD: 450 },
            { stage: 'Tasseling / Silking', minGDD: 451, maxGDD: 900 },
            { stage: 'Grain Filling', minGDD: 901, maxGDD: 1400 },
            { stage: 'Physiological Maturity', minGDD: 1401, maxGDD: 9999 }
        ],
        wheat: [
            { stage: 'Germination & Tillering', minGDD: 0, maxGDD: 300 },
            { stage: 'Stem Elongation', minGDD: 301, maxGDD: 650 },
            { stage: 'Booting & Heading', minGDD: 651, maxGDD: 950 },
            { stage: 'Ripening', minGDD: 951, maxGDD: 9999 }
        ]
    };

    const cropStages = stages[cropType.toLowerCase()] || stages.corn;
    const current = cropStages.find(s => cumulativeGDD >= s.minGDD && cumulativeGDD <= s.maxGDD) || cropStages[cropStages.length - 1];
    return { crop: cropType, cumulativeGDD, currentStage: current.stage };
}

export function estimateEvapotranspiration(temperature, humidity, solarRadiationMJ = 18.5, windSpeedMs = 2.0) {
    const meanTemp = temperature;
    const radiationEquivalent = 0.408 * solarRadiationMJ;
    const vaporDeficit = (100 - humidity) / 100;
    const et0 = Math.max(0.5, (0.0023 * (meanTemp + 17.8) * Math.sqrt(Math.max(1, 35 - meanTemp)) * radiationEquivalent * (1 + 0.05 * windSpeedMs) * (0.8 + 0.4 * vaporDeficit)) / 10);
    return {
        temperature,
        humidity,
        solarRadiationMJ,
        windSpeedMs,
        et0MmPerDay: +et0.toFixed(2),
        waterLossCategory: et0 > 6.0 ? 'High' : (et0 >= 3.5 ? 'Moderate' : 'Low')
    };
}

export function detectSensorAnomalies(recentReadings = [], maxDeltaAllowed = 25) {
    if (!Array.isArray(recentReadings) || recentReadings.length < 2) {
        return { isAnomaly: false, reason: 'Insufficient data points' };
    }

    const latest = recentReadings[recentReadings.length - 1];
    const previous = recentReadings[recentReadings.length - 2];
    const delta = Math.abs(latest - previous);

    if (latest < 0 || latest > 100) {
        return { isAnomaly: true, reason: 'OUT_OF_BOUNDS', value: latest, delta };
    }

    if (delta > maxDeltaAllowed) {
        return { isAnomaly: true, reason: 'SUDDEN_SPIKE_OR_DROP', value: latest, delta };
    }

    return { isAnomaly: false, reason: 'NORMAL_READING', value: latest, delta };
}

export function calculateCompostRatio(greenWeightKg, brownWeightKg, greenCN = 15, brownCN = 60) {
    const totalWeight = greenWeightKg + brownWeightKg;
    if (totalWeight <= 0) return { error: 'Weights must be greater than zero' };

    const compositeCN = (greenWeightKg * greenCN + brownWeightKg * brownCN) / totalWeight;
    let balanceStatus = 'Optimal';
    let recommendation = 'Carbon-to-Nitrogen ratio is ideal for decomposition.';

    if (compositeCN < 25) {
        balanceStatus = 'Excess Nitrogen';
        recommendation = 'Add dry leaves, sawdust, or straw (brown materials) to prevent ammonia odor.';
    } else if (compositeCN > 35) {
        balanceStatus = 'Excess Carbon';
        recommendation = 'Add fresh greens, vegetable scraps, or manure to accelerate decomposition.';
    }

    return {
        totalWeightKg: +totalWeight.toFixed(1),
        compositeCNRatio: +compositeCN.toFixed(1),
        idealRange: '25:1 - 30:1',
        balanceStatus,
        recommendation
    };
}

export function analyzeMoistureGradient(topsoilMoisture, subsoilMoisture, rootDepthCm = 30) {
    const gradientDelta = topsoilMoisture - subsoilMoisture;
    let infiltrationPattern = 'Equilibrium';

    if (gradientDelta > 15) {
        infiltrationPattern = 'Downward Infiltration (Recent Rain/Irrigation)';
    } else if (gradientDelta < -15) {
        infiltrationPattern = 'Capillary Rise / Surface Evaporation Deficit';
    }

    const meanRootZoneMoisture = +((topsoilMoisture * 0.4 + subsoilMoisture * 0.6).toFixed(1));
    return {
        topsoilMoisture,
        subsoilMoisture,
        gradientDelta: +gradientDelta.toFixed(1),
        meanRootZoneMoisture,
        rootDepthCm,
        infiltrationPattern
    };
}

export function calculateSmartValveSchedule(crop, currentMoisture, rainProbability = 10, forecastRainMm = 0) {
    const minMoisture = 45;
    if (rainProbability > 60 && forecastRainMm >= 10) {
        return {
            action: 'SUSPEND',
            durationMinutes: 0,
            reason: `High rain probability (${rainProbability}%, ${forecastRainMm}mm predicted). Conserving water.`,
            scheduleTime: 'Postponed'
        };
    }

    if (currentMoisture < minMoisture) {
        const deficit = minMoisture - currentMoisture;
        const minutesNeeded = Math.min(60, Math.round(deficit * 1.5));
        return {
            action: 'IRRIGATE',
            durationMinutes: minutesNeeded,
            reason: `Moisture is below threshold (${currentMoisture}% vs ${minMoisture}%).`,
            scheduleTime: 'Immediate / Next Cycle'
        };
    }

    return {
        action: 'STANDBY',
        durationMinutes: 0,
        reason: 'Soil moisture is optimal.',
        scheduleTime: 'Next evaluation in 4 hours'
    };
}

export function estimateCarbonSequestration(somPercentage, tillagePractice = 'no-till', acreage = 1.0) {
    const socPercentage = somPercentage * 0.58;
    const tillageMultipliers = {
        'no-till': 1.25,
        'reduced-till': 1.0,
        'conventional': 0.75
    };

    const multiplier = tillageMultipliers[tillagePractice.toLowerCase()] || 1.0;
    const annualSequestrationTonsPerAcre = +(0.35 * multiplier * (somPercentage / 2.5)).toFixed(2);
    const totalAcreageSequestrationTons = +(annualSequestrationTonsPerAcre * acreage).toFixed(2);

    return {
        somPercentage,
        socPercentage: +socPercentage.toFixed(2),
        tillagePractice,
        acreage,
        annualSequestrationTonsPerAcre,
        totalAcreageSequestrationTons,
        carbonCreditPotentialUsd: +(totalAcreageSequestrationTons * 35).toFixed(2)
    };
}

