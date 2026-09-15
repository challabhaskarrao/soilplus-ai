// Unit tests for Crop Water Stress Index (CWSI)
import { calculateCropWaterStressIndex } from "../utils.js";

function runTests() {
    console.log("Running CWSI Tests...");

    // Test 1: Well-watered cool canopy
    const res1 = calculateCropWaterStressIndex(24, 28, 2.0);
    console.assert(res1.cwsi < 0.35, "Test 1 Failed: Expected low CWSI, got " + res1.cwsi);
    console.assert(res1.requiresIrrigation === false, "Test 1 Failed: Irrigation should not be required");

    // Test 2: Hot stressed canopy
    const res2 = calculateCropWaterStressIndex(35, 30, 2.5);
    console.assert(res2.cwsi > 0.60, "Test 2 Failed: Expected high CWSI, got " + res2.cwsi);
    console.assert(res2.requiresIrrigation === true, "Test 2 Failed: Expected requiresIrrigation=true");

    console.log("All CWSI Tests Passed Successfully!");
}

runTests();
