import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Groups: undefined;
  History: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  DebtDetail: { personId: string; groupId: string; myId: string };
  Paywall: { trigger: 'groups' | 'history' | 'export' };
};
