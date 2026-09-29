import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../src/components/Screen';
import { colors } from '../../src/theme';
import { setCurrentSchedule, type Schedule } from '../../src/data/database';

export default function SchedulesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [items, setItems] = useState<Schedule[]>([]);
  const [currentId, setCurrentId] = useState('schedule-01');
  useEffect(() => { db.getAllAsync<Schedule>('SELECT * FROM schedules ORDER BY sort_order').then(setItems); }, [db]);
  useEffect(() => { db.getFirstAsync<{ value: string }>("SELECT value FROM app_metadata WHERE key = 'current_schedule_id'").then((row) => row?.value && setCurrentId(row.value)); }, [db]);
  const chooseSchedule = async (id: string) => { await setCurrentSchedule(db, id); setCurrentId(id); router.replace('/'); };
  return <Screen><Text style={styles.title}>Jogging schedules</Text><FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Pressable onPress={() => chooseSchedule(item.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={[styles.badge, item.id === currentId && styles.selectedBadge]}><Text style={[styles.badgeText, item.id === currentId && styles.selectedBadgeText]}>{item.sort_order}</Text></View><View style={styles.copy}><Text style={styles.pattern}>{item.pattern}</Text><Text style={styles.meta}>{Math.round(item.total_run_seconds / 60)} minutes of running{item.id === currentId ? '  ·  CURRENT' : ''}</Text></View></Pressable>} /></Screen>;
}

const styles = StyleSheet.create({ title: { color: colors.ink, fontSize: 28, fontWeight: '800', paddingTop: 14 }, list: { paddingTop: 20, paddingBottom: 30 }, row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border }, pressed: { opacity: 0.65 }, badge: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.purplePale, alignItems: 'center', justifyContent: 'center' }, selectedBadge: { backgroundColor: colors.purple }, badgeText: { color: colors.purple, fontWeight: '800' }, selectedBadgeText: { color: colors.surface }, copy: { flex: 1, paddingLeft: 14 }, pattern: { color: colors.ink, fontSize: 15, fontWeight: '700' }, meta: { color: colors.muted, fontSize: 13, marginTop: 4 } });
