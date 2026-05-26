import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/home/HomeScreen';
import { InvoiceCustomerStep } from '../screens/invoice/InvoiceCustomerStep';
import { InvoiceProductsStep } from '../screens/invoice/InvoiceProductsStep';
import { InvoiceDetailsStep } from '../screens/invoice/InvoiceDetailsStep';
import { InvoicePreviewScreen } from '../screens/invoice/InvoicePreviewScreen';
import { InvoiceSuccessScreen } from '../screens/invoice/InvoiceSuccessScreen';
import { InvoiceDetailScreen } from '../screens/invoice/InvoiceDetailScreen';
import { PdfViewerScreen } from '../screens/invoice/PdfViewerScreen';
import { useTheme } from '../hooks/useTheme';

const Stack = createNativeStackNavigator();

export const HomeStack: React.FC = () => {
  const { colors, typography } = useTheme();  

  return (
    <Stack.Navigator
      initialRouteName="HomeRoot"
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
        name="HomeRoot"
        component={HomeScreen}
        options={{ headerShown: false }} // We want to hide stack header on home, or keep it custom
      />
      <Stack.Screen
        name="InvoiceCustomerStep"
        component={InvoiceCustomerStep}
        options={{ title: 'Invoice Wizard' }}
      />
      <Stack.Screen
        name="InvoiceProductsStep"
        component={InvoiceProductsStep}
        options={{ title: 'Invoice Wizard' }}
      />
      <Stack.Screen
        name="InvoiceDetailsStep"
        component={InvoiceDetailsStep}
        options={{ title: 'Invoice Wizard' }}
      />
      <Stack.Screen
        name="InvoicePreviewScreen"
        component={InvoicePreviewScreen}
        options={{ title: 'Invoice Preview' }}
      />
      <Stack.Screen
        name="InvoiceSuccessScreen"
        component={InvoiceSuccessScreen}
        options={{ 
          headerShown: false, 
          animation: 'fade_from_bottom' 
        }} // Success screen fades up elegantly
      />
      <Stack.Screen
        name="InvoiceDetail"
        component={InvoiceDetailScreen}
        options={{ title: 'Invoice Details' }}
      />
      <Stack.Screen
        name="PdfViewer"
        component={PdfViewerScreen}
        options={{ 
          title: 'View PDF', 
          animation: 'slide_from_bottom' 
        }} // PDF viewer slides up like an immersive sheet
      />
    </Stack.Navigator>
  );
};

export default HomeStack;

