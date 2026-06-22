import { Router, type IRouter } from "express";
import healthRouter from "./health";
import brokerRouter from "./broker";
import tradingRouter from "./trading";
import profileRouter from "./profile";
import signalsRouter from "./signals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(brokerRouter);
router.use(tradingRouter);
router.use(profileRouter);
router.use(signalsRouter);

export default router;
