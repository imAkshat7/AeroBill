import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { Invoice } from '../../types';
import { useTheme } from '../../hooks/useTheme';

type InvoiceSummaryCardProps = {
  invoice: Invoice;
  onPress: () => void;
};

export const InvoiceSummaryCard: React.FC<InvoiceSummaryCardProps> = ({
  invoice,
  onPress,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const customerName = invoice.customerSnapshot?.name || 'Walk-in Customer';
  const currency = invoice.currencySymbol || '₹';
  const formattedDate = dayjs(invoice.invoiceDate).format('DD MMM YYYY');

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          ...colors.cardShadow,
        },
      ]}
    >
      <View style={styles.leftContent}>
        <Text style={[styles.invoiceNumber, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
          {invoice.invoiceNumber}
        </Text>
        <Text style={[styles.customerName, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]} numberOfLines={1}>
          {customerName}
        </Text>
        <Text style={[styles.dateText, { color: colors.placeholder, fontSize: 10 }]}>
          {formattedDate}
        </Text>
      </View>
      
      <View style={styles.rightContent}>
        <Text style={[styles.amountText, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
          {currency}{invoice.grandTotal.toFixed(2)}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.placeholder} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    marginVertical: 5,
    width: '100%',
  },
  leftContent: {
    flex: 1,
    paddingRight: 12,
  },
  invoiceNumber: {
    fontWeight: '700',
    marginBottom: 2,
  },
  customerName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  dateText: {
    fontWeight: '500',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  amountText: {
    fontWeight: '700',
    marginRight: 6,
  },
  chevron: {
    marginTop: 1,
  },
});

export default InvoiceSummaryCard;
