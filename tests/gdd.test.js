// Unit tests for Growing Degree Days (GDD) & Crop Stage
import { calculateGrowingDegreeDays, estimateCropStage } from "../utils.js";

function runTests() {
    console.log("Running GDD and Crop Stage Tests...");

    const gdd1 = calculateGrowingDegreeDays(30, 20, 10);
    console.assert(gdd1 === 15, "Test 1 Failed: Expected GDD=15, got " + gdd1);

    const gdd2 = calculateGrowingDegreeDays(12, 6, 10);
    console.assert(gdd2 === 0, "Test 2 Failed: Expected GDD=0, got " + gdd2);

    const stage1 = estimateCropStage(600, 'corn');
    console.assert(stage1.currentStage === 'Tasseling / Silking', "Test 3 Failed: " + stage1.currentStage);

    console.log("All GDD Tests Passed Successfully!");
}

runTests();
