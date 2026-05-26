import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';

import { Button } from '../../components/atoms/Button';
import { TextInput } from '../../components/atoms/TextInput';
import { ConfirmDialog } from '../../components/atoms/ConfirmDialog';
import { useTheme } from '../../hooks/useTheme';
import { useInvoiceDraftStore } from '../../stores/invoiceDraftStore';
import { InvoiceRepository } from '../../db/repositories/InvoiceRepository';

type WizardStackParamList = {
  InvoiceProductsStep: undefined;
  InvoicePreviewScreen: undefined;
};

type NavigationProp = StackNavigationProp<WizardStackParamList>;

export const InvoiceDetailsStep: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const { draft, setInvoiceDetails, updateTaxRate, resetDraft } = useInvoiceDraftStore();

  // Screen Form States
  const [invoiceNumber, setInvoiceNumber] = useState(draft?.invoiceNumber ?? '');
  const [taxRateStr, setTaxRateStr] = useState(draft?.taxRate.toString() ?? '0');
  const [notes, setNotes] = useState(draft?.notes ?? '');
  
  // Date states
  const [invoiceDate, setInvoiceDate] = useState(draft?.invoiceDate ? new Date(draft.invoiceDate) : new Date());
  const [dueDate, setDueDate] = useState<Date | null>(draft?.dueDate ? new Date(draft.dueDate) : null);

  // Date Pickers Open states
  const [showInvoiceDatePicker, setShowInvoiceDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // Validation States
  const [numberCollision, setNumberCollision] = useState(false);
  const isConfirmingBackRef = useRef(true);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [lastNavigationAction, setLastNavigationAction] = useState<any>(null);

  // Debounced check for invoice number collision
  useEffect(() => {
    const checkCollision = async () => {
      if (!invoiceNumber.trim()) {
        setNumberCollision(false);
        return;
      }
      try {
        const exists = await InvoiceRepository.checkNumberExists(invoiceNumber);
        setNumberCollision(exists);
      } catch (error) {
        console.error('Error checking invoice number collision:', error);
      }
    };

    const timer = setTimeout(checkCollision, 300);
    return () => clearTimeout(timer);
  }, [invoiceNumber]);

  // Hook into navigation back events to prevent accidental loss of invoice draft
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isConfirmingBackRef.current || e.data.action.type === 'RESET') {
        return;
      }

      e.preventDefault();
      setLastNavigationAction(e.data.action);
      setShowDiscardConfirm(true);
    });

    return unsubscribe;
  }, [navigation, resetDraft]);

  const handleInvoiceDateChange = (event: any, selectedDate?: Date) => {
    setShowInvoiceDatePicker(false);
    if (selectedDate) {
      setInvoiceDate(selectedDate);
    }
  };

  const handleDueDateChange = (event: any, selectedDate?: Date) => {
    setShowDueDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const handleTaxRateChange = (text: string) => {
    // Only accept numeric inputs
    const cleanText = text.replace(/[^0-9.]/g, '');
    setTaxRateStr(cleanText);
    const parsed = parseFloat(cleanText);
    if (!isNaN(parsed) && parsed >= 0) {
      updateTaxRate(parsed);
    } else if (cleanText === '') {
      updateTaxRate(0);
    }
  };

  const handleContinue = () => {
    // Sync UI states back to the store
    setInvoiceDetails({
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: dayjs(invoiceDate).format('YYYY-MM-DD'),
      dueDate: dueDate ? dayjs(dueDate).format('YYYY-MM-DD') : null,
      notes: notes.trim(),
    });

    // Advance to preview
    isConfirmingBackRef.current = false;
    setTimeout(() => {
      navigation.navigate('InvoicePreviewScreen');
    }, 100);
  };

  const handleBack = () => {
    isConfirmingBackRef.current = false;
    setTimeout(() => {
      navigation.navigate('InvoiceProductsStep');
    }, 100);
  };

  const currency = draft?.currencySymbol ?? '₹';
  const subtotal = draft?.subtotal ?? 0;
  const taxRate = draft?.taxRate ?? 0;
  const taxAmount = draft?.taxAmount ?? 0;
  const grandTotal = draft?.grandTotal ?? 0;

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        <ConfirmDialog
          visible={showDiscardConfirm}
          title="Discard Draft?"
          message="Going back to the dashboard will discard all progress on this invoice."
          confirmLabel="Discard"
          cancelLabel="Keep Editing"
          confirmColor={colors.danger}
          onConfirm={() => {
            resetDraft();
            isConfirmingBackRef.current = false;
            if (lastNavigationAction) navigation.dispatch(lastNavigationAction);
            setShowDiscardConfirm(false);
            setLastNavigationAction(null);
          }}
          onCancel={() => {
            setShowDiscardConfirm(false);
            setLastNavigationAction(null);
          }}
        />
        {/* 4-Step Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressStepText, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
              STEP 3 OF 4
            </Text>
            <Text style={[styles.progressPercentage, { color: colors.accent, fontSize: typography.fontSizes.xs }]}>
              75%
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.accent, width: '75%' }]} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.fontSizes.lg }]}>
          Invoice Details
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.fontSizes.sm }]}>
          Review pricing structure, set sequence numbers, add dates, tax rates, and optional invoice terms.
        </Text>

        {/* Inputs Fields */}
        <View style={styles.formContainer}>
          {/* Invoice Number */}
          <TextInput
            label="Invoice Number"
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder="INV-0001"
            inputStyle={numberCollision ? { borderColor: colors.danger, borderWidth: 1.5 } : undefined}
          />
          {numberCollision && (
            <View style={styles.collisionAlert}>
              <Ionicons name="warning" size={16} color={colors.danger} />
              <Text style={[styles.collisionText, { color: colors.danger, fontSize: typography.fontSizes.xs }]}>
                Invoice number already exists in database. Tap anyway to save.
              </Text>
            </View>
          )}

          {/* Dates Section */}
          <View style={styles.datesRow}>
            {/* Invoice Date */}
            <View style={styles.dateCol}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginBottom: spacing.xs }]}>
                Invoice Date
              </Text>
              <TouchableOpacity
                style={[styles.dateSelector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
                onPress={() => setShowInvoiceDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.accent} style={styles.calendarIcon} />
                <Text style={[styles.dateText, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
                  {dayjs(invoiceDate).format('DD MMM YYYY')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Due Date */}
            <View style={[styles.dateCol, { marginLeft: spacing.md }]}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginBottom: spacing.xs }]}>
                Due Date (Optional)
              </Text>
              <TouchableOpacity
                style={[styles.dateSelector, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
                onPress={() => setShowDueDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color={dueDate ? colors.accent : colors.placeholder} style={styles.calendarIcon} />
                <Text style={[styles.dateText, { color: dueDate ? colors.textPrimary : colors.placeholder, fontSize: typography.fontSizes.sm }]}>
                  {dueDate ? dayjs(dueDate).format('DD MMM YYYY') : 'Not Set'}
                </Text>
              </TouchableOpacity>
              {dueDate && (
                <TouchableOpacity onPress={() => setDueDate(null)} style={styles.clearDateBtn}>
                  <Text style={[styles.clearDateText, { color: colors.danger, fontSize: typography.fontSizes.xs }]}>
                    Clear Due Date
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tax Rate Field */}
          <TextInput
            label="Tax Rate (%)"
            value={taxRateStr}
            onChangeText={handleTaxRateChange}
            placeholder="0.00"
            keyboardType="numeric"
          />

          {/* Notes / Terms */}
          <TextInput
            label="Invoice Notes & Terms (Optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Thank you for your business! Net 30 terms."
            multiline={true}
            numberOfLines={4}
            inputStyle={styles.multilineInput}
          />
        </View>

        {/* Floating Native Android Calendar Modals */}
        {showInvoiceDatePicker && (
          <DateTimePicker
            value={invoiceDate}
            mode="date"
            display="default"
            onChange={handleInvoiceDateChange}
          />
        )}

        {showDueDatePicker && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            display="default"
            minimumDate={invoiceDate}
            onChange={handleDueDateChange}
          />
        )}
      </ScrollView>

      {/* Persistent Bottom Summary & Navigation Bar */}
      <View style={[styles.bottomDock, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* Real-time Invoice Totals Summary Card */}
        <View style={[styles.totalsSummaryCard, { borderColor: colors.border, backgroundColor: colors.background, borderRadius: borderRadius.md }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
              Subtotal:
            </Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary, fontSize: typography.fontSizes.xs }]}>
              {currency}{subtotal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
              Tax (GST {taxRate}%):
            </Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary, fontSize: typography.fontSizes.xs }]}>
              {currency}{taxAmount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={[styles.grandLabel, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
              Grand Total:
            </Text>
            <Text style={[styles.grandValue, { color: colors.accent, fontSize: typography.fontSizes.md }]}>
              {currency}{grandTotal.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Buttons Row */}
        <View style={styles.navRow}>
          <Button
            title="Back"
            onPress={handleBack}
            variant="secondary"
            style={styles.navBtn}
          />
          <Button
            title="Preview Invoice"
            onPress={handleContinue}
            variant="primary"
            style={[styles.navBtn, { marginLeft: spacing.sm }]}
            icon="eye-outline"
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
    paddingBottom: 220, // Free space for the totals block + buttons dock
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressStepText: {
    fontWeight: '700',
  },
  progressPercentage: {
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 20,
    marginBottom: 24,
  },
  formContainer: {
    zIndex: 1,
  },
  collisionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 16,
    paddingLeft: 4,
  },
  collisionText: {
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  datesRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontWeight: '600',
  },
  dateSelector: {
    borderWidth: 1.5,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 46,
  },
  calendarIcon: {
    marginRight: 8,
  },
  dateText: {
    fontWeight: '500',
  },
  clearDateBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontWeight: '600',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
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
  totalsSummaryCard: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  summaryLabel: {
    fontWeight: '500',
  },
  summaryValue: {
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 6,
  },
  grandLabel: {
    fontWeight: '700',
  },
  grandValue: {
    fontWeight: '800',
  },
  navRow: {
    flexDirection: 'row',
  },
  navBtn: {
    flex: 1,
  },
});

export default InvoiceDetailsStep;
