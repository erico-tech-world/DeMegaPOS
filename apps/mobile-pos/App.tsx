import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from './src/data/database';
import POSScreen from './src/screens/POSScreen';
import CartScreen from './src/screens/CartScreen';
import LoginScreen from './src/screens/LoginScreen';

import { View, Image, Text, Platform } from 'react-native';

const Stack = createNativeStackNavigator();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("App Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'red', marginBottom: 10 }}>Something went wrong.</Text>
          <Text style={{ fontSize: 16 }}>{this.state.error?.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  console.log("App starting on platform:", Platform.OS);
  console.log("Database object available:", !!database);

  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState(null);

  const handleLogin = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  return (
    <ErrorBoundary>
      <DatabaseProvider database={database}>
        <NavigationContainer>
          <Stack.Navigator>
            {!isAuthenticated ? (
              <Stack.Screen name="Login" options={{ headerShown: false }}>
                {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen
                  name="POS"
                  component={POSScreen}
                  options={{
                    headerTitle: () => (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image
                          source={require('./assets/icon.png')}
                          style={{ width: 32, height: 32, marginRight: 10 }}
                          resizeMode="contain"
                        />
                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b' }}>DeMega</Text>
                      </View>
                    ),
                    headerRight: () => (
                      <TouchableOpacity onPress={() => setIsAuthenticated(false)}>
                        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Logout</Text>
                      </TouchableOpacity>
                    )
                  }}
                />
                <Stack.Screen name="Cart" component={CartScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </DatabaseProvider>
    </ErrorBoundary>
  );
}
