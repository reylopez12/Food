import React, { useEffect } from 'react';
import { Platform, StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
function useTabBarEdgeFix() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'rnav-tab-edge-fix';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    // React Navigation puts paddingHorizontal on the Animated.View that wraps
    // [role="tablist"]. It comes from safe-area insets and can't be overridden
    // via tabBarStyle on the web renderer. This zeros it out.
    el.textContent = `div:has(> [role="tablist"]) { padding-left: 0 !important; padding-right: 0 !important; }`;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);
}

function ClassicTabLayout() {
  useTabBarEdgeFix();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const isCompact = width < 360;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          margin: 0,
          paddingVertical: 12,
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: isCompact ? 13 : 15,
          fontFamily: 'Inter_700Bold',
          paddingBottom: 4,
          letterSpacing: isCompact ? -0.4 : 0,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          minHeight: isWeb ? 112 : 108,
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          paddingHorizontal: 0,
          paddingLeft: 0,
          paddingRight: 0,
          paddingTop: 10,
          ...(isWeb ? { height: 112 } : { height: 108 }),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.card },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={36} />
            ) : (
              <Feather name="home" size={34} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="magnifyingglass" tintColor={color} size={36} />
            ) : (
              <Feather name="search" size={34} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="spin"
        options={{
          title: 'Spin',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shuffle" tintColor={color} size={36} />
            ) : (
              <Feather name="shuffle" size={34} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bookmark" tintColor={color} size={36} />
            ) : (
              <Feather name="bookmark" size={34} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={36} />
            ) : (
              <Feather name="user" size={34} color={color} />
            ),
        }}
      />
      {/* Secondary screens remain navigable without occupying a tab slot. */}
      <Tabs.Screen
        name="map"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none', width: 0 },
          title: 'Map',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none', width: 0 },
          title: 'Alerts',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none', width: 0 },
          title: 'More',
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
