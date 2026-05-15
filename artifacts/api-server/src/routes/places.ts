import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, citiesTable, placesTable } from "@workspace/db";

const router: IRouter = Router();

const placeFields = {
  id: placesTable.id,
  cityId: placesTable.cityId,
  cityName: citiesTable.name,
  name: placesTable.name,
  shortDescription: placesTable.shortDescription,
  history: placesTable.history,
  imageUrl: placesTable.imageUrl,
  latitude: placesTable.latitude,
  longitude: placesTable.longitude,
  qrCode: placesTable.qrCode,
  category: placesTable.category,
  visitHours: placesTable.visitHours,
  visitDuration: placesTable.visitDuration,
  video360Url: placesTable.video360Url,
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
          ? or(
              ilike(placesTable.name, `%${search}%`),
              ilike(placesTable.shortDescription, `%${search}%`)
            )
          : undefined
      );

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch places");
    res.status(500).json({ error: "internal_error", message: "Failed to fetch places" });
  }
});

router.get("/places/qr/:qrCode", async (req, res) => {
  try {
    const { qrCode } = req.params;

    const rows = await db
      .select(placeFields)
      .from(placesTable)
      .leftJoin(citiesTable, eq(placesTable.cityId, citiesTable.id))
      .where(eq(placesTable.qrCode, qrCode));

    if (!rows[0]) {
      return res.status(404).json({ error: "not_found", message: "Place not found for this QR code" });
    }

    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch place by QR");
    res.status(500).json({ error: "internal_error", message: "Failed to fetch place" });
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

    if (!rows[0]) {
      return res.status(404).json({ error: "not_found", message: "Place not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch place");
    res.status(500).json({ error: "internal_error", message: "Failed to fetch place" });
  }
});

export default router;
