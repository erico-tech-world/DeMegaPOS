import axios from 'axios';
import { sign } from 'jsonwebtoken';

async function test() {
    const token = sign({ id: 'dummy', tenantId: 'cmm43bthb0000jo1s57rbz7he', role: 'SUPER_ADMIN' }, 'SUPER_SECRET_JWT_KEY', { expiresIn: '1d' });
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
