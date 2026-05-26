import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Animated, BackHandler, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { Button } from '../../components/atoms/Button';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { PdfService } from '../../services/PdfService';
import { ShareService } from '../../services/ShareService';
import { Invoice } from '../../types';

type RouteParams = {
  InvoiceSuccessScreen: { invoice: Invoice };
};

type NavigationProp = StackNavigationProp<{
  HomeRoot: undefined;
  PdfViewer: { uri: string; title?: string };
}>;

export const InvoiceSuccessScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const route = useRoute<RouteProp<RouteParams, 'InvoiceSuccessScreen'>>();
  const navigation = useNavigation<NavigationProp>();
  const { showToast } = useToastStore();
  const { settings, updateSettings, loadSettings } = useSettingsStore();

  const { invoice } = route.params;

  // PDF Generation States
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Sharing & Downloading States
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Visual Animation States
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadPdfFile = async (forceRegenerate = false) => {
    setIsLoadingPdf(true);
    setPdfError(null);
    try {
      let path = '';
      if (forceRegenerate) {
        path = await PdfService.generateInvoicePdf(invoice);
      } else {
        path = await PdfService.getOrGeneratePdf(invoice.id);
      }
      setPdfPath(path);
    } catch (error) {
      console.error('PDF Generation background error:', error);
      setPdfError('Could not generate PDF. Tap to retry.');
      showToast('Failed to generate invoice PDF.', 'error');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  useEffect(() => {
    // Run entering animations sequentially
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Trigger PDF generation in background
    loadPdfFile();

    // Disable hardware back button on success screen to force tapping the CTA "Done"
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, [scaleAnim, fadeAnim]);

  const handleShareWhatsApp = async () => {
    if (isLoadingPdf || isSharing || isDownloading) return;
    
    // Safety check if PDF hasn't compiled yet
    if (!pdfPath) {
      setIsSharing(true);
      try {
        const path = await PdfService.getOrGeneratePdf(invoice.id);
        setPdfPath(path);
        await ShareService.shareToWhatsApp(path, invoice.invoiceNumber);
      } catch {
        showToast('Could not open share sheet. Try again.', 'error');
      } finally {
        setIsSharing(false);
      }
      return;
    }

    setIsSharing(true);
    try {
      await ShareService.shareToWhatsApp(pdfPath, invoice.invoiceNumber);
    } catch {
      showToast('Could not open share sheet. Try again.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (isLoadingPdf || isSharing || isDownloading) return;

    let targetPath = pdfPath;

    // Safety check if PDF is missing
    if (!targetPath) {
      setIsDownloading(true);
      try {
        targetPath = await PdfService.getOrGeneratePdf(invoice.id);
        setPdfPath(targetPath);
      } catch {
        showToast('Save failed. Try sharing instead.', 'error');
        setIsDownloading(false);
        return;
      }
    }

    setIsDownloading(true);
    try {
      // Always reload settings from DB to get the latest downloadDirectoryUri
      await loadSettings();
      const freshSettings = useSettingsStore.getState().settings;
      const savedUri = freshSettings?.downloadDirectoryUri ?? null;
      const { directoryUri } = await ShareService.downloadToDevice(targetPath, invoice.invoiceNumber, savedUri);
      // Persist granted URI so future downloads are silent
      if (directoryUri && directoryUri !== savedUri) {
        await updateSettings({ downloadDirectoryUri: directoryUri });
      }
      showToast('Saved to Downloads ✓', 'success');
    } catch (error: any) {
      if (error.message === 'DOWNLOAD_PERMISSION_DENIED') {
        showToast('Permission denied. Allow storage access to download.', 'error');
      } else if (error.message === 'INSUFFICIENT_STORAGE') {
        showToast('Not enough storage. Free up space and try again.', 'error');
      } else {
        showToast('Save failed. Try sharing instead.', 'error');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDone = () => {
    // Fully reset the entire navigation state so no wizard screens remain
    // in the stack. This prevents the "Discard Draft?" dialog from appearing.
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'HomeRoot' }],
      })
    );
  };

  const isBusy = isLoadingPdf || isSharing || isDownloading;

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={[styles.container, { padding: spacing.lg }]}>
      
      {/* 1. Animated Badge Graphic */}
      <View style={styles.badgeSection}>
        <Animated.View
          style={[
            styles.successCircle,
            {
              backgroundColor: colors.success + '15',
              borderColor: colors.success,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Ionicons name="checkmark-done-circle" size={80} color={colors.success} />
        </Animated.View>
        
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.fontSizes.xxl }]}>
            Success!
          </Text>
          <Text style={[styles.invoiceNumber, { color: colors.textSecondary, fontSize: typography.fontSizes.md }]}>
            Invoice {invoice.invoiceNumber} has been saved.
          </Text>
        </Animated.View>
      </View>

      {/* 2. Amount Summary Card */}
      <Animated.View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.lg,
            opacity: fadeAnim,
            ...colors.cardShadow,
          },
        ]}
      >
        <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
          TOTAL BILLED
        </Text>
        <Text style={[styles.summaryAmount, { color: colors.textPrimary, fontSize: typography.fontSizes.xxl }]}>
          {invoice.currencySymbol}{invoice.grandTotal.toFixed(2)}
        </Text>
        
        <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
        
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
            Billed To:
          </Text>
          <Text style={[styles.metaVal, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]} numberOfLines={1}>
            {invoice.customerSnapshot?.name || 'Walk-in Customer'}
          </Text>
        </View>

        <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
          <Text style={[styles.metaLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
            Items:
          </Text>
          <Text style={[styles.metaVal, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
            {invoice.items.length} listed item(s)
          </Text>
        </View>
      </Animated.View>

      {/* PDF Generation Background Status Indicator */}
      <Animated.View style={[styles.pdfStatusContainer, { opacity: fadeAnim }]}>
        {isLoadingPdf && (
          <View style={[styles.pdfStatusCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.pdfStatusText, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginLeft: spacing.sm }]}>
              Compiling invoice PDF receipt...
            </Text>
          </View>
        )}

        {pdfError && (
          <View style={[styles.pdfStatusCard, { backgroundColor: colors.danger + '10', borderColor: colors.danger, borderRadius: borderRadius.md }]}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={[styles.pdfStatusText, { color: colors.danger, fontSize: typography.fontSizes.xs, marginLeft: spacing.sm, flex: 1 }]}>
              {pdfError}
            </Text>
            <TouchableOpacity onPress={() => loadPdfFile(true)} style={[styles.retryBtn, { backgroundColor: colors.danger, borderRadius: borderRadius.sm }]}>
              <Text style={[styles.retryText, { fontSize: 10, color: '#FFFFFF', fontWeight: 'bold' }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* 3. Action Block CTA Cards */}
      <Animated.View style={[styles.actionsContainer, { opacity: fadeAnim }]}>
        {/* Download PDF Button */}
        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              opacity: isBusy ? 0.6 : 1,
            }
          ]}
          onPress={handleDownloadPdf}
          activeOpacity={0.7}
          disabled={isBusy}
        >
          <View style={[styles.actionIconBg, { backgroundColor: colors.accent + '15' }]}>
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="document-text" size={24} color={colors.accent} />
            )}
          </View>
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
              Download PDF Receipt
            </Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
              Save copy permanently to Downloads or chosen directory
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
        </TouchableOpacity>

        {/* WhatsApp Sharing Button */}
        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              marginTop: spacing.sm,
              opacity: isBusy ? 0.6 : 1,
            }
          ]}
          onPress={handleShareWhatsApp}
          activeOpacity={0.7}
          disabled={isBusy}
        >
          <View style={[styles.actionIconBg, { backgroundColor: colors.success + '15' }]}>
            {isSharing ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <Ionicons name="logo-whatsapp" size={24} color={colors.success} />
            )}
          </View>
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
              Share on WhatsApp
            </Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
              Send invoice PDF directly to customer contact channels
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
        </TouchableOpacity>
      </Animated.View>

      {/* 4. Complete Action done button */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Button
          title="View PDF"
          onPress={() => {
            if (pdfPath) {
              navigation.navigate('PdfViewer', { uri: pdfPath, title: `Invoice ${invoice.invoiceNumber}` });
            }
          }}
          icon="eye"
          variant="secondary"
          disabled={isBusy || !pdfPath}
        />
        <Button
          title="Back to Dashboard"
          onPress={handleDone}
          variant="primary"
          icon="home"
          disabled={isBusy}
          style={{ marginTop: spacing.md }}
        />
      </Animated.View>

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  invoiceNumber: {
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryCard: {
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  summaryAmount: {
    fontWeight: '900',
  },
  metaDivider: {
    width: '100%',
    height: 1.5,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  metaLabel: {
    fontWeight: '600',
  },
  metaVal: {
    fontWeight: '700',
    flex: 0.75,
    textAlign: 'right',
  },
  pdfStatusContainer: {
    width: '100%',
    marginBottom: 16,
  },
  pdfStatusCard: {
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfStatusText: {
    fontWeight: '500',
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  retryText: {},
  actionsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actionSubtitle: {
    lineHeight: 14,
  },
  footer: {
    width: '100%',
  },
});

export default InvoiceSuccessScreen;
