import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeStack } from './HomeStack';
import { InvoicesStack } from './InvoicesStack';
import { CustomersStack } from './CustomersStack';
import { ProductsStack } from './ProductsStack';
import { SettingsStack } from './SettingsStack';
import { useTheme } from '../hooks/useTheme';

const Tab = createBottomTabNavigator();

export const RootNavigator: React.FC = () => {
  const { colors, typography } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: !['HomeTab', 'InvoicesTab', 'SettingsTab', 'CustomersTab', 'ProductsTab'].includes(route.name), // Hide tab headers for nested stack navigation
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: colors.border,
          elevation: 1,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontSize: typography.fontSizes.lg,
          fontWeight: typography.fontWeights.bold,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1.5,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: typography.fontWeights.medium,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.preset;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'InvoicesTab':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'CustomersTab':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'ProductsTab':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'SettingsTab':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'alert-circle-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: 'Dashboard', tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="InvoicesTab"
        component={InvoicesStack}
        options={{ tabBarLabel: 'Invoices' }}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersStack}
        options={{ tabBarLabel: 'Customers' }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ProductsStack}
        options={{ tabBarLabel: 'Products' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

export default RootNavigator;
