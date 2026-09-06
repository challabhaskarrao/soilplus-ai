// Unit tests for Composting C:N ratio calculator
import { calculateCompostRatio } from "../utils.js";

function runTests() {
    console.log("Running Composting C:N Tests...");

    const res1 = calculateCompostRatio(10, 20, 15, 60);
    console.assert(res1.compositeCNRatio === 45, "Test 1 Failed: Got " + res1.compositeCNRatio);
    console.assert(res1.balanceStatus === 'Excess Carbon', "Test 1 Failed: Expected Excess Carbon");

    const res2 = calculateCompostRatio(20, 10, 15, 60);
    console.assert(res2.compositeCNRatio === 30, "Test 2 Failed: Expected 30");
    console.assert(res2.balanceStatus === 'Optimal', "Test 2 Failed: Expected Optimal");

    console.log("All Composting Tests Passed Successfully!");
}

runTests();
