// Unit tests for Phosphorus Fixation Risk Index
import { calculatePhosphorusFixationRisk } from "../utils.js";

function runTests() {
    console.log("Running Phosphorus Fixation Tests...");

    // Test 1: Acidic clay soil
    const res1 = calculatePhosphorusFixationRisk(5.2, 45, 50);
    console.assert(res1.fixationCategory === 'HIGH_FIXATION', "Test 1 Failed: Expected HIGH_FIXATION");
    console.assert(res1.recommendation.includes('lime'), "Test 1 Failed: Lime recommendation expected");

    // Test 2: Neutral loam soil
    const res2 = calculatePhosphorusFixationRisk(6.5, 20, 15);
    console.assert(res2.fixationCategory === 'LOW_FIXATION', "Test 2 Failed: Expected LOW_FIXATION");

    console.log("All Phosphorus Fixation Tests Passed Successfully!");
}

runTests();
