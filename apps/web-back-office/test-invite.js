import axios from 'axios';

async function test() {
    try {
        console.log("Logging in...");
        const loginRes = await axios.post('http://localhost:3000/auth/login', {
            identifier: 'admin@demega.com',
            password: 'password123'
        });
        const token = loginRes.data.accessToken;
        console.log("Logged in successfully.");

        console.log("\nTesting Staff Invitation with email...");
        const payloadEmail = {
            email: 'cashier1@demega.com',
            role: 'CASHIER',
            branchId: null
        };

        try {
            const inviteRes = await axios.post('http://localhost:3000/staff/invite', payloadEmail, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Invitation (Email) Succeeded! Status:", inviteRes.status, inviteRes.data);
        } catch (err) {
            console.error("Invitation (Email) Failed:");
            if (err.response) {
                console.error("Status:", err.response.status);
                console.error("Data:", JSON.stringify(err.response.data, null, 2));
            } else {
                console.error(err.message);
            }
        }

        console.log("\nTesting Staff Invitation with phone...");
        const payloadPhone = {
            phone: '08012345678',
            role: 'CASHIER',
            branchId: null
        };

        try {
            const inviteRes = await axios.post('http://localhost:3000/staff/invite', payloadPhone, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Invitation (Phone) Succeeded! Status:", inviteRes.status, inviteRes.data);
        } catch (err) {
            console.error("Invitation (Phone) Failed:");
            if (err.response) {
                console.error("Status:", err.response.status);
                console.error("Data:", JSON.stringify(err.response.data, null, 2));
            } else {
                console.error(err.message);
            }
        }

    } catch (err) {
        console.error("Test execution failed:", err.message);
    }
}

test();
