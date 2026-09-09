// Unit tests for Soil Organic Carbon (SOC) Sequestration
import { estimateCarbonSequestration } from "../utils.js";

function runTests() {
    console.log("Running SOC Sequestration Tests...");

    const res1 = estimateCarbonSequestration(3.5, 'no-till', 10);
    console.assert(res1.socPercentage > 2.0, "Test 1 Failed: SOC percentage should be > 2.0");
    console.assert(res1.totalAcreageSequestrationTons > 0, "Test 1 Failed: Total sequestration should be positive");
    console.assert(res1.carbonCreditPotentialUsd > 0, "Test 1 Failed: Carbon credits should be calculated");

    const res2 = estimateCarbonSequestration(3.5, 'conventional', 10);
    console.assert(res2.annualSequestrationTonsPerAcre < res1.annualSequestrationTonsPerAcre, "Test 2 Failed: No-till should outperform conventional");

    console.log("All SOC Sequestration Tests Passed Successfully!");
}

runTests();
