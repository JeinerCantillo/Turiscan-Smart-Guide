import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, reviewsTable, placesTable } from "@workspace/db";
import { authenticateUser, optionalAuth } from "../middleware/auth";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/places/:id/reviews", async (req, res) => {
  try {
    const placeId = Number(req.params.id);
    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.placeId, placeId))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(50);

    res.json(reviews);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch reviews");
    res.status(500).json({ error: "internal_error", message: "Error al cargar reseñas" });
  }
});

router.post("/places/:id/reviews", authenticateUser, async (req, res) => {
  try {
    const placeId = Number(req.params.id);
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "validation", message: "Calificación debe ser entre 1 y 5" });
    }

    const [review] = await db.insert(reviewsTable).values({
      placeId,
      userId: req.user!.id,
      userName: req.user!.name,
      rating: Number(rating),
      comment: comment ?? null,
    }).returning();

    await db.execute(sql`
      UPDATE places 
      SET review_count = (SELECT COUNT(*) FROM reviews WHERE place_id = ${placeId}),
          avg_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE place_id = ${placeId})
      WHERE id = ${placeId}
    `);

    res.status(201).json(review);
  } catch (err) {
    req.log.error({ err }, "Failed to add review");
    res.status(500).json({ error: "internal_error", message: "Error al enviar reseña" });
  }
});

export default router;
