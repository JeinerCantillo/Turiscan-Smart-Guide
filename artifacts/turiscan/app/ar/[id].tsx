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
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions } from "expo-camera";

import { ARGuideCharacter, type ARGuideCharacterRef } from "@/components/ARGuideCharacter";
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
    "La arquitectura religiosa de Ciénaga combina influencias españolas, árabes e indígenas.",
  ],
  Natural: [
    "La Ciénaga Grande de Santa Marta es el humedal más grande de Colombia, declarado sitio Ramsar de importancia internacional.",
    "La región alberga más de 200 especies de aves migratorias que recorren la costa Caribe colombiana cada año.",
  ],
  Patrimonio: [
    "Ciénaga fue escenario de la masacre de las bananeras en 1928, inmortalizda por Gabriel García Márquez en 'Cien años de soledad'.",
    "El centro histórico de Ciénaga conserva más de 200 fachadas republicanas y modernistas.",
  ],
  Cultural: [
    "Ciénaga es una de las cunas del vallenato, declarado Patrimonio Inmaterial de la Humanidad por la UNESCO.",
    "La tradición artesanal incluye el tejido de mochilas wayuu, la talla en madera y el sombrero vueltiao, símbolo nacional de Colombia.",
  ],
};

const LEYENDAS: Record<string, string> = {
  Plaza: "Cuenta la leyenda que en las noches de luna llena, el alma de un alcalde colonial pasea por la plaza haciendo sonar sus espuelas.",
  Religioso: "Los pescadores dicen que en noches de tormenta, las campanas repican solas para guiar a los navegantes extraviados.",
  Natural: "Los indígenas Chimilas contaban que la ciénaga era guardada por un espíritu con forma de caimán dorado, protector de la biodiversidad.",
  Patrimonio: "Se dice que bajo las calles del centro histórico existen túneles coloniales que sirvieron de refugio durante las guerras civiles.",
  Cultural: "Cuenta la tradición oral que el primer acordeón llegó a la Costa en un barco alemán y un músico cienaguero lo aprendió en una sola noche.",
};

function buildCards(place: Place): ARCard[] {
  const cards: ARCard[] = [];
  if (place.history) {
    const chunk1 = place.history.substring(0, 320);
    const hasMore = place.history.length > 320;
    cards.push({
      id: "historia-1", type: "historia", emoji: "📜", title: "Historia",
      content: chunk1 + (hasMore ? "…" : ""),
      narration: `Te cuento la historia de ${place.name}. ${chunk1}`,
      gradient: ["#0D3F54", "#1A5F7A"],
    });
    if (hasMore) {
      const chunk2 = place.history.substring(320, 640);
      cards.push({
        id: "historia-2", type: "historia", emoji: "📖", title: "Historia (cont.)",
        content: chunk2 + (place.history.length > 640 ? "…" : ""),
        narration: chunk2,
        gradient: ["#0D3F54", "#1A5F7A"],
      });
    }
  }
  const curiosidades = CATEGORY_CURIOSIDADES[place.category] ?? [
    "Ciénaga es conocida como 'La Perla del Caribe' por su riqueza cultural e histórica.",
    "La ciudad ha sido inspiración de grandes escritores colombianos.",
  ];
  curiosidades.forEach((c, i) => {
    cards.push({
      id: `curiosidad-${i}`, type: "curiosidad",
      emoji: i === 0 ? "⭐" : "💡", title: `Dato Curioso ${i + 1}`,
      content: c, narration: `¿Sabías que? ${c}`,
      gradient: ["#4A1080", "#7D3AC1"],
    });
  });
  const leyenda = LEYENDAS[place.category];
  if (leyenda) {
    cards.push({
      id: "leyenda", type: "leyenda", emoji: "🌙", title: "Leyenda Local",
      content: leyenda, narration: `Y te cuento la leyenda que rodea este lugar. ${leyenda}`,
      gradient: ["#1a0a2e", "#4a1070"],
    });
  }
  cards.push({
    id: "datos", type: "datos", emoji: "🗺️", title: "Información Práctica",
    content: `Categoría: ${place.category}\n\nHorario: ${place.visitHours ?? "Consultar en el sitio"}\n\nUbicación: Ciénaga, Magdalena\n\nCoordenadas: ${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`,
    narration: `La información práctica: Categoría ${place.category}. ${place.visitHours ? "Horario: " + place.visitHours + "." : "Consulta el horario en el sitio."} Ubicado en Ciénaga, Magdalena.`,
    gradient: ["#0D4A2A", "#1A8050"],
  });
  return cards;
}

