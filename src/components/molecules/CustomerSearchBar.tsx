import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from '../atoms/TextInput';
import { Customer } from '../../types';
import { CustomerRepository } from '../../db/repositories/CustomerRepository';
import { useTheme } from '../../hooks/useTheme';

type CustomerSearchBarProps = {
  onSelect: (customer: Customer) => void;
  onCreateNew: (name: string) => void;
  placeholder?: string;
};

export const CustomerSearchBar: React.FC<CustomerSearchBarProps> = ({
  onSelect,
  onCreateNew,
  placeholder = 'Search customer by name or phone...',
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleSearch = (text: string) => {
    setQuery(text);
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!text.trim()) {
      setResults([]);
      setIsDropdownOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsDropdownOpen(true);

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const matchingCustomers = await CustomerRepository.search(text);
        setResults(matchingCustomers);
      } catch (error) {
        console.error('Error searching customers:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelectItem = (customer: Customer) => {
    onSelect(customer);
    setQuery('');
    setResults([]);
    setIsDropdownOpen(false);
  };

  const handleCreateNew = () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      onCreateNew(trimmedQuery);
      setQuery('');
      setResults([]);
      setIsDropdownOpen(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Overlay Backdrop to dismiss dropdown on outer taps */}
      {isDropdownOpen ? (
        <TouchableWithoutFeedback onPress={() => setIsDropdownOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      ) : null}

      <View style={styles.inputWrapper}>
        <TextInput
          value={query}
          onChangeText={handleSearch}
          placeholder={placeholder}
          onFocus={() => {
            if (query.trim()) setIsDropdownOpen(true);
          }}
          inputStyle={[styles.input, { paddingLeft: spacing.xl + spacing.sm }]}
        />
        <Ionicons name="search" size={20} color={colors.placeholder} style={[styles.searchIcon, { left: spacing.md }]} />
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.accent} style={[styles.loadingIndicator, { right: spacing.md }]} />
        ) : null}
      </View>

      {/* Floating Results Dropdown List */}
      {isDropdownOpen ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              ...colors.cardShadow,
            },
          ]}
        >
          {results.length > 0 ? (
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
              {results.map((item) => (
                <TouchableOpacity
                  key={item.id.toString()}
                  activeOpacity={0.7}
                  onPress={() => handleSelectItem(item)}
                  style={[styles.row, { borderBottomColor: colors.border, padding: spacing.md }]}
                >
                  <Ionicons name="person-circle" size={24} color={colors.accent} style={styles.rowIcon} />
                  <View style={styles.rowText}>
                    <Text style={[styles.nameText, { color: colors.textPrimary, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold }]}>
                      {item.name}
                    </Text>
                    {item.phone ? (
                      <Text style={[styles.phoneText, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
                        {item.phone}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : !isLoading ? (
            // Option to add as a new customer
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCreateNew}
              style={[styles.addBtn, { padding: spacing.md }]}
            >
              <Ionicons name="add-circle" size={24} color={colors.success} style={styles.rowIcon} />
              <View style={styles.rowText}>
                <Text style={[styles.addText, { color: colors.textPrimary, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold }]}>
                  Add "{query}" as a new customer
                </Text>
                <Text style={[styles.addSubtext, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 2 }]}>
                  Quickly save this customer to your database
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    zIndex: 998,
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    zIndex: 999,
  },
  input: {},
  searchIcon: {
    position: 'absolute',
    top: 21,
    zIndex: 1000,
  },
  loadingIndicator: {
    position: 'absolute',
    top: 21,
    zIndex: 1000,
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    borderWidth: 1.5,
    maxHeight: 200,
    zIndex: 1000,
    overflow: 'hidden',
  },
  list: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  rowIcon: {
    marginRight: 10,
  },
  rowText: {
    flex: 1,
  },
  nameText: {},
  phoneText: {},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addText: {},
  addSubtext: {},
});
export default CustomerSearchBar;
