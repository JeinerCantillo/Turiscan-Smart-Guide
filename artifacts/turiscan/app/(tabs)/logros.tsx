import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Animated,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "@/constants/colors";

const ACHIEVEMENTS = [
  {
    id: "primer-escaneo",
    emoji: "🎯",
    title: "Primer Explorador",
    desc: "Escanea tu primer código QR turístico",
    xp: 50,
    condition: (stats: Stats) => stats.scansCount >= 1,
  },
  {
    id: "tres-lugares",
    emoji: "🗺️",
    title: "Curioso por Naturaleza",
    desc: "Visita 3 lugares diferentes de Ciénaga",
    xp: 100,
    condition: (stats: Stats) => stats.placesVisited.length >= 3,
  },
  {
    id: "historiador",
    emoji: "📖",
    title: "Historiador Costeño",
    desc: "Escucha la narración de 3 lugares",
    xp: 75,
    condition: (stats: Stats) => stats.narrationsListened >= 3,
  },
  {
    id: "viajero-vr",
    emoji: "🥽",
    title: "Viajero Virtual",
    desc: "Disfruta 2 experiencias de video 360°",
    xp: 150,
    condition: (stats: Stats) => stats.vrVideosWatched >= 2,
  },
  {
    id: "reseniador",
    emoji: "⭐",
    title: "Voz de la Comunidad",
    desc: "Deja tu primera reseña de un lugar",
    xp: 80,
    condition: (stats: Stats) => stats.reviewsLeft >= 1,
  },
  {
    id: "cinco-escaneos",
    emoji: "📸",
    title: "Cazador de QR",
    desc: "Escanea 5 códigos QR diferentes",
    xp: 120,
    condition: (stats: Stats) => stats.scansCount >= 5,
  },
  {
    id: "todos-lugares",
    emoji: "🏆",
    title: "Ciudadano de Ciénaga",
    desc: "Visita todos los lugares registrados",
    xp: 300,
    condition: (stats: Stats) => stats.placesVisited.length >= 5,
  },
  {
    id: "explorador-vr",
    emoji: "🌐",
    title: "Maestro del 360°",
    desc: "Experimenta 5 videos en 360°",
    xp: 200,
    condition: (stats: Stats) => stats.vrVideosWatched >= 5,
  },
];

export interface Stats {
  scansCount: number;
  placesVisited: number[];
  narrationsListened: number;
  vrVideosWatched: number;
  reviewsLeft: number;
  totalXp: number;
}

const DEFAULT_STATS: Stats = {
  scansCount: 0,
  placesVisited: [],
  narrationsListened: 0,
  vrVideosWatched: 0,
  reviewsLeft: 0,
  totalXp: 0,
};

export const STATS_KEY = "turiscan_stats_v1";

export async function loadStats(): Promise<Stats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}

export async function updateStats(patch: Partial<Stats>): Promise<Stats> {
  const current = await loadStats();
  const updated = { ...current, ...patch };
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(updated));
  return updated;
}

export async function incrementStat(key: keyof Stats, placeId?: number): Promise<void> {
  const current = await loadStats();
  if (key === "placesVisited" && placeId !== undefined) {
    if (!current.placesVisited.includes(placeId)) {
      current.placesVisited = [...current.placesVisited, placeId];
    }
  } else if (typeof current[key] === "number") {
    (current as any)[key] = (current[key] as number) + 1;
  }
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(current));
}

function XPBar({ xp, colors }: { xp: number; colors: any }) {
  const level = Math.floor(xp / 100) + 1;
  const progress = (xp % 100) / 100;
  return (
    <View style={styles.xpSection}>
      <View style={styles.xpRow}>
        <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>Nivel {level}</Text>
        <Text style={[styles.xpValue, { color: colors.tint }]}>{xp} XP</Text>
        <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>Nivel {level + 1}</Text>
      </View>
      <View style={[styles.xpBarBg, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.xpBarFill, { width: `${progress * 100}%` as any, backgroundColor: colors.tint }]} />
      </View>
    </View>
  );
}

