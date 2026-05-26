import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, RefreshControl, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';

import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { TextInput } from '../../components/atoms/TextInput';
import { InvoiceSummaryCard } from '../../components/molecules/InvoiceSummaryCard';
import { Invoice } from '../../types';
import { InvoiceRepository } from '../../db/repositories/InvoiceRepository';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';
import { AnimatedListItem } from '../../components/atoms/AnimatedListItem';

type InvoiceHistoryStackParamList = {
  InvoiceHistory: undefined;
  InvoiceDetail: { invoiceId: number };
};

type NavigationProp = StackNavigationProp<InvoiceHistoryStackParamList>;

type FilterType = 'All' | 'This Week' | 'This Month' | 'This Year';

export const InvoiceHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { showToast } = useToastStore();

  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper method to filter by date range
  const filterByDateRange = (invoiceDateStr: string, range: FilterType): boolean => {
    if (range === 'All') return true;
    
    const invoiceDate = dayjs(invoiceDateStr);
    const now = dayjs();
    
    if (range === 'This Week') {
      const startOfWeek = now.startOf('week');
      const endOfWeek = now.endOf('week');
      return (invoiceDate.isAfter(startOfWeek.subtract(1, 'day')) && invoiceDate.isBefore(endOfWeek.add(1, 'day')));
    }
    
    if (range === 'This Month') {
      const currentMonthStr = now.format('YYYY-MM');
      return invoiceDateStr.startsWith(currentMonthStr);
    }
    
    if (range === 'This Year') {
      const currentYearStr = now.format('YYYY');
      return invoiceDateStr.startsWith(currentYearStr);
    }
    
    return true;
  };

  // Main filter and search execution
  const applyFilters = useCallback((invoicesList: Invoice[], query: string, filter: FilterType) => {
    let result = [...invoicesList];

    // 1. Apply Date Filter
    if (filter !== 'All') {
      result = result.filter(inv => filterByDateRange(inv.invoiceDate, filter));
    }

    // 2. Apply Debounced Search (filters code sequence or client name)
    if (query.trim()) {
      const normalizedQuery = query.toLowerCase().trim();
      result = result.filter(inv => {
        const customerName = inv.customerSnapshot?.name?.toLowerCase() || 'walk-in customer';
        const invoiceNum = inv.invoiceNumber.toLowerCase();
        return customerName.includes(normalizedQuery) || invoiceNum.includes(normalizedQuery);
      });
    }

    setFilteredInvoices(result);
  }, []);

  // Fetch all active invoices from database
  const loadInvoices = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) {
      setIsLoading(true);
    }
    try {
      const data = await InvoiceRepository.getAll();
      setAllInvoices(data);
      applyFilters(data, searchQuery, activeFilter);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      showToast('Failed to load invoice history.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Reload history whenever screen focuses
  useFocusEffect(
    useCallback(() => {
      loadInvoices(allInvoices.length === 0);
    }, [searchQuery, activeFilter])
  );

  // Debounced search handling
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      applyFilters(allInvoices, text, activeFilter);
      setDisplayLimit(20); // Reset pagination on new search
    }, 300);
  };

  // Chip filter selection change
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    applyFilters(allInvoices, searchQuery, filter);
    setDisplayLimit(20); // Reset pagination on filter change
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadInvoices();
  };

  const handleLoadMore = () => {
    if (displayLimit < filteredInvoices.length) {
      setDisplayLimit(prev => prev + 20);
    }
  };

  const displayedInvoices = filteredInvoices.slice(0, displayLimit);

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
      {/* Top Polish Search Panel & Visual Chips Container */}
      <View style={[styles.topPanel, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={[styles.searchInputContainer, { paddingHorizontal: spacing.md }]}>
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search invoice number or customer..."
            inputStyle={[styles.searchInputField, { paddingLeft: spacing.xl + spacing.sm }]}
          />
          <Ionicons name="search" size={18} color={colors.placeholder} style={[styles.searchIcon, { left: spacing.md + 12 }]} />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')} style={[styles.clearBtn, { right: spacing.md + 12 }]}>
              <Ionicons name="close-circle" size={18} color={colors.placeholder} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Horizontal scrollable date filters chips */}
        <View style={styles.chipsOuter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.chipsScroll, { paddingHorizontal: spacing.md }]}
          >
            {(['All', 'This Week', 'This Month', 'This Year'] as FilterType[]).map((chip) => {
              const isActive = activeFilter === chip;
              return (
                <TouchableOpacity
                  key={chip}
                  activeOpacity={0.8}
                  onPress={() => handleFilterChange(chip)}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: isActive ? colors.accent : colors.surface,
                      borderColor: isActive ? colors.accent : colors.border,
                      borderRadius: borderRadius.round,
                      marginRight: spacing.xs,
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isActive ? '#FFFFFF' : colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {chip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Invoices Virtualized Scroll Container */}
      <ScreenContainer scrollable={false} useSafeArea={false} style={styles.container}>
        {isLoading ? (
          <View style={styles.centerSpinner}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlashList
            data={displayedInvoices}
            keyExtractor={(item) => item.id.toString()}
            estimatedItemSize={78}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 30 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[colors.accent]}
                tintColor={colors.accent}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconBadge, { backgroundColor: colors.accentLight, borderRadius: borderRadius.round }]}>
                  <Ionicons name="receipt" size={42} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, marginTop: spacing.md }]}>
                  No Invoices Found
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary, fontSize: typography.fontSizes.sm, marginTop: spacing.xs }]}>
                  {allInvoices.length === 0
                    ? 'Create your first invoice by tapping the + button on the Home tab dashboard!'
                    : 'Try checking your date range selection or search filter settings.'}
                </Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <AnimatedListItem index={index}>
                <InvoiceSummaryCard
                  invoice={item}
                  onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
                />
              </AnimatedListItem>
            )}
          />
        )}
      </ScreenContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  topPanel: {
    borderBottomWidth: 1.5,
    paddingTop: 8,
    paddingBottom: 8,
    elevation: 2,
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
  chipsOuter: {
    marginTop: 6,
    width: '100%',
  },
  chipsScroll: {
    paddingVertical: 4,
  },
  chipBtn: {
    borderWidth: 1,
  },
  chipText: {
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  centerSpinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 30,
  },
  emptyIconBadge: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {},
  emptyDesc: {
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default InvoiceHistoryScreen;
