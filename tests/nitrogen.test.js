// Unit tests for nitrogen volatilization risk calculator
import { calculateNitrogenVolatilizationRisk } from "../utils.js";

function runTests() {
    console.log("Running Nitrogen Volatilization Tests...");

    const res1 = calculateNitrogenVolatilizationRisk(28, 8.0, 25, 'surface');
    console.assert(res1.riskLevel === 'CRITICAL', "Test 1 Failed: Expected CRITICAL risk");
    console.assert(res1.volatilizationRiskFactor >= 70, "Test 1 Failed: Risk factor should be >= 70");

    const res2 = calculateNitrogenVolatilizationRisk(15, 6.5, 50, 'incorporated');
    console.assert(res2.riskLevel === 'LOW', "Test 2 Failed: Expected LOW risk");

    console.log("All Nitrogen Volatilization Tests Passed Successfully!");
}

runTests();
