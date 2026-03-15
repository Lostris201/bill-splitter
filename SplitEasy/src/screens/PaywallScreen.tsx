import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/revenuecat';
import { useProStore } from '../store/proStore';

const FEATURES = [
  'Unlimited groups',
  'Full settlement history',
  'Export expense summaries',
  'Everything stored locally — no cloud',
];

function packageLabel(pkg: PurchasesPackage): { title: string; price: string; sub: string } {
  const id = pkg.product.identifier;
  const price = pkg.product.priceString;
  if (id.includes('weekly')) return { title: 'Pro Weekly', price, sub: 'per week' };
  if (id.includes('monthly')) return { title: 'Pro Monthly', price, sub: 'per month · most popular' };
  return { title: 'Pro Lifetime', price, sub: 'pay once, yours forever' };
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isPro = useProStore((s) => s.isPro);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (isPro) { navigation.goBack(); return; }
    getOfferings().then((pkgs) => {
      setPackages(pkgs);
      setLoading(false);
    });
  }, [isPro]);

  async function handlePurchase(pkg: PurchasesPackage) {
    setPurchasing(true);
    const success = await purchasePackage(pkg);
    setPurchasing(false);
    if (success) navigation.goBack();
  }

  async function handleRestore() {
    setPurchasing(true);
    const restored = await restorePurchases();
    setPurchasing(false);
    if (restored) {
      navigation.goBack();
    } else {
      Alert.alert('No purchases found', 'No active Pro subscription found for this Apple ID.');
    }
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Close button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute top-4 right-4 z-10 w-8 h-8 items-center justify-center"
        style={{ top: insets.top + 12 }}
      >
        <Text className="text-gray-400 text-xl">✕</Text>
      </TouchableOpacity>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40 }}>
        {/* Headline */}
        <Text className="text-3xl font-bold text-gray-900 text-center mt-4">
          Go Pro. Stay private.
        </Text>
        <Text className="text-base text-gray-500 text-center mt-2 mb-8">
          Your data stays on your phone. Always.
        </Text>

        {/* Feature list */}
        <View className="bg-gray-50 rounded-2xl p-5 mb-8">
          {FEATURES.map((f) => (
            <View key={f} className="flex-row items-center mb-3 last:mb-0">
              <Text className="text-brand-green font-bold mr-3">✓</Text>
              <Text className="text-base text-gray-700">{f}</Text>
            </View>
          ))}
        </View>

        {/* Pricing options */}
        {loading ? (
          <ActivityIndicator color="#1D9E75" size="large" className="my-8" />
        ) : (
          packages.map((pkg) => {
            const label = packageLabel(pkg);
            const isMonthly = pkg.product.identifier.includes('monthly');
            return (
              <TouchableOpacity
                key={pkg.identifier}
                onPress={() => !purchasing && handlePurchase(pkg)}
                className={`mb-3 p-4 rounded-2xl border-2 ${
                  isMonthly
                    ? 'border-brand-green bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {isMonthly && (
                  <View className="absolute -top-3 left-4 bg-brand-green px-3 py-0.5 rounded-full">
                    <Text className="text-white text-xs font-semibold">Most popular</Text>
                  </View>
                )}
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-base font-semibold text-gray-900">{label.title}</Text>
                    <Text className="text-sm text-gray-400">{label.sub}</Text>
                  </View>
                  <Text className="text-xl font-bold text-gray-900">{label.price}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Free tier reminder */}
        <Text className="text-xs text-gray-400 text-center mt-4">
          Free version includes 1 group and up to 3 history items.
        </Text>

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} className="py-4 items-center">
          <Text className="text-sm text-gray-400">Restore purchase</Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text className="text-xs text-gray-300 text-center px-4 mb-4">
          Payment charged to your Apple ID. Subscription renews unless cancelled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>

      {purchasing && (
        <View className="absolute inset-0 bg-black/30 items-center justify-center">
          <ActivityIndicator color="white" size="large" />
        </View>
      )}
    </View>
  );
}
