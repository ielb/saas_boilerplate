import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProfileService } from '../services/profile.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  ProfileResponseDto,
  ProfileCompletionDto,
} from '../dto/profile.dto';
import { JwtPayload } from '@app/shared';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);

@ApiTags('User Profiles')
@ApiBearerAuth()
@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create user profile' })
  @ApiResponse({
    status: 201,
    description: 'Profile created successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async createProfile(
    @Body() createProfileDto: CreateProfileDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ProfileResponseDto> {
    return this.profileService.createProfile(createProfileDto, user);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getMyProfile(
    @CurrentUser() user: JwtPayload
  ): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(user);
  }

  @Get('me/completion')
  @ApiOperation({ summary: 'Get profile completion status' })
  @ApiResponse({
    status: 200,
    description: 'Profile completion retrieved successfully',
    type: ProfileCompletionDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfileCompletion(
    @CurrentUser() user: JwtPayload
  ): Promise<ProfileCompletionDto> {
    return this.profileService.getProfileCompletion(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get profile by ID' })
  @ApiParam({ name: 'id', description: 'Profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfileById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<ProfileResponseDto> {
    return this.profileService.getProfileById(id, user);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateProfile(updateProfileDto, user);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload avatar for current user' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPEG, PNG, GIF, WebP, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      })
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload
  ): Promise<ProfileResponseDto> {
    return this.profileService.uploadAvatar(file, user);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Delete avatar for current user' })
  @ApiResponse({
    status: 200,
    description: 'Avatar deleted successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @HttpCode(HttpStatus.OK)
  async deleteAvatar(
    @CurrentUser() user: JwtPayload
  ): Promise<ProfileResponseDto> {
    return this.profileService.deleteAvatar(user);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete current user profile' })
  @ApiResponse({ status: 204, description: 'Profile deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.profileService.deleteProfile(user);
  }
}
