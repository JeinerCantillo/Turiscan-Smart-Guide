import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Animated,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Dimensions,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { AvatarSvg } from "@/components/GuideAvatar";

const { height: SCREEN_H } = Dimensions.get("window");
const TAB_BAR_H = 60;
const UID = "float_chat_av";

type Message = { id: string; from: "guide" | "user"; text: string };

const RESPONSES: { kw: string[]; res: string }[] = [
  {
    kw: ["hola", "buenos", "buenas", "hey", "ola", "hi", "saludos"],
    res: "¡Hola! 👋 Soy tu guía virtual de Ciénaga, Magdalena. Puedo ayudarte a usar la app o contarte sobre los lugares turísticos. ¿En qué te puedo ayudar?",
  },
  {
    kw: ["qr", "escanear", "escaner", "código", "cámara", "camara", "scan"],
    res: "Para escanear un QR, toca el botón redondo 📷 en el centro de la barra inferior. Apunta la cámara al código que encontrarás en las señales turísticas. ¡Yo te explico la historia del lugar cuando leas uno!",
  },
  {
    kw: ["360", "vr", "virtual", "video", "inmersiv", "gafas"],
    res: "El video 360° te permite explorar los lugares de forma inmersiva 🥽. Entra al detalle de cualquier lugar y toca el badge «360°» en la foto o el botón oscuro «Ver en Realidad Virtual». ¡Arrastra la pantalla para mirar en todas direcciones!",
  },
  {
    kw: ["lugar", "lugares", "sitio", "sitios", "turístico", "visitar", "hay"],
    res: "Tenemos 5 lugares en Ciénaga 🗺️:\n• Plaza del Centenario\n• Catedral de San Juan Bautista\n• Malecón de Ciénaga\n• Cementerio Central\n• Casa de la Cultura\nCada uno tiene narración de audio, galería de fotos y video 360°.",
  },
  {
    kw: ["reseña", "calificar", "calificación", "comentario", "estrella", "opinión"],
    res: "Para dejar una reseña ⭐, inicia sesión desde la pestaña «Perfil». Luego entra a cualquier lugar, ve al final y selecciona tus estrellas y escribe tu experiencia. ¡Tu opinión ayuda a otros turistas!",
  },
  {
    kw: ["logro", "logros", "xp", "puntos", "nivel", "experiencia", "trophy", "premio"],
    res: "¡Los logros son geniales! 🏆 Gana XP al escanear QR, escuchar historias, ver videos 360° y dejar reseñas. Ve a la pestaña «Logros» para ver tu progreso. ¡Hay 8 logros por desbloquear!",
  },
  {
    kw: ["mapa", "ubicación", "localización", "dónde", "distancia", "gps", "cerca"],
    res: "En la pestaña «Mapa» 📍 puedes ver todos los lugares. Activa tu GPS con el botón «Localizar» y usa el slider para filtrar por distancia. ¡Los lugares aparecen ordenados por proximidad!",
  },
  {
    kw: ["cuenta", "perfil", "login", "registro", "iniciar", "sesión", "contraseña", "email"],
    res: "Ve a la pestaña «Perfil» 👤 para iniciar sesión o crear tu cuenta gratis. Con cuenta puedes dejar reseñas y llevar tu historial. ¡Solo necesitas email y contraseña!",
  },
  {
    kw: ["historia", "narración", "narrar", "audio", "escuchar", "voz", "narrar", "relato"],
    res: "La narración de audio 🔊 está en el detalle de cada lugar — toca «Escuchar narración». También se activa automáticamente cuando escaneas el QR y eliges «Escuchar la historia». ¡La voz narra toda la historia del lugar!",
  },
  {
    kw: ["cienaga", "ciénaga", "magdalena", "colombia", "caribe", "ciudad", "bananera"],
    res: "Ciénaga es una ciudad histórica del Caribe colombiano 🌴, en Magdalena. Famosa por la Masacre de las Bananeras (1928), el Carnaval del Caimán y su cercanía a la Sierra Nevada. ¡Un patrimonio cultural increíble!",
  },
  {
    kw: ["foto", "fotos", "galería", "imagen", "imágenes", "carrusel"],
    res: "Cada lugar tiene una galería de fotos 📸. En el detalle del lugar, desliza el carrusel de imágenes de arriba para ver diferentes ángulos y vistas del sitio turístico.",
  },
  {
    kw: ["ayuda", "cómo", "como", "funciona", "usar", "tutorial", "instrucción"],
    res: "¡Con gusto te explico! Turiscan funciona así 📱:\n1. Explora lugares en «Explorar»\n2. Escanea QR con el botón central\n3. Elige escuchar la historia o ver 360°\n4. Deja reseñas si tienes cuenta\n5. Colecciona logros y XP\n¿Sobre qué quieres saber más?",
  },
  {
    kw: ["gracias", "perfecto", "genial", "excelente", "ok", "chévere", "bacano", "bueno"],
    res: "¡De nada! 😄 Estoy aquí para lo que necesites. ¿Hay algo más en lo que te pueda ayudar con Turiscan?",
  },
  {
    kw: ["adiós", "adios", "chao", "chau", "hasta", "bye"],
    res: "¡Hasta pronto! 👋 Que disfrutes tu recorrido por Ciénaga. ¡No olvides escanear los QR turísticos!",
  },
];

