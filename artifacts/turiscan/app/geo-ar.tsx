import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";

import { useGetPlaces } from "@workspace/api-client-react";
import type { Place } from "@workspace/api-client-react";

const { width: SW, height: SH } = Dimensions.get("window");
const CAMERA_FOV = 65; // degrees horizontal field of view
const RADII = [500, 1000, 3000, 5000, 10000]; // meters
const RADII_LABELS = ["500m", "1km", "3km", "5km", "10km"];

// ─── Geometry helpers ───────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
}

// Angular difference in -180..+180
function angleDiff(a: number, b: number) {
  return ((a - b + 540) % 360) - 180;
}

function distLabel(m: number) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

const CATEGORY_ICONS: Record<string, string> = {
  Plaza: "🏛️", Religioso: "⛪", Natural: "🌿",
  Patrimonio: "🏛️", Cultural: "🎭",
};

// ─── Floating AR place card ──────────────────────────────────
type NearbyPlace = Place & { distance: number; bearing: number };

function FloatingCard({ place, onPress }: { place: NearbyPlace; onPress: () => void }) {
  const emoji = CATEGORY_ICONS[place.category] ?? "📍";
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.floatCard}>
      <LinearGradient
        colors={["rgba(4,20,40,0.94)", "rgba(10,40,70,0.92)"]}
        style={styles.floatCardInner}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        {/* AR connector line */}
        <View style={styles.floatConnector} />

        {/* Header */}
        <View style={styles.floatHeader}>
          <Text style={styles.floatEmoji}>{emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.floatName} numberOfLines={2}>{place.name}</Text>
            <View style={styles.floatMeta}>
              <View style={styles.distBadge}>
                <Feather name="navigation" size={9} color="#1AEFFF" />
                <Text style={styles.distText}>{distLabel(place.distance)}</Text>
              </View>
              <Text style={styles.catText}>{place.category}</Text>
            </View>
          </View>
        </View>

        {/* QR code */}
        {place.qrCode ? (
          <View style={styles.qrWrap}>
            <QRCode
              value={place.qrCode}
              size={88}
              color="#0D1F2D"
              backgroundColor="#F0F8FF"
            />
            <Text style={styles.qrLabel}>Escanea para visitar</Text>
          </View>
        ) : null}

        {/* CTA */}
        <TouchableOpacity style={styles.floatCTA} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.floatCTAText}>Ver detalles</Text>
          <Feather name="arrow-right" size={13} color="#1AEFFF" />
        </TouchableOpacity>

        {/* Corner brackets */}
        <View style={styles.cTL} /><View style={styles.cBR} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Mini radar ──────────────────────────────────────────────
function MiniRadar({ places, heading, radius }: {
  places: NearbyPlace[]; heading: number; radius: number;
}) {
  const R = 52; // radar radius px
  return (
    <View style={styles.radar}>
      {/* Rings */}
      <View style={[styles.radarRing, { width: R * 2, height: R * 2, borderRadius: R, top: 0, left: 0 }]} />
      <View style={[styles.radarRing, { width: R, height: R, borderRadius: R / 2, top: R / 2, left: R / 2, borderColor: "rgba(26,239,255,0.2)" }]} />
      {/* Cross lines */}
      <View style={styles.radarCrossH} />
      <View style={styles.radarCrossV} />
      {/* User dot */}
      <View style={[styles.radarDot, { backgroundColor: "#1AEFFF", width: 10, height: 10, borderRadius: 5, top: R - 5, left: R - 5 }]} />
      {/* Heading indicator */}
      <View style={[styles.radarHeading, {
        transform: [{ rotate: `${heading}deg` }],
        top: R - 48, left: R - 1,
      }]} />
      {/* Place dots */}
      {places.slice(0, 6).map((p) => {
        const ang = (p.bearing - heading + 360) % 360;
        const rad = (ang * Math.PI) / 180;
        const dist = Math.min(p.distance / radius, 0.96);
        const px = R + (R - 8) * dist * Math.sin(rad) - 5;
        const py = R - (R - 8) * dist * Math.cos(rad) - 5;
        return (
          <View
            key={p.id}
            style={[styles.radarDot, {
              backgroundColor: "#F4D03F",
              width: 8, height: 8, borderRadius: 4,
              top: py, left: px,
            }]}
          />
        );
      })}
    </View>
  );
}

