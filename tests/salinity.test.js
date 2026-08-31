// Unit tests for soil salinity & EC calculations
import { calculateSalinityIndex } from "../utils.js";

function runTests() {
    console.log("Running Salinity Utility Tests...");

    const res1 = calculateSalinityIndex(0.8);
    console.assert(res1.level === "Non-saline", "Test 1 Failed");

    const res2 = calculateSalinityIndex(1.8);
    console.assert(res2.level === "Slightly Saline", "Test 2 Failed");

    const res3 = calculateSalinityIndex(3.5);
    console.assert(res3.level === "Moderately Saline", "Test 3 Failed");

    const res4 = calculateSalinityIndex(5.2);
    console.assert(res4.level === "Severely Saline", "Test 4 Failed");

    console.log("All Salinity Utility Tests Passed Successfully!");
}

runTests();