function AchievementCard({
  achievement,
  unlocked,
  colors,
}: {
  achievement: typeof ACHIEVEMENTS[0];
  unlocked: boolean;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.achievementCard,
        {
          backgroundColor: unlocked ? colors.backgroundCard : colors.backgroundSecondary,
          borderColor: unlocked ? `${colors.tint}40` : colors.border,
          opacity: unlocked ? 1 : 0.65,
        },
      ]}
    >
      <View style={[styles.emojiCircle, { backgroundColor: unlocked ? `${colors.tint}18` : colors.border }]}>
        <Text style={styles.emoji}>{unlocked ? achievement.emoji : "🔒"}</Text>
      </View>
      <View style={styles.achievementInfo}>
        <Text style={[styles.achievementTitle, { color: unlocked ? colors.text : colors.textMuted }]}>
          {achievement.title}
        </Text>
        <Text style={[styles.achievementDesc, { color: colors.textMuted }]} numberOfLines={2}>
          {achievement.desc}
        </Text>
      </View>
      <View style={[styles.xpBadge, { backgroundColor: unlocked ? colors.tint : colors.border }]}>
        <Text style={[styles.xpBadgeText, { color: unlocked ? "#fff" : colors.textMuted }]}>
          +{achievement.xp}
        </Text>
        <Text style={[styles.xpBadgeLabel, { color: unlocked ? "rgba(255,255,255,0.8)" : colors.textMuted }]}>
          XP
        </Text>
      </View>
    </View>
  );
}

export default function LogrosScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);

  useEffect(() => {
    loadStats().then(setStats);
  }, []);

  const unlockedCount = ACHIEVEMENTS.filter((a) => a.condition(stats)).length;
  const totalXp = ACHIEVEMENTS.filter((a) => a.condition(stats)).reduce((sum, a) => sum + a.xp, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (isWeb ? 67 : 0) + 12,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Logros</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            Tu aventura por Ciénaga
          </Text>
        </View>

        {/* Stats card */}
        <View style={[styles.statsCard, { backgroundColor: colors.tint }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{unlockedCount}</Text>
              <Text style={styles.statLabel}>Logros</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{stats.placesVisited.length}</Text>
              <Text style={styles.statLabel}>Lugares</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{stats.scansCount}</Text>
              <Text style={styles.statLabel}>Escaneos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{totalXp}</Text>
              <Text style={styles.statLabel}>XP Total</Text>
            </View>
          </View>
          <XPBar xp={totalXp} colors={{ tint: "rgba(255,255,255,0.9)", border: "rgba(255,255,255,0.25)", textSecondary: "rgba(255,255,255,0.8)" }} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Ionicons name="trophy" size={16} color={colors.accent} />
            <Text style={[styles.progressText, { color: colors.text }]}>
              {unlockedCount} de {ACHIEVEMENTS.length} logros desbloqueados
            </Text>
          </View>
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` as any,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
        </View>

        {/* Achievements list */}
        <View style={styles.achievementsList}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted, paddingHorizontal: 20 }]}>
            TODOS LOS LOGROS
          </Text>
          {ACHIEVEMENTS.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              unlocked={achievement.condition(stats)}
              colors={colors}
            />
          ))}
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: `${colors.tint}10`, borderColor: `${colors.tint}30` }]}>
          <Ionicons name="bulb-outline" size={18} color={colors.tint} />
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            Escanea los códigos QR en los sitios turísticos de Ciénaga para desbloquear logros y ganar XP
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  statDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.3)" },
  xpSection: { gap: 6 },
  xpRow: { flexDirection: "row", justifyContent: "space-between" },
  xpLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  xpValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  xpBarBg: { height: 6, borderRadius: 3 },
  xpBarFill: { height: 6, borderRadius: 3 },
  progressSection: { paddingHorizontal: 20, marginBottom: 20, gap: 8 },
  progressHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  progressText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  progressBg: { height: 8, borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  achievementsList: { gap: 10, paddingBottom: 8 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 4 },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 22 },
  achievementInfo: { flex: 1, gap: 3 },
  achievementTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  achievementDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  xpBadge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 42,
  },
  xpBadgeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  xpBadgeLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  tipsCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  tipsText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
