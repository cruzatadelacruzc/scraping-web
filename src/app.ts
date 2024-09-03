import 'dotenv/config';
import 'module-alias/register';
import express from 'express';
import cors from 'cors';
import { router } from '@/routes';
import dbConnect from '@/config/db-config';
const PORT = process.env.PORT || 3000;

dbConnect();
const app = express();

app.use(cors());
app.use(router);

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
