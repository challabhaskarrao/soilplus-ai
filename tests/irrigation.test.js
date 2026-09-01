// Unit tests for irrigation threshold estimator
import { estimateIrrigationThreshold } from "../utils.js";

function runTests() {
    console.log("Running Irrigation Threshold Tests...");

    // Test 1: Sandy soil below threshold
    const res1 = estimateIrrigationThreshold("Tomato", "sandy", 30);
    console.assert(res1.needsIrrigation === true, "Test 1 Failed: Expected needsIrrigation=true");
    console.assert(res1.minThreshold === 35, "Test 1 Failed: Expected minThreshold=35");

    // Test 2: Loam soil adequate moisture
    const res2 = estimateIrrigationThreshold("Wheat", "loam", 50);
    console.assert(res2.needsIrrigation === false, "Test 2 Failed: Expected needsIrrigation=false");
    console.assert(res2.minThreshold === 45, "Test 2 Failed: Expected minThreshold=45");

    // Test 3: Clay soil moisture deficit
    const res3 = estimateIrrigationThreshold("Maize", "clay", 40);
    console.assert(res3.needsIrrigation === true, "Test 3 Failed: Expected needsIrrigation=true");
    console.assert(res3.waterDeficitPercent === 15, "Test 3 Failed: Expected waterDeficitPercent=15");

    console.log("All Irrigation Threshold Tests Passed Successfully!");
}

runTests();
