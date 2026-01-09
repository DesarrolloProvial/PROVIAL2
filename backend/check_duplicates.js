
const API_URL = 'https://provial-production.up.railway.app/api';
const USERNAME = 'operaciones';
const PASSWORD = 'provial123';
const TARGET_USERNAME = '1022';

async function checkDuplicates() {
    console.log(`Checking for Duplicate Users matching: ${TARGET_USERNAME}...`);

    try {
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });
        const { accessToken } = await loginRes.json();

        const res = await fetch(`${API_URL}/brigadas`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        const brigadas = data.brigadas || data;

        // Find ALL matches
        const matches = brigadas.filter(u => u.usuario === TARGET_USERNAME || u.chapa === TARGET_USERNAME);

        if (matches.length > 0) {
            console.log(`\nFound ${matches.length} user(s) matching '${TARGET_USERNAME}':`);
            matches.forEach(m => {
                console.log(`   - ID: ${m.id} | Name: ${m.nombre || m.nombre_completo} | Username: ${m.usuario} | Chapa: ${m.chapa}`);
            });

            if (matches.length > 1) {
                console.log('\n🚨 DUPLICATE USERS FOUND! Login might resolve to the wrong one.');
            } else {
                console.log('\n✅ Single user found (No duplicates).');
            }
        } else {
            console.log('\n❌ No users found.');
        }

    } catch (err) {
        console.error(err);
    }
}

checkDuplicates();
