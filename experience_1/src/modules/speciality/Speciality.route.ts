import express from "express";
const router = express.Router();
import { createSpeciality } from "./controllers/CreateSpeciality.controller";
import { deleteSpeciality } from "./controllers/DeleteSpeciality.controller";
import { getAllSpecialities } from "./controllers/GetAllSpecialities.controller";
import { getSpecialityById } from "./controllers/GetSpecialityById.controller";
import { updateSpeciality } from "./controllers/UpdateSpeciality.controller";
import { bulkCreateSpecialities } from "./controllers/BulkCreateSpecialities.controller";

router.post("/create", createSpeciality);
router.post("/bulk-create", bulkCreateSpecialities);
router.get("/all", getAllSpecialities);
router.get("/id/:id", getSpecialityById);
router.delete("/id/:id", deleteSpeciality);
router.put("/id/:id", updateSpeciality);


export default router;
