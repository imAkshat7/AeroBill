import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { useTheme } from '../../hooks/useTheme';

type ParamList = {
  PdfViewer: { uri: string; title?: string };
};

export const PdfViewerScreen: React.FC = () => {
  const { colors, spacing } = useTheme();
  const route = useRoute<RouteProp<ParamList, 'PdfViewer'>>();
  const navigation = useNavigation();

  const { uri, title } = route.params;

  const [dataUri, setDataUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAndroidExternal, setIsAndroidExternal] = useState(false);

  React.useLayoutEffect(() => {
    if (title) {
      navigation.setOptions({ title });
    }
  }, [navigation, title]);

  const openAndroidExternal = async (fileUri: string) => {
    try {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/pdf',
      });
    } catch (err) {
      console.warn('Failed to open PDF externally:', err);
      setError('No app found to open PDF.');
    }
  };

  useEffect(() => {
    const loadPdf = async () => {
      try {
        if (Platform.OS === 'android' && !uri.startsWith('http')) {
          setIsAndroidExternal(true);
          await openAndroidExternal(uri);
          return;
        }

        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          setDataUri(uri);
          return;
        }
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
        setDataUri(`data:application/pdf;base64,${base64}`);
      } catch (err) {
        console.error('PdfViewerScreen: failed to read PDF file', err);
        setError('Could not load the PDF file.');
      }
    };
    loadPdf();
  }, [uri]);

  if (error) {
    return (
      <ScreenContainer scrollable={false} contentContainerStyle={styles.center}>
        <Text style={{ color: colors.textSecondary }}>{error}</Text>
      </ScreenContainer>
    );
  }

  if (isAndroidExternal) {
    return (
      <ScreenContainer scrollable={false} contentContainerStyle={styles.center}>
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
          PDF opened in external viewer.
        </Text>
        <TouchableOpacity
          style={{ padding: spacing.md, backgroundColor: colors.accent, borderRadius: 8 }}
          onPress={() => openAndroidExternal(uri)}
        >
          <Text style={{ color: '#FFF' }}>Open PDF Again</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (!dataUri) {
    return (
      <ScreenContainer scrollable={false} contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>
          Preparing PDF...
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable={false} contentContainerStyle={styles.container}>
      <WebView
        source={{ uri: dataUri }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>
              Loading PDF...
            </Text>
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
          setError('Failed to render PDF.');
        }}
        originWhitelist={['*']}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});

export default PdfViewerScreen;
