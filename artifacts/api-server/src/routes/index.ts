import { Router, type IRouter } from "express";
import healthRouter from "./health";
import placesRouter from "./places";
import citiesRouter from "./cities";
import authRouter from "./auth";
import reviewsRouter from "./reviews";

const router: IRouter = Router();

router.use(authRouter);
router.use(placesRouter);
router.use(citiesRouter);
router.use(reviewsRouter);
router.use(healthRouter);

export default router;
