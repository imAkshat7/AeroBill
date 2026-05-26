import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { TextInput } from '../../components/atoms/TextInput';
import { Button } from '../../components/atoms/Button';
import { SectionHeader } from '../../components/atoms/SectionHeader';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToastStore } from '../../stores/toastStore';

const padZero = (num: number, size = 4): string => {
  let s = num.toString();
  while (s.length < size) s = '0' + s;
  return s;
};

export const InvoiceDefaultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { settings, loadSettings, updateSettings, isLoading } = useSettingsStore();
  const { showToast } = useToastStore();

  // Form states
  const [taxRate, setTaxRate] = useState('0');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [prefix, setPrefix] = useState('INV-');
  const [sequence, setSequence] = useState(0);
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [templateId, setTemplateId] = useState('1');

  const [showPrefixWarning, setShowPrefixWarning] = useState(false);

  // Load defaults on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSettings();
    }, 100);
    return () => clearTimeout(timer);
  }, [loadSettings]);

  // Update form states when settings change
  useEffect(() => {
    if (settings) {
      setTaxRate(settings.defaultTaxRate.toString());
      setCurrencySymbol(settings.currencySymbol);
      setPrefix(settings.invoicePrefix);
      setSequence(settings.invoiceSequence);
      setThankYouMessage(settings.thankYouMessage);
      setTemplateId(settings.templateId || '1');
    }
  }, [settings]);

  const handlePrefixChange = (text: string) => {
    setPrefix(text);
    if (settings && text !== settings.invoicePrefix) {
      setShowPrefixWarning(true);
    } else {
      setShowPrefixWarning(false);
    }
  };

  const handleSave = async () => {
    const cleanTaxRate = parseFloat(taxRate);
    if (isNaN(cleanTaxRate) || cleanTaxRate < 0) {
      showToast('Tax rate must be a valid positive number.', 'error');
      return;
    }

    if (!currencySymbol.trim()) {
      showToast('Currency symbol is required.', 'error');
      return;
    }

    if (!prefix.trim()) {
      showToast('Invoice number prefix is required.', 'error');
      return;
    }

    const prefixChanged = settings && prefix !== settings.invoicePrefix;

    const performSave = async () => {
      try {
        const updateData: any = {
          defaultTaxRate: cleanTaxRate,
          currencySymbol: currencySymbol.trim(),
          invoicePrefix: prefix.trim(),
          thankYouMessage: thankYouMessage.trim(),
          templateId: templateId,
        };
        if (prefixChanged) {
          updateData.invoiceSequence = 0; // Reset sequence if prefix changed
        }
        await updateSettings(updateData);
        showToast('Invoice defaults updated successfully!', 'success');
        navigation.goBack();
      } catch (error: any) {
        showToast(error.message || 'Failed to save invoice defaults.', 'error');
      }
    };

    if (prefixChanged) {
      Alert.alert(
        'Reset Invoice Sequence?',
        `Changing the prefix from "${settings.invoicePrefix}" to "${prefix.trim()}" will reset the sequence counter to 0.\n\nYour next generated invoice will be "${prefix.trim()}${padZero(1, 4)}". Are you sure?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Reset Sequence', style: 'destructive', onPress: performSave },
        ]
      );
    } else {
      performSave();
    }
  };

  // Preview generated invoice number
  const nextNumberPreview = `${prefix}${padZero((settings && prefix !== settings.invoicePrefix ? 0 : sequence) + 1, 4)}`;

  const TEMPLATES = [
    { id: '1', name: 'Classic Blue' },
    { id: '2', name: 'Corporate' },
    { id: '3', name: 'Bold Header' },
    { id: '4', name: 'Minimalist' }
  ];

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <SectionHeader title="Invoice Defaults" subtitle="Set standard options applied automatically to new invoices." />

      <View style={styles.form}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold }]}>
          Default Invoice Template
        </Text>
        <View style={styles.templateList}>
          {TEMPLATES.map((tmpl) => {
            const isSelected = templateId === tmpl.id;
            return (
              <TouchableOpacity
                key={tmpl.id}
                style={[
                  styles.templateCard,
                  { 
                    backgroundColor: isSelected ? colors.accentLight : colors.surface,
                    borderColor: isSelected ? colors.accent : colors.border
                  }
                ]}
                onPress={() => setTemplateId(tmpl.id)}
              >
                <Ionicons name="document-text" size={24} color={isSelected ? colors.accent : colors.placeholder} />
                <Text style={{ color: isSelected ? colors.accent : colors.textSecondary, marginTop: 8, fontSize: 12, fontWeight: 'bold' }}>
                  {tmpl.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          label="Default Tax Rate (%)"
          value={taxRate}
          onChangeText={setTaxRate}
          placeholder="e.g. 18.0"
          keyboardType="numeric"
        />

        <TextInput
          label="Currency Symbol"
          value={currencySymbol}
          onChangeText={setCurrencySymbol}
          placeholder="e.g. ₹ or $"
          maxLength={5}
        />

        <TextInput
          label="Invoice Prefix"
          value={prefix}
          onChangeText={handlePrefixChange}
          placeholder="e.g. INV- or 2026-"
          autoCapitalize="characters"
        />

        {showPrefixWarning ? (
          <View style={[styles.warningBox, { backgroundColor: colors.warningLight, borderColor: colors.warning, borderRadius: borderRadius.md, padding: spacing.sm }]}>
            <Ionicons name="warning" size={16} color={colors.warning} style={styles.warningIcon} />
            <Text style={[styles.warningText, { color: colors.textPrimary, fontSize: typography.fontSizes.xs }]}>
              Changing the prefix will reset your sequence counter to 0!
            </Text>
          </View>
        ) : null}

        {/* Next Number Preview */}
        <View style={[styles.previewBox, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md }]}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.medium }]}>
            NEXT INVOICE NUMBER PREVIEW
          </Text>
          <Text style={[styles.previewValue, { color: colors.accent, fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, marginTop: 4 }]}>
            {nextNumberPreview}
          </Text>
        </View>

        <TextInput
          label="Current Sequence (read-only)"
          value={sequence.toString()}
          editable={false}
          inputStyle={[styles.readOnlyInput, { backgroundColor: colors.background, color: colors.textSecondary }]}
        />

        <TextInput
          label="Default Thank You Message"
          value={thankYouMessage}
          onChangeText={setThankYouMessage}
          placeholder="e.g. Thank you for your business!"
          multiline={true}
          numberOfLines={2}
          inputStyle={styles.messageInput}
        />
      </View>

      <Button
        title="Save Defaults"
        onPress={handleSave}
        loading={isLoading}
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    marginVertical: 4,
  },
  warningIcon: {
    marginRight: 6,
  },
  warningText: {
    flex: 1,
  },
  previewBox: {
    borderWidth: 1.5,
    marginVertical: 12,
  },
  previewLabel: {},
  previewValue: {},
  readOnlyInput: {
    borderStyle: 'dashed',
  },
  messageInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    marginBottom: 8,
  },
  templateList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  templateCard: {
    width: '48%',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: {
    width: '100%',
  },
});
export default InvoiceDefaultsScreen;
