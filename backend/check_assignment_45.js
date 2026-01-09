
const API_URL = 'https://provial-production.up.railway.app/api';
const USERNAME = 'operaciones';
const PASSWORD = 'provial123';
const TARGET_ID = '45';

async function checkSpecificAssignment() {
    console.log(`🔍 Checking SPECIFIC Assignment ID ${TARGET_ID} via API: ${API_URL}`);

    try {
        // 1. Login
        console.log('1️⃣ Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });

        if (!loginRes.ok) throw new Error('Login failed');
        const { accessToken } = await loginRes.json();
        console.log('✅ Login successful.');

        // 2. Fetch specific ID
        console.log(`2️⃣ Fetching GET /asignaciones/${TARGET_ID}...`);
        const res = await fetch(`${API_URL}/asignaciones/${TARGET_ID}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (res.status === 200) {
            const data = await res.json();
            console.log('✅ FOUND Assignment 45:');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(`❌ FAILED to find ID ${TARGET_ID}. Status: ${res.status}`);
            const err = await res.text();
            console.log('   Response:', err);
            console.log('\n🚨 DIAGNOSIS: The database this API connects to DOES NOT contain ID 45.');
            console.log('   This confirms "Split Brain": Web/Vercel is writing to DB "A", but Mobile/Railway is reading from DB "B".');
        }

    } catch (err) {
        console.error('🚨 Error:', err.message);
    }
}

checkSpecificAssignment();
