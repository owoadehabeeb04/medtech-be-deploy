import { add } from "@medtech/utils";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" }); // shared
dotenv.config(); // local


console.log(add(1, 2));
console.log("Shared var:", process.env.SHARED_VAR);
console.log("Domain var:", process.env.DOMAIN_VAR);
