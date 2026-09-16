import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  // Usar validaciones globales
  app.useGlobalPipes(new ValidationPipe());

  // La API vive bajo /api: así el fallback SPA puede servir index.html para
  // cualquier otro GET sin mantener una lista de excepciones por controlador.
  app.setGlobalPrefix('api');

  // Archivos estáticos: SIEMPRE desde 2BACK/uploads (cwd del proyecto).
  // __dirname cambia entre dev (dist/) y prod; el cwd es estable y coincide
  // con donde Multer escribe los archivos.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Configuración de Swagger para la documentación de la API
  const config = new DocumentBuilder()
    .setTitle('Manage Repair Store')
    .setDescription('API backend Manage Repair Store')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // CORS configurado desde variable de entorno
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin || ((origin, callback) => {
      // Allow all localhost variants (IPv4, IPv6) in development
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://[::1]') || origin.startsWith('http://192.168.')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    }),
    credentials: true,
  });

  // Producción: servir la SPA de Angular compilada desde el mismo origen.
  // Todo lo que cuelga de /api, /api-docs y /uploads queda en Nest; cualquier
  // otro GET que acepte HTML cae a index.html para que los deep links vivan.
  const frontendDist = process.env.FRONTEND_DIST_DIR;
  if (frontendDist && existsSync(join(frontendDist, 'index.html'))) {
    app.useStaticAssets(frontendDist);

    app.use((req: Request, res: Response, next: NextFunction) => {
      const path = req.path;
      const isServerPath =
        path === '/api' || path.startsWith('/api/') ||
        path === '/api-docs' || path.startsWith('/api-docs/') ||
        path.startsWith('/uploads/');

      if (req.method !== 'GET' || isServerPath || !req.accepts('html')) {
        return next();
      }

      res.sendFile(join(frontendDist, 'index.html'));
    });
  }

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
}
bootstrap();