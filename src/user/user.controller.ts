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
import { Public } from '../auth/decorators/isPublic.decorator';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { UserPayload } from '../auth/types/UserPayload';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // cadastra um usuário com os dados enviados
  @Public()
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  // busca o perfil da pessoa que fez login
  @Get('me')
  async findMyProfile(@CurrentUser() currentUser: UserPayload) {
    return this.userService.findOne(currentUser.sub);
  }

  // consulta o perfil público de qualquer usuário
  @Public()
  @Get('public/:id')
  async findPublicProfile(
  @Param('id', ParseIntPipe) id: number,) {
  return this.userService.findPublicProfile(id);
 }

  // consulta um usuário quando o id pertence a pessoa logada
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

  // altera apenas a conta da pessoa logada
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

  // apaga apenas a conta da pessoa logada
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    if (id !== currentUser.sub) {
      throw new UnauthorizedException(
        'Você só pode deletar sua própria conta.',
      );
    }

    return this.userService.remove(id);
  }
}
