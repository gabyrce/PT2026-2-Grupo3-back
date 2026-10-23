import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Permite que o Next.js (frontend) se comunique com o NestJS (backend)
  app.enableCors();

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();