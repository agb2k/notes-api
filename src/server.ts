import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import healthRoutes from './routes/healthRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import logger from './utils/logger';
import { validateEnvironment } from './utils/envValidator';
import swaggerUi from 'swagger-ui-express';
import { RegisterRoutes } from './routes/generated/routes';
import swaggerJson from './config/swagger.json';
import { upload } from './middleware/uploadMiddleware';

validateEnvironment();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info('Created uploads directory');
}

const app = express();

app.use(helmet());

const corsOptions = {
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : true),
    credentials: true,
};
app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(requestLogger);

app.use((req: Request, res: Response, next) => {
    (req as any).res = res;
    next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJson));

app.use('/health', healthRoutes);

const apiRouter = express.Router();
RegisterRoutes(apiRouter, { multer: upload });
app.use('/api', apiRouter);

app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Hello from API' });
});

app.use(errorHandler);

export default app;

if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 8080;

    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    });
}

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Promise Rejection:', {
        reason,
        promise,
    });
    if (process.env.NODE_ENV !== 'production') {
        logger.error('Stack trace:', new Error().stack);
    }
});

process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    process.exit(0);
});
