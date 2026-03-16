// ROUTER layer — root layout.
// Mounts the two VIPER presenters so every tab can access shared state.
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useNotifications } from '@/hooks/useNotifications';
import { TicketPresenter }  from '@/src/presenters/TicketPresenter';
import { ResultsPresenter } from '@/src/presenters/ResultsPresenter';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  // Poll for result alerts (local notifications only — no remote push in Expo Go)
  useNotifications();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={DarkTheme}>
          <TicketPresenter>
            <ResultsPresenter>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="tabs"  options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style="light" backgroundColor="#0d1117" />
            </ResultsPresenter>
          </TicketPresenter>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
