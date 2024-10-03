import 'dotenv/config';
import 'module-alias/register';
import 'reflect-metadata';
import { App } from './app';

console.clear();

export async function bootstrap() {
  new App().setup();
}

bootstrap();
