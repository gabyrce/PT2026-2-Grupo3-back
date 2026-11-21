import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { CategoriasModule } from './categorias/categorias.module';
import { LojasModule } from './lojas/lojas.module';
import { ImgProductModule } from './img_product/img_product.module';
import { AvaliacaoModule } from './avaliacao/avaliacao.module';
import { ComentariosModule } from './comentarios/comentarios.module';
import { ProfileImageModule } from './profile-image/profile-image.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    CategoriasModule,
    ProductModule,
    LojasModule,
    ImgProductModule,
    ProfileImageModule,  
    AvaliacaoModule,
    ComentariosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
