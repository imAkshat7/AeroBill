import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { TextInput } from '../../components/atoms/TextInput';
import { Button } from '../../components/atoms/Button';
import { SectionHeader } from '../../components/atoms/SectionHeader';
import { CustomerRepository } from '../../db/repositories/CustomerRepository';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';

export const CustomerDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { colors, spacing } = useTheme();
  const { showToast } = useToastStore();

  const customerId = route.params?.customerId;
  const isEditMode = !!customerId;

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // 1. Fetch data on edit mount
  useEffect(() => {
    if (isEditMode) {
      const fetchCustomer = async () => {
        try {
          const customer = await CustomerRepository.getById(customerId);
          if (customer) {
            setName(customer.name);
            setPhone(customer.phone);
            setEmail(customer.email);
            setAddress(customer.address);
          } else {
            showToast('Customer record not found.', 'error');
            navigation.goBack();
          }
        } catch {
          showToast('Failed to load customer details.', 'error');
        }
      };
      fetchCustomer();
    }
  }, [customerId, isEditMode]);

  // 2. Set dynamic screen titles & add header delete trigger
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Profile' : 'New Customer',
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
      'Delete Customer',
      `Are you sure you want to delete ${name || 'this customer'}? This will archive their profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CustomerRepository.softDelete(customerId);
              showToast('Customer record archived.', 'success');
              navigation.goBack();
            } catch {
              showToast('Failed to delete customer.', 'error');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    setNameError('');
    if (!name.trim()) {
      setNameError('Customer Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await CustomerRepository.update(customerId, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
        });
        showToast('Customer profile updated.', 'success');
      } else {
        await CustomerRepository.create({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
        });
        showToast('Customer profile saved.', 'success');
      }
      navigation.goBack();
    } catch (error: any) {
      showToast(error.message || 'Failed to save customer.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <SectionHeader
        title={isEditMode ? 'Modify Customer Info' : 'Create Customer profile'}
        subtitle="This information is used to pre-fill billing details during invoice generation."
      />

      <View style={styles.form}>
        <TextInput
          label="Customer Name"
          required={true}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (text.trim()) setNameError('');
          }}
          placeholder="e.g. Rahul Sharma"
          error={nameError}
          autoCapitalize="words"
        />

        <TextInput
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. +91 98765 43210"
          keyboardType="phone-pad"
        />

        <TextInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. rahul@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          label="Billing Address"
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. Flat 104, Blue Heights, Pune"
          multiline={true}
          numberOfLines={3}
          inputStyle={styles.addressInput}
        />
      </View>

      <Button
        title={isEditMode ? 'Update Customer' : 'Create Customer'}
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
  addressInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    width: '100%',
  },
});
export default CustomerDetailScreen;
