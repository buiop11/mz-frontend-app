import React from 'react';
import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabBarIcon(props: Readonly<{ name: React.ComponentProps<typeof Feather>['name']; color: string }>) {
  return <Feather size={22} style={{ marginBottom: -2 }} {...props} />;
}

function createTabIcon(name: React.ComponentProps<typeof Feather>['name']) {
  return ({ color }: { color: string }) => <TabBarIcon name={name} color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.tabIconSelected,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: {
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: c.surface,
          borderBottomColor: c.border,
        },
        headerTitleStyle: {
          color: c.gold,
          fontWeight: '700',
        },
        headerTintColor: c.gold,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: createTabIcon('home'),
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: '목록',
          tabBarIcon: createTabIcon('list'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '로그',
          tabBarIcon: createTabIcon('clock'),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: '마이',
          tabBarIcon: createTabIcon('user'),
        }}
      />
    </Tabs>
  );
}
