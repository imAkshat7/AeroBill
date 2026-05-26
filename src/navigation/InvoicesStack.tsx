import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InvoiceHistoryScreen } from '../screens/invoice/InvoiceHistoryScreen';
import { InvoiceDetailScreen } from '../screens/invoice/InvoiceDetailScreen';
import { PdfViewerScreen } from '../screens/invoice/PdfViewerScreen';
import { useTheme } from '../hooks/useTheme';

const Stack = createNativeStackNavigator();

export const InvoicesStack: React.FC = () => {
  const { colors, typography } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="InvoiceHistory"
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
        name="InvoiceHistory"
        component={InvoiceHistoryScreen}
        options={{ title: 'Invoices' }}
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
        }} // PDF viewer slides up natively like an overlay sheet
      />
    </Stack.Navigator>
  );
};

export default InvoicesStack;

