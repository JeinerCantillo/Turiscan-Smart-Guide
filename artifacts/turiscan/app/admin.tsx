import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const CATEGORIES = ["Plaza", "Religioso", "Natural", "Patrimonio", "Cultural", "Restaurante", "Comercio", "Hotel"];

interface Place {
  id: number;
  name: string;
  shortDescription: string;
  category: string;
  imageUrl?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  qrCode: string;
  video360Url?: string | null;
}

interface PlaceForm {
  name: string;
  shortDescription: string;
  history: string;
  address: string;
  imageUrl: string;
  latitude: string;
  longitude: string;
  category: string;
  visitHours: string;
  visitDuration: string;
  video360Url: string;
}

const EMPTY_FORM: PlaceForm = {
  name: "",
  shortDescription: "",
  history: "",
  address: "",
  imageUrl: "",
  latitude: "10.8800",
  longitude: "-74.1300",
  category: "Historic",
  visitHours: "",
  visitDuration: "",
  video360Url: "",
};

function placeToForm(place: Place): PlaceForm {
  return {
    name: place.name,
    shortDescription: place.shortDescription,
    history: "",
    address: place.address ?? "",
    imageUrl: place.imageUrl ?? "",
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    category: place.category,
    visitHours: "",
    visitDuration: "",
    video360Url: place.video360Url ?? "",
  };
}

