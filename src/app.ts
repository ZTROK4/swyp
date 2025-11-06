import express from "express";
import cors from "cors";
import morgan from "morgan";
import userRouter from "./routes/userRoutes.js";
import verificationRouter from "./routes/verificationRoutes.js";
import productRouter from "./routes/productRoutes.js";
import loginRouter from "./routes/loginRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/users", userRouter);
app.use("/api/verifications", verificationRouter);
app.use("/api/products", productRouter);
app.use("/api/login",loginRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));