import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, citiesTable, placesTable } from "@workspace/db";
import { authenticateUser, requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

const placeFields = {
  id: placesTable.id,
  cityId: placesTable.cityId,
  cityName: citiesTable.name,
  name: placesTable.name,
  shortDescription: placesTable.shortDescription,
  history: placesTable.history,
  address: placesTable.address,
  imageUrl: placesTable.imageUrl,
  latitude: placesTable.latitude,
  longitude: placesTable.longitude,
  qrCode: placesTable.qrCode,
  category: placesTable.category,
  visitHours: placesTable.visitHours,
  visitDuration: placesTable.visitDuration,
  video360Url: placesTable.video360Url,
  avgRating: placesTable.avgRating,
  reviewCount: placesTable.reviewCount,
};

router.get("/places", async (req, res) => {
  try {
    const { cityId, search } = req.query;
    const rows = await db
      .select(placeFields)
      .from(placesTable)
      .leftJoin(citiesTable, eq(placesTable.cityId, citiesTable.id))
      .where(
        cityId
          ? eq(placesTable.cityId, Number(cityId))
          : search
          ? or(ilike(placesTable.name, `%${search}%`), ilike(placesTable.shortDescription, `%${search}%`))
          : undefined
      );
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch places");
    res.status(500).json({ error: "internal_error", message: "Error al cargar lugares" });
  }
});

router.get("/places/qr/:qrCode", async (req, res) => {
  try {
    const rows = await db
      .select(placeFields)
      .from(placesTable)
      .leftJoin(citiesTable, eq(placesTable.cityId, citiesTable.id))
      .where(eq(placesTable.qrCode, req.params.qrCode));
    if (!rows[0]) return res.status(404).json({ error: "not_found", message: "Código QR no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch place by QR");
    res.status(500).json({ error: "internal_error", message: "Error" });
  }
});

router.get("/places/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db
      .select(placeFields)
      .from(placesTable)
      .leftJoin(citiesTable, eq(placesTable.cityId, citiesTable.id))
      .where(eq(placesTable.id, id));
    if (!rows[0]) return res.status(404).json({ error: "not_found", message: "Lugar no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch place");
    res.status(500).json({ error: "internal_error", message: "Error" });
  }
});

router.post("/places", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { cityId, name, shortDescription, history, address, imageUrl, latitude, longitude, category, visitHours, visitDuration, video360Url } = req.body;
    if (!name || !shortDescription || !history || !latitude || !longitude || !category) {
      return res.status(400).json({ error: "validation", message: "Campos requeridos: nombre, descripción, historia, coordenadas, categoría" });
    }
    const qrCode = `TURISCAN-${Date.now()}`;
    const [place] = await db.insert(placesTable).values({
      cityId: cityId ?? 1,
      name,
      shortDescription,
      history,
      address: address ?? null,
      imageUrl: imageUrl ?? null,
      latitude: Number(latitude),
      longitude: Number(longitude),
      qrCode,
      category,
      visitHours: visitHours ?? null,
      visitDuration: visitDuration ?? null,
      video360Url: video360Url ?? null,
    }).returning();
    res.status(201).json(place);
  } catch (err) {
    req.log.error({ err }, "Failed to create place");
    res.status(500).json({ error: "internal_error", message: "Error al crear lugar" });
  }
});

router.put("/places/:id", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, shortDescription, history, address, imageUrl, latitude, longitude, category, visitHours, visitDuration, video360Url } = req.body;
    const [place] = await db
      .update(placesTable)
      .set({
        ...(name && { name }),
        ...(shortDescription && { shortDescription }),
        ...(history && { history }),
        ...(address !== undefined && { address }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(latitude && { latitude: Number(latitude) }),
        ...(longitude && { longitude: Number(longitude) }),
        ...(category && { category }),
        ...(visitHours !== undefined && { visitHours }),
        ...(visitDuration !== undefined && { visitDuration }),
        ...(video360Url !== undefined && { video360Url }),
      })
      .where(eq(placesTable.id, id))
      .returning();
    if (!place) return res.status(404).json({ error: "not_found", message: "Lugar no encontrado" });
    res.json(place);
  } catch (err) {
    req.log.error({ err }, "Failed to update place");
    res.status(500).json({ error: "internal_error", message: "Error al actualizar lugar" });
  }
});

router.delete("/places/:id", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(placesTable).where(eq(placesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete place");
    res.status(500).json({ error: "internal_error", message: "Error al eliminar lugar" });
  }
});

export default router;
