import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage'; // Assuming it might be added later or use memory
const API_URL = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ? process.env.EXPO_PUBLIC_API_URL : 'http://localhost:3000';


export default function LoginScreen({ navigation, onLogin }: any) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!identifier || !password) {
            Alert.alert('Error', 'Please enter both credentials');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                identifier,
                password,
            });

            const { accessToken, user } = response.data;

            // Store token globally or in context
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

            if (onLogin) {
                onLogin(user, accessToken);
            }
        } catch (error: any) {
            console.error('Login error:', error);
            const message = error.response?.data?.message || 'Failed to authenticate';
            Alert.alert('Login Failed', message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Image source={require('../assets/icon.png')} style={styles.logo} />
                    </View>
                    <Text style={styles.title}>DeMega POS</Text>
                    <Text style={styles.subtitle}>ENTERPRISE GRADE CONTROL</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>EMAIL OR PHONE</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 08012345678"
                            value={identifier}
                            onChangeText={setIdentifier}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, isLoading && styles.disabledButton]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>SIGN IN ENGINE</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 30,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    logoCircle: {
        width: 90,
        height: 90,
        backgroundColor: '#fff',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2D7A3E',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    logo: {
        width: 50,
        height: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
        marginTop: 20,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 2,
        marginTop: 5,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748B',
        marginLeft: 4,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    loginButton: {
        backgroundColor: '#2D7A3E',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#2D7A3E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    disabledButton: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
