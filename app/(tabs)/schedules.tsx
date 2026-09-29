import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../src/components/Screen';
import { colors } from '../../src/theme';
import type { Schedule } from '../../src/data/database';

export default function SchedulesScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<Schedule[]>([]);
  useEffect(() => { db.getAllAsync<Schedule>('SELECT * FROM schedules ORDER BY sort_order').then(setItems); }, [db]);
  return <Screen><Text style={styles.title}>Jogging schedules</Text><FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <View style={styles.row}><View style={styles.badge}><Text style={styles.badgeText}>{item.sort_order}</Text></View><View style={styles.copy}><Text style={styles.pattern}>{item.pattern}</Text><Text style={styles.meta}>{Math.round(item.total_run_seconds / 60)} minutes of running</Text></View></View>} /></Screen>;
}

const styles = StyleSheet.create({ title: { color: colors.ink, fontSize: 28, fontWeight: '800', paddingTop: 14 }, list: { paddingTop: 20, paddingBottom: 30 }, row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border }, badge: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.purplePale, alignItems: 'center', justifyContent: 'center' }, badgeText: { color: colors.purple, fontWeight: '800' }, copy: { flex: 1, paddingLeft: 14 }, pattern: { color: colors.ink, fontSize: 15, fontWeight: '700' }, meta: { color: colors.muted, fontSize: 13, marginTop: 4 } });
