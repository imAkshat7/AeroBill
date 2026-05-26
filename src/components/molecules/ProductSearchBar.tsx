import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from '../atoms/TextInput';
import { Product } from '../../types';
import { ProductRepository } from '../../db/repositories/ProductRepository';
import { useTheme } from '../../hooks/useTheme';

type ProductSearchBarProps = {
  onSelect: (product: Product) => void;
  onCreateNew: (name: string) => void;
  placeholder?: string;
};

export const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
  onSelect,
  onCreateNew,
  placeholder = 'Search product by name or SKU...',
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
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
        const matchingProducts = await ProductRepository.search(text);
        setResults(matchingProducts);
      } catch (error) {
        console.error('Error searching products:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelectItem = (product: Product) => {
    onSelect(product);
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
      {/* Overlay Backdrop */}
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

      {/* Floating Dropdown List */}
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
                  <Ionicons name="cube-outline" size={24} color={colors.accent} style={styles.rowIcon} />
                  <View style={styles.rowText}>
                    <Text style={[styles.nameText, { color: colors.textPrimary, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.priceText, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
                      {item.sku ? `SKU: ${item.sku} · ` : ''}₹{item.defaultPrice.toFixed(2)} / {item.unit}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : !isLoading ? (
            // Option to add new product
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCreateNew}
              style={[styles.addBtn, { padding: spacing.md }]}
            >
              <Ionicons name="add-circle" size={24} color={colors.success} style={styles.rowIcon} />
              <View style={styles.rowText}>
                <Text style={[styles.addText, { color: colors.textPrimary, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold }]}>
                  Add "{query}" as a new product
                </Text>
                <Text style={[styles.addSubtext, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 2 }]}>
                  Quickly save this product to your catalog
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
  priceText: {},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addText: {},
  addSubtext: {},
});
export default ProductSearchBar;
