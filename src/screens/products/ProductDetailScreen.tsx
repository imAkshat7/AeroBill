import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { TextInput } from '../../components/atoms/TextInput';
import { Button } from '../../components/atoms/Button';
import { SectionHeader } from '../../components/atoms/SectionHeader';
import { ProductRepository } from '../../db/repositories/ProductRepository';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';

const UNIT_PRESETS = ['pcs', 'kg', 'hrs', 'ltrs', 'mtr', 'box'];

export const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { showToast } = useToastStore();

  const productId = route.params?.productId;
  const isEditMode = !!productId;

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('0');
  const [unit, setUnit] = useState('pcs');
  
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // 1. Fetch data on edit mount
  useEffect(() => {
    if (isEditMode) {
      const fetchProduct = async () => {
        try {
          const product = await ProductRepository.getById(productId);
          if (product) {
            setName(product.name);
            setSku(product.sku);
            setPrice(product.defaultPrice.toString());
            setUnit(product.unit);
          } else {
            showToast('Product record not found.', 'error');
            navigation.goBack();
          }
        } catch {
          showToast('Failed to load product details.', 'error');
        }
      };
      fetchProduct();
    }
  }, [productId, isEditMode]);

  // 2. Set dynamic screen titles & add header delete trigger
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Product' : 'New Product',
      headerRight: isEditMode
        ? () => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDelete}
              style={{ marginRight: spacing.md }}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, isEditMode, colors.danger, name]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${name || 'this product'}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductRepository.delete(productId);
              showToast('Product removed from catalog.', 'success');
              navigation.goBack();
            } catch {
              showToast('Failed to delete product.', 'error');
            }
          },
        },
      ]
    );
  };

  const handlePriceChange = (text: string) => {
    // Allows numbers and decimals
    const cleanText = text.replace(/[^0-9.]/g, '');
    const parts = cleanText.split('.');
    if (parts.length > 2) return; 
    if (parts[1] && parts[1].length > 2) return; // Limit to 2 decimal places

    setPrice(cleanText);
  };

  const handleSave = async () => {
    setNameError('');
    if (!name.trim()) {
      setNameError('Product Name is required.');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      showToast('Price must be a valid positive number.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await ProductRepository.update(productId, {
          name: name.trim(),
          sku: sku.trim(),
          defaultPrice: numericPrice,
          unit: unit.trim(),
        });
        showToast('Product catalog updated.', 'success');
      } else {
        await ProductRepository.create({
          name: name.trim(),
          sku: sku.trim(),
          defaultPrice: numericPrice,
          unit: unit.trim(),
        });
        showToast('Product saved to catalog.', 'success');
      }
      navigation.goBack();
    } catch (error: any) {
      showToast(error.message || 'Failed to save product.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <SectionHeader
        title={isEditMode ? 'Modify Catalog Item' : 'Add Item to Catalog'}
        subtitle="This item can be easily added as a line item when writing invoices."
      />

      <View style={styles.form}>
        <TextInput
          label="Product / Service Name"
          required={true}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (text.trim()) setNameError('');
          }}
          placeholder="e.g. Premium Wireless Earbuds"
          error={nameError}
          autoCapitalize="words"
        />

        <TextInput
          label="SKU / Item Code"
          value={sku}
          onChangeText={setSku}
          placeholder="e.g. SKU-1029-BLK"
          autoCapitalize="characters"
        />

        <TextInput
          label="Default Unit Price (₹)"
          value={price}
          onChangeText={handlePriceChange}
          placeholder="e.g. 1499.00 (Price of 0 is valid)"
          keyboardType="numeric"
        />

        {/* Unit input with presets */}
        <View style={styles.unitContainer}>
          <TextInput
            label="Measurement Unit"
            value={unit}
            onChangeText={setUnit}
            placeholder="e.g. pcs, kg, hrs"
            autoCapitalize="none"
          />
          
          <Text style={[styles.presetsLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginBottom: spacing.xs }]}>
            Common Presets:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsList}>
            {UNIT_PRESETS.map((p) => {
              const isPresetSelected = unit === p;
              return (
                <TouchableOpacity
                  key={p}
                  activeOpacity={0.8}
                  onPress={() => setUnit(p)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isPresetSelected ? colors.accentLight : colors.surface,
                      borderColor: isPresetSelected ? colors.accent : colors.border,
                      borderRadius: borderRadius.round,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      marginRight: spacing.sm,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isPresetSelected ? colors.accent : colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                        fontWeight: typography.fontWeights.medium,
                      },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <Button
        title={isEditMode ? 'Update Product' : 'Create Product'}
        onPress={handleSave}
        loading={isSaving}
        disabled={!name.trim()}
        style={[styles.saveButton, { marginTop: spacing.xl }]}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  form: {
    marginTop: 8,
  },
  unitContainer: {
    marginVertical: 4,
  },
  presetsLabel: {
    fontWeight: '500',
    marginTop: 2,
  },
  presetsList: {
    flexDirection: 'row',
    marginTop: 2,
    paddingBottom: 6,
  },
  chip: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {},
  saveButton: {
    width: '100%',
  },
});
export default ProductDetailScreen;
