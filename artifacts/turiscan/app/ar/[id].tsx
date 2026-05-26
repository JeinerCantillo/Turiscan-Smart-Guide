import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  StatusBar,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions } from "expo-camera";

import { ARGuideAvatar3D, type ARGuideAvatarRef } from "@/components/ARGuideAvatar3D";
import { useGetPlaceById } from "@workspace/api-client-react";
import type { Place } from "@workspace/api-client-react";

const { width: SW, height: SH } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────
// Card data builder
// ─────────────────────────────────────────────────────────────
type CardType = "historia" | "curiosidad" | "leyenda" | "datos";

interface ARCard {
  id: string;
  type: CardType;
  emoji: string;
  title: string;
  content: string;
  narration: string;
  gradient: [string, string];
}

const CATEGORY_CURIOSIDADES: Record<string, string[]> = {
  Plaza: [
    "Las plazas coloniales colombianas eran el corazón cívico de la ciudad: allí se proclamaban leyes, se celebraban fiestas y se realizaban los mercados principales.",
    "El diseño de las plazas del Caribe colombiano mezcla la tradición española con elementos tropicales propios de la región Caribe.",
  ],
  Religioso: [
    "Las iglesias de la Costa Caribe colombiana conservan retablos barrocos únicos, traídos desde España durante la colonia.",
    "La arquitectura religiosa de Ciénaga combina influencias españolas, árabes e indígenas, reflejando la riqueza multicultural del Caribe.",
  ],
  Natural: [
    "La Ciénaga Grande de Santa Marta es el humedal más grande de Colombia y uno de los más importantes del Caribe, declarado sitio Ramsar de importancia internacional.",
    "La región alberga más de 200 especies de aves migratorias que recorren la costa Caribe colombiana cada año.",
  ],
  Patrimonio: [
    "Ciénaga fue escenario de la masacre de las bananeras en 1928, un hecho histórico que Gabriel García Márquez inmortalizó en 'Cien años de soledad'.",
    "El centro histórico de Ciénaga conserva más de 200 fachadas republicanas y modernistas, siendo uno de los conjuntos arquitectónicos más importantes del Caribe.",
  ],
  Cultural: [
    "Ciénaga es una de las cunas del vallenato. Sus parrandas y festivales han dado forma a este ritmo declarado Patrimonio Inmaterial de la Humanidad por la UNESCO.",
    "La tradición artesanal de la región incluye el tejido de mochilas wayuu, la talla en madera y la elaboración del sombrero vueltiao, símbolo nacional de Colombia.",
  ],
};

const LEYENDAS: Record<string, string> = {
  Plaza:
    "Cuenta la leyenda que en las noches de luna llena, el alma de un alcalde colonial pasea por la plaza haciendo sonar sus espuelas, recordando los tiempos de oro de la villa.",
  Religioso:
    "Los pescadores de la región dicen que en noches de tormenta, las campanas repican solas para guiar a los navegantes extraviados de vuelta al puerto.",
  Natural:
    "Los indígenas Chimilas contaban que la ciénaga era guardada por un espíritu del agua con forma de caimán dorado, protector de la biodiversidad del lugar.",
  Patrimonio:
    "Se dice que bajo las calles del centro histórico existen túneles coloniales que comunicaban los edificios importantes y que sirvieron de refugio durante las guerras civiles.",
  Cultural:
    "La tradición oral cuenta que el primer acordeón llegó a la Costa Caribe en un barco alemán, y que un músico cienaguero lo escuchó y en una sola noche aprendió a tocarlo para sorpresa de todos.",
};

