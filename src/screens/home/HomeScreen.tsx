import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, RefreshControl, ScrollView, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../stores/settingsStore';
import { useInvoiceDraftStore } from '../../stores/invoiceDraftStore';
import { InvoiceRepository } from '../../db/repositories/InvoiceRepository';
import { Invoice } from '../../types';

type HomeStackParamList = {
  HomeRoot: undefined;
  InvoiceCustomerStep: undefined;
  InvoiceHistory: undefined;
  InvoiceDetail: { invoiceId: number };
};

type NavigationProp = StackNavigationProp<HomeStackParamList & { InvoicesTab: undefined }>;

export const HomeScreen: React.FC = () => {
  const { colors, typography, spacing, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  
  const { settings, loadSettings } = useSettingsStore();
  const { resetDraft } = useInvoiceDraftStore();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalInvoiced, setTotalInvoiced] = useState(0);
  const [thisMonthInvoiced, setThisMonthInvoiced] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStartingDraft, setIsStartingDraft] = useState(false);

  // Animation values for staggered entrance
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardFade1 = useRef(new Animated.Value(0)).current;
  const cardTranslateY1 = useRef(new Animated.Value(15)).current;
  const cardFade2 = useRef(new Animated.Value(0)).current;
  const cardTranslateY2 = useRef(new Animated.Value(15)).current;
  const cardFade3 = useRef(new Animated.Value(0)).current;
  const cardTranslateY3 = useRef(new Animated.Value(15)).current;
  const listFade = useRef(new Animated.Value(0)).current;
  const listTranslateY = useRef(new Animated.Value(20)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  const triggerEntranceAnimations = useCallback(() => {
    // Reset animations
    headerFade.setValue(0);
    cardFade1.setValue(0);
    cardTranslateY1.setValue(15);
    cardFade2.setValue(0);
    cardTranslateY2.setValue(15);
    cardFade3.setValue(0);
    cardTranslateY3.setValue(15);
    listFade.setValue(0);
    listTranslateY.setValue(20);
    fabScale.setValue(0);

    Animated.stagger(80, [
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardFade1, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(cardTranslateY1, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade2, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(cardTranslateY2, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade3, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(cardTranslateY3, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(listFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(listTranslateY, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
      ]),
      Animated.spring(fabScale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerFade, cardFade1, cardTranslateY1, cardFade2, cardTranslateY2, cardFade3, cardTranslateY3, listFade, listTranslateY, fabScale]);

  // Run on mount
  useEffect(() => {
    triggerEntranceAnimations();
  }, [triggerEntranceAnimations]);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Load current business settings
      await loadSettings();
      
      // Get all active invoices
      const allInvoices = await InvoiceRepository.getAll();
      setTotalCount(allInvoices.length);
      
      // Calculations
      let sumTotal = 0;
      let monthSum = 0;
      const currentMonthStr = dayjs().format('YYYY-MM');

      allInvoices.forEach(inv => {
        sumTotal += inv.grandTotal;
        if (inv.invoiceDate.startsWith(currentMonthStr)) {
          monthSum += inv.grandTotal;
        }
      });

      setTotalInvoiced(sumTotal);
      setThisMonthInvoiced(monthSum);

      // Get last 5 invoices
      const recent = allInvoices.slice(0, 5);
      setInvoices(recent);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, [loadSettings]);

  // Refresh dashboard metrics when screen focuses or on manual pull-to-refresh
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        fetchDashboardData();
      }, 100);
      return () => clearTimeout(timer);
    }, [fetchDashboardData])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  const handleStartWizard = async () => {
    if (isStartingDraft) return;
    setIsStartingDraft(true);
    try {
      await resetDraft();
      navigation.navigate('InvoiceCustomerStep');
    } catch (error) {
      console.error('Failed to start invoice draft:', error);
    } finally {
      setIsStartingDraft(false);
    }
  };

  // Compute greeting
  const getGreeting = () => {
    const hour = dayjs().hour();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const currency = settings?.currencySymbol ?? '₹';
  const businessName = settings?.name?.trim() ? settings.name : 'Your Business';

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.md }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Header Block */}
        <Animated.View style={[styles.headerSection, { opacity: headerFade }]}>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontSize: typography.fontSizes.sm }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.businessName, { color: colors.textPrimary, fontSize: typography.fontSizes.xl }]} numberOfLines={1}>
            {businessName}
          </Text>
        </Animated.View>

        {/* Dynamic Nudge Banner for New Users */}
        {totalCount === 0 && (
          <TouchableOpacity
            style={[styles.nudgeBanner, { backgroundColor: colors.accent + '15', borderColor: colors.accent }]}
            onPress={handleStartWizard}
            activeOpacity={0.8}
          >
            <View style={styles.nudgeTextContainer}>
              <Text style={[styles.nudgeTitle, { color: colors.accent, fontSize: typography.fontSizes.md }]}>
                Welcome to AeroBill! ✨
              </Text>
              <Text style={[styles.nudgeSubtitle, { color: colors.textSecondary, fontSize: typography.fontSizes.sm }]}>
                Create your first invoice in just seconds. 100% offline, quick, and extremely secure.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={colors.accent} />
          </TouchableOpacity>
        )}

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Card 1: Total Invoiced */}
          <Animated.View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: cardFade1, transform: [{ translateY: cardTranslateY1 }] }]}>
            <Ionicons name="wallet-outline" size={20} color={colors.accent} style={styles.statIcon} />
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
              Total Invoiced
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: typography.fontSizes.md }]} numberOfLines={1}>
              {currency}{totalInvoiced.toFixed(2)}
            </Text>
          </Animated.View>

          {/* Card 2: This Month */}
          <Animated.View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: cardFade2, transform: [{ translateY: cardTranslateY2 }] }]}>
            <Ionicons name="calendar-outline" size={20} color="#10B981" style={styles.statIcon} />
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
              This Month
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: typography.fontSizes.md }]} numberOfLines={1}>
              {currency}{thisMonthInvoiced.toFixed(2)}
            </Text>
          </Animated.View>

          {/* Card 3: Count */}
          <Animated.View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 0.95, opacity: cardFade3, transform: [{ translateY: cardTranslateY3 }] }]}>
            <Ionicons name="receipt-outline" size={20} color="#F59E0B" style={styles.statIcon} />
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
              Invoices
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: typography.fontSizes.md }]}>
              {totalCount}
            </Text>
          </Animated.View>
        </View>

        {/* Recent Invoices Section */}
        <Animated.View style={{ opacity: listFade, transform: [{ translateY: listTranslateY }] }}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.md }]}>
              Recent Invoices
            </Text>
            {totalCount > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('InvoicesTab')}>
                <Text style={[styles.seeAllText, { color: colors.accent, fontSize: typography.fontSizes.sm }]}>
                  See All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {invoices.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={48} color={colors.placeholder} />
              <Text style={[styles.emptyStateTitle, { color: colors.textSecondary, fontSize: typography.fontSizes.md }]}>
                No invoices created yet
              </Text>
              <Text style={[styles.emptyStateSubtitle, { color: colors.placeholder, fontSize: typography.fontSizes.xs }]}>
                Tap the floating button below to create one.
              </Text>
            </View>
          ) : (
            <View style={[styles.invoiceListContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {invoices.map((item, index) => {
                const customerName = item.customerSnapshot?.name || 'Walk-in Customer';
                const isLastItem = index === invoices.length - 1;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.invoiceRow,
                      !isLastItem && { borderBottomWidth: 1, borderBottomColor: colors.border }
                    ]}
                    onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.invoiceLeft}>
                      <Text style={[styles.invoiceNumber, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
                        {item.invoiceNumber}
                      </Text>
                      <Text style={[styles.invoiceCustomer, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]} numberOfLines={1}>
                        {customerName}
                      </Text>
                    </View>
                    <View style={styles.invoiceRight}>
                      <Text style={[styles.invoiceTotal, { color: colors.textPrimary, fontSize: typography.fontSizes.sm }]}>
                        {item.currencySymbol}{item.grandTotal.toFixed(2)}
                      </Text>
                      <Text style={[styles.invoiceDate, { color: colors.placeholder, fontSize: typography.fontSizes.xs }]}>
                        {dayjs(item.invoiceDate).format('DD MMM YYYY')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button (FAB) with spring scale animation */}
      <Animated.View
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent,
            borderRadius: borderRadius.round,
            transform: [{ scale: fabScale }],
            ...colors.cardShadow,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fabTouch}
          onPress={handleStartWizard}
          activeOpacity={0.8}
          disabled={isStartingDraft}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Safe space for FAB
  },
  headerSection: {
    marginBottom: 20,
    marginTop: 10,
  },
  greeting: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  businessName: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  nudgeBanner: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  nudgeTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  nudgeTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nudgeSubtitle: {
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statLabel: {
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontWeight: '700',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  seeAllText: {
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    textAlign: 'center',
  },
  invoiceListContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  invoiceLeft: {
    flex: 1,
    marginRight: 12,
  },
  invoiceNumber: {
    fontWeight: '700',
    marginBottom: 4,
  },
  invoiceCustomer: {
    fontWeight: '500',
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceTotal: {
    fontWeight: '700',
    marginBottom: 4,
  },
  invoiceDate: {
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
});

export default HomeScreen;
