import { View, Text, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import Product from '../models/Product';
import { ShoppingCart, Search } from 'lucide-react-native';
import { addToCart, getOrCreateDraftOrder } from '../services/cart';

const ProductCard = ({ product, onPress }: { product: Product, onPress: () => void }) => (
    <TouchableOpacity
        className="bg-white p-4 m-2 rounded-xl shadow-sm border border-gray-100 flex-1"
        onPress={onPress}
    >
        <Text className="text-lg font-bold text-gray-800">{product.name}</Text>
        <Text className="text-gray-500">SKU: {product.sku}</Text>
        <View className="flex-row justify-between items-center mt-4">
            <Text className="text-blue-600 font-bold text-lg">₦{product.price}</Text>
            <Text className="text-gray-400">Stock: {product.stock}</Text>
        </View>
    </TouchableOpacity>
);

const POSScreen = ({ database, products, customers, navigation }: any) => {
    const [search, setSearch] = React.useState('');
    const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);
    const [isCustomerModalOpen, setCustomerModalOpen] = React.useState(false);

    const filteredProducts = products.filter((p: any) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    const handleAddToCart = async (product: any) => {
        try {
            // Assuming addToCart is defined elsewhere and handles adding to the current draft order
            await addToCart(product);
            // Optional: Show toast
        } catch (error) {
            Alert.alert('Error', 'Failed to add to cart');
        }
    };

    const handleSelectCustomer = async (customer: any) => {
        setSelectedCustomer(customer);
        setCustomerModalOpen(false);
        // Link customer to the current draft order
        // This assumes getOrCreateDraftOrder is defined elsewhere and returns a WatermelonDB Order model
        const order = await getOrCreateDraftOrder();
        await database.write(async () => {
            await order.update(o => {
                o.customerId = customer.id;
            });
        });
        Alert.alert('Success', `Customer ${customer.name} linked. VIP prices will apply if available.`);
    };

    return (
        <View className="flex-1 bg-gray-50">
            <View className="p-4 bg-white border-b border-gray-200">
                <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-2 text-base"
                        placeholder="Search products..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                <TouchableOpacity
                    className="mt-3 p-3 bg-blue-50 rounded-xl flex-row justify-between items-center border border-blue-100"
                    onPress={() => setCustomerModalOpen(true)}
                >
                    <View className="flex-row items-center">
                        <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center mr-3">
                            <Text className="text-white font-bold text-xs">{selectedCustomer?.name[0] || '?'}</Text>
                        </View>
                        <View>
                            <Text className="text-blue-900 font-black text-xs uppercase tracking-tighter">
                                {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                            </Text>
                            {selectedCustomer && (
                                <Text className="text-blue-600 text-[10px] font-bold">
                                    Wallet Balance: ₦{selectedCustomer.walletBalance || 0}
                                </Text>
                            )}
                        </View>
                    </View>
                    <Text className="text-blue-600 text-xs font-bold">Change</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={({ item }) => (
                    <ProductCard product={item} onPress={() => handleAddToCart(item)} />
                )}
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center mt-20">
                        <Text className="text-gray-400 italic">No products found.</Text>
                    </View>
                }
            />

            {isCustomerModalOpen && (
                <View className="absolute inset-0 bg-black/50 z-50 flex-end">
                    <View className="mt-auto bg-white rounded-t-3xl p-6 h-3/4">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-black text-gray-900">Select Customer</Text>
                            <TouchableOpacity onPress={() => setCustomerModalOpen(false)}>
                                <Text className="text-blue-600 font-bold">Close</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={customers}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className="p-4 border-b border-gray-100 flex-row justify-between items-center"
                                    onPress={() => handleSelectCustomer(item)}
                                >
                                    <View>
                                        <Text className="font-bold text-gray-800">{item.name}</Text>
                                        <Text className="text-gray-400 text-xs">{item.phone || 'No phone'}</Text>
                                    </View>
                                    <Text className="text-blue-600 font-bold text-xs">select</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            )}

            <TouchableOpacity
                className="absolute bottom-8 right-8 bg-blue-600 p-4 rounded-full shadow-lg flex-row items-center"
                onPress={() => navigation.navigate('Cart')}
            >
                <ShoppingCart color="white" size={24} />
            </TouchableOpacity>
        </View>
    );
};

const enhance = withObservables([], ({ database }: any) => ({
    products: database.collections.get('products').query().observe(),
    customers: database.collections.get('customers').query().observe(),
}));

export default withDatabase(enhance(POSScreen));
