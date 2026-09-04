// Unit tests for Evapotranspiration (ET0) estimator
import { estimateEvapotranspiration } from "../utils.js";

function runTests() {
    console.log("Running Evapotranspiration (ET0) Tests...");

    const res1 = estimateEvapotranspiration(32, 45, 22.0, 2.5);
    console.assert(res1.et0MmPerDay > 3.0, "Test 1 Failed: Expected substantial ET0");
    console.assert(typeof res1.waterLossCategory === 'string', "Test 1 Failed: Missing category");

    const res2 = estimateEvapotranspiration(18, 90, 8.0, 1.0);
    console.assert(res2.et0MmPerDay < res1.et0MmPerDay, "Test 2 Failed: Overcast day ET0 should be lower");

    console.log("All ET0 Tests Passed Successfully!");
}

runTests();
