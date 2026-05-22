import { Router } from "express";
import GetWalletController from "./controllers/GetWallet.controller";
import FundWalletController from "./controllers/FundWallet.controller";
import WithdrawWalletController from "./controllers/WithdrawWallet.controller";
import ConfirmFundingController from "./controllers/ConfirmFunding.controller";
import GetTransactionsController from "./controllers/GetTransactions.controller";

const walletRouter: Router = Router();

walletRouter.get("/", GetWalletController);
walletRouter.post("/fund", FundWalletController);
walletRouter.post("/withdraw", WithdrawWalletController);
walletRouter.post("/confirm-funding", ConfirmFundingController);
walletRouter.get("/transactions", GetTransactionsController);

export default walletRouter;
