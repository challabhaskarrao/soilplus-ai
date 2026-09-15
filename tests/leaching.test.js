// Unit tests for Leaching Fraction Calculator
import { calculateLeachingFraction } from "../utils.js";

function runTests() {
    console.log("Running Leaching Fraction Tests...");

    // Test 1: Standard irrigation EC
    const res1 = calculateLeachingFraction(1.2, 4.0);
    console.assert(res1.leachingFraction > 0, "Test 1 Failed: Positive fraction expected");
    console.assert(res1.leachingRequirementPercentage < 20, "Test 1 Failed: Moderate requirement expected");

    // Test 2: Saline water -> High leaching needed
    const res2 = calculateLeachingFraction(3.5, 3.0);
    console.assert(res2.status === 'HIGH_LEACHING_NEEDED', "Test 2 Failed: Expected HIGH_LEACHING_NEEDED");

    console.log("All Leaching Fraction Tests Passed Successfully!");
}

runTests();
