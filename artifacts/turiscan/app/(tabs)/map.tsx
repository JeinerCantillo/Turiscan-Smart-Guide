import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  PanResponder,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { TuriscanMap, type MapPoint } from "@/components/TuriscanMap";
import { useGetPlaces } from "@workspace/api-client-react";
import type { Place } from "@workspace/api-client-react";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = 340;
const CATEGORIES = ["Todos", "Plaza", "Religioso", "Natural", "Patrimonio", "Cultural"];

const CATEGORY_COLORS: Record<string, string> = {
  Plaza: "#F5A623",
  Religioso: "#9B59B6",
  Natural: "#27AE60",
  Patrimonio: "#E74C3C",
  Cultural: "#2980B9",
};

const CATEGORY_ICONS: Record<string, string> = {
  Plaza: "map",
  Religioso: "activity",
  Natural: "sunset",
  Patrimonio: "archive",
  Cultural: "book-open",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#1A6B4A";
}

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined);

  const sheetAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const sheetVisible = useRef(false);

  const { data: places, isLoading } = useGetPlaces({});

  const filteredPlaces = (places ?? []).filter(
    (p) => selectedCategory === "Todos" || p.category === selectedCategory
  );

  const allPoints: MapPoint[] = filteredPlaces.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
    title: p.name,
    category: p.category,
    id: p.id,
  }));

  const openSheet = useCallback(() => {
    sheetVisible.current = true;
    Animated.spring(sheetAnim, {
      toValue: 0,
      useNativeDriver: Platform.OS !== "web",
      bounciness: 4,
    }).start();
  }, [sheetAnim]);

  const closeSheet = useCallback(() => {
    sheetVisible.current = false;
    Animated.timing(sheetAnim, {
      toValue: SHEET_HEIGHT,
      duration: 280,
      useNativeDriver: Platform.OS !== "web",
    }).start(() => {
      setSelectedPlace(null);
      setSelectedIndex(undefined);
    });
  }, [sheetAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) sheetAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          closeSheet();
        } else {
          Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const handleMarkerPress = (point: MapPoint, index: number) => {
    const place = filteredPlaces.find((p) => p.id === point.id) ?? null;
    if (!place) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlace(place);
    setSelectedIndex(index);
    openSheet();
  };

  const handleDetails = () => {
    if (!selectedPlace) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeSheet();
    setTimeout(() => router.push({ pathname: "/place/[id]", params: { id: String(selectedPlace.id) } }), 120);
  };

  const handleVR = () => {
    if (!selectedPlace) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    closeSheet();
    setTimeout(() => router.push({ pathname: "/vr/[id]", params: { id: String(selectedPlace.id) } }), 120);
  };

  const handleDirections = () => {
    if (!selectedPlace) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.latitude},${selectedPlace.longitude}`;
    Linking.openURL(url);
  };

  const catColor = selectedPlace ? getCategoryColor(selectedPlace.category) : colors.tint;
  const catIcon = selectedPlace ? (CATEGORY_ICONS[selectedPlace.category] ?? "map-pin") : "map-pin";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter chips row — floating over map */}
      <View style={[styles.filterBar, { paddingTop: insets.top + (isWeb ? 67 : 0) + 8, backgroundColor: colors.background }]}>
        <Text style={[styles.filterTitle, { color: colors.text }]}>Mapa Turístico</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            const chipColor = cat === "Todos" ? colors.tint : getCategoryColor(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? chipColor : `${chipColor}18`,
                    borderColor: active ? chipColor : `${chipColor}40`,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat);
                  if (sheetVisible.current) closeSheet();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: active ? "#fff" : chipColor }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Full-screen interactive map */}
      <TouchableOpacity
        style={styles.mapContainer}
        activeOpacity={1}
        onPress={() => { if (sheetVisible.current) closeSheet(); }}
      >
        <TuriscanMap
          latitude={11.005}
          longitude={-74.249}
          allPoints={allPoints}
          scrollEnabled={true}
          zoomEnabled={true}
          style={styles.map}
          tintColor={colors.tint}
          onMarkerPress={handleMarkerPress}
          selectedIndex={selectedIndex}
        />
      </TouchableOpacity>

      {/* Place count badge */}
      <View style={[styles.countBadge, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        <Feather name="map-pin" size={12} color={colors.tint} />
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filteredPlaces.length} {filteredPlaces.length === 1 ? "sitio" : "sitios"}
        </Text>
      </View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.backgroundCard,
            transform: [{ translateY: sheetAnim }],
            paddingBottom: insets.bottom + (isWeb ? 34 : 0) + 16,
            pointerEvents: selectedPlace ? "box-none" : "none",
          } as any,
        ]}
      >
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.sheetHandle}>
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
        </View>

        {selectedPlace && (
          <>
            {/* Image + Info row */}
            <View style={styles.sheetHeader}>
              {selectedPlace.imageUrl ? (
                <Image
                  source={{ uri: selectedPlace.imageUrl }}
                  style={styles.sheetThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.sheetThumbPlaceholder, { backgroundColor: `${catColor}20` }]}>
                  <Feather name={catIcon as any} size={28} color={catColor} />
                </View>
              )}
              <View style={styles.sheetInfo}>
                <View style={[styles.categoryBadge, { backgroundColor: `${catColor}18` }]}>
                  <Feather name={catIcon as any} size={11} color={catColor} />
                  <Text style={[styles.categoryBadgeText, { color: catColor }]}>{selectedPlace.category}</Text>
                </View>
                <Text style={[styles.sheetName, { color: colors.text }]} numberOfLines={2}>
                  {selectedPlace.name}
                </Text>
                {selectedPlace.visitHours && (
                  <View style={styles.sheetMetaRow}>
                    <Feather name="clock" size={12} color={colors.textMuted} />
                    <Text style={[styles.sheetMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {selectedPlace.visitHours}
                    </Text>
                  </View>
                )}
                {selectedPlace.visitDuration && (
                  <View style={styles.sheetMetaRow}>
                    <Feather name="navigation" size={12} color={colors.textMuted} />
                    <Text style={[styles.sheetMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {selectedPlace.visitDuration}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Description */}
            <Text style={[styles.sheetDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {selectedPlace.shortDescription}
            </Text>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              {/* VR Button */}
              <TouchableOpacity
                style={[styles.actionBtnPrimary, { backgroundColor: catColor }]}
                onPress={handleVR}
                activeOpacity={0.85}
              >
                <Ionicons name="glasses" size={18} color="#fff" />
                <Text style={styles.actionBtnPrimaryText}>Realidad Virtual</Text>
              </TouchableOpacity>

              {/* Directions button */}
              <TouchableOpacity
                style={[styles.actionBtnIcon, { backgroundColor: `${catColor}18`, borderColor: `${catColor}40` }]}
                onPress={handleDirections}
                activeOpacity={0.8}
              >
                <Feather name="navigation" size={18} color={catColor} />
              </TouchableOpacity>

              {/* Details button */}
              <TouchableOpacity
                style={[styles.actionBtnIcon, { backgroundColor: `${catColor}18`, borderColor: `${catColor}40` }]}
                onPress={handleDetails}
                activeOpacity={0.8}
              >
                <Feather name="info" size={18} color={catColor} />
              </TouchableOpacity>
            </View>

            {/* Labels under icon buttons */}
            <View style={styles.actionLabelRow}>
              <View style={{ flex: 1 }} />
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Cómo llegar</Text>
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Ver detalles</Text>
            </View>

            {/* Close hint */}
            <TouchableOpacity onPress={closeSheet} style={styles.closeHint}>
              <Text style={[styles.closeHintText, { color: colors.textMuted }]}>Toca fuera para cerrar</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  filterTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  filterChips: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  mapContainer: { flex: 1 },
  map: { flex: 1, width: "100%" },
  countBadge: {
    position: "absolute",
    bottom: SHEET_HEIGHT + 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 5,
  },
  countText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  sheetHandle: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
  },
  sheetThumb: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  sheetThumbPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetInfo: { flex: 1, gap: 4 },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sheetName: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 22 },
  sheetMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  sheetMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  sheetDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  actionBtnPrimaryText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabelRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    paddingRight: 2,
  },
  actionLabel: {
    width: 48,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  closeHint: {
    alignItems: "center",
    paddingTop: 8,
  },
  closeHintText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
