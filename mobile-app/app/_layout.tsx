// ROUTER layer — root layout.
// Mounts the two VIPER presenters so every tab can access shared state.
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useNotifications } from '@/hooks/useNotifications';
import { TicketPresenter }  from '@/src/presenters/TicketPresenter';
import { ResultsPresenter } from '@/src/presenters/ResultsPresenter';

export const unstable_settings = {
  anchor: 'tabs',
};

export default function RootLayout() {
  // Register push notifications and poll for result alerts
  useNotifications();

  return (
    <ThemeProvider value={DarkTheme}>
      <TicketPresenter>
        <ResultsPresenter>
          <Stack>
            <Stack.Screen name="tabs"  options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="light" backgroundColor="#0d1117" />
        </ResultsPresenter>
      </TicketPresenter>
    </ThemeProvider>
  );
}
