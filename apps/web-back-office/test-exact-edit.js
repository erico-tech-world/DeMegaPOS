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
        if (products.length === 0) {
            console.log("No products found.");
            return;
        }

        const product = products[0];
        console.log(`\nTesting exact frontend payload update on product: ${product.name} (ID: ${product.id})`);

        // Exact replica of frontend formData state mapping
        const formData = {
            name: product.name,
            sku: product.sku || '',
            imageUrl: product.imageUrl || '',
            type: product.type || 'STANDARD',
            stock: product.stock || 0,
            price: Number(product.price) || 0,
            costPrice: Number(product.costPrice) || 0,
            vipPrice: Number(product.vipPrice) || 0,
            expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
            unit: product.unit || 'pcs',
            categoryId: product.categoryId || '',
            variantsInput: ''
        };

        // Exact replica of frontend payload construction in EditItemModal
        const payload = {
            ...formData,
            stock: Number(formData.stock),
            price: Number(formData.price),
            costPrice: Number(formData.costPrice),
            vipPrice: Number(formData.vipPrice),
            imageUrl: formData.imageUrl || null,
            expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
            categoryId: null,
        };
        delete payload.variantsInput;

        console.log("Payload being sent:", JSON.stringify(payload, null, 2));

        try {
            const updateRes = await axios.put(`http://localhost:3000/inventory/products/${product.id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Update Succeeded! Status:", updateRes.status);
            console.log("Response data:", JSON.stringify(updateRes.data, null, 2));
        } catch (err) {
            console.error("Update Failed:", err);
        }

    } catch (err) {
        console.error("Test execution failed:", err);
    }
}

test();
