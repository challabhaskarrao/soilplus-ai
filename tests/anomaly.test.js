// Unit tests for sensor anomaly detection
import { detectSensorAnomalies } from "../utils.js";

function runTests() {
    console.log("Running Sensor Anomaly Tests...");

    const res1 = detectSensorAnomalies([42, 43, 44, 43]);
    console.assert(res1.isAnomaly === false, "Test 1 Failed: Normal sequence flagged as anomaly");

    const res2 = detectSensorAnomalies([45, 46, 12], 20);
    console.assert(res2.isAnomaly === true, "Test 2 Failed: Expected anomaly for sudden drop");
    console.assert(res2.reason === 'SUDDEN_SPIKE_OR_DROP', "Test 2 Failed: Wrong reason");

    const res3 = detectSensorAnomalies([50, 125]);
    console.assert(res3.isAnomaly === true, "Test 3 Failed: Out of bounds value missed");

    console.log("All Sensor Anomaly Tests Passed Successfully!");
}

runTests();
