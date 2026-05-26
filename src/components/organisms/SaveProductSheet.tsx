import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableWithoutFeedback } from 'react-native';
import { Product, ProductInput } from '../../types';
import { ProductRepository } from '../../db/repositories/ProductRepository';
import { Button } from '../atoms/Button';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';

type SaveProductSheetProps = {
  productData: ProductInput;
  onSave: (savedProduct: Product) => void;
  onSkip: () => void;
  visible: boolean;
};

export const SaveProductSheet: React.FC<SaveProductSheetProps> = ({
  productData,
  onSave,
  onSkip,
  visible,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { showToast } = useToastStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToDb = async () => {
    setIsSaving(true);
    try {
      const savedProduct = await ProductRepository.create(productData);
      showToast(`Product "${savedProduct.name}" saved successfully!`, 'success');
      onSave(savedProduct);
    } catch (error) {
      console.error('Error saving product inline:', error);
      showToast('Failed to save product. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Semi-transparent backdrop tap block */}
        <TouchableWithoutFeedback onPress={onSkip}>
          <View style={[styles.backdrop, { backgroundColor: 'rgba(11, 15, 25, 0.6)' }]} />
        </TouchableWithoutFeedback>

        {/* Sliding dialog container */}
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xl,
              borderTopWidth: 1.5,
              borderTopColor: colors.border,
            },
          ]}
        >
          {/* Decorative Drag Handle bar */}
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
                marginTop: spacing.sm,
              },
            ]}
          >
            Save this product to your catalog?
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
                fontSize: typography.fontSizes.sm,
                marginVertical: spacing.md,
              },
            ]}
          >
            We detected a new product name. Would you like to save this product to your default catalog for quick reuse later?
          </Text>

          {/* Product Preview card */}
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                marginBottom: spacing.xl,
              },
            ]}
          >
            <Text
              style={[
                styles.nameText,
                {
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                },
              ]}
            >
              {productData.name}
            </Text>
            <Text
              style={[
                styles.priceText,
                {
                  color: colors.accent,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.semibold,
                  marginTop: 4,
                },
              ]}
            >
              Price: ₹{productData.defaultPrice.toFixed(2)} / {productData.unit}
            </Text>
            {productData.sku ? (
              <Text
                style={[
                  styles.skuText,
                  {
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 2,
                  },
                ]}
              >
                SKU: {productData.sku}
              </Text>
            ) : null}
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <Button
              title="Yes, Save to Catalog"
              onPress={handleSaveToDb}
              loading={isSaving}
              variant="primary"
              style={styles.btn}
            />
            <Button
              title="No, Just This Invoice"
              onPress={onSkip}
              disabled={isSaving}
              variant="secondary"
              style={[styles.btn, { marginTop: spacing.xs }]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetContainer: {
    width: '100%',
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  previewCard: {
    width: '100%',
    borderWidth: 1.5,
  },
  nameText: {},
  priceText: {},
  skuText: {},
  actions: {
    width: '100%',
  },
  btn: {
    width: '100%',
  },
});
export default SaveProductSheet;
