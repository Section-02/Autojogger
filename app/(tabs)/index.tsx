import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeEventEmitter, NativeModules, Pressable, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import { Screen } from '../../src/components/Screen';
import { colors } from '../../src/theme';
import { getCurrentSchedule, setCurrentSchedule, type Schedule, type WorkoutInterval } from '../../src/data/database';

type SessionState = 'idle' | 'ready' | 'active' | 'paused' | 'finished' | 'entry';
type RecoveryState = {
  scheduleId: string;
  sessionState: Exclude<SessionState, 'idle'>;
  currentIndex: number;
  secondsRemaining: number;
  workoutStartedAt: string;
  workoutStatus: 'completed' | 'ended_early';
  workoutModified: boolean;
  distance: string;
  rating: 'easy' | 'just_right' | 'too_hard' | null;
  notes: string;
};
const phaseLabels: Record<WorkoutInterval['phase'], string> = { warmup: 'WARM UP', jog: 'JOG', walk: 'WALK', cooldown: 'COOL DOWN' };
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

export default function RunScreen() {
  const db = useSQLiteContext();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [intervals, setIntervals] = useState<WorkoutInterval[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(300);
  const [workoutStartedAt, setWorkoutStartedAt] = useState<string | null>(null);
  const [workoutStatus, setWorkoutStatus] = useState<'completed' | 'ended_early'>('completed');
  const [workoutModified, setWorkoutModified] = useState(false);
  const [distance, setDistance] = useState('');
  const [rating, setRating] = useState<'easy' | 'just_right' | 'too_hard' | null>(null);
  const [notes, setNotes] = useState('');
  const [voiceCues, setVoiceCues] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [cueVolume, setCueVolume] = useState(1);
  const notificationIds = useRef<string[]>([]);
  const recoveryLoaded = useRef(false);
  const audioSession = NativeModules.AutolauferAudioSession as { startWorkoutAudio?: () => Promise<boolean>; stopWorkoutAudio?: () => Promise<boolean> } | undefined;

  const loadSchedule = useCallback(async () => {
    const current = await getCurrentSchedule(db);
    if (!current) return;
    const preferences = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM app_metadata WHERE key IN ('voice_cues_enabled', 'haptics_enabled', 'cue_volume')");
    const preferenceValues = Object.fromEntries(preferences.map((item) => [item.key, item.value]));
    setVoiceCues(preferenceValues.voice_cues_enabled !== '0');
    setHaptics(preferenceValues.haptics_enabled !== '0');
    setCueVolume(Math.max(0, Math.min(1, Number(preferenceValues.cue_volume ?? 1))));
    const recovery = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_metadata WHERE key = 'active_workout'");
    let selected = current;
    let saved: RecoveryState | null = null;
    if (!recoveryLoaded.current && recovery?.value) {
      try {
        const parsed = JSON.parse(recovery.value) as RecoveryState;
        if (parsed?.scheduleId && parsed?.workoutStartedAt) {
          const recoveredSchedule = await db.getFirstAsync<Schedule>('SELECT * FROM schedules WHERE id = ?', parsed.scheduleId);
          if (recoveredSchedule) { selected = recoveredSchedule; saved = parsed; }
        }
      } catch { /* Ignore an invalid recovery record and load the normal schedule. */ }
    }
    const loadedIntervals = await db.getAllAsync<WorkoutInterval>('SELECT id, phase, duration_seconds FROM schedule_intervals WHERE schedule_id = ? ORDER BY position', selected.id);
    setSchedule(selected);
    setIntervals(loadedIntervals);
    if (saved && !recoveryLoaded.current) {
      recoveryLoaded.current = true;
      setCurrentIndex(saved.currentIndex);
      setSecondsRemaining(saved.secondsRemaining);
      setWorkoutStartedAt(saved.workoutStartedAt);
      setWorkoutStatus(saved.workoutStatus);
      setWorkoutModified(saved.workoutModified);
      setDistance(saved.distance);
      setRating(saved.rating);
      setNotes(saved.notes);
      setSessionState(saved.sessionState);
    } else if (sessionState === 'idle') {
      setCurrentIndex(0); setSecondsRemaining(loadedIntervals[0]?.duration_seconds ?? 300);
    }
  }, [db, sessionState]);

  useFocusEffect(useCallback(() => { loadSchedule(); }, [loadSchedule]));

  const speakCue = useCallback((message: string) => {
    if (haptics) Vibration.vibrate(35);
    if (voiceCues) Speech.speak(message, { volume: cueVolume });
  }, [cueVolume, haptics, voiceCues]);

  useEffect(() => {
    if (!schedule || sessionState === 'idle' || !workoutStartedAt) return;
    const recovery: RecoveryState = { scheduleId: schedule.id, sessionState, currentIndex, secondsRemaining, workoutStartedAt, workoutStatus, workoutModified, distance, rating, notes };
    void db.runAsync("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('active_workout', ?)", JSON.stringify(recovery));
  }, [db, schedule, sessionState, currentIndex, secondsRemaining, workoutStartedAt, workoutStatus, workoutModified, distance, rating, notes]);

  useEffect(() => {
    if (sessionState !== 'ready' && sessionState !== 'active') return;
    const timer = setInterval(() => {
      setSecondsRemaining((remaining) => {
        if (remaining > 1) return remaining - 1;
        if (sessionState === 'ready') {
          const first = intervals[0];
          if (first) { setSessionState('active'); setCurrentIndex(0); speakCue(phaseLabels[first.phase]); return first.duration_seconds; }
        }
        const nextIndex = currentIndex + 1;
        const next = intervals[nextIndex];
        if (!next) { void cancelNotifications(); setWorkoutStatus('completed'); setSessionState('entry'); speakCue('Workout complete'); return 0; }
        setCurrentIndex(nextIndex);
        speakCue(phaseLabels[next.phase]);
        return next.duration_seconds;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionState, currentIndex, intervals, speakCue]);

  const moveSchedule = async (direction: -1 | 1) => {
    if (!schedule || sessionState !== 'idle') return;
    const next = await db.getFirstAsync<Schedule>('SELECT * FROM schedules WHERE sort_order = ?', schedule.sort_order + direction);
    if (next) { await setCurrentSchedule(db, next.id); setSchedule(next); const nextIntervals = await db.getAllAsync<WorkoutInterval>('SELECT id, phase, duration_seconds FROM schedule_intervals WHERE schedule_id = ? ORDER BY position', next.id); setIntervals(nextIntervals); setCurrentIndex(0); setSecondsRemaining(nextIntervals[0]?.duration_seconds ?? 300); }
  };

  const cancelNotifications = async () => { if (notificationIds.current.length) { await Promise.all(notificationIds.current.map((id) => Notifications.cancelScheduledNotificationAsync(id))); notificationIds.current = []; } };
  useEffect(() => {
    if (!audioSession) return;
    const emitter = new NativeEventEmitter(NativeModules.AutolauferAudioSession);
    const subscription = emitter.addListener('AutolauferAudioInterruption', ({ type }: { type: string }) => {
      if (type === 'began' && (sessionState === 'ready' || sessionState === 'active')) {
        void cancelNotifications();
        Speech.stop();
        setSessionState('paused');
      }
    });
    return () => subscription.remove();
  }, [audioSession, sessionState]);
  const scheduleNotifications = async (startIndex: number, firstDelay: number) => {
    await cancelNotifications();
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') return;
    let delay = firstDelay;
    for (let index = startIndex + 1; index < intervals.length; index += 1) {
      const next = intervals[index];
      const following = intervals[index + 1];
      const id = await Notifications.scheduleNotificationAsync({ content: { title: 'Autoläufer', body: following ? `${phaseLabels[next.phase]} · Next: ${phaseLabels[following.phase]} in ${formatTime(next.duration_seconds)}` : phaseLabels[next.phase], sound: 'default' }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + delay * 1000) } });
      notificationIds.current.push(id);
      delay += next.duration_seconds;
    }
  };
  const startWorkout = async () => { if (intervals.length) { const permission = await Notifications.requestPermissionsAsync(); await audioSession?.startWorkoutAudio?.(); setWorkoutStartedAt(new Date().toISOString()); setWorkoutStatus('completed'); setWorkoutModified(false); setDistance(''); setRating(null); setNotes(''); setSessionState('ready'); setSecondsRemaining(5); speakCue('Get ready'); if (permission.status === 'granted') await scheduleNotifications(-1, 5); } };
  const pauseWorkout = async () => { await cancelNotifications(); setSessionState('paused'); };
  const resumeWorkout = async () => { await audioSession?.startWorkoutAudio?.(); setSessionState('active'); await scheduleNotifications(currentIndex, secondsRemaining); };
  const endWorkout = async () => { await cancelNotifications(); await audioSession?.stopWorkoutAudio?.(); Speech.stop(); setWorkoutStatus('ended_early'); setSessionState('entry'); };
  const skipInterval = async () => { const next = intervals[currentIndex + 1]; setWorkoutModified(true); if (!next) { await cancelNotifications(); setWorkoutStatus('completed'); setSessionState('entry'); return; } setCurrentIndex(currentIndex + 1); setSecondsRemaining(next.duration_seconds); speakCue(phaseLabels[next.phase]); if (sessionState === 'active') await scheduleNotifications(currentIndex + 1, next.duration_seconds); };
  const repeatWalk = () => { const current = intervals[currentIndex]; if (current?.phase === 'walk') { setWorkoutModified(true); setSecondsRemaining(current.duration_seconds); speakCue('Walk'); } };
  const saveWorkout = async () => {
    if (!schedule || !workoutStartedAt || !rating) return;
    await cancelNotifications();
    await audioSession?.stopWorkoutAudio?.();
    await db.runAsync('INSERT INTO workouts (id, schedule_id, started_at, ended_at, status, rating, distance_value, distance_unit, notes, modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', `workout-${Date.now()}`, schedule.id, workoutStartedAt, new Date().toISOString(), workoutStatus, rating, distance ? Number(distance) : null, 'mi', notes.trim() || null, workoutModified ? 1 : 0);
    await db.runAsync("DELETE FROM app_metadata WHERE key = 'active_workout'");
    setSessionState('idle'); setCurrentIndex(0); setSecondsRemaining(intervals[0]?.duration_seconds ?? 300); setWorkoutStartedAt(null);
  };

  const currentInterval = intervals[currentIndex];
  const displayPhase = sessionState === 'ready' ? 'GET READY' : sessionState === 'finished' ? 'COMPLETE' : phaseLabels[currentInterval?.phase ?? 'warmup'];
  const nextInterval = sessionState === 'active' || sessionState === 'paused' ? intervals[currentIndex + 1] : undefined;

  return <Screen>
    <View style={styles.header}><View><Text style={styles.eyebrow}>TODAY'S RUN</Text><Text style={styles.title}>Schedule {schedule?.sort_order ?? 1} of 17</Text></View><Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings"><SymbolView name="gearshape" tintColor={colors.muted} size={23} /></Pressable></View>
    <View style={styles.arrows}><Pressable style={styles.arrowButton} disabled={!schedule || schedule.sort_order === 1 || sessionState !== 'idle'} onPress={() => moveSchedule(-1)} accessibilityRole="button" accessibilityLabel="Previous schedule"><Text style={[styles.arrow, (!schedule || schedule.sort_order === 1 || sessionState !== 'idle') && styles.arrowDisabled]}>‹</Text></Pressable><Text style={styles.schedule}>{schedule?.pattern ?? 'Loading schedule…'}</Text><Pressable style={styles.arrowButton} disabled={!schedule || schedule.sort_order === 17 || sessionState !== 'idle'} onPress={() => moveSchedule(1)} accessibilityRole="button" accessibilityLabel="Next schedule"><Text style={[styles.arrow, (!schedule || schedule.sort_order === 17 || sessionState !== 'idle') && styles.arrowDisabled]}>›</Text></Pressable></View>
    {sessionState !== 'entry' && <View style={styles.phaseBox}><Text style={styles.phaseLabel}>{displayPhase}</Text><Text style={styles.phaseTime}>{sessionState === 'finished' ? '✓' : formatTime(secondsRemaining)}</Text>{nextInterval && <Text style={styles.next}>NEXT: {phaseLabels[nextInterval.phase]} · {formatTime(nextInterval.duration_seconds)}</Text>}</View>}
    {sessionState === 'entry' ? <View style={styles.entry}><Text style={styles.entryTitle}>Workout complete</Text><Text style={styles.entryLabel}>TOTAL DISTANCE (MILES)</Text><TextInput value={distance} onChangeText={setDistance} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.muted} style={styles.input} /><Text style={styles.entryLabel}>HOW DID IT FEEL?</Text><View style={styles.ratingRow}>{[['easy', 'EASY'], ['just_right', 'JUST RIGHT'], ['too_hard', 'TOO HARD']].map(([value, label]) => <Pressable key={value} onPress={() => setRating(value as typeof rating)} style={[styles.rating, rating === value && styles.ratingSelected]}><Text style={[styles.ratingText, rating === value && styles.ratingTextSelected]}>{label}</Text></Pressable>)}</View><Text style={styles.entryLabel}>NOTES</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Optional" placeholderTextColor={colors.muted} style={[styles.input, styles.notes]} multiline /><Pressable disabled={!rating} onPress={saveWorkout} style={[styles.saveButton, !rating && styles.saveDisabled]}><Text style={styles.saveText}>SAVE WORKOUT</Text></Pressable></View> : sessionState === 'idle' || sessionState === 'finished' ? <View style={styles.goWrap}><Pressable accessibilityRole="button" onPress={startWorkout} style={({ pressed }) => [styles.go, pressed && styles.goPressed]}><Text style={styles.goText}>{sessionState === 'finished' ? 'AGAIN' : 'GO'}</Text></Pressable></View> : <View style={styles.controls}><Pressable style={styles.controlButton} onPress={sessionState === 'paused' ? resumeWorkout : pauseWorkout}><Text style={styles.controlText}>{sessionState === 'paused' ? 'RESUME' : 'PAUSE'}</Text></Pressable><Pressable style={styles.controlButton} onPress={skipInterval}><Text style={styles.controlText}>SKIP</Text></Pressable>{currentInterval?.phase === 'walk' && <Pressable style={styles.controlButton} onPress={repeatWalk}><Text style={styles.controlText}>REPEAT WALK</Text></Pressable>}<Pressable style={styles.endButton} onPress={endWorkout}><Text style={styles.endText}>END WORKOUT</Text></Pressable></View>}
    <Text style={styles.count}>Completed 0 times</Text>
  </Screen>;
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }, eyebrow: { color: colors.purple, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, title: { color: colors.ink, fontSize: 27, fontWeight: '800', marginTop: 5 }, arrows: { flexDirection: 'row', alignItems: 'center', marginTop: 34 }, arrowButton: { width: 36, alignItems: 'center' }, arrow: { color: colors.purple, fontSize: 42, fontWeight: '300' }, arrowDisabled: { color: colors.border }, schedule: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '700', lineHeight: 22, textAlign: 'center', paddingHorizontal: 8 }, phaseBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purplePale, borderRadius: 22, minHeight: 136, marginTop: 28, paddingVertical: 18 }, phaseLabel: { color: colors.purple, fontSize: 14, fontWeight: '900', letterSpacing: 1.6 }, phaseTime: { color: colors.ink, fontSize: 48, lineHeight: 56, fontWeight: '800', marginTop: 5, fontVariant: ['tabular-nums'] }, next: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 8 }, goWrap: { alignItems: 'center', marginTop: 32 }, go: { width: 168, height: 168, borderRadius: 84, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', shadowColor: colors.purpleDeep, shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 }, goPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 }, goText: { color: colors.surface, fontSize: 34, fontWeight: '900', letterSpacing: 2 }, controls: { alignItems: 'center', gap: 10, marginTop: 28 }, controlButton: { minWidth: 180, paddingVertical: 13, paddingHorizontal: 24, borderRadius: 22, backgroundColor: colors.purple, alignItems: 'center' }, controlText: { color: colors.surface, fontSize: 14, fontWeight: '900', letterSpacing: 0.7 }, endButton: { marginTop: 6, paddingVertical: 10 }, endText: { color: colors.red, fontSize: 13, fontWeight: '800' }, entry: { marginTop: 24 }, entryTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', marginBottom: 20 }, entryLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 7 }, input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.ink, fontSize: 18, paddingHorizontal: 14, paddingVertical: 11 }, notes: { minHeight: 72, textAlignVertical: 'top' }, ratingRow: { flexDirection: 'row', gap: 6 }, rating: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, alignItems: 'center' }, ratingSelected: { backgroundColor: colors.purple, borderColor: colors.purple }, ratingText: { color: colors.ink, fontSize: 11, fontWeight: '800' }, ratingTextSelected: { color: colors.surface }, saveButton: { backgroundColor: colors.purple, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 22 }, saveDisabled: { opacity: 0.45 }, saveText: { color: colors.surface, fontSize: 14, fontWeight: '900' }, count: { textAlign: 'center', color: colors.muted, marginTop: 24, fontSize: 14 } });
