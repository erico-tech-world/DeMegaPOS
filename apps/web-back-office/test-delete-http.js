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

        // 1. Fetch a customer and try deleting them via API
        console.log("\nFetching customers...");
        const customersRes = await axios.get('http://localhost:3000/customers', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const customers = customersRes.data;
        if (customers.length > 0) {
            const customer = customers[0];
            console.log(`Trying to delete customer via API: ${customer.name} (ID: ${customer.id})`);
            try {
                const deleteRes = await axios.delete(`http://localhost:3000/customers/${customer.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log("Customer deleted successfully via API. Status:", deleteRes.status);
            } catch (err) {
                console.error("Customer deletion failed via API:");
                if (err.response) {
                    console.error("Status:", err.response.status);
                    console.error("Data:", JSON.stringify(err.response.data, null, 2));
                } else {
                    console.error(err.message);
                }
            }
        } else {
            console.log("No customers to delete.");
        }

        // 2. Fetch a product and try deleting it via API
        console.log("\nFetching products...");
        const productsRes = await axios.get('http://localhost:3000/inventory/products', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const products = productsRes.data;
        if (products.length > 0) {
            const product = products[0];
            console.log(`Trying to delete product via API: ${product.name} (ID: ${product.id})`);
            try {
                const deleteRes = await axios.delete(`http://localhost:3000/inventory/products/${product.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log("Product deleted successfully via API. Status:", deleteRes.status);
            } catch (err) {
                console.error("Product deletion failed via API:");
                if (err.response) {
                    console.error("Status:", err.response.status);
                    console.error("Data:", JSON.stringify(err.response.data, null, 2));
                } else {
                    console.error(err.message);
                }
            }
        } else {
            console.log("No products to delete.");
        }

        // 3. Fetch staff and try deleting via API
        console.log("\nFetching staff...");
        const staffRes = await axios.get('http://localhost:3000/staff', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const staff = staffRes.data;
        // Find a cashier or non-admin staff
        const cashier = staff.find(s => s.role === 'CASHIER');
        if (cashier) {
            console.log(`Trying to delete staff via API: ${cashier.name} (ID: ${cashier.id})`);
            try {
                const deleteRes = await axios.delete(`http://localhost:3000/staff/${cashier.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log("Staff deleted successfully via API. Status:", deleteRes.status);
            } catch (err) {
                console.error("Staff deletion failed via API:");
                if (err.response) {
                    console.error("Status:", err.response.status);
                    console.error("Data:", JSON.stringify(err.response.data, null, 2));
                } else {
                    console.error(err.message);
                }
            }
        } else {
            console.log("No cashier staff found to delete.");
        }

    } catch (err) {
        console.error("Test execution failed:", err.message);
    }
}

test();