function buildCards(place: Place): ARCard[] {
  const cards: ARCard[] = [];

  if (place.history) {
    const chunk1 = place.history.substring(0, 320);
    const hasMore = place.history.length > 320;
    cards.push({
      id: "historia-1",
      type: "historia",
      emoji: "📜",
      title: "Historia",
      content: chunk1 + (hasMore ? "…" : ""),
      narration: `Te cuento la historia de ${place.name}. ${chunk1}`,
      gradient: ["#0D3F54", "#1A5F7A"],
    });
    if (hasMore) {
      const chunk2 = place.history.substring(320, 640);
      cards.push({
        id: "historia-2",
        type: "historia",
        emoji: "📖",
        title: "Historia (cont.)",
        content: chunk2 + (place.history.length > 640 ? "…" : ""),
        narration: chunk2,
        gradient: ["#0D3F54", "#1A5F7A"],
      });
    }
  }

  const curiosidades = CATEGORY_CURIOSIDADES[place.category] ?? [
    "Ciénaga es conocida como 'La Perla del Caribe' por su riqueza cultural e histórica.",
    "La ciudad ha sido inspiración de grandes escritores colombianos, incluyendo Gabriel García Márquez.",
  ];

  curiosidades.forEach((c, i) => {
    cards.push({
      id: `curiosidad-${i}`,
      type: "curiosidad",
      emoji: i === 0 ? "⭐" : "💡",
      title: `Dato Curioso ${i + 1}`,
      content: c,
      narration: `¿Sabías que? ${c}`,
      gradient: ["#4A1080", "#7D3AC1"],
    });
  });

  const leyenda = LEYENDAS[place.category];
  if (leyenda) {
    cards.push({
      id: "leyenda",
      type: "leyenda",
      emoji: "🌙",
      title: "Leyenda Local",
      content: leyenda,
      narration: `Y te cuento la leyenda que rodea este lugar. ${leyenda}`,
      gradient: ["#1a0a2e", "#4a1070"],
    });
  }

  cards.push({
    id: "datos",
    type: "datos",
    emoji: "🗺️",
    title: "Información",
    content: `Categoría: ${place.category}\n\nHorario: ${
      place.visitHours ?? "Consultar en el sitio"
    }\n\nUbicación: Ciénaga, Magdalena, Colombia\n\nCoordenadas: ${place.latitude.toFixed(
      5
    )}, ${place.longitude.toFixed(5)}`,
    narration: `La información práctica del lugar. Categoría ${
      place.category
    }. ${
      place.visitHours
        ? "Horario de visita: " + place.visitHours + "."
        : "Consulta los horarios directamente en el sitio."
    } Se encuentra en Ciénaga, Magdalena.`,
    gradient: ["#0D4A2A", "#1A8050"],
  });

  return cards;
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function ARCornerBrackets() {
  const SIZE = 36;
  const THICK = 4;
  const COLOR = "#1AEFFF";
  const cornerStyle = (tl: boolean, tr: boolean, bl: boolean, br: boolean) => ({
    position: "absolute" as const,
    width: SIZE,
    height: SIZE,
    borderColor: COLOR,
    borderTopWidth: tl || tr ? THICK : 0,
    borderBottomWidth: bl || br ? THICK : 0,
    borderLeftWidth: tl || bl ? THICK : 0,
    borderRightWidth: tr || br ? THICK : 0,
    borderTopLeftRadius: tl ? 4 : 0,
    borderTopRightRadius: tr ? 4 : 0,
    borderBottomLeftRadius: bl ? 4 : 0,
    borderBottomRightRadius: br ? 4 : 0,
  });
  return (
    <>
      <View style={[cornerStyle(true,false,false,false), { top: 0, left: 0 }]} />
      <View style={[cornerStyle(false,true,false,false), { top: 0, right: 0 }]} />
      <View style={[cornerStyle(false,false,true,false), { bottom: 0, left: 0 }]} />
      <View style={[cornerStyle(false,false,false,true), { bottom: 0, right: 0 }]} />
    </>
  );
}

function ScanlineEffect({ onDone }: { onDone: () => void }) {
  const y = useRef(new Animated.Value(-4)).current;
  useEffect(() => {
    Animated.timing(y, {
      toValue: SH + 4,
      duration: 1200,
      useNativeDriver: true,
    }).start(() => onDone());
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.scanline, { transform: [{ translateY: y }] }]}
    />
  );
}

function ARHud({
  place,
  cardIndex,
  total,
  pulseAnim,
}: {
  place: Place;
  cardIndex: number;
  total: number;
  pulseAnim: Animated.Value;
}) {
  return (
    <View style={styles.hud}>
      <View style={styles.hudLeft}>
        <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
        <Text style={styles.hudLiveText}>AR LIVE</Text>
      </View>
      <View style={styles.hudCenter}>
        <Text style={styles.hudPlaceName} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.hudCoords}>
          {place.latitude.toFixed(4)}°N · {Math.abs(place.longitude).toFixed(4)}°O
        </Text>
      </View>
      <View style={styles.hudRight}>
        <Text style={styles.hudCardCount}>
          {cardIndex + 1}/{total}
        </Text>
      </View>
    </View>
  );
}

