import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/atoms/Button';
import { ConfirmDialog } from '../../components/atoms/ConfirmDialog';
import { TextInput } from '../../components/atoms/TextInput';
import { ProductSearchBar } from '../../components/molecules/ProductSearchBar';
import { LineItemRow } from '../../components/molecules/LineItemRow';
import { SaveProductSheet } from '../../components/organisms/SaveProductSheet';
import { useTheme } from '../../hooks/useTheme';
import { useInvoiceDraftStore } from '../../stores/invoiceDraftStore';
import { Product, ProductInput } from '../../types';

type WizardStackParamList = {
  InvoiceCustomerStep: undefined;
  InvoiceDetailsStep: undefined;
};

type NavigationProp = StackNavigationProp<WizardStackParamList>;

const UNIT_PRESETS = ['pcs', 'kg', 'hrs', 'ltrs', 'mtr', 'box'];

export const InvoiceProductsStep: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const { draft, addItem, updateItem, removeItem, resetDraft } = useInvoiceDraftStore();

  // Inline Form State
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [inlineProductName, setInlineProductName] = useState('');
  const [inlineProductPrice, setInlineProductPrice] = useState('');
  const [inlineProductUnit, setInlineProductUnit] = useState('pcs');
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [lastNavigationAction, setLastNavigationAction] = useState<any>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const isConfirmingBackRef = useRef(true);

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

  const handleSelectProduct = (product: Product) => {
    addItem(product, product.name, product.defaultPrice, product.unit);
    setShowInlineForm(false);
  };

  const handleCreateNewProductTrigger = (name: string) => {
    setInlineProductName(name);
    setInlineProductPrice('');
    setInlineProductUnit('pcs');
    setShowInlineForm(true);
  };

  const handleSaveInlineProduct = (savedProduct: Product) => {
    addItem(savedProduct, savedProduct.name, savedProduct.defaultPrice, savedProduct.unit);
    setShowSaveSheet(false);
    setShowInlineForm(false);
  };

  const handleSkipInlineProduct = () => {
    // Just add to active invoice once (without saving to product catalog database)
    const priceVal = parseFloat(inlineProductPrice);
    const finalPrice = isNaN(priceVal) ? 0 : priceVal;
    addItem(
      null, // null productId indicates temporary product
      inlineProductName.trim(),
      finalPrice,
      inlineProductUnit
    );
    setShowSaveSheet(false);
    setShowInlineForm(false);
  };

  const handleTriggerSaveConfirmation = () => {
    const priceVal = parseFloat(inlineProductPrice);
    if (isNaN(priceVal) || priceVal < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price for the product.');
      return;
    }
    setShowSaveSheet(true);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    updateItem(index, { quantity: qty });
  };

  const handlePriceChange = (index: number, price: number) => {
    updateItem(index, { unitPrice: price });
  };

  const handleRemoveItem = (index: number) => {
    removeItem(index);
  };

  const handleContinue = () => {
    isConfirmingBackRef.current = false;
    setTimeout(() => {
      navigation.navigate('InvoiceDetailsStep');
    }, 100);
  };

  const handleBack = () => {
    isConfirmingBackRef.current = false;
    setTimeout(() => {
      navigation.navigate('InvoiceCustomerStep');
    }, 100);
  };

  const currency = draft?.currencySymbol ?? '₹';
  const hasItems = draft?.items && draft.items.length > 0;
  const priceValParsed = parseFloat(inlineProductPrice);
  const parsedPrice = isNaN(priceValParsed) ? 0 : priceValParsed;

  const productDataForSheet: ProductInput = {
    name: inlineProductName.trim(),
    defaultPrice: parsedPrice,
    unit: inlineProductUnit,
  };

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
              STEP 2 OF 4
            </Text>
            <Text style={[styles.progressPercentage, { color: colors.accent, fontSize: typography.fontSizes.xs }]}>
              50%
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.accent, width: '50%' }]} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.fontSizes.lg }]}>
          Add Products
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.fontSizes.sm }]}>
          Search products, add ones from catalog, or type a custom product name to bill once.
        </Text>

        {/* Product Search Bar */}
        <View style={styles.searchSection}>
          <ProductSearchBar
            onSelect={handleSelectProduct}
            onCreateNew={handleCreateNewProductTrigger}
          />
        </View>

        {/* Custom Product Inline Form */}
        {showInlineForm && (
          <View style={[styles.inlineForm, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}>
            <View style={styles.inlineFormHeader}>
              <Ionicons name="cube" size={20} color={colors.success} />
              <Text style={[styles.inlineFormTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
                New Product Details
              </Text>
            </View>

            <TextInput
              label="Product Name"
              value={inlineProductName}
              onChangeText={setInlineProductName}
              placeholder="E.g., Laptop Power Cable"
            />

            <TextInput
              label="Unit Price"
              value={inlineProductPrice}
              onChangeText={setInlineProductPrice}
              placeholder="0.00"
              keyboardType="numeric"
            />

            <Text style={[styles.unitLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginBottom: spacing.xs }]}>
              Measurement Unit
            </Text>
            <View style={styles.presetsContainer}>
              {UNIT_PRESETS.map((preset) => {
                const isSelected = inlineProductUnit === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.unitChip,
                      {
                        borderColor: isSelected ? colors.accent : colors.border,
                        backgroundColor: isSelected ? colors.accent + '20' : colors.surface,
                        borderRadius: borderRadius.sm,
                      },
                    ]}
                    onPress={() => setInlineProductUnit(preset)}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        {
                          color: isSelected ? colors.accent : colors.textSecondary,
                          fontSize: typography.fontSizes.xs,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inlineFormActions}>
              <Button
                title="Add Item"
                onPress={handleTriggerSaveConfirmation}
                variant="primary"
                style={styles.formBtn}
                disabled={!inlineProductName.trim()}
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

        {/* Selected Products List */}
        {hasItems && (
          <View style={styles.listContainer}>
            <Text style={[styles.listHeader, { color: colors.textPrimary, fontSize: typography.fontSizes.sm, marginBottom: spacing.xs }]}>
              Items in Invoice ({draft?.items.length})
            </Text>
            {draft?.items.map((item, index) => (
              <LineItemRow
                key={`${item.productId}-${index}`}
                item={item}
                currencySymbol={currency}
                index={index}
                onQuantityChange={handleQuantityChange}
                onPriceChange={handlePriceChange}
                onRemove={handleRemoveItem}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {!hasItems && !showInlineForm && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.lg }]}>
            <Ionicons name="cart-outline" size={48} color={colors.placeholder} />
            <Text style={[styles.emptyStateTitle, { color: colors.textSecondary, fontSize: typography.fontSizes.md }]}>
              No items added
            </Text>
            <Text style={[styles.emptyStateSubtitle, { color: colors.placeholder, fontSize: typography.fontSizes.xs }]}>
              Type above to search your products catalog or tap a result to add items.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Persistent Bottom Bar with Running Subtotal & Navigation Buttons */}
      <View style={[styles.bottomDock, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.subtotalRow}>
          <Text style={[styles.subtotalLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.sm }]}>
            Running Subtotal
          </Text>
          <Text style={[styles.subtotalVal, { color: colors.textPrimary, fontSize: typography.fontSizes.md }]}>
            {currency}{(draft?.subtotal ?? 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.navRow}>
          <Button
            title="Back"
            onPress={handleBack}
            variant="secondary"
            style={styles.navBtn}
          />
          <Button
            title="Next Step"
            onPress={handleContinue}
            variant="primary"
            disabled={!hasItems}
            style={[styles.navBtn, { marginLeft: spacing.sm }]}
            icon="arrow-forward"
            iconPosition="right"
          />
        </View>
      </View>

      {/* Save Product to Catalog sheet slider */}
      <SaveProductSheet
        productData={productDataForSheet}
        visible={showSaveSheet}
        onSave={handleSaveInlineProduct}
        onSkip={handleSkipInlineProduct}
      />
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
    paddingBottom: 160, // Clear space for bottom docked bar
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
  unitLabel: {
    fontWeight: '600',
    marginTop: 8,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  unitChip: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  unitChipText: {},
  inlineFormActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  formBtn: {
    flex: 1,
  },
  listContainer: {
    marginTop: 8,
  },
  listHeader: {
    fontWeight: '700',
    paddingLeft: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingVertical: 48,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    textAlign: 'center',
    lineHeight: 18,
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
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtotalLabel: {
    fontWeight: '600',
  },
  subtotalVal: {
    fontWeight: '800',
  },
  navRow: {
    flexDirection: 'row',
  },
  navBtn: {
    flex: 1,
  },
});

export default InvoiceProductsStep;
