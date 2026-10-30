import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import { checkout } from '../services/cart';
import { Trash2, CreditCard } from 'lucide-react-native';

const CartItem = ({ item }: { item: OrderItem }) => (
    <View className="flex-row justify-between items-center p-4 bg-white border-b border-gray-100">
        <View className="flex-1">
            <Text className="text-base font-bold text-gray-800">Product #{item.productId}</Text>
            <Text className="text-gray-500">Qty: {item.quantity} x ₦{item.price}</Text>
        </View>
        <Text className="text-lg font-bold text-gray-900">₦{item.quantity * item.price}</Text>
    </View>
);

const CartScreen = ({ order, items, navigation }: any) => {
    const [paymentMethod, setPaymentMethod] = React.useState<'CASH' | 'CARD' | 'TRANSFER' | 'WALLET' | 'SPLIT' | 'CREDIT'>('CASH');
    const [amountCash, setAmountCash] = React.useState('0');
    const [amountTransfer, setAmountTransfer] = React.useState('0');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);

    const paymentMethods = [
        { id: 'CASH', label: 'Cash', icon: 'banknote' },
        { id: 'CARD', label: 'Card', icon: 'credit-card' },
        { id: 'TRANSFER', label: 'Transfer', icon: 'landmark' },
        { id: 'SPLIT', label: 'Split', icon: 'split' },
    ];

    const handleCheckout = async () => {
        setIsSubmitting(true);
        try {
            if (paymentMethod === 'CARD' || paymentMethod === 'TRANSFER') {
                Alert.alert(
                    'Verify Payment',
                    `Confirm you have received the ${paymentMethod} payment on the external terminal/app.`,
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => setIsSubmitting(false) },
                        {
                            text: 'Verified',
                            onPress: async () => {
                                try {
                                    await checkout({
                                        paymentMethod,
                                        amountCash: Number(amountCash),
                                        amountTransfer: Number(amountTransfer),
                                        customerId: order.customerId
                                    });
                                    Alert.alert('Success', 'Order completed successfully!', [
                                        { text: 'OK', onPress: () => navigation.navigate('POS') }
                                    ]);
                                } catch (err) {
                                    Alert.alert('Error', 'Failed to complete order');
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }
                        }
                    ]
                );
                return;
            }

            await checkout({
                paymentMethod,
                amountCash: Number(amountCash),
                amountTransfer: Number(amountTransfer),
                customerId: order.customerId // Inherited from order
            });
            Alert.alert('Success', 'Order completed successfully!', [
                { text: 'OK', onPress: () => navigation.navigate('POS') }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to complete order');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <CartItem item={item} />}
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center mt-20">
                        <Text className="text-gray-400">Cart is empty</Text>
                    </View>
                }
            />

            <View className="bg-white p-6 shadow-2xl rounded-t-3xl border-t border-gray-100">
                <View className="mb-4">
                    <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Payment Method</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {['CASH', 'CARD', 'TRANSFER', 'SPLIT', 'CREDIT'].map((method) => (
                            <TouchableOpacity
                                key={method}
                                onPress={() => setPaymentMethod(method as any)}
                                className={`px-4 py-2 rounded-lg border ${paymentMethod === method ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <Text className={`text-xs font-bold ${paymentMethod === method ? 'text-white' : 'text-gray-600'}`}>
                                    {method}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {paymentMethod === 'SPLIT' && (
                    <View className="flex-row gap-4 mb-4">
                        <View className="flex-1">
                            <Text className="text-[10px] font-bold text-gray-400 mb-1">CASH PORTION</Text>
                            <TextInput
                                keyboardType="numeric"
                                className="bg-gray-50 p-2 rounded border border-gray-200 font-bold"
                                value={amountCash}
                                onChangeText={setAmountCash}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[10px] font-bold text-gray-400 mb-1">TRANSFER PORTION</Text>
                            <TextInput
                                keyboardType="numeric"
                                className="bg-gray-50 p-2 rounded border border-gray-200 font-bold"
                                value={amountTransfer}
                                onChangeText={setAmountTransfer}
                            />
                        </View>
                    </View>
                )}

                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-gray-500 text-lg">Total Amount</Text>
                    <Text className="text-3xl font-bold text-blue-600">₦{order?.totalAmount || 0}</Text>
                </View>

                <TouchableOpacity
                    className={`py-4 rounded-2xl flex-row justify-center items-center ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600'}`}
                    onPress={handleCheckout}
                    disabled={!items || items.length === 0 || isSubmitting}
                >
                    <CreditCard color="white" size={20} className="mr-2" />
                    <Text className="text-white text-lg font-bold ml-2">
                        {isSubmitting ? 'Processing...' : 'Complete Payment'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const enhance = withObservables([], ({ database }: any) => ({
    order: database.collections.get('orders').query(Q.where('is_draft', true)).observe().pipe(
        // map(orders => orders[0]) would be needed but for simplicity we use the first match in component
    ),
    items: database.collections.get('order_items').query(
        Q.on('orders', Q.where('is_draft', true))
    ).observe(),
}));

// We need a middle layer to handle the observable array to single object mapping
const CartContainer = (props: any) => {
    const order = props.order && props.order.length > 0 ? props.order[0] : null;
    return <CartScreen {...props} order={order} />;
};

export default withDatabase(enhance(CartContainer));
