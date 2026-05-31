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

        console.log("Fetching products...");
        const productsRes = await axios.get('http://localhost:3000/inventory/products', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const products = productsRes.data;
        console.log(`Fetched ${products.length} products.`);

        for (const product of products) {
            console.log(`\nTesting update on product: ${product.id} (${product.name})`);
            const payload = {
                name: product.name,
                sku: product.sku || undefined,
                type: product.type || 'STANDARD',
                stock: Number(product.stock),
                price: Number(product.price),
                costPrice: product.costPrice ? Number(product.costPrice) : 0,
                vipPrice: product.vipPrice ? Number(product.vipPrice) : 0,
                expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString() : null,
                categoryId: product.categoryId || undefined,
                unit: product.unit || 'pcs'
            };

            try {
                const updateRes = await axios.put(`http://localhost:3000/inventory/products/${product.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log(`Success! Updated product ${product.id}`);
            } catch (err) {
                console.error(`Failed to update product ${product.id}:`);
                if (err.response) {
                    console.error("Status:", err.response.status);
                    console.error("Data:", JSON.stringify(err.response.data, null, 2));
                } else {
                    console.error(err.message);
                }
            }
        }
    } catch (err) {
        console.error("Test execution failed:", err.message);
    }
}

test();