// ─────────────────────────────────────────────────────────────
// Corner brackets AR overlay
// ─────────────────────────────────────────────────────────────
function ARCornerBrackets() {
  const S = 36, T = 4, C = "#1AEFFF";
  const corner = (tl: boolean, tr: boolean, bl: boolean, br: boolean) => ({
    position: "absolute" as const, width: S, height: S, borderColor: C,
    borderTopWidth: tl || tr ? T : 0, borderBottomWidth: bl || br ? T : 0,
    borderLeftWidth: tl || bl ? T : 0, borderRightWidth: tr || br ? T : 0,
    borderTopLeftRadius: tl ? 4 : 0, borderTopRightRadius: tr ? 4 : 0,
    borderBottomLeftRadius: bl ? 4 : 0, borderBottomRightRadius: br ? 4 : 0,
  });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[corner(true,false,false,false), { top: 0, left: 0 }]} />
      <View style={[corner(false,true,false,false), { top: 0, right: 0 }]} />
      <View style={[corner(false,false,true,false), { bottom: 0, left: 0 }]} />
      <View style={[corner(false,false,false,true), { bottom: 0, right: 0 }]} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Scanline startup animation
// ─────────────────────────────────────────────────────────────
function ScanlineEffect({ onDone }: { onDone: () => void }) {
  const y = useRef(new Animated.Value(-4)).current;
  useEffect(() => {
    Animated.timing(y, { toValue: SH + 4, duration: 1100, useNativeDriver: true }).start(() => onDone());
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.scanline, { transform: [{ translateY: y }] }]}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Floating AR info card (touch-enabled)
// ─────────────────────────────────────────────────────────────
function ARInfoCard({
  card, isActive, offset, onTap, isSpeaking,
}: {
  card: ARCard; isActive: boolean; offset: number;
  onTap: () => void; isSpeaking: boolean;
}) {
  const scale   = useRef(new Animated.Value(isActive ? 1 : 0.88)).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0.4)).current;
  const rotY    = useRef(new Animated.Value(isActive ? 0 : offset * 7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: isActive ? 1 : Math.max(0.72, 0.88 - Math.abs(offset) * 0.05), useNativeDriver: true, tension: 55, friction: 8 }),
      Animated.timing(opacity, { toValue: isActive ? 1 : Math.max(0, 0.45 - Math.abs(offset) * 0.18), duration: 260, useNativeDriver: true }),
      Animated.spring(rotY,    { toValue: isActive ? 0 : offset * 9, useNativeDriver: true, tension: 55, friction: 8 }),
    ]).start();
  }, [isActive, offset]);

  if (Math.abs(offset) > 2) return null;

  // Static border color — no Animated interpolation, avoids mixing native/JS drivers
  const borderColor = isActive && isSpeaking
    ? "rgba(26,239,255,0.85)"
    : isActive
      ? "rgba(255,255,255,0.28)"
      : "rgba(255,255,255,0.10)";

  return (
    <Animated.View
      style={[
        styles.arCard,
        {
          opacity,
          borderColor,
          transform: [
            { scale },
            { perspective: 1200 },
            { rotateY: rotY.interpolate({ inputRange: [-90, 90], outputRange: ["-90deg", "90deg"] }) },
            { translateX: offset * (SW * 0.82) },
            { translateY: Math.abs(offset) * 20 },
          ],
          zIndex: isActive ? 10 : 5 - Math.abs(offset),
          shadowOpacity: isActive ? 0.5 : 0.1,
        },
      ]}
      pointerEvents={isActive ? "box-none" : "none"}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onTap}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={[...card.gradient, card.gradient[1] + "CC"] as any}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {/* Tap hint on active card when not speaking */}
          {isActive && !isSpeaking && (
            <View style={styles.tapHint}>
              <Ionicons name="volume-medium" size={11} color="rgba(255,255,255,0.55)" />
              <Text style={styles.tapHintText}>Toca para escuchar</Text>
            </View>
          )}

          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>{card.emoji}</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardType}>{card.type.toUpperCase()}</Text>
              <Text style={styles.cardTitle}>{card.title}</Text>
            </View>
            {isActive && isSpeaking && (
              <View style={styles.speakingBadge}>
                <Ionicons name="volume-high" size={14} color="#1AEFFF" />
              </View>
            )}
          </View>
          <View style={styles.cardDivider} />
          <Text style={styles.cardContent}>{card.content}</Text>
          {/* Corner decorations */}
          <View style={styles.cardCornerTL} />
          <View style={styles.cardCornerBR} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Speech bubble
