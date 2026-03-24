import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Platform,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";

function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      <View style={[styles.infoIconContainer, { backgroundColor: `${colors.tint}18` }]}>
        <Feather name={icon as any} size={22} color={colors.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </View>
  );
}

function QRCodeItem({ code, name }: { code: string; name: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.qrItem, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      <View style={[styles.qrCodeBadge, { backgroundColor: `${colors.tint}15` }]}>
        <Ionicons name="qr-code-outline" size={18} color={colors.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.qrName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.qrCode, { color: colors.textMuted }]}>{code}</Text>
      </View>
    </View>
  );
}

export default function AboutScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const qrCodes = [
    { code: "TURISCAN-CIENAGA-001", name: "Plaza del Centenario" },
    { code: "TURISCAN-CIENAGA-002", name: "Catedral de San Juan Bautista" },
    { code: "TURISCAN-CIENAGA-003", name: "Malecón de Ciénaga" },
    { code: "TURISCAN-CIENAGA-004", name: "Cementerio Central" },
    { code: "TURISCAN-CIENAGA-005", name: "Casa de la Cultura" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + (isWeb ? 67 : 0) + 12,
          paddingBottom: insets.bottom + (isWeb ? 34 : 0) + 100,
          paddingHorizontal: 20,
        }}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.tint }]}>
          <Ionicons name="qr-code-outline" size={48} color="#fff" />
          <Text style={styles.heroTitle}>Turiscan</Text>
          <Text style={styles.heroSub}>Guía turística inteligente para Ciénaga, Magdalena</Text>
          <Text style={styles.heroVersion}>Versión 1.0.0</Text>
        </View>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>¿Cómo funciona?</Text>
        <InfoCard
          icon="camera"
          title="Escanea el QR"
          description="Encuentra los códigos QR ubicados en los sitios turísticos y escanéalos con la cámara."
        />
        <InfoCard
          icon="info"
          title="Descubre la historia"
          description="Obtén información detallada, historia y contexto cultural del lugar que estás visitando."
        />
        <InfoCard
          icon="volume-2"
          title="Escucha la narración"
          description="Activa la narración automática y escucha la historia del lugar sin necesidad de leer."
        />
        <InfoCard
          icon="map-pin"
          title="Ubícate en el mapa"
          description="Visualiza la ubicación exacta del sitio y encuentra cómo llegar fácilmente."
        />

        {/* QR Codes */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Códigos QR disponibles</Text>
        <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
          Estos son los identificadores de los sitios registrados en Ciénaga. Los QR físicos deben contener este texto exacto.
        </Text>
        {qrCodes.map((qr) => (
          <QRCodeItem key={qr.code} {...qr} />
        ))}

        {/* City info */}
        <View style={[styles.cityCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Text style={[styles.cityCardTitle, { color: colors.text }]}>Ciénaga, Magdalena</Text>
          <Text style={[styles.cityCardDesc, { color: colors.textSecondary }]}>
            Ciudad histórica del Caribe colombiano, conocida por su arquitectura republicana de la época bananera, su rica tradición vallenata y su privilegiada ubicación entre la Sierra Nevada de Santa Marta y el Mar Caribe.
          </Text>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          Desarrollado para preservar y promover el patrimonio cultural de Colombia.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 28,
    gap: 8,
  },
  heroTitle: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  heroVersion: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12, marginTop: 8 },
  sectionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 12, marginTop: -4 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  infoDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  qrItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  qrCodeBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  qrName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  qrCode: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  cityCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  cityCardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  cityCardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
});
