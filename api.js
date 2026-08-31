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

export async function fetchFrostRisk() {
    try {
        const res = await fetch('/api/diagnostics/frost-risk');
        return await res.json();
    } catch (err) {
        console.error('Failed to fetch frost risk diagnostics:', err);
        return null;
    }
}

export async function fetchOrganicMatter() {
    try {
        const res = await fetch('/api/diagnostics/organic-matter');
        return await res.json();
    } catch (err) {
        console.error('Failed to fetch organic matter diagnostics:', err);
        return null;
    }
}

export async function fetchSalinityData() {
    try {
        const res = await fetch('/api/diagnostics/salinity');
        return await res.json();
    } catch (err) {
        console.error('Failed to fetch soil salinity diagnostics:', err);
        return null;
    }
}

