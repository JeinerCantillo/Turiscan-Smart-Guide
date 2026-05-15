import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Platform,
  Dimensions,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useGetPlaceById } from "@workspace/api-client-react";

const { width, height } = Dimensions.get("window");

const CATEGORY_COLORS: Record<string, string> = {
  Plaza: "#F4D03F",
  Religioso: "#9B59B6",
  Natural: "#27AE60",
  Patrimonio: "#E74C3C",
  Cultural: "#2E86AB",
};

function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = url.match(/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return url.split("?")[0];
  return url;
}

function buildVrHtml(videoUrl: string, vrMode: boolean): string {
  const embedBase = getYouTubeEmbedUrl(videoUrl);
  const embedUrl = `${embedBase}?autoplay=1&controls=1&playsinline=1&rel=0&fs=1&enablejsapi=1`;

  const frame = `<iframe src="${embedUrl}" allow="autoplay; gyroscope; accelerometer; fullscreen; camera; microphone" allowfullscreen></iframe>`;

  if (vrMode) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; width: 100vw; height: 100vh; display: flex; }
    .eye { width: 50vw; height: 100vh; overflow: hidden; }
    .eye + .eye { border-left: 2px solid #333; }
    iframe { width: 200%; height: 100%; border: 0; margin-left: -50%; }
    .eye:last-child iframe { margin-left: 0; }
  </style>
</head>
<body>
  <div class="eye">${frame}</div>
  <div class="eye">${frame.replace('"autoplay=1', '"autoplay=0')}</div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
    iframe { width: 100vw; height: 100vh; border: 0; display: block; }
  </style>
</head>
<body>
  ${frame}
</body>
</html>`;
}

export default function VrPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [vrMode, setVrMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: place } = useGetPlaceById(Number(id), {
    query: { enabled: !isNaN(Number(id)) },
  });

  const videoUrl = place?.video360Url ?? "";
  const categoryColor = (place?.category && CATEGORY_COLORS[place.category]) ?? colors.tint;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  const toggleVrMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setVrMode((v) => !v);
    setLoading(true);
  };

  const showControlsTemp = () => {
    setControlsVisible(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setControlsVisible(false), 4000);
  };

  if (Platform.OS === "web") {
    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    return (
      <View style={[styles.container, { backgroundColor: "#000" }]}>
        {embedUrl ? (
          <>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={showControlsTemp} activeOpacity={1}>
              <iframe
                src={`${embedUrl}?autoplay=1&controls=1&rel=0`}
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="autoplay; gyroscope; accelerometer; fullscreen"
                allowFullScreen
              />
            </TouchableOpacity>
            {controlsVisible && (
              <View style={[styles.topBar, { paddingTop: insets.top + 67 + 8 }]}>
                <TouchableOpacity style={styles.controlBtn} onPress={handleClose}>
                  <Feather name="x" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle} numberOfLines={1}>{place?.name ?? ""}</Text>
                <View style={{ width: 44 }} />
              </View>
            )}
          </>
        ) : (
          <View style={styles.fallback}>
            <Ionicons name="videocam-off" size={64} color="#fff" style={{ opacity: 0.5 }} />
            <Text style={styles.fallbackTitle}>{place?.name ? "Sin video 360° disponible" : "Cargando..."}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Feather name="arrow-left" size={18} color="#fff" />
              <Text style={styles.closeBtnText}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (!videoUrl && place !== undefined) {
    return (
      <View style={[styles.container, { backgroundColor: "#000" }]}>
        <View style={styles.fallback}>
          <Ionicons name="videocam-off" size={64} color="#fff" style={{ opacity: 0.5 }} />
          <Text style={styles.fallbackTitle}>Sin video 360° disponible</Text>
          <Text style={styles.fallbackSub}>Este lugar no tiene video 360° aún.</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Feather name="arrow-left" size={18} color="#fff" />
            <Text style={styles.closeBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const WebView = require("react-native-webview").default;

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={showControlsTemp} activeOpacity={1}>
        {videoUrl ? (
          <WebView
            source={{ html: buildVrHtml(videoUrl, vrMode) }}
            style={styles.webview}
            onLoad={() => setLoading(false)}
            onLoadStart={() => setLoading(true)}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            onShouldStartLoadWithRequest={(req: any) => {
              return req.url.startsWith("about:") || req.url.includes("youtube.com") || req.url.includes("youtu.be");
            }}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000", alignItems: "center", justifyContent: "center" }]}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        )}
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando experiencia 360°...</Text>
        </View>
      )}

      {controlsVisible && (
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.controlBtn} onPress={handleClose}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            {vrMode && (
              <View style={[styles.vrBadge, { backgroundColor: categoryColor }]}>
                <Ionicons name="glasses" size={12} color="#fff" />
                <Text style={styles.vrBadgeText}>MODO VR</Text>
              </View>
            )}
            <Text style={styles.topBarTitle} numberOfLines={1}>{place?.name ?? "Cargando..."}</Text>
          </View>
          <TouchableOpacity
            style={[styles.controlBtn, vrMode && { backgroundColor: categoryColor }]}
            onPress={toggleVrMode}
          >
            <Ionicons name="glasses" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {controlsVisible && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.modeBtn, !vrMode && { backgroundColor: categoryColor }]}
            onPress={() => { setVrMode(false); setLoading(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Ionicons name="phone-portrait" size={18} color="#fff" />
            <Text style={styles.modeBtnText}>Pantalla completa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, vrMode && { backgroundColor: categoryColor }]}
            onPress={() => { setVrMode(true); setLoading(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
          >
            <Ionicons name="glasses" size={18} color="#fff" />
            <Text style={styles.modeBtnText}>Gafas VR</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "#000" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#fff", fontSize: 14, fontFamily: "Inter_400Regular" },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "rgba(0,0,0,0.5)", gap: 12,
  },
  controlBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  titleContainer: { flex: 1, alignItems: "center", gap: 4 },
  topBarTitle: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  vrBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  vrBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center",
  },
  modeBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.15)" },
  modeBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 40 },
  fallbackTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  fallbackSub: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  closeBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, marginTop: 8 },
  closeBtnText: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Inter_400Regular" },
});
