import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

function AvatarCircle({ name, size = 72 }: { name: string; size?: number }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.tint },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  sublabel,
  onPress,
  color,
  showArrow = true,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  color?: string;
  showArrow?: boolean;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  return (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: `${color ?? colors.tint}18` }]}>
        <Feather name={icon as any} size={18} color={color ?? colors.tint} />
      </View>
      <View style={styles.menuItemText}>
        <Text style={[styles.menuItemLabel, { color: colors.text }]}>{label}</Text>
        {sublabel && <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>{sublabel}</Text>}
      </View>
      {showArrow && <Feather name="chevron-right" size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Cerrar sesión?")) {
        logout();
      }
    } else {
      Alert.alert("Cerrar sesión", "¿Estás seguro de que quieres salir?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: logout },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (isWeb ? 67 : 0) + 12,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Perfil</Text>
        </View>

        {user ? (
          <>
            {/* User card */}
            <View
              style={[
                styles.userCard,
                { backgroundColor: colors.backgroundCard, borderColor: colors.border, shadowColor: colors.shadow },
              ]}
            >
              <AvatarCircle name={user.name} />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: user.role === "admin" ? `${colors.accent}22` : `${colors.tint}18` },
                  ]}
                >
                  <Feather
                    name={user.role === "admin" ? "shield" : "user"}
                    size={11}
                    color={user.role === "admin" ? colors.accentDark : colors.tint}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      { color: user.role === "admin" ? colors.accentDark : colors.tint },
                    ]}
                  >
                    {user.role === "admin" ? "Administrador" : "Visitante"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Admin section */}
            {user.role === "admin" && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ADMINISTRACIÓN</Text>
                <MenuItem
                  icon="settings"
                  label="Panel de Administración"
                  sublabel="Gestionar lugares turísticos"
                  onPress={() => router.push("/admin")}
                  color={colors.accent}
                />
              </View>
            )}

            {/* Account section */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CUENTA</Text>
              <MenuItem
                icon="log-out"
                label="Cerrar sesión"
                onPress={handleLogout}
                color={colors.error}
                showArrow={false}
              />
            </View>
          </>
        ) : (
          <>
            {/* Guest view */}
            <View
              style={[
                styles.guestCard,
                { backgroundColor: colors.backgroundCard, borderColor: colors.border },
              ]}
            >
              <View style={[styles.guestIcon, { backgroundColor: `${colors.tint}18` }]}>
                <Feather name="user" size={40} color={colors.tint} />
              </View>
              <Text style={[styles.guestTitle, { color: colors.text }]}>Crea tu cuenta</Text>
              <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
                Inicia sesión para dejar reseñas y guardar tus lugares favoritos en Ciénaga
              </Text>
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.tint }]}
                onPress={() => router.push("/login")}
                activeOpacity={0.85}
              >
                <Feather name="log-in" size={16} color="#fff" />
                <Text style={styles.loginBtnText}>Iniciar sesión</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.registerBtn, { borderColor: colors.tint }]}
                onPress={() => router.push("/register")}
                activeOpacity={0.85}
              >
                <Text style={[styles.registerBtnText, { color: colors.tint }]}>Crear cuenta gratis</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textMuted }]}>
            Turiscan — Guía turística de Ciénaga, Magdalena
          </Text>
          <Text style={[styles.appInfoVersion, { color: colors.textMuted }]}>Versión 2.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  userCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  section: { marginTop: 20, paddingHorizontal: 20, gap: 8 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 2 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: { flex: 1 },
  menuItemLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuItemSublabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  guestCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  guestIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  guestSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 8 },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    justifyContent: "center",
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  registerBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    width: "100%",
    alignItems: "center",
  },
  registerBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  appInfo: { alignItems: "center", marginTop: 32, gap: 4, paddingHorizontal: 20 },
  appInfoText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  appInfoVersion: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
