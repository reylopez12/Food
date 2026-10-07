import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts as usePlayfairFonts,
} from '@expo-google-fonts/playfair-display';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { DirectoryProvider } from '@/context/DirectoryContext';
import { AuthProvider } from '@/lib/auth';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { getApiBase } from '@/lib/apiBase';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — reduces noisy refetches on app focus
    },
  },
});

// Point the API client at the API server (see lib/apiBase.ts).
if (Platform.OS === 'web') {
  // On Replit, Expo Web is served behind the same proxy as /api, so relative
  // requests preserve browser caching and cookie semantics. Running locally
  // there is no proxy, so use the explicit API URL from `pnpm dev:local`.
  setBaseUrl(process.env.EXPO_PUBLIC_API_URL ?? null);
  setAuthTokenGetter(null);
} else {
  const apiBase = getApiBase();
  if (apiBase) {
    setBaseUrl(apiBase);
  }
  // Native clients cannot use browser session cookies.
  setAuthTokenGetter(() => SecureStore.getItemAsync('auth_session_token'));
}

function RootLayoutNav() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="listing/[id]"
        options={{
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [playfairLoaded, playfairError] = usePlayfairFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const fontsLoaded = interLoaded && playfairLoaded;
  const fontError = interError || playfairError;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <DirectoryProvider>
                  <RootLayoutNav />
                </DirectoryProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
