import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={tabStyles.wrap}>
      <Text style={tabStyles.emoji}>{emoji}</Text>
      {focused && <View style={tabStyles.dot} />}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap:  { alignItems: 'center', paddingTop: 2 },
  emoji: { fontSize: 20 },
  dot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: '#24488D', marginTop: 2 },
});

const TAB_SCREENS = [
  { name: 'index',    title: 'Home',     emoji: String.fromCodePoint(0x1F3E0) },
  { name: 'upload',   title: 'Scan',     emoji: String.fromCodePoint(0x1F4F7) },
  { name: 'history',  title: 'History',  emoji: String.fromCodePoint(0x1F4CB) },
  { name: 'results',  title: 'Results',  emoji: String.fromCodePoint(0x1F3C6) },
  { name: 'predict',  title: 'Predict',  emoji: String.fromCodePoint(0x1F52E) },
  { name: 'settings', title: 'Settings', emoji: String.fromCodePoint(0x2699) + String.fromCodePoint(0xFE0F) },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#010e1f',
          borderTopColor: '#0a2448',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarActiveTintColor: '#FBC63C',
        tabBarInactiveTintColor: '#6b8eb5',
      }}
    >
      {TAB_SCREENS.map(({ name, title, emoji }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused }) => <TabIcon emoji={emoji} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}
