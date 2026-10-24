import express from "express";
import UserRouter from "./routes/userRoutes";
import CategoriesRouter from "./routes/categoriesRoutes";
import SupplierRouter from "./routes/suppliersRoutes";
import ProductsRouter from "./routes/productsRoutes";
import StockInputRouter from "./routes/stockInputRoutes";
import InputItemRouter from "./routes/inputItemRoutes";
import StockOutputRouter from "./routes/stockOutputRoutes";
import OutputItemRouter from "./routes/outputItemRoutes";
import NotificationsRouter from "./routes/notificationsRoutes";
import DashboardRouter from "./routes/dashboardRoutes";
import CompaniesRouter from "./routes/companiesRoutes";
import BillingRouter from "./routes/billingRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import { authenticateToken } from "./middlewares/authMiddleware";
import { requireAdmin } from "./middlewares/requireAdmin";
import { chatBotInput, chatBotHistory } from "./chatBot/controllers/chatController";
import { securityHeaders } from "./middlewares/securityHeaders";
import { chatLimit } from "./middlewares/rateLimit";

const cors = require('cors');

export const app = express();

// Origens que podem chamar a API pelo navegador. Em produção, defina CORS_ORIGIN no .env
// com o endereço do frontend (vários separados por vírgula).
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

// Atrás de proxy (Railway, Render, Nginx), o IP real vem no X-Forwarded-For; usado no limite de tentativas.
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.disable("x-powered-by");
app.use(securityHeaders);
app.use(cors({
  // Sem Origin (curl, servidor a servidor) não há risco de CORS; navegadores só das origens liberadas.
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) =>
    callback(null, !origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)),
}));
app.use(express.json({ limit: "100kb" }));
app.use("/categories", authenticateToken, CategoriesRouter);

app.use("/users", UserRouter);

// Cadastro de empresa é público (cria a empresa e o primeiro administrador).
app.use("/companies", CompaniesRouter);

app.use("/suppliers", authenticateToken, SupplierRouter);

app.use("/products", authenticateToken, ProductsRouter);

app.use("/stockInputs", authenticateToken, StockInputRouter);

app.use("/inputItems", authenticateToken, InputItemRouter);

app.use("/stockOutputs", authenticateToken, StockOutputRouter);

app.use("/outputItems", authenticateToken, OutputItemRouter);

app.use("/notifications", authenticateToken, NotificationsRouter);

app.use("/dashboard" ,authenticateToken, DashboardRouter)

// Assinatura do plano: exclusiva do administrador.
app.use("/billing", authenticateToken, requireAdmin, BillingRouter);

// O assistente de IA é exclusivo do administrador, como no menu do frontend.
app.get("/chat/history", authenticateToken, requireAdmin, chatBotHistory);
app.post("/chat", authenticateToken, requireAdmin, chatLimit, chatBotInput);

// O tratamento de erros deve vir depois das rotas e do middleware de upload.
app.use(errorHandler);

// Importar a aplicação nos testes não deve iniciar o servidor de produção.
if (require.main === module) {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
