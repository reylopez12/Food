import { Router, type IRouter } from "express";
import healthRouter from "./health";
import listingsRouter from "./listings";
import authRouter from "./auth";
import followsRouter from "./follows";
import adminRouter from "./admin";
import announcementsRouter from "./announcements";
import notificationsRouter from "./notifications";
import broadcasterRouter from "./broadcaster";
import partnersRouter from "./partners";

const router: IRouter = Router();

router.use(healthRouter);
router.use(listingsRouter);
router.use(authRouter);
router.use(followsRouter);
router.use("/admin", adminRouter);
router.use(announcementsRouter);
router.use(notificationsRouter);
router.use(broadcasterRouter);
router.use(partnersRouter);

export default router;