function ARInfoCard({
  card,
  isActive,
  offset,
}: {
  card: ARCard;
  isActive: boolean;
  offset: number;
}) {
  const scale = useRef(new Animated.Value(isActive ? 1 : 0.92)).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0.45)).current;
  const rotY = useRef(new Animated.Value(isActive ? 0 : offset * 6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: isActive ? 1 : 0.88 + Math.abs(offset) * 0.04, useNativeDriver: true, tension: 55, friction: 8 }),
      Animated.timing(opacity, { toValue: isActive ? 1 : Math.max(0, 0.5 - Math.abs(offset) * 0.2), duration: 280, useNativeDriver: true }),
      Animated.spring(rotY, { toValue: isActive ? 0 : offset * 8, useNativeDriver: true, tension: 55, friction: 8 }),
    ]).start();
  }, [isActive, offset]);

  if (Math.abs(offset) > 2) return null;

  return (
    <Animated.View
      style={[
        styles.arCard,
        {
          opacity,
          transform: [
            { scale },
            { perspective: 1200 },
            { rotateY: rotY.interpolate({ inputRange: [-90, 90], outputRange: ["-90deg", "90deg"] }) },
            { translateX: offset * (SW * 0.78) },
            { translateY: Math.abs(offset) * 18 },
          ],
          zIndex: isActive ? 10 : 5 - Math.abs(offset),
        },
      ]}
      pointerEvents={isActive ? "box-none" : "none"}
    >
      <LinearGradient
        colors={[...card.gradient, card.gradient[1] + "CC"] as any}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Card header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>{card.emoji}</Text>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardType}>{card.type.toUpperCase()}</Text>
            <Text style={styles.cardTitle}>{card.title}</Text>
          </View>
          <View style={styles.cardHeaderDots}>
            <View style={[styles.headerDot, { backgroundColor: "rgba(255,255,255,0.6)" }]} />
            <View style={[styles.headerDot, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Content */}
        <Text style={styles.cardContent}>{card.content}</Text>

        {/* Corner decoration */}
        <View style={styles.cardCornerTL} />
        <View style={styles.cardCornerBR} />
      </LinearGradient>
    </Animated.View>
  );
}

