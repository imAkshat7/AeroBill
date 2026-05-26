import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, StatusBar, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { runMigrations } from './src/db/DBClient';
import { useSettingsStore } from './src/stores/settingsStore';
import { useThemeStore } from './src/stores/themeStore';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Toast } from './src/components/atoms/Toast';
import { useTheme } from './src/hooks/useTheme';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingText, setLoadingText] = useState('Securing storage...');
  
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const loadTheme = useThemeStore((state) => state.loadTheme);
  const { colors } = useTheme();

  useEffect(() => {
    async function initializeApp() {
      try {
        setLoadingText('Initializing database...');
        await runMigrations();

        await Promise.all([
          loadSettings(),
          loadTheme(),
        ]);

        // Sync local theme state with the theme stored in database settings
        const settings = useSettingsStore.getState().settings;
        if (settings?.theme) {
          await useThemeStore.getState().setTheme(settings.theme);
        }
        
        setLoadingText('Ready!');
      } catch (error) {
        console.error('Fatal initialization error:', error);
        setLoadingText('Failed to start AeroBill. Please restart.');
      } finally {
        // Subtle delay to allow UI to transition smoothly
        setTimeout(() => {
          setIsInitializing(false);
        }, 800);
      }
    }
    initializeApp();
  }, []);

  if (isInitializing) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.content}>
          {/* AeroBill Brand Logo */}
          <Image
            source={require('./assets/aerobill.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.splashSubtitle}>Your 100% Offline Billing Partner</Text>
          
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="large" color="#1565C0" style={styles.spinner} />
            <Text style={styles.splashLoadingText}>{loadingText}</Text>
          </View>
        </View>
        <Text style={styles.footerText}>SECURED DATA · NO DATA LEAVES YOUR DEVICE</Text>
      </View>
    );
  }

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
        <Toast />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000', // Pitch black to blend seamlessly with Aerobill.png
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoImage: {
    width: 240,
    height: 240,
    marginBottom: 20,
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
  loaderWrapper: {
    marginTop: 48,
    alignItems: 'center',
    minHeight: 80,
  },
  spinner: {
    marginBottom: 12,
  },
  splashLoadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  footerText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
});
