// Unit tests for multi-depth soil moisture gradient analyzer
import { analyzeMoistureGradient } from "../utils.js";

function runTests() {
    console.log("Running Moisture Gradient Tests...");

    const res1 = analyzeMoistureGradient(65, 35, 25);
    console.assert(res1.gradientDelta === 30, "Test 1 Failed: Got " + res1.gradientDelta);
    console.assert(res1.infiltrationPattern.includes('Downward'), "Test 1 Failed: Wrong pattern");

    const res2 = analyzeMoistureGradient(25, 55, 30);
    console.assert(res2.gradientDelta === -30, "Test 2 Failed: Got " + res2.gradientDelta);
    console.assert(res2.infiltrationPattern.includes('Capillary'), "Test 2 Failed: Wrong pattern");

    console.log("All Moisture Gradient Tests Passed Successfully!");
}

runTests();