// ─── Compass bar ─────────────────────────────────────────────
const COMPASS_DIRS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
function headingLabel(h: number) {
  const idx = Math.round(h / 45) % 8;
  return COMPASS_DIRS[idx];
}

// ─── Main Screen ─────────────────────────────────────────────
export default function GeoARScreen() {
  const insets = useSafeAreaInsets();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [radiusIdx, setRadiusIdx] = useState(2); // default 3km
  const radius = RADII[radiusIdx];

  const [userLoc, setUserLoc]   = useState<{ lat: number; lon: number } | null>(null);
  const [heading, setHeading]   = useState(0);
  const [locError, setLocError] = useState(false);
  const [showList, setShowList] = useState(false); // fallback list mode

  const { data: allPlaces = [], isLoading } = useGetPlaces();

  // Request camera permission
  useEffect(() => { requestCamPerm(); }, []);

  // GPS watch
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocError(true); return; }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 3 },
        ({ coords }) => setUserLoc({ lat: coords.latitude, lon: coords.longitude })
      );
    })();
    return () => { sub?.remove(); };
  }, []);

  // Magnetometer compass
  useEffect(() => {
    if (Platform.OS === "web") return;
    Magnetometer.setUpdateInterval(150);
    const sub = Magnetometer.addListener(({ x, y }) => {
      // Formula: compass bearing from magnetometer (phone held in portrait, screen facing user)
      // Works best when phone is held upright for camera use
      let deg = (90 - Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      setHeading(h => {
        // Smooth the heading with a simple low-pass filter to reduce jitter
        const diff = angleDiff(deg, h);
        return (h + diff * 0.25 + 360) % 360;
      });
    });
    return () => sub.remove();
  }, []);

  // Compute nearby + in-view places
  const nearbyPlaces: NearbyPlace[] = React.useMemo(() => {
    if (!userLoc || !allPlaces.length) return [];
    return allPlaces
      .map(p => ({
        ...p,
        distance: haversine(userLoc.lat, userLoc.lon, p.latitude, p.longitude),
        bearing:  getBearing(userLoc.lat, userLoc.lon, p.latitude, p.longitude),
      }))
      .filter(p => p.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [userLoc, allPlaces, radius]);

  const inViewPlaces = React.useMemo(() =>
    nearbyPlaces.filter(p => Math.abs(angleDiff(p.bearing, heading)) < CAMERA_FOV / 2),
    [nearbyPlaces, heading]
  );

  const handlePlacePress = useCallback((place: NearbyPlace) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/place/${place.id}`);
  }, []);

  const hasCam = (camPerm?.granted ?? false) && Platform.OS !== "web";
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* Camera background */}
      {hasCam ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <LinearGradient colors={["#040D14", "#082030", "#0C2840"]} style={StyleSheet.absoluteFill} />
      )}

      {/* Dark vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.60)", "transparent", "rgba(0,0,0,0.72)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* AR grid */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={[styles.gridLine, { top: `${(i + 1) * 10}%` as any }]} />
        ))}
      </View>

      {/* ── TOP BAR ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 10 }]}>
        {/* Close */}
        <TouchableOpacity style={styles.topBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Compass heading */}
        <View style={styles.compassWrap}>
          <MaterialCommunityIcons name="compass" size={18} color="#1AEFFF" />
          <Text style={styles.compassText}>{headingLabel(heading)} · {Math.round(heading)}°</Text>
        </View>

        {/* Radius selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.radiusScroll}>
          {RADII_LABELS.map((label, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.radiusBtn, i === radiusIdx && styles.radiusBtnActive]}
              onPress={() => { setRadiusIdx(i); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.radiusTxt, i === radiusIdx && styles.radiusTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List toggle */}
        <TouchableOpacity style={styles.topBtn} onPress={() => setShowList(v => !v)}>
          <Feather name={showList ? "camera" : "list"} size={18} color="#1AEFFF" />
        </TouchableOpacity>
      </View>

      {/* ── STATUS BAR (below top) ── */}
      <View style={[styles.statusBar, { top: topPad + 62 }]} pointerEvents="none">
        {isLoading ? (
          <ActivityIndicator size="small" color="#1AEFFF" />
        ) : !userLoc ? (
          <Text style={styles.statusTxt}>
            {locError ? "⚠ Sin GPS" : "Obteniendo ubicación…"}
          </Text>
        ) : (
          <Text style={styles.statusTxt}>
            📍 {nearbyPlaces.length} sitio{nearbyPlaces.length !== 1 ? "s" : ""} a {RADII_LABELS[radiusIdx]}
            {inViewPlaces.length > 0 ? ` · ${inViewPlaces.length} en cámara` : ""}
          </Text>
        )}
      </View>

      {/* ── AR FLOATING CARDS (camera mode) ── */}
      {!showList && inViewPlaces.map((place, idx) => {
        const angOff = angleDiff(place.bearing, heading);
        const xPos = SW / 2 + (angOff / (CAMERA_FOV / 2)) * (SW * 0.38) - 130;
        // Stack cards vertically so they don't overlap
        const yPos = SH * 0.22 + idx * 260;
        if (yPos > SH * 0.72) return null;
        return (
          <View
            key={place.id}
            style={[styles.floatAnchor, { left: Math.max(8, Math.min(SW - 268, xPos)), top: yPos }]}
            pointerEvents="box-none"
          >
            <FloatingCard place={place} onPress={() => handlePlacePress(place)} />
          </View>
        );
      })}

      {/* ── NO PLACES IN FOV hint ── */}
      {!showList && !isLoading && userLoc && nearbyPlaces.length > 0 && inViewPlaces.length === 0 && (
        <View style={styles.noViewHint} pointerEvents="none">
          <Text style={styles.noViewEmoji}>🧭</Text>
          <Text style={styles.noViewText}>Gira hacia los sitios turísticos</Text>
          <Text style={styles.noViewSub}>
            {nearbyPlaces.slice(0, 2).map(p => `${p.name} (${distLabel(p.distance)})`).join(" · ")}
          </Text>
        </View>
      )}

      {/* ── NO PLACES IN RADIUS ── */}
      {!showList && !isLoading && userLoc && nearbyPlaces.length === 0 && (
        <View style={styles.noViewHint} pointerEvents="none">
          <Text style={styles.noViewEmoji}>🗺️</Text>
          <Text style={styles.noViewText}>No hay sitios a {RADII_LABELS[radiusIdx]}</Text>
          <Text style={styles.noViewSub}>Amplía el radio o desplázate hacia Ciénaga</Text>
        </View>
      )}

      {/* ── LIST MODE OVERLAY ── */}
      {showList && (
        <View style={[styles.listOverlay, { top: topPad + 72, bottom: insets.bottom + 140 }]}>
          {nearbyPlaces.length === 0 ? (
            <Text style={styles.listEmpty}>No hay sitios a {RADII_LABELS[radiusIdx]}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {nearbyPlaces.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.listItem}
                  onPress={() => handlePlacePress(p)}
                  activeOpacity={0.82}
                >
                  <Text style={styles.listEmoji}>{CATEGORY_ICONS[p.category] ?? "📍"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listName}>{p.name}</Text>
                    <Text style={styles.listMeta}>{p.category} · {distLabel(p.distance)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={styles.listBearing}>{headingLabel(p.bearing)} {Math.round(p.bearing)}°</Text>
                    <Feather name="arrow-right" size={14} color="#1AEFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── BOTTOM: radar + scan hint ── */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 10 }]}>
        {userLoc && nearbyPlaces.length > 0 && (
          <MiniRadar places={nearbyPlaces} heading={heading} radius={radius} />
        )}
        <View style={styles.bottomHint}>
          <Ionicons name="scan-outline" size={16} color="#1AEFFF" />
          <Text style={styles.hintText}>
            {inViewPlaces.length > 0
              ? "Apunta la cámara · toca una tarjeta para ver detalles"
              : "Apunta hacia un sitio turístico"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  gridLine: {
    position: "absolute", left: 0, right: 0, height: 1,
    backgroundColor: "rgba(26,239,255,0.04)",
  },

  // Top bar
  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, gap: 8,
  },
  topBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  compassWrap: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(26,239,255,0.3)",
  },
  compassText: { color: "#1AEFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  radiusScroll: { flex: 1 },
  radiusBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, marginRight: 5,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  radiusBtnActive: { backgroundColor: "rgba(26,239,255,0.22)", borderColor: "#1AEFFF" },
  radiusTxt:       { color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "Inter_500Medium" },
  radiusTxtActive: { color: "#1AEFFF", fontFamily: "Inter_600SemiBold" },

  // Status
  statusBar: {
    position: "absolute", left: 0, right: 0,
    alignItems: "center",
  },
  statusTxt: {
    color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular",
    backgroundColor: "rgba(0,0,0,0.42)", paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 10,
  },

  // Floating card
  floatAnchor: { position: "absolute", width: 260 },
  floatCard:   { borderRadius: 18, overflow: "hidden", shadowColor: "#1AEFFF", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 12 },
  floatCardInner: { padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(26,239,255,0.5)" },
  floatConnector: {
    position: "absolute", bottom: -18, left: "50%",
    width: 2, height: 18, backgroundColor: "#1AEFFF", opacity: 0.5,
  },
  floatHeader:  { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 10 },
  floatEmoji:   { fontSize: 26, marginTop: 2 },
  floatName:    { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 18 },
  floatMeta:    { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  distBadge:    { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(26,239,255,0.15)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  distText:     { color: "#1AEFFF", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  catText:      { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "Inter_400Regular" },
  qrWrap:       { alignItems: "center", backgroundColor: "#F0F8FF", borderRadius: 10, padding: 10, marginBottom: 10 },
  qrLabel:      { color: "#1A5F7A", fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 5 },
  floatCTA:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(26,239,255,0.4)", backgroundColor: "rgba(26,239,255,0.1)" },
  floatCTAText: { color: "#1AEFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cTL: { position: "absolute", top: 8, left: 8, width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2, borderColor: "rgba(26,239,255,0.5)", borderTopLeftRadius: 3 },
  cBR: { position: "absolute", bottom: 8, right: 8, width: 14, height: 14, borderBottomWidth: 2, borderRightWidth: 2, borderColor: "rgba(26,239,255,0.5)", borderBottomRightRadius: 3 },

  // No view hint
  noViewHint: {
    position: "absolute", left: 20, right: 20, top: "38%",
    alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: "rgba(26,239,255,0.2)",
  },
  noViewEmoji: { fontSize: 36 },
  noViewText:  { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  noViewSub:   { color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  // List mode
  listOverlay: {
    position: "absolute", left: 0, right: 0,
    backgroundColor: "rgba(4,13,20,0.92)",
    borderTopWidth: 1, borderTopColor: "rgba(26,239,255,0.2)",
    paddingHorizontal: 16, paddingTop: 12,
  },
  listEmpty: { color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 24, fontFamily: "Inter_400Regular", fontSize: 14 },
  listItem:  {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  listEmoji:   { fontSize: 24 },
  listName:    { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  listMeta:    { color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  listBearing: { color: "#1AEFFF", fontSize: 10, fontFamily: "Inter_600SemiBold" },

  // Bottom
  bottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, flexDirection: "row",
    alignItems: "flex-end", gap: 14,
  },
  bottomHint: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "rgba(26,239,255,0.2)", marginBottom: 4,
  },
  hintText: { flex: 1, color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },

  // Radar
  radar: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: "rgba(0,20,40,0.82)", marginBottom: 4,
    overflow: "hidden", position: "relative",
  },
  radarRing: {
    position: "absolute", borderWidth: 1, borderColor: "rgba(26,239,255,0.35)",
  },
  radarCrossH: {
    position: "absolute", top: 51, left: 0, right: 0, height: 1,
    backgroundColor: "rgba(26,239,255,0.18)",
  },
  radarCrossV: {
    position: "absolute", left: 51, top: 0, bottom: 0, width: 1,
    backgroundColor: "rgba(26,239,255,0.18)",
  },
  radarDot: { position: "absolute" },
  radarHeading: {
    position: "absolute",
    width: 2, height: 48,
    backgroundColor: "#1AEFFF", opacity: 0.7,
    left: 51, top: 4,
  },
});
