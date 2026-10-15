import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import { audit } from "../team/Audit.service";
import GetWalletController from "./controllers/GetWallet.controller";
import FundWalletController from "./controllers/FundWallet.controller";
import WithdrawWalletController from "./controllers/WithdrawWallet.controller";
import ConfirmFundingController from "./controllers/ConfirmFunding.controller";
import GetTransactionsController from "./controllers/GetTransactions.controller";

const walletRouter: Router = Router();

walletRouter.get("/", requirePermission("wallet.view"), GetWalletController);
walletRouter.post("/fund", requirePermission("wallet.fund"), audit("wallet.fund_started"), FundWalletController);
walletRouter.post("/withdraw", requirePermission("wallet.withdraw"), audit("wallet.withdrawal_requested"), WithdrawWalletController);
walletRouter.post("/confirm-funding", requirePermission("wallet.fund"), audit("wallet.funding_confirmed"), ConfirmFundingController);
walletRouter.get("/transactions", requirePermission("wallet.view"), GetTransactionsController);

export default walletRouter;
