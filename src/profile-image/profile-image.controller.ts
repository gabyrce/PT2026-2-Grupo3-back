import {
  Controller,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { UserPayload } from '../auth/types/UserPayload';
import { ProfileImageService } from './profile-image.service';

@Controller('profile-image')
export class ProfileImageController {
  constructor(
    private readonly profileImageService: ProfileImageService,
  ) {}

  @Patch('me')
  @UseInterceptors(
    FileInterceptor('imagem', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  update(
    @UploadedFile() imagem: Express.Multer.File,
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.profileImageService.update(currentUser.sub, imagem);
  }
}
