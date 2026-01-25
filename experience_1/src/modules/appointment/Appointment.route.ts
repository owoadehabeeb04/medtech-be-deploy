import express from "express";
import Auth from "../../middlewares/Auth.Middleware";
import { getAllMedicAppointments } from "./controllers/GetAllMedicsAppointment.controller";
import { bookAppointment } from "./controllers/BookAppointment.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();

router.get("/", verifyToken, getAllMedicAppointments);
router.post("/book", verifyToken, bookAppointment);

export default router;

