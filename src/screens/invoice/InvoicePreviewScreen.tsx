import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import dayjs from 'dayjs';

import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { Button } from '../../components/atoms/Button';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../stores/settingsStore';
import { useInvoiceDraftStore } from '../../stores/invoiceDraftStore';
import { useToastStore } from '../../stores/toastStore';
import { InvoiceRepository } from '../../db/repositories/InvoiceRepository';
import { Invoice } from '../../types';

type WizardStackParamList = {
  InvoiceDetailsStep: undefined;
  InvoiceSuccessScreen: { invoice: Invoice };
};

type NavigationProp = StackNavigationProp<WizardStackParamList>;

/**
 * Extracts first letters from the business name to form a monogram (e.g. "Sanla Fabrication" -> "SF")
 */
const getBusinessInitials = (name: string): string => {
  if (!name || !name.trim()) return 'SF';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const InvoicePreviewScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const { settings, loadSettings } = useSettingsStore();
  const { draft, resetDraft } = useInvoiceDraftStore();
  const { showToast } = useToastStore();

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Ensure the latest settings are loaded for the preview
    loadSettings();
  }, [loadSettings]);

  const handleConfirmAndSave = async () => {
    if (!draft) {
      showToast('No active invoice draft found.', 'error');
      return;
    }

    if (draft.items.length === 0) {
      showToast('Cannot save an invoice with 0 items.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Transactionally write invoice + items and update sequences inside DB
      const savedInvoice = await InvoiceRepository.create(draft);
      showToast(`Invoice ${savedInvoice.invoiceNumber} saved!`, 'success');
      
      // 2. Clear draft in state store (safe to reset because savedInvoice has final state)
      await resetDraft();

      // 3. Move to Step 5 Success Screen
      navigation.navigate('InvoiceSuccessScreen', { invoice: savedInvoice });
    } catch (error: any) {
      console.error('Failed to save invoice transaction:', error);
      showToast(error.message || 'Failed to save invoice. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigation.navigate('InvoiceDetailsStep');
  };

  if (!draft) {
    return (
      <ScreenContainer scrollable={false} contentContainerStyle={styles.center}>
        <Text style={{ color: colors.textSecondary }}>No draft invoice available.</Text>
      </ScreenContainer>
    );
  }

  const currency = draft.currencySymbol;
  const businessName = settings?.name || 'AeroBill';
  const selectedCustomer = draft.customerSnapshot;
  const initials = getBusinessInitials(businessName);

  const templateId = draft.businessSnapshot?.templateId || '1';

  let primaryColor = '#4a7eec';
  if (templateId === '2') {
    primaryColor = '#3b82f6';
  } else if (templateId === '3') {
    primaryColor = '#2563eb';
  } else if (templateId === '4') {
    primaryColor = '#000000';
  }

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.md }]}
      >
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.fontSizes.lg }]}>
          Review & Save
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.fontSizes.sm }]}>
          Verify billing details, customer snapshot values, GST taxes, and totals before locking record.
        </Text>

        {/* Template Selector */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold, marginBottom: 8 }}>
            Invoice Template
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {[
              { id: '1', name: 'Classic Blue' },
              { id: '2', name: 'Corporate' },
              { id: '3', name: 'Bold Header' },
              { id: '4', name: 'Minimalist' }
            ].map(tmpl => {
              const isSelected = (draft.businessSnapshot?.templateId || '1') === tmpl.id;
              return (
                <TouchableOpacity
                  key={tmpl.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    backgroundColor: isSelected ? colors.accentLight : colors.surface,
                    borderColor: isSelected ? colors.accent : colors.border
                  }}
                  onPress={() => {
                    useInvoiceDraftStore.getState().updateDraft({
                      businessSnapshot: { ...draft.businessSnapshot, templateId: tmpl.id } as any
                    });
                  }}
                >
                  <Text style={{ color: isSelected ? colors.accent : colors.textSecondary, fontWeight: 'bold', fontSize: 12 }}>
                    {tmpl.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Paper Sheet Preview Container (Replicates the chosen template style) */}
        <View style={[styles.paperSheet, { backgroundColor: '#FFFFFF', borderColor: colors.border, borderRadius: borderRadius.lg }]}>
          
          {/* 1. Header Layout block depending on templateId */}
          {templateId === '1' && (
            <View style={[styles.headerBanner, { borderTopLeftRadius: borderRadius.lg - 1, borderTopRightRadius: borderRadius.lg - 1, backgroundColor: primaryColor }]}>
              <View style={styles.logoContainer}>
                {settings?.logoPath ? (
                  <Image source={{ uri: `${settings.logoPath}?t=${Date.now()}` }} style={styles.logoImage} resizeMode="contain" />
                ) : (
                  <Text style={[styles.logoMonogram, { color: primaryColor }]}>{initials}</Text>
                )}
              </View>
              <View style={styles.businessInfo}>
                <Text style={styles.businessName} numberOfLines={1}>{businessName}</Text>
                {settings?.address ? <Text style={styles.businessMeta} numberOfLines={2}>{settings.address}</Text> : null}
                {settings?.phone || settings?.email ? (
                  <Text style={styles.businessMeta}>
                    {settings.phone ? `Phone: ${settings.phone}` : ''}
                    {settings.phone && settings.email ? ' · ' : ''}
                    {settings.email ? `Email: ${settings.email}` : ''}
                  </Text>
                ) : null}
                {settings?.gstin ? <Text style={[styles.businessMeta, { fontWeight: '700' }]}>GSTIN: {settings.gstin}</Text> : null}
              </View>
            </View>
          )}

          {templateId === '2' && (
            <View style={{ borderBottomWidth: 2, borderBottomColor: primaryColor, paddingBottom: 16, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: '300', letterSpacing: 2, color: '#111' }}>INVOICE</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: primaryColor, marginTop: 4 }}>{draft.invoiceNumber}</Text>
                  <Text style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Date: {dayjs(draft.invoiceDate).format('DD-MM-YYYY')}</Text>
                  {draft.dueDate && <Text style={{ fontSize: 11, color: '#555' }}>Due: {dayjs(draft.dueDate).format('DD-MM-YYYY')}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', flex: 1.2 }}>
                  <View style={[styles.logoContainer, { marginRight: 0, marginBottom: 8, borderWidth: 1, borderColor: '#eee' }]}>
                    {settings?.logoPath ? (
                      <Image source={{ uri: `${settings.logoPath}?t=${Date.now()}` }} style={styles.logoImage} resizeMode="contain" />
                    ) : (
                      <Text style={[styles.logoMonogram, { color: primaryColor }]}>{initials}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111' }}>{businessName}</Text>
                  {settings?.address ? <Text style={{ fontSize: 10, color: '#666', textAlign: 'right', marginTop: 2 }} numberOfLines={2}>{settings.address}</Text> : null}
                  {settings?.phone || settings?.email ? (
                    <Text style={{ fontSize: 10, color: '#666', textAlign: 'right', marginTop: 2 }}>
                      {settings.phone ? `${settings.phone}` : ''}
                      {settings.phone && settings.email ? '  |  ' : ''}
                      {settings.email ? `${settings.email}` : ''}
                    </Text>
                  ) : null}
                  {settings?.gstin ? <Text style={{ fontSize: 10, color: '#111', fontWeight: 'bold', marginTop: 2 }}>Tax ID: {settings.gstin}</Text> : null}
                </View>
              </View>
            </View>
          )}

          {templateId === '3' && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <View style={[styles.logoContainer, { marginBottom: 8 }]}>
                    {settings?.logoPath ? (
                      <Image source={{ uri: `${settings.logoPath}?t=${Date.now()}` }} style={styles.logoImage} resizeMode="contain" />
                    ) : (
                      <Text style={[styles.logoMonogram, { color: primaryColor }]}>{initials}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#111' }}>{businessName}</Text>
                  {settings?.address ? <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }} numberOfLines={2}>{settings.address}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', flex: 1.2 }}>
                  {settings?.phone || settings?.email ? (
                    <Text style={{ fontSize: 10, color: '#666', textAlign: 'right' }}>
                      {settings.phone ? `Phone: ${settings.phone}` : ''}
                      {settings.phone && settings.email ? '  |  ' : ''}
                      {settings.email ? `${settings.email}` : ''}
                    </Text>
                  ) : null}
                  {settings?.gstin ? <Text style={{ fontSize: 10, color: '#111', fontWeight: 'bold', marginTop: 4 }}>GSTIN: {settings.gstin}</Text> : null}
                </View>
              </View>
              <View style={{ backgroundColor: primaryColor, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: -16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', letterSpacing: 1 }}>INVOICE</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#fff' }}>{draft.invoiceNumber}</Text>
                  <Text style={{ fontSize: 10, color: '#e2ecff' }}>Date: {dayjs(draft.invoiceDate).format('DD-MM-YYYY')}</Text>
                </View>
              </View>
            </View>
          )}

          {templateId === '4' && (
            <View style={{ marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 20 }}>
              <Text style={{ fontSize: 22, letterSpacing: 4, textAlign: 'center', fontWeight: '300', marginBottom: 25, color: '#000' }}>INVOICE</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1.2 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', color: '#000', marginBottom: 4 }}>{businessName}</Text>
                  {settings?.address ? <Text style={{ fontSize: 10, color: '#444', lineHeight: 14 }} numberOfLines={3}>{settings.address}</Text> : null}
                  {settings?.phone || settings?.email ? (
                    <Text style={{ fontSize: 10, color: '#444', marginTop: 4, lineHeight: 14 }}>
                      {settings.phone ? `Phone: ${settings.phone}` : ''}
                      {settings.phone && settings.email ? '  |  ' : ''}
                      {settings.email ? `${settings.email}` : ''}
                    </Text>
                  ) : null}
                  {settings?.gstin ? <Text style={{ fontSize: 10, color: '#000', fontWeight: 'bold', marginTop: 4 }}>Tax ID: {settings.gstin}</Text> : null}
                </View>
                <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Invoice No</Text>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#000', marginBottom: 8 }}>{draft.invoiceNumber}</Text>
                  <Text style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Date</Text>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#000', marginBottom: 8 }}>{dayjs(draft.invoiceDate).format('DD-MM-YYYY')}</Text>
                  {draft.dueDate && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Due Date</Text>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#000' }}>{dayjs(draft.dueDate).format('DD-MM-YYYY')}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* 2. Customer Snapshots & Invoice Metadata Zone */}
          {templateId === '1' ? (
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
                  {draft.invoiceNumber}
                </Text>
                <Text style={[styles.metaDateLabel, { fontSize: typography.fontSizes.xs }]}>
                  Date: {dayjs(draft.invoiceDate).format('DD-MM-YYYY')}
                </Text>
                {draft.dueDate ? (
                  <Text style={[styles.metaDueDate, { fontSize: typography.fontSizes.xs, marginTop: 4 }]}>
                    Due Date: {dayjs(draft.dueDate).format('DD-MM-YYYY')}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: primaryColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Bill To</Text>
              {selectedCustomer ? (
                <View>
                  <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: '#111' }}>{selectedCustomer.name}</Text>
                  {selectedCustomer.address ? <Text style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{selectedCustomer.address}</Text> : null}
                  {selectedCustomer.phone ? <Text style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Phone: {selectedCustomer.phone}</Text> : null}
                </View>
              ) : (
                <View>
                  <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: '#111' }}>Walk-in Customer</Text>
                  <Text style={{ fontSize: 10, color: '#777', marginTop: 2 }}>Cash Counter Sale</Text>
                </View>
              )}
            </View>
          )}

          {/* 3. Items Grid Table */}
          <View style={styles.tableContainer}>
            <View style={[
              styles.tableHeader, 
              { 
                backgroundColor: templateId === '3' ? '#f1f5f9' : (templateId === '4' ? '#ffffff' : primaryColor),
                borderTopWidth: templateId === '4' ? 1 : 0,
                borderBottomWidth: templateId === '4' ? 1 : 0,
                borderColor: '#000000',
                paddingVertical: templateId === '4' ? 12 : 8
              }
            ]}>
              <Text style={[styles.colIndex, styles.headerText, { color: (templateId === '3' || templateId === '4') ? '#333333' : '#ffffff' }]}>Sr no.</Text>
              <Text style={[styles.colName, styles.headerText, { color: (templateId === '3' || templateId === '4') ? '#333333' : '#ffffff' }]}>Product</Text>
              <Text style={[styles.colQty, styles.headerText, { textAlign: 'right', color: (templateId === '3' || templateId === '4') ? '#333333' : '#ffffff' }]}>Qty</Text>
              <Text style={[styles.colPrice, styles.headerText, { textAlign: 'right', color: (templateId === '3' || templateId === '4') ? '#333333' : '#ffffff' }]}>Rate</Text>
              <Text style={[styles.colTotal, styles.headerText, { textAlign: 'right', color: (templateId === '3' || templateId === '4') ? '#333333' : '#ffffff' }]}>Amount</Text>
            </View>

            {draft.items.map((item, index) => {
              const isEven = index % 2 === 1;
              return (
                <View
                  key={index}
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
              {draft.notes ? (
                <View>
                  <Text style={[styles.noteBoxTitle, { borderBottomColor: primaryColor }]}>Please Note</Text>
                  <Text style={[styles.noteBoxContent, { color: colors.textSecondary }]}>
                    {draft.notes}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Summary Totals Column */}
            <View style={styles.totalsColumn}>
              <View style={[styles.totalsRow, styles.totalsBorderBottom]}>
                <Text style={styles.totalsText}>Total</Text>
                <Text style={styles.totalsText}>
                  {currency}{draft.subtotal.toFixed(2)}
                </Text>
              </View>

              {draft.taxRate > 0 && (
                <View style={[styles.totalsRow, styles.totalsBorderBottom, { fontWeight: 'normal' }]}>
                  <Text style={{ fontSize: 11.5, color: '#444' }}>GST ({draft.taxRate}%)</Text>
                  <Text style={{ fontSize: 11.5, color: '#444' }}>
                    {currency}{draft.taxAmount.toFixed(2)}
                  </Text>
                </View>
              )}

              {templateId === '1' ? (
                <View style={[styles.grandTotalBanner, { backgroundColor: primaryColor }]}>
                  <Text style={styles.grandTotalText}>Grand Total</Text>
                  <Text style={styles.grandTotalText}>
                    {currency}{draft.grandTotal.toFixed(2)}
                  </Text>
                </View>
              ) : (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderTopWidth: templateId === '2' ? 2 : 1,
                  borderBottomWidth: templateId === '2' ? 0 : 1,
                  borderColor: templateId === '2' ? primaryColor : '#000000',
                  marginTop: 6,
                }}>
                  <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: '#111' }}>{templateId === '4' ? 'Total Due' : 'Total'}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: '#111' }}>
                    {currency}{draft.grandTotal.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 5. Signature Footer Block */}
          <View style={[styles.signatureContainer, { alignItems: templateId === '2' ? 'flex-start' : 'flex-end' }]}>
            <View style={{ alignItems: 'center', width: 150 }}>
              {settings?.signaturePath ? (
                <Image
                  source={{ uri: `${settings.signaturePath}?t=${Date.now()}` }}
                  style={styles.signatureImagePreview}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.signatureLine} />
              )}
              <Text style={[styles.signatureName, { textAlign: 'center' }]}>
                {settings?.signatoryName || businessName}
              </Text>
              <Text style={[styles.signatureLabel, { textAlign: 'center' }]}>Authorized Signatory</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Persistent Confirmation Buttons Dock */}
      <View style={[styles.bottomDock, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.navRow}>
          <Button
            title="Edit Details"
            onPress={handleBack}
            variant="secondary"
            style={styles.navBtn}
            disabled={isSaving}
          />
          <Button
            title="Confirm & Save"
            onPress={handleConfirmAndSave}
            variant="primary"
            loading={isSaving}
            style={[styles.navBtn, { marginLeft: spacing.sm }]}
            icon="checkmark-done"
          />
        </View>
      </View>
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
    paddingBottom: 110, // Safe space for bottom docked buttons
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 20,
    marginBottom: 20,
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
    width: 150,
    height: 50,
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  signatureLabel: {
    fontSize: 9.5,
    color: '#64748b',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    padding: 16,
    elevation: 8,
  },
  navRow: {
    flexDirection: 'row',
  },
  navBtn: {
    flex: 1,
  },
});

export default InvoicePreviewScreen;
