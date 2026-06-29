import { Router, type IRouter } from "express";
import healthRouter from "./health";
import brokerRouter from "./broker";
import tradingRouter from "./trading";
import profileRouter from "./profile";
import signalsRouter from "./signals";
import portfolioRouter from "./portfolio";
import { journalRouter } from "./journal";
import { analyticsRouter } from "./analytics";
import { authRouter } from "./auth";
import { tradingAccountRouter } from "./tradingAccount";
import { pushRouter } from "./push";

const router: IRouter = Router();

router.use(authRouter);
router.use(tradingAccountRouter);
router.use(healthRouter);
router.use(brokerRouter);
router.use(tradingRouter);
router.use(profileRouter);
router.use(signalsRouter);
router.use(portfolioRouter);
router.use(journalRouter);
router.use(analyticsRouter);
router.use(pushRouter);

export default router;
