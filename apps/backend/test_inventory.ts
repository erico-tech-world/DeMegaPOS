import axios from 'axios';
import { sign } from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

async function test() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is required to generate test token.');
    }
    const tenantId = process.env.TEST_TENANT_ID || 'test-tenant-id';
    const token = sign({ id: 'dummy', tenantId, role: 'SUPER_ADMIN' }, jwtSecret, { expiresIn: '1d' });
    try {
        const res = await axios.post('http://localhost:3000/inventory/products', {
            name: 'Test Product 3',
            price: 150,
            stock: 5,
            type: 'STANDARD',
            unit: 'pcs'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success:', res.data);
    } catch (err: any) {
        console.error('Error:', err.response?.status, err.response?.data);
    }
}

test();
