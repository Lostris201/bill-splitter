import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { useProStore } from '../store/proStore';
import { ProStatus } from '../types';

// Replace with your actual RevenueCat iOS API key from dashboard
const RC_API_KEY = 'test_LUulRXMLMyAdOPMyQmWYyUmkhDJ';

export function initRevenueCat() {
  Purchases.setLogLevel(LOG_LEVEL.DEBUG); // remove for production
  Purchases.configure({ apiKey: RC_API_KEY });
}

function mapCustomerInfo(info: CustomerInfo): ProStatus {
  const entitlement = info.entitlements.active['pro'];
  if (!entitlement) return { isPro: false, purchaseType: null };

  const productId = entitlement.productIdentifier;
  let purchaseType: ProStatus['purchaseType'] = null;
  if (productId.includes('weekly')) purchaseType = 'weekly';
  else if (productId.includes('monthly')) purchaseType = 'monthly';
  else if (productId.includes('lifetime')) purchaseType = 'lifetime';

  return { isPro: true, purchaseType };
}

export async function syncProStatus() {
  try {
    const info = await Purchases.getCustomerInfo();
    useProStore.getState().setProStatus(mapCustomerInfo(info));
  } catch (e) {
    console.warn('RevenueCat syncProStatus failed:', e);
  }
}

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (e) {
    console.warn('RevenueCat getOfferings failed:', e);
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    useProStore.getState().setProStatus(mapCustomerInfo(customerInfo));
    return true;
  } catch (e: any) {
    if (!e.userCancelled) console.warn('Purchase failed:', e);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    const status = mapCustomerInfo(info);
    useProStore.getState().setProStatus(status);
    return status.isPro;
  } catch (e) {
    console.warn('Restore failed:', e);
    return false;
  }
}
