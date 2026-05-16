import React from 'react';
import { NavigationContainer, DefaultTheme as NavLight } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import DetectByLinkScreen from '../screens/DetectByLinkScreen';
import DetectByFeaturesScreen from '../screens/DetectByFeaturesScreen';
import UsernameAnalyzerScreen from '../screens/UsernameAnalyzerScreen';
import BioAnalyzerScreen from '../screens/BioAnalyzerScreen';
import ResultScreen from '../screens/ResultScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import type { PredictionResult } from '../api';

export type RootStackParamList = {
  Tabs: undefined;
  DetectByLink: { prefillUrl?: string } | undefined;
  DetectByFeatures: { prefill?: any } | undefined;
  UsernameAnalyzer: undefined;
  BioAnalyzer: undefined;
  Result: { result: PredictionResult; method: 'link' | 'features' | 'username' | 'bio'; label: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...NavLight,
  colors: {
    ...NavLight.colors,
    background: colors.bg,
    card: colors.bgSurface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
    notification: colors.primary,
  },
};

function Tabs() {
  // When we set `tabBarStyle.paddingBottom`, React Navigation v7 stops applying
  // its own safe-area inset — so we have to add it back manually, otherwise
  // labels get hidden behind Android's gesture bar.
  const insets = useSafeAreaInsets();
  // +10 extra so labels have breathing room before the gesture bar / screen edge
  const bottomPad = Math.max(insets.bottom, 8) + 10;
  const CONTENT_HEIGHT = 42; // icon (~22) + tight gap + label (~14) + small slack
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.border,
          height: CONTENT_HEIGHT + bottomPad,
          paddingTop: 6,
          paddingBottom: bottomPad,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 0 },
        tabBarIcon: ({ color, size, focused }) => {
          const map: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            Home: ['shield-checkmark', 'shield-checkmark-outline'],
            History: ['time', 'time-outline'],
            Settings: ['settings', 'settings-outline'],
          };
          const [solid, outline] = map[route.name] || ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? solid : outline} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bgSurface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="DetectByLink" component={DetectByLinkScreen} options={{ title: 'Detect by Link' }} />
        <Stack.Screen name="DetectByFeatures" component={DetectByFeaturesScreen} options={{ title: 'Manual Analysis' }} />
        <Stack.Screen name="UsernameAnalyzer" component={UsernameAnalyzerScreen} options={{ title: 'Username Check' }} />
        <Stack.Screen name="BioAnalyzer" component={BioAnalyzerScreen} options={{ title: 'Bio Analyzer' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Detection Result' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