// ─────────────────────────────────────────────────────────────
function SpeechBubble({ text, visible }: { text: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(ty, { toValue: 0, useNativeDriver: true, tension: 70, friction: 10 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 10, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, text]);
  return (
    <Animated.View pointerEvents="none" style={[styles.speechBubble, { opacity, transform: [{ translateY: ty }] }]}>
      <View style={styles.speechTail} />
      <Text style={styles.speechText} numberOfLines={4}>{text}</Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────────
function ARHud({ place, cardIndex, total, pulseAnim }: {
  place: Place; cardIndex: number; total: number; pulseAnim: Animated.Value;
}) {
  return (
    <View style={styles.hud}>
      <View style={styles.hudLeft}>
        <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
        <Text style={styles.hudLive}>AR LIVE</Text>
      </View>
      <View style={styles.hudCenter}>
        <Text style={styles.hudName} numberOfLines={1}>{place.name}</Text>
        <Text style={styles.hudCoords}>{place.latitude.toFixed(4)}°N · {Math.abs(place.longitude).toFixed(4)}°O</Text>
      </View>
      <View style={styles.hudRight}>
        <Text style={styles.hudCount}>{cardIndex + 1}/{total}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export default function ARScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [camPermission, requestCamPermission] = useCameraPermissions();

  const { data: place, isLoading, isError } = useGetPlaceById(Number(id));

  const [scanning,   setScanning]   = useState(true);
  const [cardIndex,  setCardIndex]  = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const [muteToggle, setMuteToggle] = useState(false);

  const avatarRef    = useRef<ARGuideCharacterRef>(null);
  const swipeAnim    = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const muteRef      = useRef(false);
  const cardIndexRef = useRef(0); // always-fresh ref to avoid stale closure in PanResponder

  const cards       = useMemo(() => (place ? buildCards(place) : []), [place]);
  const currentCard = cards[cardIndex];

  // Keep refs in sync so closures always read fresh values
  useEffect(() => { muteRef.current    = muteToggle; }, [muteToggle]);
  useEffect(() => { cardIndexRef.current = cardIndex; }, [cardIndex]);
  const cardsRef = useRef(cards);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  // LIVE dot pulse
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  // Request camera on mount
  useEffect(() => { requestCamPermission(); }, []);

  // ── Narrate function ──
  const narrate = useCallback(async (text: string) => {
    if (muteRef.current) return;
    Speech.stop();
    setIsSpeaking(true);
    avatarRef.current?.setSpeaking(true);
    avatarRef.current?.setPointing(true);
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const voice  = voices.find(v => v.language === "es-CO" || v.language === "es_CO")
        ?? voices.find(v => v.language === "es-419")
        ?? voices.find(v => v.language.startsWith("es"));
      Speech.speak(text, {
        language: "es-CO",
        voice:    voice?.identifier,
        rate:     0.84,
        pitch:    1.05,
        onDone:    () => { setIsSpeaking(false); avatarRef.current?.setSpeaking(false); avatarRef.current?.setPointing(false); },
        onStopped: () => { setIsSpeaking(false); avatarRef.current?.setSpeaking(false); avatarRef.current?.setPointing(false); },
        onError:   () => { setIsSpeaking(false); avatarRef.current?.setSpeaking(false); avatarRef.current?.setPointing(false); },
      });
    } catch {
      setIsSpeaking(false);
      avatarRef.current?.setSpeaking(false);
      avatarRef.current?.setPointing(false);
    }
  }, []);

  // Auto-greet + narrate first card when scan completes
  useEffect(() => {
    if (!scanning && cards.length > 0 && place) {
      const greet = `¡Bienvenidos a ${place.name}! Soy Carlos, tu guía turístico cienaguero. Toca las tarjetas para escuchar la historia y curiosidades de este lugar.`;
      setBubbleText(greet);
      setShowBubble(true);
      setTimeout(() => narrate(greet), 600);
    }
  }, [scanning, cards, place]);

  // Update bubble text when card changes (after startup)
  useEffect(() => {
    if (!scanning && currentCard) {
      setBubbleText(currentCard.narration.substring(0, 100) + "…");
      setShowBubble(true);
    }
  }, [cardIndex, scanning]);

  // ── Navigate to card ──
  // Uses refs so PanResponder (created once) always has fresh values — no stale closure
  const goCard = useCallback((dir: 1 | -1) => {
    const idx  = cardIndexRef.current;
    const len  = cardsRef.current.length;
    const next = idx + dir;
    if (next < 0 || next >= len) return;
    Haptics.selectionAsync();
    Speech.stop();
    setIsSpeaking(false);
    avatarRef.current?.setSpeaking(false);
    avatarRef.current?.setPointing(false);
    Animated.sequence([
      Animated.timing(swipeAnim, { toValue: -dir * SW, duration: 180, useNativeDriver: true }),
      Animated.timing(swipeAnim, { toValue:  dir * SW, duration: 0,   useNativeDriver: true }),
      Animated.spring( swipeAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 9 }),
    ]).start();
    setCardIndex(next);
  }, []); // no state deps — reads refs

  // Always-fresh ref so PanResponder closure is never stale
  const goCardRef = useRef(goCard);
  useEffect(() => { goCardRef.current = goCard; }, [goCard]);

  // ── Tap card to narrate ──
  const handleCardTap = useCallback(() => {
    if (!currentCard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      avatarRef.current?.setSpeaking(false);
      avatarRef.current?.setPointing(false);
      setShowBubble(false);
    } else {
      setBubbleText(currentCard.narration.substring(0, 100) + "…");
      setShowBubble(true);
      narrate(currentCard.narration);
    }
  }, [isSpeaking, currentCard, narrate]);

  // ── Full-screen swipe gesture ──
  // PanResponder calls goCardRef.current so it always has the latest goCard
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 14 && Math.abs(gs.dy) < 70,
      onPanResponderMove:   (_, gs) => swipeAnim.setValue(gs.dx * 0.55),
      onPanResponderRelease: (_, gs) => {
        if      (gs.dx < -55) goCardRef.current(1);
        else if (gs.dx >  55) goCardRef.current(-1);
        else Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 9 }).start();
      },
    })
  ).current;

  const handleClose = () => {
    Speech.stop();
    router.back();
  };

  const handleMute = () => {
    if (!muteRef.current) Speech.stop();
    setMuteToggle(m => !m);
    setIsSpeaking(false);
    avatarRef.current?.setSpeaking(false);
  };

  // ── LOADING ──
  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1AEFFF" />
        <Text style={styles.loadingText}>Iniciando AR…</Text>
      </View>
    );
  }

  // ── ERROR ──
  if (isError || !place) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="alert-circle-outline" size={48} color="#1AEFFF" />
        <Text style={styles.loadingText}>No se pudo cargar el lugar</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasCam = (camPermission?.granted ?? false) && Platform.OS !== "web";
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <StatusBar hidden />

      {/* ── CAMERA (or gradient fallback) ── */}
      {hasCam ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <LinearGradient
          colors={["#040D14", "#082030", "#0C2840"]}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* ── VIGNETTE ── */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.55)", "transparent", "rgba(0,0,0,0.70)"]}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── AR GRID ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={[styles.gridLine, { top: `${(i + 1) * 10}%` as any }]} />
        ))}
      </View>

      {/* ── SCANLINE startup ── */}
      {scanning && <ScanlineEffect onDone={() => setScanning(false)} />}

      {/* ── CORNER BRACKETS ── */}
      <View style={[StyleSheet.absoluteFill, { margin: 12 }]} pointerEvents="none">
        <ARCornerBrackets />
      </View>

      {/* ── HUD ── */}
      <View style={{ position: "absolute", top: topPad + 8, left: 0, right: 0 }}>
        <ARHud place={place} cardIndex={cardIndex} total={cards.length} pulseAnim={pulseAnim} />
      </View>

      {/* ── SWIPE HINT ── */}
      {!scanning && (
        <View style={[styles.swipeHint, { top: topPad + 68 }]} pointerEvents="none">
          <Feather name="chevron-left"  size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.swipeHintText}>desliza para navegar</Text>
          <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.4)" />
        </View>
      )}

      {/* ── CARDS ── */}
      <View style={styles.cardsArea}>
        {!scanning && cards.map((card, i) => (
          <ARInfoCard
            key={card.id}
            card={card}
            isActive={i === cardIndex}
            offset={i - cardIndex}
            onTap={i === cardIndex ? handleCardTap : () => {}}
            isSpeaking={isSpeaking && i === cardIndex}
          />
        ))}

        {/* Dot navigation */}
        {!scanning && (
          <View style={styles.cardDots}>
            {cards.map((_, i) => (
              <View
                key={i}
                style={[styles.cardDot, {
                  backgroundColor: i === cardIndex ? "#1AEFFF" : "rgba(255,255,255,0.35)",
                  width: i === cardIndex ? 22 : 6,
                }]}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── BOTTOM SECTION: avatar + controls ── */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 10 }]}>
        <View style={styles.avatarRow}>
          {/* Holographic avatar panel */}
          <View style={styles.holoPanel}>
            <View style={styles.holoPanelTop}>
              <View style={styles.holoDot} />
              <Text style={styles.holoPanelLabel}>GUÍA AR</Text>
              <View style={[styles.holoDot, { backgroundColor: "#F4D03F" }]} />
            </View>
            <ARGuideCharacter ref={avatarRef} width={140} height={190} />
            <View style={styles.holoPanelBottom}>
              <Text style={styles.holoPanelName}>Carlos · Cienaguero</Text>
            </View>
          </View>

          {/* Speech bubble */}
          <View style={styles.bubbleWrap}>
            <SpeechBubble text={bubbleText} visible={showBubble} />
          </View>
        </View>

        {/* Control row: mute + close */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.ctrlBtn, muteToggle && styles.ctrlBtnActive]}
            onPress={handleMute}
            activeOpacity={0.8}
          >
            <Ionicons name={muteToggle ? "volume-mute" : "volume-high"} size={20} color={muteToggle ? "#E74C3C" : "#1AEFFF"} />
          </TouchableOpacity>

          <View style={styles.ctrlDivider} />

          <TouchableOpacity style={styles.ctrlClose} onPress={handleClose} activeOpacity={0.85}>
            <Feather name="x" size={20} color="#fff" />
            <Text style={styles.ctrlCloseText}>Cerrar AR</Text>
          </TouchableOpacity>
        </View>
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
  loadingText:   { color: "#1AEFFF", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  errorBtn:      { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, borderWidth: 1.5, borderColor: "#1AEFFF" },
  errorBtnText:  { color: "#1AEFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },

  scanline: {
    position: "absolute", left: 0, right: 0, height: 3,
    backgroundColor: "#1AEFFF", opacity: 0.85,
    shadowColor: "#1AEFFF", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 12, zIndex: 100,
  },

  gridLine: {
    position: "absolute", left: 0, right: 0, height: 1,
    backgroundColor: "rgba(26,239,255,0.045)",
  },

  // HUD
  hud: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 14, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.58)",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(26,239,255,0.3)", gap: 10,
  },
  hudLeft:   { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E74C3C" },
  hudLive:   { color: "#E74C3C", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  hudCenter: { flex: 1, alignItems: "center" },
  hudName:   { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  hudCoords: { color: "rgba(26,239,255,0.7)", fontSize: 9, fontFamily: "Inter_400Regular", letterSpacing: 0.4 },
  hudRight:  {},
  hudCount:  { color: "#1AEFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Swipe hint
  swipeHint: {
    position: "absolute", left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
  },
  swipeHintText: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "Inter_400Regular" },

  // Cards
  cardsArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  arCard: {
    position: "absolute",
    width: SW - 36,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#1AEFFF",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1.5,
  },
  cardGradient: { padding: 20, minHeight: 185 },

  tapHint: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-end", marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  tapHintText: { color: "rgba(255,255,255,0.55)", fontSize: 10, fontFamily: "Inter_400Regular" },

  cardHeader:     { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  cardEmoji:      { fontSize: 32 },
  cardHeaderText: { flex: 1 },
  cardType:       { color: "rgba(255,255,255,0.55)", fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  cardTitle:      { color: "#fff", fontSize: 19, fontFamily: "Inter_700Bold", marginTop: 1 },
  speakingBadge:  {
    backgroundColor: "rgba(26,239,255,0.2)", borderRadius: 10,
    padding: 5, borderWidth: 1, borderColor: "rgba(26,239,255,0.5)",
  },
  cardDivider:    { height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginVertical: 10 },
  cardContent:    { color: "rgba(255,255,255,0.92)", fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 21 },
  cardCornerTL:   {
    position: "absolute", top: 10, left: 10, width: 16, height: 16,
    borderTopWidth: 2, borderLeftWidth: 2, borderColor: "rgba(255,255,255,0.4)", borderTopLeftRadius: 3,
  },
  cardCornerBR:   {
    position: "absolute", bottom: 10, right: 10, width: 16, height: 16,
    borderBottomWidth: 2, borderRightWidth: 2, borderColor: "rgba(255,255,255,0.4)", borderBottomRightRadius: 3,
  },
  cardDots: {
    position: "absolute", bottom: -28,
    flexDirection: "row", gap: 6, alignItems: "center",
  },
  cardDot: { height: 6, borderRadius: 3 },

  // Bottom
  bottom: { paddingHorizontal: 14, gap: 8 },
  avatarRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },

  holoPanel: {
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1.5, borderColor: "#1AEFFF",
    backgroundColor: "rgba(0,16,36,0.88)",
    shadowColor: "#1AEFFF", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 16, elevation: 12,
  },
  holoPanelTop: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: "rgba(26,239,255,0.12)",
    borderBottomWidth: 1, borderBottomColor: "rgba(26,239,255,0.3)",
  },
  holoDot:        { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#1AEFFF" },
  holoPanelLabel: { color: "#1AEFFF", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  holoPanelBottom: {
    paddingVertical: 4, paddingHorizontal: 10,
    backgroundColor: "rgba(26,239,255,0.08)",
    borderTopWidth: 1, borderTopColor: "rgba(26,239,255,0.3)",
    alignItems: "center",
  },
  holoPanelName: { color: "#F4D03F", fontSize: 10, fontFamily: "Inter_600SemiBold" },

  bubbleWrap: { flex: 1, justifyContent: "flex-end", paddingBottom: 8 },
  speechBubble: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: "rgba(26,239,255,0.45)",
    shadowColor: "#1AEFFF", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },
  speechTail: {
    position: "absolute", bottom: -7, left: 16,
    width: 12, height: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: "rgba(26,239,255,0.45)",
    transform: [{ rotate: "45deg" }],
  },
  speechText: { color: "#0D1F2D", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  // Controls
  controls: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  ctrlBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(26,239,255,0.12)",
    borderWidth: 1, borderColor: "rgba(26,239,255,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  ctrlBtnActive: {
    backgroundColor: "rgba(231,76,60,0.18)",
    borderColor: "rgba(231,76,60,0.5)",
  },
  ctrlDivider: { flex: 1 },
  ctrlClose: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    backgroundColor: "rgba(231,76,60,0.22)",
    borderWidth: 1, borderColor: "rgba(231,76,60,0.5)",
  },
  ctrlCloseText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