const WELCOME: Message = {
  id: "welcome",
  from: "guide",
  text: "¡Hola! Soy tu guía virtual de Ciénaga 🗺️. Puedo ayudarte con:\n• Escanear códigos QR\n• Lugares turísticos\n• Videos 360°\n• Logros y puntos\n• Y mucho más\n\n¿En qué te puedo ayudar?",
};

function getResponse(input: string): string {
  const lower = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const { kw, res } of RESPONSES) {
    if (kw.some((k) => lower.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
      return res;
    }
  }
  return "¡Uf! No entendí muy bien. Puedo ayudarte con:\n• Escanear QR turísticos\n• Los lugares de Ciénaga\n• Videos 360° inmersivos\n• Logros y puntos XP\n• Reseñas y calificaciones\n¿Sobre cuál te cuento?";
}

export function FloatingGuideChat() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const [hasNew, setHasNew] = useState(true);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    Animated.spring(badgeAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 6 }).start();
    return () => pulse.stop();
  }, []);

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpen(true);
    setHasNew(false);
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), from: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setTimeout(() => {
      const reply: Message = { id: (Date.now() + 1).toString(), from: "guide", text: getResponse(text) };
      setMessages((prev) => [...prev, reply]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isGuide = item.from === "guide";
    return (
      <View style={[styles.msgRow, isGuide ? styles.msgRowGuide : styles.msgRowUser]}>
        {isGuide && (
          <View style={styles.msgAvatar}>
            <AvatarSvg size={32} uid={`msg_${item.id}`} />
          </View>
        )}
        <View
          style={[
            styles.msgBubble,
            isGuide
              ? { backgroundColor: colors.backgroundCard, borderColor: colors.border, borderWidth: 1 }
              : { backgroundColor: colors.tint },
            isGuide ? styles.msgBubbleGuide : styles.msgBubbleUser,
          ]}
        >
          <Text style={[styles.msgText, { color: isGuide ? colors.text : "#fff" }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* Floating button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: TAB_BAR_H + insets.bottom + 12 + (Platform.OS === "web" ? 34 : 0),
            transform: [{ scale: pulseAnim }],
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={handleOpen}
          style={[styles.fab, { shadowColor: colors.tint }]}
          activeOpacity={0.85}
        >
          <AvatarSvg size={44} uid="fab_av" />
        </TouchableOpacity>
        {hasNew && (
          <Animated.View style={[styles.badge, { transform: [{ scale: badgeAnim }] }]}>
            <Text style={styles.badgeText}>!</Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.kavWrapper}
          >
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + (Platform.OS === "web" ? 20 : 0) + 8,
                  maxHeight: SCREEN_H * 0.8,
                },
              ]}
            >
              {/* Handle bar */}
              <View style={[styles.handle, { backgroundColor: colors.border }]} />

              {/* Header */}
              <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                <AvatarSvg size={44} uid="sheet_av" />
                <View style={styles.sheetTitleBlock}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>Guía Turístico</Text>
                  <View style={styles.onlineDot}>
                    <View style={styles.onlineDotInner} />
                    <Text style={[styles.onlineText, { color: colors.textMuted }]}>En línea · Ciénaga</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              />

              {/* Input */}
              <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  placeholder="Escríbeme algo..."
                  placeholderTextColor={colors.textMuted}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  multiline={false}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.tint : colors.border }]}
                  disabled={!input.trim()}
                >
                  <Ionicons name="send" size={18} color={input.trim() ? "#fff" : colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    right: 16,
    zIndex: 999,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E74C3C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  kavWrapper: { justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  sheetTitleBlock: { flex: 1, gap: 3 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  onlineDot: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#27AE60" },
  onlineText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  closeBtn: { padding: 6 },
  messagesList: { padding: 16, gap: 12 },
  msgRow: { flexDirection: "row", gap: 8, maxWidth: "88%" },
  msgRowGuide: { alignSelf: "flex-start" },
  msgRowUser: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  msgAvatar: { alignSelf: "flex-end" },
  msgBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, flex: 1 },
  msgBubbleGuide: { borderBottomLeftRadius: 4 },
  msgBubbleUser: { borderBottomRightRadius: 4 },
  msgText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
