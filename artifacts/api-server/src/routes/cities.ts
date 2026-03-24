import { Router, type IRouter } from "express";
import { db, citiesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/cities", async (req, res) => {
  try {
    const rows = await db.select().from(citiesTable);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch cities");
    res.status(500).json({ error: "internal_error", message: "Failed to fetch cities" });
  }
});

export default router;
