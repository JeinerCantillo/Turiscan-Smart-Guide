import { Router, type IRouter } from "express";
import healthRouter from "./health";
import placesRouter from "./places";
import citiesRouter from "./cities";

const router: IRouter = Router();

router.use(healthRouter);
router.use(placesRouter);
router.use(citiesRouter);

export default router;
