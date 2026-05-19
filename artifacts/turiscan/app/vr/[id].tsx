import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useGetPlaceById } from "@workspace/api-client-react";

const CATEGORY_COLORS: Record<string, string> = {
  Plaza: "#F4D03F",
  Religioso: "#9B59B6",
  Natural: "#27AE60",
  Patrimonio: "#E74C3C",
  Cultural: "#2E86AB",
};

function build360Html(videoUrl: string, vrMode: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>360° Video</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
    canvas { display: block; }
    #ui {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%); display: flex; gap: 10px; z-index: 100;
    }
    .btn {
      background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.25);
      border-radius: 22px; padding: 10px 18px; font-size: 13px;
      font-family: -apple-system, sans-serif; cursor: pointer;
      backdrop-filter: blur(8px); display: flex; align-items: center; gap: 6px;
    }
    .btn:active { background: rgba(26,95,122,0.7); }
    #loading {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: white; font-size: 15px; font-family: -apple-system, sans-serif;
      text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top: 3px solid #2E86AB;
      border-radius: 50%; animation: spin 0.9s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #hint {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: rgba(255,255,255,0.6); font-size: 13px;
      font-family: -apple-system, sans-serif;
      background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 20px;
      pointer-events: none; transition: opacity 0.6s;
    }
    #vr-divider {
      position: fixed; top: 0; bottom: 0; left: 50%;
      width: 2px; background: #333; display: ${vrMode ? "block" : "none"};
    }
  </style>