export default function AdminScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, token } = useAuth();

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlaceForm>(EMPTY_FORM);

  const authHeader = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (user?.role !== "admin") {
      router.replace("/(tabs)");
      return;
    }
    fetchPlaces();
  }, [user]);

  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/places`);
      const data = await res.json();
      setPlaces(Array.isArray(data) ? data : []);
    } catch {
      setError("Error al cargar lugares");
    } finally {
      setLoading(false);
    }
  }, []);

  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (place: Place) => {
    setForm(placeToForm(place));
    setEditingId(place.id);
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.shortDescription.trim() || !form.latitude || !form.longitude) {
      setFormError("Nombre, descripción, latitud y longitud son requeridos");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const body = {
        name: form.name.trim(),
        shortDescription: form.shortDescription.trim(),
        history: form.history.trim() || form.shortDescription.trim(),
        address: form.address.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        category: form.category,
        visitHours: form.visitHours.trim() || null,
        visitDuration: form.visitDuration.trim() || null,
        video360Url: form.video360Url.trim() || null,
      };

      const url = editingId ? `${BASE_URL}/api/places/${editingId}` : `${BASE_URL}/api/places`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeader, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error al guardar");

      await fetchPlaces();
      setShowForm(false);
    } catch (e: any) {
      setFormError(e.message ?? "Error al guardar lugar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (place: Place) => {
    const doDelete = async () => {
      try {
        await fetch(`${BASE_URL}/api/places/${place.id}`, { method: "DELETE", headers: authHeader });
        await fetchPlaces();
      } catch {
        setError("Error al eliminar lugar");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`¿Eliminar "${place.name}"?`)) doDelete();
    } else {
      Alert.alert("Eliminar lugar", `¿Eliminar "${place.name}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const updateField = (key: keyof PlaceForm, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (isWeb ? 67 : 0) + 8, backgroundColor: colors.backgroundCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Panel de Administración</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={openAddForm}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando lugares...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 16 }}>
          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: `${colors.error}18`, borderColor: colors.error, marginHorizontal: 16 }]}>
              <Text style={[{ color: colors.error, fontSize: 13 }]}>{error}</Text>
            </View>
          )}
          <Text style={[styles.sectionLabel, { color: colors.textMuted, paddingHorizontal: 16 }]}>
            {places.length} lugar{places.length !== 1 ? "es" : ""} registrado{places.length !== 1 ? "s" : ""}
          </Text>
          {places.map((place) => (
            <View key={place.id} style={[styles.placeRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              {place.imageUrl ? (
                <Image source={{ uri: place.imageUrl }} style={styles.placeThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.placeThumb, styles.placeThumbEmpty, { backgroundColor: colors.backgroundSecondary }]}>
                  <Feather name="image" size={20} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.placeInfo}>
                <Text style={[styles.placeName, { color: colors.text }]} numberOfLines={1}>{place.name}</Text>
                <Text style={[styles.placeCategory, { color: colors.tint }]}>{place.category}</Text>
                {place.address && (
                  <Text style={[styles.placeAddress, { color: colors.textMuted }]} numberOfLines={1}>{place.address}</Text>
                )}
              </View>
              <View style={styles.placeActions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.tint}18` }]} onPress={() => openEditForm(place)}>
                  <Feather name="edit-2" size={15} color={colors.tint} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.error}18` }]} onPress={() => handleDelete(place)}>
                  <Feather name="trash-2" size={15} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Modal header */}
          <View style={[styles.modalHeader, { backgroundColor: colors.backgroundCard, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingId ? "Editar lugar" : "Nuevo lugar"}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text style={[styles.modalSave, { color: colors.tint }]}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
            {!!formError && (
              <View style={[styles.errorBox, { backgroundColor: `${colors.error}18`, borderColor: colors.error }]}>
                <Text style={[{ color: colors.error, fontSize: 13 }]}>{formError}</Text>
              </View>
            )}

            {(
              [
                { key: "name", label: "Nombre del lugar *", placeholder: "Ej: Plaza del Centenario" },
                { key: "shortDescription", label: "Descripción corta *", placeholder: "Breve descripción..." },
                { key: "history", label: "Historia completa", placeholder: "Historia del lugar..." },
                { key: "address", label: "Dirección", placeholder: "Ej: Calle 15 con Carrera 15" },
                { key: "imageUrl", label: "URL de imagen", placeholder: "https://..." },
                { key: "visitHours", label: "Horario de visita", placeholder: "Ej: 8am - 6pm" },
                { key: "visitDuration", label: "Duración de visita", placeholder: "Ej: 30 - 60 min" },
                { key: "video360Url", label: "URL video 360°", placeholder: "https://www.youtube.com/watch?v=..." },
              ] as { key: keyof PlaceForm; label: string; placeholder: string }[]
            ).map(({ key, label, placeholder }) => (
              <View key={key} style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{label}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={form[key]}
                  onChangeText={(v) => updateField(key, v)}
                  multiline={["shortDescription", "history"].includes(key)}
                  numberOfLines={["shortDescription", "history"].includes(key) ? 3 : 1}
                  autoCapitalize={key === "imageUrl" || key === "video360Url" ? "none" : "sentences"}
                />
              </View>
            ))}

            {/* Coordinates */}
            <View style={styles.coordRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Latitud *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="10.8800"
                  placeholderTextColor={colors.textMuted}
                  value={form.latitude}
                  onChangeText={(v) => updateField("latitude", v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Longitud *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="-74.1300"
                  placeholderTextColor={colors.textMuted}
                  value={form.longitude}
                  onChangeText={(v) => updateField("longitude", v)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Category */}
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Categoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: form.category === cat ? colors.tint : colors.backgroundSecondary,
                        borderColor: form.category === cat ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => updateField("category", cat)}
                  >
                    <Text style={[styles.catChipText, { color: form.category === cat ? "#fff" : colors.textSecondary }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 8 },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    gap: 12,
  },
  placeThumb: { width: 64, height: 64 },
  placeThumbEmpty: { alignItems: "center", justifyContent: "center" },
  placeInfo: { flex: 1, paddingVertical: 10 },
  placeName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  placeCategory: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  placeAddress: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  placeActions: { flexDirection: "row", gap: 8, paddingRight: 12 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16, fontFamily: "Inter_400Regular" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalSave: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  formContainer: { padding: 16, gap: 12, paddingBottom: 40 },
  formField: { gap: 6 },
  formLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  formInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
  },
  coordRow: { flexDirection: "row", gap: 12 },
  catList: { gap: 8, paddingVertical: 4 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
