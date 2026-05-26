import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { TextInput } from '../../components/atoms/TextInput';
import { Button } from '../../components/atoms/Button';
import { SectionHeader } from '../../components/atoms/SectionHeader';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToastStore } from '../../stores/toastStore';
import { LogoService } from '../../services/LogoService';
import { SignaturePadModal } from '../../components/organisms/SignaturePadModal';

export const BusinessSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { settings, loadSettings, updateSettings, isLoading } = useSettingsStore();
  const { showToast } = useToastStore();

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const [signatoryName, setSignatoryName] = useState('');

  const [logoLoading, setLogoLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [cacheBuster, setCacheBuster] = useState(Date.now());

  // Load defaults on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSettings();
    }, 100);
    return () => clearTimeout(timer);
  }, [loadSettings]);

  // Load settings into form on mount/update
  useEffect(() => {
    if (settings) {
      setName(settings.name);
      setAddress(settings.address);
      setPhone(settings.phone);
      setEmail(settings.email);
      setGstin(settings.gstin);
      setLogoPath(settings.logoPath);
      setSignaturePath((settings as any).signaturePath ?? null);
      setSignatoryName((settings as any).signatoryName ?? '');
    }
  }, [settings]);

  const handlePickLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Gallery permission is required to choose a business logo.', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square is optimal for business logos
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        setLogoLoading(true);
        const resizedPath = await LogoService.resizeAndSave(pickedUri, 'business_logo.jpg');
        setLogoPath(resizedPath);
        setCacheBuster(Date.now());
        showToast('Logo updated successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to select logo', 'error');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setLogoLoading(true);
      await LogoService.deleteLogo();
      setLogoPath(null);
      showToast('Logo removed.', 'success');
    } catch {
      showToast('Failed to remove logo.', 'error');
    } finally {
      setLogoLoading(false);
    }
  };

  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const handlePickSignature = () => {
    Alert.alert(
      'Add Signature',
      'Choose how you want to add your signature',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Draw Signature', onPress: () => setShowSignatureModal(true) },
        { text: 'Upload from Gallery', onPress: handleGallerySignature },
      ],
      { cancelable: true }
    );
  };

  const handleGallerySignature = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Gallery permission is required to choose a signature image.', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1], // Wide ratio for signature
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        setLogoLoading(true);
        // Resize & persist into app document directory with distinct filename
        const resizedPath = await LogoService.resizeAndSave(pickedUri, 'business_signature.jpg');
        setSignaturePath(resizedPath);
        setCacheBuster(Date.now());
        showToast('Signature updated!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to select signature image', 'error');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleSaveDrawnSignature = async (base64Signature: string) => {
    try {
      setShowSignatureModal(false);
      setLogoLoading(true);
      // The base64Signature comes as a data URI from the canvas
      const savedPath = await LogoService.resizeAndSave(base64Signature, 'business_signature_drawn.png');
      setSignaturePath(savedPath);
      setCacheBuster(Date.now());
      showToast('Signature drawn and saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save drawn signature', 'error');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleRemoveSignature = async () => {
    try {
      setLogoLoading(true);
      await LogoService.deleteSignature();
      setSignaturePath(null);
      showToast('Signature removed.', 'success');
    } catch {
      showToast('Failed to remove signature.', 'error');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleSave = async () => {
    setNameError('');
    if (!name.trim()) {
      setNameError('Business Name is required.');
      showToast('Please correct validation errors before saving.', 'error');
      return;
    }

    try {
      await updateSettings({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstin: gstin.trim(),
        logoPath: logoPath,
        signaturePath: signaturePath,
        signatoryName: signatoryName.trim(),
      } as any);
      showToast('Business details updated successfully!', 'success');
      navigation.goBack();
    } catch (error: any) {
      showToast(error.message || 'Failed to save business settings.', 'error');
    }
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <SectionHeader title="Business Details" subtitle="This details will appear at the header of your invoices." />

      {/* Logo Upload Picker Section */}
      <View style={styles.logoSection}>
        <Text style={[styles.logoLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium, marginBottom: spacing.sm }]}>
          Business Logo
        </Text>
        <View style={styles.logoRow}>
          <View
            style={[
              styles.logoPreviewContainer,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                padding: spacing.xs,
              },
            ]}
          >
            {logoLoading ? (
              <ActivityIndicator size="small" color={colors.accent} style={styles.logoPlaceholder} />
            ) : logoPath ? (
              <Image source={{ uri: `${logoPath}?t=${cacheBuster}` }} style={[styles.logoImage, { borderRadius: borderRadius.md }]} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: colors.background, borderRadius: borderRadius.md }]}>
                <Ionicons name="image" size={32} color={colors.placeholder} />
                <Text style={[styles.logoPlaceholderText, { color: colors.placeholder, fontSize: typography.fontSizes.xs - 2, marginTop: 4 }]}>
                  No Logo
                </Text>
              </View>
            )}
          </View>

          <View style={styles.logoActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickLogo}
              style={[styles.logoButton, { backgroundColor: colors.accentLight, borderRadius: borderRadius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}
            >
              <Ionicons name="camera" size={16} color={colors.accent} style={styles.logoBtnIcon} />
              <Text style={[styles.logoButtonText, { color: colors.accent, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold }]}>
                {logoPath ? 'Change Logo' : 'Add Logo'}
              </Text>
            </TouchableOpacity>

            {logoPath ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleRemoveLogo}
                style={[styles.removeLogoButton, { borderColor: colors.danger, borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.xs }]}
              >
                <Ionicons name="trash" size={14} color={colors.danger} style={styles.logoBtnIcon} />
                <Text style={[styles.removeLogoText, { color: colors.danger, fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semibold }]}>
                  Remove Logo
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* Signature Upload Section */}
      <View style={styles.logoSection}>
        <Text style={[styles.logoLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium, marginBottom: spacing.sm }]}>
          Business Signature
        </Text>
        <View style={styles.logoRow}>
          <View
            style={[
              styles.logoPreviewContainer,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                padding: spacing.xs,
              },
            ]}
          >
            {logoLoading ? (
              <ActivityIndicator size="small" color={colors.accent} style={styles.signaturePlaceholder} />
            ) : signaturePath ? (
              <Image source={{ uri: `${signaturePath}?t=${cacheBuster}` }} style={[styles.signatureImage, { borderRadius: borderRadius.md }]} resizeMode="contain" />
            ) : (
              <View style={[styles.signaturePlaceholder, { backgroundColor: colors.background, borderRadius: borderRadius.md }]}>
                <Ionicons name="pencil" size={28} color={colors.placeholder} />
                <Text style={[styles.logoPlaceholderText, { color: colors.placeholder, fontSize: typography.fontSizes.xs - 2, marginTop: 4 }]}>
                  No Signature
                </Text>
              </View>
            )}
          </View>

          <View style={styles.logoActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickSignature}
              style={[styles.logoButton, { backgroundColor: colors.accentLight, borderRadius: borderRadius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}
            >
              <Ionicons name="pencil" size={16} color={colors.accent} style={styles.logoBtnIcon} />
              <Text style={[styles.logoButtonText, { color: colors.accent, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold }]}>
                {signaturePath ? 'Change Signature' : 'Add Signature'}
              </Text>
            </TouchableOpacity>

            {signaturePath ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleRemoveSignature}
                style={[styles.removeLogoButton, { borderColor: colors.danger, borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.xs }]}
              >
                <Ionicons name="trash" size={14} color={colors.danger} style={styles.logoBtnIcon} />
                <Text style={[styles.removeLogoText, { color: colors.danger, fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semibold }]}>
                  Remove Signature
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <Text style={[{ color: colors.placeholder, fontSize: typography.fontSizes.xs - 1, marginTop: spacing.xs }]}>
          Upload a photo of your handwritten signature. It will appear at the bottom of invoices.
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Business Name"
          required={true}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (text.trim()) setNameError('');
          }}
          placeholder="e.g. Acme Electronics Inc."
          error={nameError}
          autoCapitalize="words"
        />

        <TextInput
          label="GSTIN / Tax ID"
          value={gstin}
          onChangeText={setGstin}
          placeholder="e.g. 27AAAAA1111A1Z1"
          autoCapitalize="characters"
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
          placeholder="e.g. billing@acme.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          label="Billing Address"
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. Suite 402, Trade Tower, Mumbai, India"
          multiline={true}
          numberOfLines={3}
          inputStyle={styles.addressInput}
        />

        <TextInput
          label="Signatory Name"
          value={signatoryName}
          onChangeText={setSignatoryName}
          placeholder="e.g. Rajesh Kumar (appears on invoice signature)"
          autoCapitalize="words"
        />
      </View>

      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={isLoading}
        style={[styles.saveButton, { marginTop: spacing.xl }]}
      />

      <SignaturePadModal
        visible={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSaveDrawnSignature}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  logoSection: {
    marginVertical: 12,
  },
  logoLabel: {},
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPreviewContainer: {
    borderWidth: 1.5,
    marginRight: 16,
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  logoPlaceholder: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {},
  logoActions: {
    flex: 1,
    justifyContent: 'center',
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBtnIcon: {
    marginRight: 6,
  },
  logoButtonText: {},
  removeLogoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeLogoText: {},
  signatureImage: {
    width: 120,
    height: 50,
  },
  signaturePlaceholder: {
    width: 120,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
export default BusinessSettingsScreen;
