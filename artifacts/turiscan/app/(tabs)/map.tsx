import React, { useState, useRef, useCallback, useEffect } from "react";
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
import * as Location from "expo-location";
import Slider from "@react-native-community/slider";

import Colors from "@/constants/colors";
import { TuriscanMap, type MapPoint } from "@/components/TuriscanMap";
import { useGetPlaces } from "@workspace/api-client-react";
import type { Place } from "@workspace/api-client-react";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = 360;
const CATEGORIES = ["Todos", "Plaza", "Religioso", "Natural", "Patrimonio", "Cultural"];

const CATEGORY_COLORS: Record<string, string> = {
  Plaza: "#F4D03F",
  Religioso: "#9B59B6",
  Natural: "#27AE60",
  Patrimonio: "#E74C3C",
  Cultural: "#2E86AB",
  Restaurante: "#E67E22",
  Hotel: "#1ABC9C",
};

const CATEGORY_ICONS: Record<string, string> = {
  Plaza: "map",
  Religioso: "activity",
  Natural: "sunset",
  Patrimonio: "archive",
  Cultural: "book-open",
};

function getCategoryColor(category: string, tint: string): string {
  return CATEGORY_COLORS[category] ?? tint;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [showRadiusPanel, setShowRadiusPanel] = useState(false);
  const [locating, setLocating] = useState(false);

  const sheetAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const sheetVisible = useRef(false);

  const { data: places } = useGetPlaces({});

  const requestLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setShowRadiusPanel(true);
    } catch {}
    setLocating(false);
  };

  const clearLocation = () => {
    setUserLocation(null);
    setShowRadiusPanel(false);
  };

  const filteredPlaces = (places ?? []).filter((p) => {
    const catMatch = selectedCategory === "Todos" || p.category === selectedCategory;
    if (!catMatch) return false;
    if (userLocation) {
      const dist = haversineKm(userLocation.latitude, userLocation.longitude, p.latitude, p.longitude);
      return dist <= radiusKm;
    }
    return true;
  });

  const placesWithDistance = filteredPlaces.map((p) => ({
    ...p,
    distanceKm: userLocation
      ? haversineKm(userLocation.latitude, userLocation.longitude, p.latitude, p.longitude)
      : null,
  })).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  const allPoints: MapPoint[] = placesWithDistance.map((p) => ({
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
          Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: Platform.OS !== "web", bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const handleMarkerPress = (point: MapPoint, index: number) => {
    const place = placesWithDistance.find((p) => p.id === point.id) ?? null;
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

  const selectedPlaceWithDist = selectedPlace
    ? placesWithDistance.find((p) => p.id === selectedPlace.id)
    : null;

  const catColor = selectedPlace ? getCategoryColor(selectedPlace.category, colors.tint) : colors.tint;
  const catIcon = selectedPlace ? (CATEGORY_ICONS[selectedPlace.category] ?? "map-pin") : "map-pin";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (isWeb ? 67 : 0) + 8, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mapa Turístico</Text>
          <TouchableOpacity
            style={[
              styles.locationBtn,
              {
                backgroundColor: userLocation ? colors.tint : colors.backgroundCard,
                borderColor: userLocation ? colors.tint : colors.border,
              },
            ]}
            onPress={userLocation ? clearLocation : requestLocation}
            activeOpacity={0.8}
          >
            <Feather
              name={locating ? "loader" : userLocation ? "crosshair" : "navigation"}
              size={15}
              color={userLocation ? "#fff" : colors.tint}
            />
            <Text style={[styles.locationBtnText, { color: userLocation ? "#fff" : colors.tint }]}>
              {locating ? "Buscando..." : userLocation ? "Mi ubicación" : "Localizar"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Radius panel */}
        {showRadiusPanel && userLocation && (
          <View style={[styles.radiusPanel, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={styles.radiusPanelRow}>
              <Feather name="circle" size={14} color={colors.tint} />
              <Text style={[styles.radiusLabel, { color: colors.text }]}>Radio: </Text>
              <Text style={[styles.radiusValue, { color: colors.tint }]}>{radiusKm} km</Text>
              <Text style={[styles.radiusCount, { color: colors.textMuted }]}>
                · {placesWithDistance.length} sitio{placesWithDistance.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <Slider
              minimumValue={1}
              maximumValue={50}
              step={1}
              value={radiusKm}
              onValueChange={(v) => setRadiusKm(Math.round(v))}
              minimumTrackTintColor={colors.tint}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.tint}
              style={{ width: "100%", height: 32 }}
            />
          </View>
        )}

        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            const chipColor = cat === "Todos" ? colors.tint : getCategoryColor(cat, colors.tint);
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

      {/* Full-screen map */}
      <TouchableOpacity
        style={styles.mapContainer}
        activeOpacity={1}
        onPress={() => { if (sheetVisible.current) closeSheet(); }}
      >
        <TuriscanMap
          latitude={userLocation?.latitude ?? 11.005}
          longitude={userLocation?.longitude ?? -74.249}
          allPoints={allPoints}
          scrollEnabled={true}
          zoomEnabled={true}
          style={styles.map}
          tintColor={colors.tint}
          onMarkerPress={handleMarkerPress}
          selectedIndex={selectedIndex}
          showsUserLocation={!!userLocation}
          userLocation={userLocation}
          animateToUser={!!userLocation}
        />
      </TouchableOpacity>

      {/* Place count badge */}
      <View style={[styles.countBadge, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        <Feather name="map-pin" size={12} color={colors.tint} />
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {placesWithDistance.length} {placesWithDistance.length === 1 ? "sitio" : "sitios"}
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
        <View {...panResponder.panHandlers} style={styles.sheetHandle}>
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
        </View>

        {selectedPlace && (
          <>
            <View style={styles.sheetHeader}>
              {selectedPlace.imageUrl ? (
                <Image source={{ uri: selectedPlace.imageUrl }} style={styles.sheetThumb} resizeMode="cover" />
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
                {selectedPlaceWithDist?.distanceKm != null && (
                  <View style={styles.sheetMetaRow}>
                    <Feather name="navigation" size={12} color={colors.tint} />
                    <Text style={[styles.sheetMetaText, { color: colors.tint }]}>
                      {selectedPlaceWithDist.distanceKm < 1
                        ? `${Math.round(selectedPlaceWithDist.distanceKm * 1000)} m`
                        : `${selectedPlaceWithDist.distanceKm.toFixed(1)} km`} de ti
                    </Text>
                  </View>
                )}
                {selectedPlace.visitHours && (
                  <View style={styles.sheetMetaRow}>
                    <Feather name="clock" size={12} color={colors.textMuted} />
                    <Text style={[styles.sheetMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {selectedPlace.visitHours}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={[styles.sheetDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {selectedPlace.shortDescription}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtnPrimary, { backgroundColor: catColor }]}
                onPress={handleVR}
                activeOpacity={0.85}
              >
                <Ionicons name="glasses" size={18} color="#fff" />
                <Text style={styles.actionBtnPrimaryText}>360° Virtual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnIcon, { backgroundColor: `${catColor}18`, borderColor: `${catColor}40` }]}
                onPress={handleDirections}
                activeOpacity={0.8}
              >
                <Feather name="navigation" size={18} color={catColor} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnIcon, { backgroundColor: `${catColor}18`, borderColor: `${catColor}40` }]}
                onPress={handleDetails}
                activeOpacity={0.8}
              >
                <Feather name="info" size={18} color={catColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionLabelRow}>
              <View style={{ flex: 1 }} />
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Cómo llegar</Text>
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Ver detalles</Text>
            </View>

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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  locationBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  radiusPanel: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    gap: 2,
  },
  radiusPanelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  radiusLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  radiusValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  radiusCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  filterChips: { flexDirection: "row", gap: 8, paddingRight: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
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
  sheetHandle: { alignItems: "center", paddingTop: 10, paddingBottom: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: "row", gap: 14, marginBottom: 10 },
  sheetThumb: { width: 90, height: 90, borderRadius: 14 },
  sheetThumbPlaceholder: { width: 90, height: 90, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sheetInfo: { flex: 1, gap: 4 },
  categoryBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sheetName: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 22 },
  sheetMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  sheetMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  sheetDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 12 },
  actionRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  actionBtnPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14 },
  actionBtnPrimaryText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionBtnIcon: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionLabelRow: { flexDirection: "row", gap: 10, marginTop: 4, paddingRight: 2 },
  actionLabel: { width: 48, fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  closeHint: { alignItems: "center", paddingTop: 8 },
  closeHintText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
