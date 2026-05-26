import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, RefreshControl, Dimensions, Alert, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { TextInput } from '../../components/atoms/TextInput';
import { Product } from '../../types';
import { ProductRepository } from '../../db/repositories/ProductRepository';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';
import { AnimatedListItem } from '../../components/atoms/AnimatedListItem';

const { width: screenWidth } = Dimensions.get('window');
const DELETE_BUTTON_WIDTH = 90;

export const ProductListScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { showToast } = useToastStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all products from DB
  const loadProducts = async (query = '') => {
    setIsLoading(true);
    try {
      let data: Product[];
      if (query.trim()) {
        data = await ProductRepository.search(query);
      } else {
        data = await ProductRepository.getAll();
      }
      setProducts(data);
    } catch {
      showToast('Failed to load product records.', 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Reload data whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      loadProducts(searchQuery);
    }, [searchQuery])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadProducts(text);
    }, 300);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts(searchQuery);
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.name}? This will archive or delete this item.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductRepository.delete(product.id);
              showToast('Product record removed.', 'success');
              loadProducts(searchQuery);
            } catch {
              showToast('Failed to delete product.', 'error');
            }
          },
        },
      ]
    );
  };

  // Custom Pure JS Swipeable Row Wrapper using ScrollView
  const SwipeableRow: React.FC<{ item: Product; children: React.ReactNode }> = ({ item, children }) => {
    const rowRef = useRef<ScrollView>(null);

    const handleScrollEnd = (e: any) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      if (offsetX > DELETE_BUTTON_WIDTH / 2) {
        rowRef.current?.scrollTo({ x: DELETE_BUTTON_WIDTH, animated: true });
      } else {
        rowRef.current?.scrollTo({ x: 0, animated: true });
      }
    };

    return (
      <ScrollView
        ref={rowRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScrollEndDrag={handleScrollEnd}
        bounces={false}
        contentContainerStyle={{ width: screenWidth + DELETE_BUTTON_WIDTH }}
        style={styles.swipeScroll}
      >
        {/* Main Content card */}
        <View style={{ width: screenWidth, paddingHorizontal: spacing.lg }}>
          {children}
        </View>

        {/* Swipe-to-delete action red overlay */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            rowRef.current?.scrollTo({ x: 0, animated: false });
            handleDelete(item);
          }}
          style={[
            styles.deleteBtn,
            {
              backgroundColor: colors.danger,
              borderRadius: borderRadius.md,
              marginVertical: 6,
              marginRight: spacing.lg,
            },
          ]}
        >
          <Ionicons name="trash" size={22} color="#FFFFFF" />
          <Text style={[styles.deleteBtnText, { fontSize: typography.fontSizes.xs - 2, fontWeight: typography.fontWeights.semibold }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
      {/* Top Search bar wrapper */}
      <View style={[styles.headerSearch, { paddingHorizontal: spacing.lg, borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.searchInputContainer}>
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search product name or SKU..."
            inputStyle={[styles.searchInputField, { paddingLeft: spacing.xl + spacing.sm }]}
          />
          <Ionicons name="search" size={18} color={colors.placeholder} style={[styles.searchIcon, { left: spacing.md }]} />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')} style={[styles.clearBtn, { right: spacing.md }]}>
              <Ionicons name="close-circle" size={18} color={colors.placeholder} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScreenContainer scrollable={false} useSafeArea={false} style={styles.container}>
        <FlashList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          estimatedItemSize={76}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconBadge, { backgroundColor: colors.accentLight, borderRadius: borderRadius.round }]}>
                  <Ionicons name="cube" size={48} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, marginTop: spacing.md }]}>
                  No Products Yet
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary, fontSize: typography.fontSizes.sm, marginTop: spacing.xs, marginHorizontal: spacing.xxl }]}>
                  Your product catalog is empty. Add products or services with pricing defaults for fast item insertions during invoicing.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <SwipeableRow item={item}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                  style={[
                    styles.productCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                      ...colors.cardShadow,
                    },
                  ]}
                >
                  <View style={[styles.avatarBadge, { backgroundColor: colors.accentLight, borderRadius: borderRadius.round }]}>
                    <Ionicons name="cube-outline" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.nameText, { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.priceText, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 2 }]} numberOfLines={1}>
                      {item.sku ? `SKU: ${item.sku} · ` : ''}₹{item.defaultPrice.toFixed(2)} / {item.unit}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.placeholder} />
                </TouchableOpacity>
              </SwipeableRow>
            </AnimatedListItem>
          )}
        />
      </ScreenContainer>

      {/* FAB trigger for create mode */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ProductDetail')}
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent,
            borderRadius: borderRadius.round,
            ...colors.cardShadow,
          },
        ]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  headerSearch: {
    borderBottomWidth: 1.5,
    paddingTop: 8,
    paddingBottom: 2,
    zIndex: 10,
  },
  searchInputContainer: {
    position: 'relative',
    width: '100%',
  },
  searchInputField: {
    marginVertical: 4,
  },
  searchIcon: {
    position: 'absolute',
    top: 17,
  },
  clearBtn: {
    position: 'absolute',
    top: 17,
  },
  container: {
    flex: 1,
    paddingHorizontal: 0,
  },
  swipeScroll: {
    flexDirection: 'row',
  },
  deleteBtn: {
    width: DELETE_BUTTON_WIDTH - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    marginTop: 4,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginVertical: 6,
  },
  avatarBadge: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  nameText: {},
  priceText: {},
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyIconBadge: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {},
  emptyDesc: {
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    zIndex: 99,
  },
});
export default ProductListScreen;
