// Unit tests for Smart Valve Scheduler
import { calculateSmartValveSchedule } from "../utils.js";

function runTests() {
    console.log("Running Smart Valve Scheduler Tests...");

    const res1 = calculateSmartValveSchedule('Tomato', 38, 75, 15);
    console.assert(res1.action === 'SUSPEND', "Test 1 Failed: Expected SUSPEND, got " + res1.action);

    const res2 = calculateSmartValveSchedule('Tomato', 30, 5, 0);
    console.assert(res2.action === 'IRRIGATE', "Test 2 Failed: Expected IRRIGATE");
    console.assert(res2.durationMinutes > 0, "Test 2 Failed: Irrigation duration should be > 0");

    console.log("All Smart Valve Scheduler Tests Passed Successfully!");
}

runTests();
