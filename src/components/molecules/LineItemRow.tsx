import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InvoiceItem } from '../../types';
import { useTheme } from '../../hooks/useTheme';

type LineItemRowProps = {
  item: InvoiceItem;
  currencySymbol: string;
  index: number;
  onQuantityChange: (index: number, qty: number) => void;
  onPriceChange: (index: number, price: number) => void;
  onRemove: (index: number) => void;
};

export const LineItemRow: React.FC<LineItemRowProps> = ({
  item,
  currencySymbol,
  index,
  onQuantityChange,
  onPriceChange,
  onRemove,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const handleQtyChange = (text: string) => {
    // Allows only numbers and decimals (up to 3 decimal places)
    const cleanText = text.replace(/[^0-9.]/g, '');
    
    // Enforce decimal structure
    const parts = cleanText.split('.');
    if (parts.length > 2) return; // Ignore multiple decimals
    if (parts[1] && parts[1].length > 3) return; // Limit to 3 decimal places

    const val = parseFloat(cleanText);
    onQuantityChange(index, isNaN(val) ? 0 : val);
  };

  const handlePriceChange = (text: string) => {
    // Allows numbers and decimals
    const cleanText = text.replace(/[^0-9.]/g, '');
    
    const parts = cleanText.split('.');
    if (parts.length > 2) return; 
    if (parts[1] && parts[1].length > 2) return; // Limit to 2 decimal places for money

    const val = parseFloat(cleanText);
    onPriceChange(index, isNaN(val) ? 0 : val);
  };

  const lineTotal = item.quantity * item.unitPrice;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          ...colors.cardShadow,
        },
      ]}
    >
      {/* Product Details Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrapper}>
          <Text
            style={[
              styles.itemName,
              {
                color: colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.semibold,
              },
            ]}
            numberOfLines={1}
          >
            {item.itemName}
          </Text>
          <Text style={[styles.unitLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
            Unit: {item.unit}
          </Text>
        </View>
        
        {/* Remove Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onRemove(index)}
          style={[styles.removeButton, { padding: spacing.xs }]}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Editing Numeric Controls */}
      <View style={[styles.controlsRow, { marginTop: spacing.sm }]}>
        {/* Quantity Field */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginBottom: spacing.xs }]}>
            Quantity
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                borderRadius: borderRadius.sm,
                backgroundColor: colors.background,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                fontSize: typography.fontSizes.sm,
              },
            ]}
            value={item.quantity === 0 ? '' : item.quantity.toString()}
            onChangeText={handleQtyChange}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        {/* Unit Price Field */}
        <View style={[styles.fieldWrapper, { marginLeft: spacing.md }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginBottom: spacing.xs }]}>
            Unit Price ({currencySymbol})
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                borderRadius: borderRadius.sm,
                backgroundColor: colors.background,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                fontSize: typography.fontSizes.sm,
              },
            ]}
            value={item.unitPrice === 0 ? '' : item.unitPrice.toString()}
            onChangeText={handlePriceChange}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        {/* Line Total display */}
        <View style={[styles.totalWrapper, { marginLeft: spacing.md }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginBottom: spacing.xs, textAlign: 'right' }]}>
            Total
          </Text>
          <Text
            style={[
              styles.totalText,
              {
                color: colors.accent,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
                textAlign: 'right',
                paddingVertical: spacing.xs,
              },
            ]}
          >
            {currencySymbol}
            {lineTotal.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    marginVertical: 6,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrapper: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {},
  unitLabel: {
    marginTop: 2,
  },
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldWrapper: {
    flex: 2.5,
  },
  fieldLabel: {
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    minHeight: 38,
    textAlign: 'center',
  },
  totalWrapper: {
    flex: 3,
    justifyContent: 'center',
  },
  totalText: {},
});
export default LineItemRow;