function SpeechBubble({ text, visible }: { text: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 70, friction: 10 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 12, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, text]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.speechBubble, { opacity, transform: [{ translateY }] }]}
    >
      <View style={styles.speechBubbleTail} />
      <Text style={styles.speechBubbleText} numberOfLines={3}>
        {text}
      </Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export default function ARScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [camPermission, requestCamPermission] = useCameraPermissions();

  const { data: place, isLoading } = useGetPlaceById({ id: Number(id) });

  const [scanning, setScanning] = useState(true);
  const [cardIndex, setCardIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [showBubble, setShowBubble] = useState(false);

  const avatarRef = useRef<ARGuideAvatarRef>(null);
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const cards = useMemo(() => (place ? buildCards(place) : []), [place]);
  const currentCard = cards[cardIndex];

  // Pulse animation for "LIVE" dot
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Request camera on mount
  useEffect(() => {
    requestCamPermission();
  }, []);

  // Auto-narrate first card on load
  useEffect(() => {
    if (!scanning && cards.length > 0 && place) {
      setTimeout(() => {
        const greet = `¡Bienvenidos a ${place.name}! Soy Carlos, tu guía turístico. Desliza las tarjetas para explorar la historia y curiosidades de este increíble lugar.`;
        setBubbleText(greet);
        setShowBubble(true);
        narrate(greet);
      }, 800);
    }
  }, [scanning, cards]);

  // Update bubble when card changes
  useEffect(() => {
    if (!scanning && currentCard) {
      setBubbleText(currentCard.narration.substring(0, 90) + "…");
      setShowBubble(true);
    }
  }, [cardIndex, scanning]);

  const narrate = useCallback(async (text: string) => {
    Speech.stop();
    setIsSpeaking(true);
    avatarRef.current?.setSpeaking(true);
    avatarRef.current?.setPointing(true);
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const co = voices.find((v) => v.language === "es-CO" || v.language === "es_CO");
      const lat = voices.find((v) => v.language === "es-419");
      const anyEs = voices.find((v) => v.language.startsWith("es"));
      const voiceId = (co || lat || anyEs)?.identifier;
      Speech.speak(text, {
        language: "es-CO",
        voice: voiceId,
        rate: 0.82,
        pitch: 1.05,
        onDone: () => { setIsSpeaking(false); avatarRef.current?.setSpeaking(false); },
        onStopped: () => { setIsSpeaking(false); avatarRef.current?.setSpeaking(false); },
        onError: () => { setIsSpeaking(false); avatarRef.current?.setSpeaking(false); },
      });
    } catch {
      setIsSpeaking(false);
      avatarRef.current?.setSpeaking(false);
    }
  }, []);

  const handleSpeak = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      avatarRef.current?.setSpeaking(false);
      setShowBubble(false);
    } else if (currentCard) {
      setBubbleText(currentCard.narration.substring(0, 90) + "…");
      setShowBubble(true);
      narrate(currentCard.narration);
    }
  }, [isSpeaking, currentCard, narrate]);

  const goCard = useCallback(
    (dir: 1 | -1) => {
      const next = cardIndex + dir;
      if (next < 0 || next >= cards.length) return;
      Haptics.selectionAsync();
      Speech.stop();
      setIsSpeaking(false);
      avatarRef.current?.setSpeaking(false);

      Animated.sequence([
        Animated.timing(swipeAnim, { toValue: -dir * SW, duration: 220, useNativeDriver: true }),
        Animated.timing(swipeAnim, { toValue: dir * SW, duration: 0, useNativeDriver: true }),
        Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 9 }),
      ]).start();

      setCardIndex(next);
    },
    [cardIndex, cards.length, swipeAnim]
  );

  // Swipe gesture on card area
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 12 && Math.abs(gs.dy) < 60,
      onPanResponderMove: (_, gs) => swipeAnim.setValue(gs.dx),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -60) goCard(1);
        else if (gs.dx > 60) goCard(-1);
        else Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 9 }).start();
      },
    })
  ).current;

  const handleClose = () => {
    Speech.stop();
    router.back();
  };

  // ── LOADING ──
  if (isLoading || !place) {
    return (
      <View style={styles.loadingScreen}>
        <Feather name="loader" size={32} color="#1AEFFF" />
        <Text style={styles.loadingText}>Iniciando AR…</Text>
      </View>
    );
  }

  const hasCam = camPermission?.granted ?? false;

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* ── BACKGROUND: camera or gradient fallback ── */}
      {hasCam && Platform.OS !== "web" ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <LinearGradient
          colors={["#040D14", "#081828", "#0C2438"]}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Dark vignette overlay for readability */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.6)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── SCANLINE (startup) ── */}
      {scanning && <ScanlineEffect onDone={() => setScanning(false)} />}

      {/* ── CORNER BRACKETS ── */}
      <View style={[styles.cornersOverlay, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <ARCornerBrackets />
      </View>

      {/* ── HUD ── */}
      <View style={{ paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 6 }}>
        <ARHud place={place} cardIndex={cardIndex} total={cards.length} pulseAnim={pulseAnim} />
      </View>

      {/* ── CARDS AREA ── */}
      <View style={styles.cardsArea} {...panResponder.panHandlers}>
        {cards.map((card, i) => (
          <ARInfoCard
            key={card.id}
            card={card}
            isActive={i === cardIndex}
            offset={i - cardIndex}
          />
        ))}

        {/* Swipe hint dots */}
        <View style={styles.cardDots}>
          {cards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.cardDot,
                { backgroundColor: i === cardIndex ? "#1AEFFF" : "rgba(255,255,255,0.3)", width: i === cardIndex ? 20 : 6 },
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── BOTTOM: avatar + speech + controls ── */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8 }]}>

        {/* Avatar holographic panel */}
        <View style={styles.avatarSection}>
          {/* Holographic frame */}
          <View style={styles.holoFrame}>
            <View style={styles.holoTopBar}>
              <View style={styles.holoDot} />
              <Text style={styles.holoLabel}>GUÍA IA</Text>
              <View style={[styles.holoDot, { backgroundColor: "#F4D03F" }]} />
            </View>
            <ARGuideAvatar3D ref={avatarRef} width={148} height={160} />
            <View style={styles.holoBottomBar}>
              <Text style={styles.holoName}>Carlos · Cienaguero</Text>
            </View>
          </View>

          {/* Speech bubble */}
          <View style={styles.bubbleContainer}>
            <SpeechBubble text={bubbleText} visible={showBubble} />
          </View>
        </View>

        {/* Controls row */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.ctrlBtn, { opacity: cardIndex === 0 ? 0.35 : 1 }]}
            onPress={() => goCard(-1)}
            disabled={cardIndex === 0}
          >
            <Feather name="chevron-left" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlBtnSpeak, { backgroundColor: isSpeaking ? "#E74C3C" : "#1AEFFF" }]}
            onPress={handleSpeak}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isSpeaking ? "stop" : "volume-high"}
              size={26}
              color={isSpeaking ? "#fff" : "#0D1F2D"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlBtn, { opacity: cardIndex === cards.length - 1 ? 0.35 : 1 }]}
            onPress={() => goCard(1)}
            disabled={cardIndex === cards.length - 1}
          >
            <Feather name="chevron-right" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctrlBtnClose} onPress={handleClose}>
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Card label */}
        {currentCard && (
          <Text style={styles.ctrlCardLabel}>
            {currentCard.emoji} {currentCard.title}
          </Text>
        )}
      </View>

      {/* Grid overlay (subtle AR grid) */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            style={[styles.gridLine, { top: `${(i + 1) * 11}%` as any }]}
          />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  loadingScreen: { flex: 1, backgroundColor: "#040D14", alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { color: "#1AEFFF", fontFamily: "Inter_600SemiBold", fontSize: 16 },

  cornersOverlay: {
    position: "absolute",
    top: 0, left: 12, right: 12,
    height: SH * 0.72,
  },
  scanline: {
    position: "absolute",
    left: 0, right: 0,
    height: 4,
    backgroundColor: "#1AEFFF",
    opacity: 0.7,
    shadowColor: "#1AEFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    zIndex: 100,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  gridLine: {
    position: "absolute",
    left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(26,239,255,0.04)",
  },

  // ── HUD ──
  hud: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(26,239,255,0.3)",
    gap: 10,
  },
  hudLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E74C3C" },
  hudLiveText: { color: "#E74C3C", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  hudCenter: { flex: 1, alignItems: "center" },
  hudPlaceName: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  hudCoords: { color: "rgba(26,239,255,0.7)", fontSize: 9, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  hudRight: {},
  hudCardCount: { color: "#1AEFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // ── CARDS ──
  cardsArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  arCard: {
    position: "absolute",
    width: SW - 40,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#1AEFFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  cardGradient: { padding: 22, minHeight: 200 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  cardEmoji: { fontSize: 34 },
  cardHeaderText: { flex: 1 },
  cardType: { color: "rgba(255,255,255,0.55)", fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  cardTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 1 },
  cardHeaderDots: { gap: 4 },
  headerDot: { width: 6, height: 6, borderRadius: 3 },
  cardDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginVertical: 12 },
  cardContent: { color: "rgba(255,255,255,0.92)", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  cardCornerTL: {
    position: "absolute", top: 10, left: 10,
    width: 18, height: 18,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderTopLeftRadius: 3,
  },
  cardCornerBR: {
    position: "absolute", bottom: 10, right: 10,
    width: 18, height: 18,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderBottomRightRadius: 3,
  },
  cardDots: {
    position: "absolute",
    bottom: -30,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  cardDot: { height: 6, borderRadius: 3 },

  // ── BOTTOM ──
  bottom: {
    paddingHorizontal: 16,
    gap: 10,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  holoFrame: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#1AEFFF",
    backgroundColor: "rgba(0,20,40,0.82)",
    shadowColor: "#1AEFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 10,
  },
  holoTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(26,239,255,0.12)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(26,239,255,0.3)",
  },
  holoDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#1AEFFF" },
  holoLabel: { color: "#1AEFFF", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  holoBottomBar: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "rgba(26,239,255,0.08)",
    borderTopWidth: 1,
    borderTopColor: "rgba(26,239,255,0.3)",
    alignItems: "center",
  },
  holoName: { color: "#F4D03F", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  bubbleContainer: { flex: 1, justifyContent: "flex-end", paddingBottom: 6 },

  // ── SPEECH BUBBLE ──
  speechBubble: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(26,239,255,0.4)",
    shadowColor: "#1AEFFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  speechBubbleTail: {
    position: "absolute",
    bottom: -7,
    left: 18,
    width: 12,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(26,239,255,0.4)",
    transform: [{ rotate: "45deg" }],
  },
  speechBubbleText: { color: "#0D1F2D", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  // ── CONTROLS ──
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlBtnSpeak: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1AEFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 10,
  },
  ctrlBtnClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(231,76,60,0.3)",
    borderWidth: 1,
    borderColor: "rgba(231,76,60,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  ctrlCardLabel: {
    textAlign: "center",
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
