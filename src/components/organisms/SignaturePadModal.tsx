import React, { useRef } from 'react';
import { StyleSheet, View, Modal, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

type SignaturePadModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string) => void;
};

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({ visible, onClose, onSave }) => {
  const { colors, typography, borderRadius, isDark } = useTheme();
  const signatureRef = useRef<SignatureViewRef>(null);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  const handleOK = (signature: string) => {
    onSave(signature);
  };

  // The style for the webview inside the canvas
  const webStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body,html {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
  `;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.surface}
        />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={[styles.cancelText, { color: colors.danger, fontSize: typography.fontSizes.md }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.fontSizes.md }]}>
              Draw Signature
            </Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
              <Text style={[styles.saveText, { color: colors.accent, fontSize: typography.fontSizes.md }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.instructionContainer, { backgroundColor: isDark ? colors.surface : '#F1F5F9' }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.instructionText, { color: colors.textSecondary, fontSize: typography.fontSizes.sm }]}>
              Please sign inside the dashed box below.
            </Text>
          </View>

          <View style={[styles.canvasContainer, { borderColor: colors.border, backgroundColor: '#FFFFFF' }]}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleOK}
              webStyle={webStyle}
              autoClear={false}
              descriptionText="Sign above"
              backgroundColor="transparent"
              penColor="#000000"
              minWidth={2.5}
              maxWidth={5}
            />
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.clearButton, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]} 
              onPress={handleClear}
            >
              <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Clear Signature</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  cancelText: {
    fontWeight: '500',
  },
  saveText: {
    fontWeight: 'bold',
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  instructionText: {
    fontWeight: '500',
  },
  canvasContainer: {
    height: 250,
    margin: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
  },
});
