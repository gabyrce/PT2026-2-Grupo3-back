import { Module } from '@nestjs/common';
import { LojasService } from './lojas.service';
import { LojasController } from './lojas.controller';
import { LojasImageService } from './lojas-image.service';

@Module({
  controllers: [LojasController],
  providers: [LojasService, LojasImageService],
})
export class LojasModule {}
