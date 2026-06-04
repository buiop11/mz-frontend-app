import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthGate } from '@/src/auth/AuthGate';
import { AuthProvider } from '@/src/auth/AuthProvider';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthGate>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: '알림' }} />
            <Stack.Screen name="create" options={{ headerShown: false, title: '안건 생성' }} />
            <Stack.Screen name="category/new" options={{ headerShown: false, title: '카테고리 생성' }} />
            <Stack.Screen name="category/manage" options={{ headerShown: false, title: '카테고리 관리' }} />
            <Stack.Screen name="category/edit" options={{ headerShown: false, title: '카테고리 수정' }} />
            <Stack.Screen name="candidate/edit" options={{ headerShown: false, title: '후보 등록/수정' }} />
            <Stack.Screen name="agenda/[id]" options={{ headerShown: false, title: '안건 상세' }} />
            <Stack.Screen name="calendar/[id]" options={{ headerShown: false, title: '일정 상세' }} />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
}
