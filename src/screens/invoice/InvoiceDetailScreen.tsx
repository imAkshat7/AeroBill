import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { ConfirmDialog } from '../../components/atoms/ConfirmDialog';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { InvoiceRepository } from '../../db/repositories/InvoiceRepository';
import { PdfService } from '../../services/PdfService';
import { ShareService } from '../../services/ShareService';
import { Invoice } from '../../types';

type InvoiceHistoryStackParamList = {
  InvoiceHistory: undefined;
  InvoiceDetail: { invoiceId: number };
  PdfViewer: { uri: string; title?: string };
};

type InvoiceDetailScreenRouteProp = RouteProp<InvoiceHistoryStackParamList, 'InvoiceDetail'>;
type NavigationProp = StackNavigationProp<InvoiceHistoryStackParamList>;

/**
 * Extracts first letters from the business name to form a monogram (e.g. "Sanla Fabrication" -> "SF")
 */
const getBusinessInitials = (name: string): string => {
  if (!name || !name.trim()) return 'SF';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const InvoiceDetailScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<InvoiceDetailScreenRouteProp>();
  const { showToast } = useToastStore();
  const { settings, updateSettings, loadSettings } = useSettingsStore();

  const { invoiceId } = route.params;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionProcessing, setIsActionProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchInvoiceDetails = async () => {
    setIsLoading(true);
    try {
      const data = await InvoiceRepository.getById(invoiceId);
      if (data) {
        setInvoice(data);
      } else {
        showToast('Invoice record not found.', 'error');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      showToast('Failed to load invoice details.', 'error');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetails();
  }, [invoiceId]);

  const handleDelete = () => {
    if (!invoice) return;

    setShowDeleteConfirm(true);
  };

  const handleShareOrDownload = () => {
    if (!invoice) return;

    Alert.alert(
      'Invoice Actions',
      'Choose an action for this invoice:',
      [
        {
          text: 'Share on WhatsApp',
          onPress: async () => {
            setIsActionProcessing(true);
            try {
              const path = await PdfService.getOrGeneratePdf(invoice.id);
              await ShareService.shareToWhatsApp(path, invoice.invoiceNumber);
            } catch {
              showToast('Failed to share PDF via WhatsApp.', 'error');
            } finally {
              setIsActionProcessing(false);
            }
          },
        },
        {
          text: 'Save to Downloads (PDF)',
          onPress: async () => {
            setIsActionProcessing(true);
            try {
              const path = await PdfService.getOrGeneratePdf(invoice.id);
              
              // Always reload settings from DB to get the latest downloadDirectoryUri
              await loadSettings();
              const freshSettings = useSettingsStore.getState().settings;
              const savedUri = freshSettings?.downloadDirectoryUri ?? null;
              
              const { directoryUri } = await ShareService.downloadToDevice(path, invoice.invoiceNumber, savedUri);
              if (directoryUri && directoryUri !== savedUri) {
                await updateSettings({ downloadDirectoryUri: directoryUri });
              }
              showToast('Saved to Downloads ✓', 'success');
            } catch (err: any) {
              if (err.message === 'DOWNLOAD_PERMISSION_DENIED') {
                showToast('Download permission was denied.', 'error');
              } else if (err.message === 'INSUFFICIENT_STORAGE') {
                showToast('Insufficient storage on device.', 'error');
              } else {
                showToast('Failed to download PDF.', 'error');
              }
            } finally {
              setIsActionProcessing(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleViewPdf = async () => {
    if (!invoice) return;
    setIsActionProcessing(true);
    try {
      const path = await PdfService.getOrGeneratePdf(invoice.id);
      navigation.navigate('PdfViewer', { uri: path, title: `Invoice ${invoice.invoiceNumber}` });
    } catch {
      showToast('Failed to load PDF.', 'error');
    } finally {
      setIsActionProcessing(false);
    }
  };

  // Configure navigation header buttons dynamically
  useEffect(() => {
    if (invoice) {
      navigation.setOptions({
        headerRight: () => (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={handleViewPdf}
              style={[styles.headerBtn, { marginRight: spacing.md }]}
              disabled={isActionProcessing}
            >
              <Ionicons name="eye-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareOrDownload}
              style={[styles.headerBtn, { marginRight: spacing.md }]}
              disabled={isActionProcessing}
            >
              <Ionicons name="share-social-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.headerBtn, { marginRight: spacing.md }]}
              disabled={isActionProcessing}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [navigation, invoice, isActionProcessing, colors]);

  if (isLoading) {
    return (
      <ScreenContainer scrollable={false} contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.textSecondary, marginTop: spacing.md, fontSize: typography.fontSizes.sm }}>
          Loading invoice details...
        </Text>
      </ScreenContainer>
    );
  }

  if (!invoice) {
    return (
      <ScreenContainer scrollable={false} contentContainerStyle={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Failed to load invoice details.</Text>
      </ScreenContainer>
    );
  }

  const currency = invoice.currencySymbol || '₹';
  const businessName = invoice.businessSnapshot.name || 'Your Business';
  const selectedCustomer = invoice.customerSnapshot;
  const initials = getBusinessInitials(businessName);

  return (
    <View style={styles.outerContainer}>
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Invoice"
        message={`Are you sure you want to delete ${invoice.invoiceNumber}? This will archive the record and remove it from history.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor={colors.danger}
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          setIsActionProcessing(true);
          try {
            await InvoiceRepository.softDelete(invoice.id);
            showToast(`Invoice ${invoice.invoiceNumber} deleted successfully.`, 'success');
            navigation.goBack();
          } catch {
            showToast('Failed to delete invoice.', 'error');
          } finally {
            setIsActionProcessing(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.md }]}
      >
        {/* Paper Sheet Preview Container (Strict visual parity with preview / invoice template.jpeg) */}
        <View style={[styles.paperSheet, { backgroundColor: '#FFFFFF', borderColor: colors.border, borderRadius: borderRadius.lg }]}>
          
          {/* 1. Logo & Business Header Block spanning full horizontal banner */}
          <View style={[styles.headerBanner, { borderTopLeftRadius: borderRadius.lg - 1, borderTopRightRadius: borderRadius.lg - 1 }]}>
            <View style={styles.logoContainer}>
              {invoice.businessSnapshot.logoPath ? (
                <Image
                  source={{ uri: invoice.businessSnapshot.logoPath }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.logoMonogram}>{initials}</Text>
              )}
            </View>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName} numberOfLines={1}>
                {businessName}
              </Text>
              {invoice.businessSnapshot.address ? (
                <Text style={styles.businessMeta} numberOfLines={2}>
                  {invoice.businessSnapshot.address}
                </Text>
              ) : null}
              {invoice.businessSnapshot.phone || invoice.businessSnapshot.email ? (
                <Text style={styles.businessMeta}>
                  {invoice.businessSnapshot.phone ? `Phone: ${invoice.businessSnapshot.phone}` : ''}
                  {invoice.businessSnapshot.phone && invoice.businessSnapshot.email ? ' · ' : ''}
                  {invoice.businessSnapshot.email ? `Email: ${invoice.businessSnapshot.email}` : ''}
                </Text>
              ) : null}
              {invoice.businessSnapshot.gstin ? (
                <Text style={[styles.businessMeta, { fontWeight: '700' }]}>
                  GSTIN: {invoice.businessSnapshot.gstin}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Centered Document Title */}
          <Text style={styles.docTitle}>INVOICE</Text>

          {/* 2. Customer Snapshots & Invoice Metadata Zone */}
          <View style={styles.billingSection}>
            {/* Bill To */}
            <View style={styles.billToBlock}>
              <Text style={[styles.sectionTitleLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
                Bill To
              </Text>
              {selectedCustomer ? (
                <View>
                  <Text style={[styles.previewName, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
                    {selectedCustomer.name}
                  </Text>
                  {selectedCustomer.address ? (
                    <Text style={[styles.previewMeta, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
                      {selectedCustomer.address}
                    </Text>
                  ) : null}
                  {selectedCustomer.phone ? (
                    <Text style={[styles.previewMeta, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
                      Phone: {selectedCustomer.phone}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View>
                  <Text style={[styles.previewName, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
                    Walk-in Customer
                  </Text>
                  <Text style={[styles.previewMeta, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
                    Cash Counter Sale
                  </Text>
                </View>
              )}
            </View>

            {/* Invoice Meta details */}
            <View style={styles.metaBlock}>
              <Text style={styles.invoiceNumberLarge}>
                {invoice.invoiceNumber}
              </Text>
              <Text style={[styles.metaDateLabel, { fontSize: typography.fontSizes.xs }]}>
                Date: {dayjs(invoice.invoiceDate).format('DD-MM-YYYY')}
              </Text>
              {invoice.dueDate ? (
                <Text style={[styles.metaDueDate, { fontSize: typography.fontSizes.xs, marginTop: 4 }]}>
                  Due Date: {dayjs(invoice.dueDate).format('DD-MM-YYYY')}
                </Text>
              ) : null}
            </View>
          </View>

          {/* 3. Items Grid Table */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colIndex, styles.headerText]}>Sr no.</Text>
              <Text style={[styles.colName, styles.headerText]}>Product</Text>
              <Text style={[styles.colQty, styles.headerText, { textAlign: 'right' }]}>Qty</Text>
              <Text style={[styles.colPrice, styles.headerText, { textAlign: 'right' }]}>Rate</Text>
              <Text style={[styles.colTotal, styles.headerText, { textAlign: 'right' }]}>Amount</Text>
            </View>

            {invoice.items.map((item, index) => {
              const isEven = index % 2 === 1;
              return (
                <View
                  key={item.id || index}
                  style={[
                    styles.tableRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: isEven ? '#f8faff' : '#ffffff'
                    }
                  ]}
                >
                  <Text style={[styles.colIndex, styles.boldCell]}>{index + 1}</Text>
                  <View style={styles.colName}>
                    <Text style={styles.itemNameText} numberOfLines={2}>
                      {item.itemName}
                    </Text>
                    <Text style={[styles.itemUnitText, { color: colors.textSecondary }]}>Unit: {item.unit}</Text>
                  </View>
                  <Text style={[styles.colQty, styles.boldCell, { textAlign: 'right' }]}>
                    {item.quantity.toFixed(2)}
                  </Text>
                  <Text style={[styles.colPrice, { textAlign: 'right' }]}>
                    {item.unitPrice.toFixed(2)}
                  </Text>
                  <Text style={[styles.colTotal, styles.boldCell, { textAlign: 'right' }]}>
                    {item.lineTotal.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* 4. Notes & Summary Breakdown Split Layout */}
          <View style={styles.footerGrid}>
            {/* Notes Column */}
            <View style={styles.noteColumn}>
              {invoice.notes ? (
                <View>
                  <Text style={styles.noteBoxTitle}>Please Note</Text>
                  <Text style={[styles.noteBoxContent, { color: colors.textSecondary }]}>
                    {invoice.notes}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Summary Totals Column */}
            <View style={styles.totalsColumn}>
              <View style={[styles.totalsRow, styles.totalsBorderBottom]}>
                <Text style={styles.totalsText}>Total</Text>
                <Text style={styles.totalsText}>
                  {currency}{invoice.subtotal.toFixed(2)}
                </Text>
              </View>

              {invoice.taxRate > 0 && (
                <View style={[styles.totalsRow, styles.totalsBorderBottom, { fontWeight: 'normal' }]}>
                  <Text style={{ fontSize: 11.5, color: '#444' }}>GST ({invoice.taxRate}%)</Text>
                  <Text style={{ fontSize: 11.5, color: '#444' }}>
                    {currency}{invoice.taxAmount.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.grandTotalBanner}>
                <Text style={styles.grandTotalText}>Grand Total</Text>
                <Text style={styles.grandTotalText}>
                  {currency}{invoice.grandTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* 5. Signature Footer Block */}
          <View style={[styles.signatureContainer, { alignItems: (invoice.businessSnapshot?.templateId === '2') ? 'flex-start' : 'flex-end' }]}>
            {invoice.businessSnapshot?.signaturePath ? (
              <Image
                source={{ uri: `${invoice.businessSnapshot.signaturePath}?t=${Date.now()}` }}
                style={styles.signatureImagePreview}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signatureName}>
              {invoice.businessSnapshot?.signatoryName || businessName}
            </Text>
            <Text style={styles.signatureLabel}>Signature</Text>
          </View>

        </View>
      </ScrollView>

      {/* Full screen loading/action overlay */}
      {isActionProcessing && (
        <View style={styles.actionOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.overlayText}>Processing, please wait...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperSheet: {
    borderWidth: 1.5,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    padding: 4,
  },
  
  // Header Blue Banner Layout
  headerBanner: {
    backgroundColor: '#4a7eec',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 16,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoMonogram: {
    color: '#4a7eec',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  businessMeta: {
    fontSize: 10.5,
    color: '#e2ecff',
    marginTop: 2,
    lineHeight: 14,
  },

  docTitle: {
    textAlign: 'center',
    fontSize: 20,
    color: '#4a7eec',
    fontWeight: 'bold',
    marginVertical: 12,
    letterSpacing: 1,
  },

  billingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  billToBlock: {
    flex: 0.6,
  },
  sectionTitleLabel: {
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  previewName: {
    fontWeight: '700',
    marginBottom: 4,
  },
  previewMeta: {
    lineHeight: 15,
  },
  metaBlock: {
    flex: 0.38,
    alignItems: 'flex-end',
  },
  invoiceNumberLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a7eec',
    marginBottom: 4,
  },
  metaDateLabel: {
    color: '#4a7eec',
    fontWeight: 'bold',
  },
  metaDueDate: {
    color: '#666',
  },

  // Table Grid Styles
  tableContainer: {
    marginBottom: 20,
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4a7eec',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  colIndex: {
    width: 40,
    fontSize: 10.5,
  },
  colName: {
    flex: 2.2,
    fontSize: 10.5,
  },
  colQty: {
    width: 50,
    fontSize: 10.5,
  },
  colPrice: {
    width: 80,
    fontSize: 10.5,
  },
  colTotal: {
    width: 90,
    fontSize: 10.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111',
  },
  itemUnitText: {
    fontSize: 9,
    marginTop: 2,
  },
  boldCell: {
    fontWeight: 'bold',
    color: '#000000',
  },

  // Summary notes split block
  footerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  noteColumn: {
    flex: 0.55,
  },
  noteBoxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: '#4a7eec',
    marginBottom: 6,
    alignSelf: 'flex-start',
    minWidth: 90,
  },
  noteBoxContent: {
    fontSize: 11,
    lineHeight: 16,
  },
  totalsColumn: {
    flex: 0.4,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalsText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalsBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  grandTotalBanner: {
    backgroundColor: '#4a7eec',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 3,
    marginTop: 6,
  },
  grandTotalText: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Signature Block
  signatureContainer: {
    marginTop: 40,
    alignItems: 'flex-end',
    width: '100%',
  },
  signatureLine: {
    width: 130,
    borderBottomWidth: 1,
    borderBottomColor: '#aaaaaa',
    borderStyle: 'dashed',
    marginBottom: 6,
  },
  signatureImagePreview: {
    width: 120,
    height: 40,
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
  },
  signatureLabel: {
    fontSize: 10,
    color: '#777777',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  // Action Overlay
  actionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
  },
});

export default InvoiceDetailScreen;
