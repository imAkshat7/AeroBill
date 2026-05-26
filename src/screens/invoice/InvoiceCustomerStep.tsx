import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { Button } from '../../components/atoms/Button';
import { TextInput } from '../../components/atoms/TextInput';
import { ConfirmDialog } from '../../components/atoms/ConfirmDialog';
import { CustomerSearchBar } from '../../components/molecules/CustomerSearchBar';
import { SaveCustomerSheet } from '../../components/organisms/SaveCustomerSheet';
import { useTheme } from '../../hooks/useTheme';
import { useInvoiceDraftStore } from '../../stores/invoiceDraftStore';
import { Customer, CustomerInput } from '../../types';

type WizardStackParamList = {
  HomeRoot: undefined;
  InvoiceCustomerStep: undefined;
  InvoiceProductsStep: undefined;
};

type NavigationProp = StackNavigationProp<WizardStackParamList>;

export const InvoiceCustomerStep: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { draft, setCustomer, resetDraft } = useInvoiceDraftStore();

  // Dialog & Inline Form state
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [inlineCustomerName, setInlineCustomerName] = useState('');
  const [inlineCustomerPhone, setInlineCustomerPhone] = useState('');
  const [inlineCustomerEmail, setInlineCustomerEmail] = useState('');
  const [inlineCustomerAddress, setInlineCustomerAddress] = useState('');
  const [showInlineForm, setShowInlineForm] = useState(false);
  const isConfirmingBackRef = useRef(true);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [lastNavigationAction, setLastNavigationAction] = useState<any>(null);

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

  const handleSelectCustomer = (customer: Customer) => {
    setCustomer(customer);
    setShowInlineForm(false);
  };

  const handleCreateNewCustomerTrigger = (name: string) => {
    setInlineCustomerName(name);
    setInlineCustomerPhone('');
    setInlineCustomerEmail('');
    setInlineCustomerAddress('');
    setShowInlineForm(true);
  };

  const handleSaveInlineCustomer = (savedCustomer: Customer) => {
    setCustomer(savedCustomer);
    setShowSaveSheet(false);
    setShowInlineForm(false);
    // Auto-advance on successful customer save
    setTimeout(() => {
      navigation.navigate('InvoiceProductsStep');
    }, 200);
  };

  const handleSkipInlineCustomer = () => {
    // Treat as temporary walk-in customer (not saved to database)
    const tempCustomer: Customer = {
      id: 0, // id <= 0 indicates walk-in, so customerId defaults to null in db
      name: inlineCustomerName.trim(),
      phone: inlineCustomerPhone.trim(),
      email: inlineCustomerEmail.trim(),
      address: inlineCustomerAddress.trim(),
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomer(tempCustomer);
    setShowSaveSheet(false);
    setShowInlineForm(false);
    // Auto-advance
    setTimeout(() => {
      navigation.navigate('InvoiceProductsStep');
    }, 200);
  };

  const handleSkipCustomerEntirely = () => {
    setCustomer(null);
    setShowInlineForm(false);
    navigation.navigate('InvoiceProductsStep');
  };

  const handleContinue = () => {
    navigation.navigate('InvoiceProductsStep');
  };

  const customerDataForSheet: CustomerInput = {
    name: inlineCustomerName.trim(),
    phone: inlineCustomerPhone.trim(),
    email: inlineCustomerEmail.trim(),
    address: inlineCustomerAddress.trim(),
  };

  const selectedCustomer = draft?.customerSnapshot;

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={[styles.container, { padding: spacing.md }]}>
      <ConfirmDialog
        visible={showDiscardConfirm}
        title="Discard Draft?"
        message="Starting back will discard all entered items and information for this invoice draft."
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
            STEP 1 OF 4
          </Text>
          <Text style={[styles.progressPercentage, { color: colors.accent, fontSize: typography.fontSizes.xs }]}>
            25%
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, { backgroundColor: colors.accent, width: '25%' }]} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.fontSizes.lg }]}>
        Select Customer
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.fontSizes.sm }]}>
        Search and link an existing customer from your directory, create a new one, or skip for walk-ins.
      </Text>

      {/* Selected Customer Card or Search Bar */}
      {selectedCustomer ? (
        <View style={[styles.selectedCard, { backgroundColor: colors.surface, borderColor: colors.accent, borderRadius: borderRadius.lg }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="person" size={24} color={colors.accent} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.customerName, { color: colors.textPrimary, fontSize: typography.fontSizes.md }]}>
                {selectedCustomer.name}
              </Text>
              {selectedCustomer.phone ? (
                <Text style={[styles.customerPhone, { color: colors.textSecondary, fontSize: typography.fontSizes.sm }]}>
                  {selectedCustomer.phone}
                </Text>
              ) : null}
              {selectedCustomer.id === 0 && (
                <View style={[styles.badge, { backgroundColor: colors.border }]}>
                  <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                    One-time Customer
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.changeBtn, { borderColor: colors.border }]}
            onPress={() => setCustomer(null)}
          >
            <Text style={[styles.changeBtnText, { color: colors.textSecondary, fontSize: typography.fontSizes.sm }]}>
              Clear Customer
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.searchSection}>
          <CustomerSearchBar
            onSelect={handleSelectCustomer}
            onCreateNew={handleCreateNewCustomerTrigger}
          />
        </View>
      )}

      {/* Inline Lightweight Form */}
      {showInlineForm && !selectedCustomer && (
        <View style={[styles.inlineForm, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}>
          <View style={styles.inlineFormHeader}>
            <Ionicons name="person-add" size={20} color={colors.success} />
            <Text style={[styles.inlineFormTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
              Customer Details
            </Text>
          </View>
          
          <TextInput
            label="Customer Name"
            value={inlineCustomerName}
            onChangeText={setInlineCustomerName}
            placeholder="E.g., John Doe"
          />

          <TextInput
            label="Phone Number (Optional)"
            value={inlineCustomerPhone}
            onChangeText={setInlineCustomerPhone}
            placeholder="E.g., 9876543210"
            keyboardType="phone-pad"
          />

          <TextInput
            label="Email Address (Optional)"
            value={inlineCustomerEmail}
            onChangeText={setInlineCustomerEmail}
            placeholder="E.g., john@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            label="Billing Address (Optional)"
            value={inlineCustomerAddress}
            onChangeText={setInlineCustomerAddress}
            placeholder="E.g., 123 Main Street, City"
            multiline
            numberOfLines={2}
          />

          <View style={styles.inlineFormActions}>
            <Button
              title="Add Customer"
              onPress={() => setShowSaveSheet(true)}
              variant="primary"
              style={styles.formBtn}
              disabled={!inlineCustomerName.trim()}
            />
            <Button
              title="Cancel"
              onPress={() => setShowInlineForm(false)}
              variant="secondary"
              style={[styles.formBtn, { marginLeft: spacing.sm }]}
            />
          </View>
        </View>
      )}

      {/* Skip Option when nothing is selected */}
      {!selectedCustomer && !showInlineForm && (
        <TouchableOpacity
          style={[styles.skipContainer, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
          onPress={handleSkipCustomerEntirely}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={24} color={colors.textSecondary} />
          <View style={styles.skipTextContainer}>
            <Text style={[styles.skipTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
              Skip Customer Selection
            </Text>
            <Text style={[styles.skipSubtitle, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
              Useful for generic cash counter retail or generic walk-in services
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.placeholder} />
        </TouchableOpacity>
      )}

      {/* Save to Directory Slideup bottom sheet modal */}
      <SaveCustomerSheet
        customerData={customerDataForSheet}
        visible={showSaveSheet}
        onSave={handleSaveInlineCustomer}
        onSkip={handleSkipInlineCustomer}
      />

      {/* Sticky Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          title={selectedCustomer ? 'Continue to Products' : 'Skip & Continue'}
          onPress={selectedCustomer ? handleContinue : handleSkipCustomerEntirely}
          variant="primary"
          icon="arrow-forward"
          iconPosition="right"
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  searchSection: {
    zIndex: 1000,
    marginBottom: 20,
  },
  selectedCard: {
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  customerName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerPhone: {
    fontWeight: '500',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  changeBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBtnText: {
    fontWeight: '600',
  },
  inlineForm: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  inlineFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inlineFormTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  inlineFormActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  formBtn: {
    flex: 1,
  },
  skipContainer: {
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  skipTextContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  skipTitle: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  skipSubtitle: {
    lineHeight: 16,
  },
  bottomActions: {
    marginTop: 'auto',
    paddingTop: 16,
  },
});

export default InvoiceCustomerStep;
