// recebe as requisições de usuário e limita as chamadas para só o usuario logado
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { Public } from '../auth/decorators/isPublic.decorator';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { UserPayload } from '../auth/types/UserPayload';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get('me')
  async findMyProfile(@CurrentUser() currentUser: UserPayload) {
    return this.userService.findOne(currentUser.sub);
  }

  @Patch('me/senha')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.userService.changePassword(
      currentUser.sub,
      changePasswordDto.senhaAtual,
      changePasswordDto.novaSenha,
    );
  }

  @Public()
  @Get('public/:id')
  async findPublicProfile(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findPublicProfile(id);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    if (id !== currentUser.sub) {
      throw new UnauthorizedException(
        'Você só pode consultar sua própria conta.',
      );
    }
    return this.userService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    if (id !== currentUser.sub) {
      throw new UnauthorizedException(
        'Você só pode alterar sua própria conta.',
      );
    }
    return this.userService.update(id, updateUserDto);
  }

  @Delete('me')
  async deleteAccount(
    @Body() deleteAccountDto: DeleteAccountDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.userService.deleteAccount(
      currentUser.sub,
      deleteAccountDto.senhaAtual,
    );
  }
}