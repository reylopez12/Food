import { Router, type IRouter } from "express";
import healthRouter from "./health";
import listingsRouter from "./listings";
import authRouter from "./auth";
import followsRouter from "./follows";

const router: IRouter = Router();

router.use(healthRouter);
router.use(listingsRouter);
router.use(authRouter);
router.use(followsRouter);

export default router;
