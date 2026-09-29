import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { colors } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.purple,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { height: 84, paddingTop: 8, borderTopColor: colors.border, backgroundColor: colors.surface },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Run', tabBarIcon: ({ color }) => <SymbolView name="figure.run" tintColor={color} size={23} /> }} />
      <Tabs.Screen name="schedules" options={{ title: 'Schedules', tabBarIcon: ({ color }) => <SymbolView name="list.bullet" tintColor={color} size={22} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ color }) => <SymbolView name="chart.xyaxis.line" tintColor={color} size={22} /> }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
