import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductListScreen } from '../screens/products/ProductListScreen';
import { ProductDetailScreen } from '../screens/products/ProductDetailScreen';
import { useTheme } from '../hooks/useTheme';

const Stack = createNativeStackNavigator();

export const ProductsStack: React.FC = () => {
  const { colors, typography } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="ProductList"
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
        name="ProductList"
        component={ProductListScreen}
        options={{ title: 'Product Catalog' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Product Details' }}
      />
    </Stack.Navigator>
  );
};

export default ProductsStack;

