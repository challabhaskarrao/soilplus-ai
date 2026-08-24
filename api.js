// Async API fetch service
export async function fetchSoilData(sensorId) {
    try {
        const res = await fetch(`/api/sensors/${sensorId}`);
        return await res.json();
    } catch (err) {
        console.error('Failed to fetch sensor data:', err);
        return null;
    }
}
