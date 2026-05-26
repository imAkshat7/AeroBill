import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerListScreen } from '../screens/customers/CustomerListScreen';
import { CustomerDetailScreen } from '../screens/customers/CustomerDetailScreen';
import { useTheme } from '../hooks/useTheme';

const Stack = createNativeStackNavigator();

export const CustomersStack: React.FC = () => {
  const { colors, typography } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="CustomerList"
      screenOptions={{
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerShadowVisible: true,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontSize: typography.fontSizes.lg,
          fontWeight: typography.fontWeights.bold,
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="CustomerList"
        component={CustomerListScreen}
        options={{ title: 'Customer Directory' }}
      />
      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={{ title: 'Customer Details' }}
      />
    </Stack.Navigator>
  );
};

export default CustomersStack;

