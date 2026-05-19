import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  useColorScheme,
} from "react-native";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";

import Colors from "@/constants/colors";

const { width, height } = Dimensions.get("window");
const SCANNER_SIZE = width * 0.72;
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = "#1A5F7A";

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    scanLoop.start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => { scanLoop.stop(); pulse.stop(); };
  }, []);

  const translateY = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SCANNER_SIZE - 4] });

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const qrCode = data.trim();
    // Navigate to scan-result screen with avatar interaction
    router.replace({ pathname: "/scan-result", params: { qrCode } });
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.permText}>Cargando cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="camera-outline" size={64} color="#fff" style={{ marginBottom: 20 }} />
        <Text style={styles.permTitle}>Acceso a la cámara</Text>
        <Text style={styles.permText}>
          Turiscan necesita acceso a la cámara para escanear los códigos QR turísticos.
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Conceder permiso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS !== "web" ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          enableTorch={torch}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0A1520" }]}>
          <View style={styles.webCameraPlaceholder}>
            <Ionicons name="qr-code-outline" size={80} color="rgba(255,255,255,0.3)" />
            <Text style={styles.webNote}>Escaneo de QR disponible en dispositivo móvil</Text>
            <TouchableOpacity
              style={[styles.permButton, { marginTop: 8 }]}
              onPress={() => handleBarCodeScanned({ type: "qr", data: "PLAZA_CENTENARIO" })}
            >
              <Text style={styles.permButtonText}>Simular escaneo (demo)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={[styles.overlayRow, { height: (height - SCANNER_SIZE) / 2.5 }]} />
        <View style={styles.overlayMiddle}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }} />
          <Animated.View style={[styles.scannerWindow, { width: SCANNER_SIZE, height: SCANNER_SIZE, transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
          </Animated.View>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }} />
        </View>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12 }]}>
        <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Escanear QR</Text>
        <TouchableOpacity
          onPress={() => { setTorch(!torch); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.iconBtn, torch && styles.iconBtnActive]}
        >
          <Ionicons name={torch ? "flashlight" : "flashlight-outline"} size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Instruction */}
      <View style={[styles.instructionContainer, { bottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40 }]}>
        {scanned ? (
          <View style={styles.successPill}>
            <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
            <Text style={styles.successText}>¡Código detectado!</Text>
          </View>
        ) : (
          <>
            <Text style={styles.instructionTitle}>Apunta al código QR</Text>
            <Text style={styles.instructionText}>
              Busca el código QR en la señal turística del sitio
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: { alignItems: "center", justifyContent: "center", padding: 32 },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayRow: { width: "100%", backgroundColor: "rgba(0,0,0,0.65)" },
  overlayMiddle: { flexDirection: "row", alignItems: "stretch" },
  scannerWindow: { position: "relative", overflow: "hidden" },
  scanLine: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: CORNER_COLOR,
    shadowColor: CORNER_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  corner: { position: "absolute", width: CORNER_SIZE, height: CORNER_SIZE, borderColor: CORNER_COLOR },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 6 },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 6 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 6 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 6 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topTitle: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: "rgba(26,95,122,0.7)" },
  instructionContainer: { position: "absolute", left: 24, right: 24, alignItems: "center" },
  instructionTitle: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 6 },
  instructionText: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  successPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(39,174,96,0.2)",
    borderColor: "#27AE60",
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  successText: { color: "#27AE60", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  permTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 10 },
  permText: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  permButton: { backgroundColor: "#1A5F7A", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginBottom: 12 },
  permButtonText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cancelButton: { padding: 12 },
  cancelButtonText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontFamily: "Inter_400Regular" },
  webCameraPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  webNote: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
});
