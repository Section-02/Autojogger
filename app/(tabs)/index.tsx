import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Screen } from '../../src/components/Screen';
import { colors } from '../../src/theme';

export default function RunScreen() {
  const [running, setRunning] = useState(false);
  return <Screen>
    <View style={styles.header}><View><Text style={styles.eyebrow}>TODAY'S RUN</Text><Text style={styles.title}>Schedule 1 of 17</Text></View><Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings"><SymbolView name="gearshape" tintColor={colors.muted} size={23} /></Pressable></View>
    <View style={styles.arrows}><Pressable disabled accessibilityRole="button" accessibilityLabel="Previous schedule"><Text style={[styles.arrow, styles.arrowDisabled]}>‹</Text></Pressable><Text style={styles.schedule}>Run 1:00 / Walk 3:30</Text><Pressable accessibilityRole="button" accessibilityLabel="Next schedule"><Text style={styles.arrow}>›</Text></Pressable></View>
    <View style={styles.phaseBox}><Text style={styles.phaseLabel}>WARM UP</Text><Text style={styles.phaseTime}>5:00</Text></View>
    <View style={styles.goWrap}><Pressable accessibilityRole="button" onPress={() => setRunning(true)} style={({ pressed }) => [styles.go, pressed && styles.goPressed]}><Text style={styles.goText}>{running ? 'READY' : 'GO'}</Text></Pressable></View>
    <Text style={styles.count}>Completed 0 times</Text>
  </Screen>;
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }, eyebrow: { color: colors.purple, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, title: { color: colors.ink, fontSize: 27, fontWeight: '800', marginTop: 5 }, arrows: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 34 }, arrow: { color: colors.purple, fontSize: 42, fontWeight: '300', paddingHorizontal: 8 }, arrowDisabled: { color: colors.border }, schedule: { color: colors.ink, fontSize: 16, fontWeight: '700' }, phaseBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purplePale, borderRadius: 22, minHeight: 118, marginTop: 28, paddingVertical: 18 }, phaseLabel: { color: colors.purple, fontSize: 14, fontWeight: '900', letterSpacing: 1.6 }, phaseTime: { color: colors.ink, fontSize: 48, lineHeight: 56, fontWeight: '800', marginTop: 5, fontVariant: ['tabular-nums'] }, goWrap: { alignItems: 'center', marginTop: 32 }, go: { width: 168, height: 168, borderRadius: 84, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', shadowColor: colors.purpleDeep, shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 }, goPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 }, goText: { color: colors.surface, fontSize: 34, fontWeight: '900', letterSpacing: 2 }, count: { textAlign: 'center', color: colors.muted, marginTop: 24, fontSize: 14 } });