</head>
<body>
  <div id="loading"><div class="spinner"></div>Cargando video 360°...</div>
  <div id="hint">Arrastra para explorar</div>
  <div id="vr-divider"></div>
  <div id="ui">
    <button class="btn" id="playBtn">⏸ Pausar</button>
    <button class="btn" id="muteBtn">🔊 Sonido</button>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script>
    const VIDEO_URL = '${videoUrl.replace(/'/g, "\\'")}';
    const VR_MODE = ${vrMode};

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.playsInline = true;
    video.muted = false;
    video.autoplay = true;
    video.src = VIDEO_URL;

    // Scene setup
    const scene = new THREE.Scene();
    const W = window.innerWidth, H = window.innerHeight;

    const makeCamera = (aspect) => {
      const c = new THREE.PerspectiveCamera(80, aspect, 0.1, 1000);
      c.position.set(0, 0, 0.01);
      return c;
    };

    const cameraMain = makeCamera(W / H);
    const cameraL = VR_MODE ? makeCamera((W / 2) / H) : null;
    const cameraR = VR_MODE ? makeCamera((W / 2) / H) : null;

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(W, H);
    if (VR_MODE) renderer.setScissorTest(true);
    document.body.appendChild(renderer.domElement);

    // 360° sphere
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const geo = new THREE.SphereGeometry(500, 60, 40);
    geo.scale(-1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: texture });
    const sphere = new THREE.Mesh(geo, mat);
    scene.add(sphere);

    // Interaction state
    let lon = 0, lat = 0, targetLon = 0, targetLat = 0;
    let isDragging = false, lastX = 0, lastY = 0;
    let autoRotate = true;

    const el = renderer.domElement;
    el.addEventListener('mousedown', e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; autoRotate = false; });
    el.addEventListener('mousemove', e => { if (!isDragging) return; targetLon -= (e.clientX - lastX) * 0.15; targetLat += (e.clientY - lastY) * 0.15; lastX = e.clientX; lastY = e.clientY; });
    el.addEventListener('mouseup', () => isDragging = false);
    el.addEventListener('mouseleave', () => isDragging = false);

    el.addEventListener('touchstart', e => { lastX = e.touches[0].pageX; lastY = e.touches[0].pageY; autoRotate = false; }, { passive: true });
    el.addEventListener('touchmove', e => {
      e.preventDefault();
      targetLon -= (e.touches[0].pageX - lastX) * 0.2;
      targetLat += (e.touches[0].pageY - lastY) * 0.2;
      lastX = e.touches[0].pageX; lastY = e.touches[0].pageY;
    }, { passive: false });

    if (VR_MODE && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', e => {
        if (isDragging) return;
        targetLat = -(e.beta - 90);
        targetLon = e.alpha;
      });
    }

    // Controls
    const playBtn = document.getElementById('playBtn');
    const muteBtn = document.getElementById('muteBtn');
    playBtn.addEventListener('click', e => {
      e.stopPropagation();
      video.paused ? (video.play(), playBtn.textContent = '⏸ Pausar') : (video.pause(), playBtn.textContent = '▶ Reproducir');
    });
    muteBtn.addEventListener('click', e => {
      e.stopPropagation();
      video.muted = !video.muted;
      muteBtn.textContent = video.muted ? '🔇 Silencio' : '🔊 Sonido';
    });

    // Loading state
    let loaded = false;
    const hideLoading = () => {
      if (loaded) return; loaded = true;
      const el = document.getElementById('loading');
      if (el) el.style.display = 'none';
      setTimeout(() => {
        const h = document.getElementById('hint');
        if (h) { h.style.opacity = '0'; setTimeout(() => h.remove(), 600); }
      }, 2500);
    };
    video.addEventListener('playing', hideLoading);
    video.addEventListener('canplay', () => video.play().catch(() => {}));
    video.addEventListener('error', () => {
      const el = document.getElementById('loading');
      if (el) el.innerHTML = '<span style="color:#E74C3C">Error al cargar el video.<br>Verifica la URL.</span>';
    });

    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      cameraMain.aspect = w / h; cameraMain.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    const lerp = (a, b, t) => a + (b - a) * t;

    function lookAt(cam) {
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      cam.lookAt(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );
    }

    (function animate() {
      requestAnimationFrame(animate);
      if (autoRotate) targetLon += 0.05;
      lon = lerp(lon, targetLon, 0.08);
      lat = lerp(lat, Math.max(-85, Math.min(85, targetLat)), 0.08);

      if (VR_MODE && cameraL && cameraR) {
        const w = window.innerWidth, h = window.innerHeight;
        lookAt(cameraL); lookAt(cameraR);
        renderer.setViewport(0, 0, w / 2, h); renderer.setScissor(0, 0, w / 2, h);
        renderer.render(scene, cameraL);
        renderer.setViewport(w / 2, 0, w / 2, h); renderer.setScissor(w / 2, 0, w / 2, h);
        renderer.render(scene, cameraR);
      } else {
        lookAt(cameraMain);
        renderer.render(scene, cameraMain);
      }
    })();
  </script>
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

  const noVideo = !videoUrl && place !== undefined;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: "#000" }]}>
        {videoUrl ? (
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={showControlsTemp} activeOpacity={1}>
            <iframe
              src=""
              srcDoc={build360Html(videoUrl, vrMode)}
              style={{ width: "100%", height: "100%", border: "none" } as any}
              allow="autoplay; gyroscope; accelerometer; fullscreen"
              allowFullScreen
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.fallback}>
            <Ionicons name="videocam-off" size={64} color="#fff" style={{ opacity: 0.5 }} />
            <Text style={styles.fallbackTitle}>{place ? "Sin video 360° disponible" : "Cargando..."}</Text>
            {!place && <ActivityIndicator color="#fff" />}
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Feather name="arrow-left" size={18} color="#fff" />
              <Text style={styles.closeBtnText}>Volver</Text>
            </TouchableOpacity>
          </View>
        )}
        {videoUrl && controlsVisible && (
          <View style={[styles.topBar, { paddingTop: insets.top + 67 + 8 }]}>
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
              <Text style={styles.topBarTitle} numberOfLines={1}>{place?.name ?? ""}</Text>
            </View>
            <TouchableOpacity style={[styles.controlBtn, vrMode && { backgroundColor: categoryColor }]} onPress={toggleVrMode}>
              <Ionicons name="glasses" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (noVideo) {
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
      {videoUrl ? (
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={showControlsTemp} activeOpacity={1}>
          <WebView
            key={`${vrMode}-${videoUrl}`}
            source={{ html: build360Html(videoUrl, vrMode) }}
            style={styles.webview}
            onLoad={() => setLoading(false)}
            onLoadStart={() => setLoading(true)}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
            mixedContentMode="always"
          />
        </TouchableOpacity>
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 12, fontFamily: "Inter_400Regular", fontSize: 14 }}>
            Cargando información...
          </Text>
        </View>
      )}

      {loading && videoUrl && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#2E86AB" />
          <Text style={styles.loadingText}>Preparando experiencia 360°...</Text>
        </View>
      )}

      {controlsVisible && (
        <>
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
            <TouchableOpacity style={[styles.controlBtn, vrMode && { backgroundColor: categoryColor }]} onPress={toggleVrMode}>
              <Ionicons name="glasses" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "#000" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { color: "#fff", fontSize: 14, fontFamily: "Inter_400Regular" },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "rgba(0,0,0,0.55)", gap: 12,
  },
  controlBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  titleContainer: { flex: 1, alignItems: "center", gap: 4 },
  topBarTitle: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  vrBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  vrBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center",
  },
  modeBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.15)" },
  modeBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 40 },
  fallbackTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  fallbackSub: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  closeBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, marginTop: 8 },
  closeBtnText: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Inter_400Regular" },
});
