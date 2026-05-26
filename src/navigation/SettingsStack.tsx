import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsMenuScreen } from '../screens/settings/SettingsMenuScreen';
import { BusinessSettingsScreen } from '../screens/settings/BusinessSettingsScreen';
import { InvoiceDefaultsScreen } from '../screens/settings/InvoiceDefaultsScreen';
import { AppearanceScreen } from '../screens/settings/AppearanceScreen';
import { BackupRestoreScreen } from '../screens/settings/BackupRestoreScreen';
import { DownloadPathScreen } from '../screens/settings/DownloadPathScreen';
import { useTheme } from '../hooks/useTheme';

const Stack = createNativeStackNavigator();

export const SettingsStack: React.FC = () => {
  const { colors, typography } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="SettingsMenu"
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
        name="SettingsMenu"
        component={SettingsMenuScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="BusinessSettings"
        component={BusinessSettingsScreen}
        options={{ title: 'Business Details' }}
      />
      <Stack.Screen
        name="InvoiceDefaults"
        component={InvoiceDefaultsScreen}
        options={{ title: 'Invoice Defaults' }}
      />
      <Stack.Screen
        name="Appearance"
        component={AppearanceScreen}
        options={{ title: 'Appearance' }}
      />
      <Stack.Screen
        name="BackupRestore"
        component={BackupRestoreScreen}
        options={{ title: 'Backup & Restore' }}
      />
      <Stack.Screen
        name="DownloadPath"
        component={DownloadPathScreen}
        options={{ title: 'Download Folder' }}
      />
    </Stack.Navigator>
  );
};

export default SettingsStack;

