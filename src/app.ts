import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import morgan from "morgan";
import authRoutes from './routes/auth';
import ninRoutes from './routes/Nin';
import artisanRoutes from './routes/artisan'


const app = express();

app.use(
    cors({
        origin: "*", // allow all for now (dev)
    })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.static('frontend'));

app.use('/api/auth', authRoutes);
app.use('/api/verifyNin', ninRoutes);
app.use('/api/artisans', artisanRoutes)


app.get('/api', (_req, res) => {
    res.json({ message: 'API is running' })
})



export default app;
