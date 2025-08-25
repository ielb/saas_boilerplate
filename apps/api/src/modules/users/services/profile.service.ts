import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { UserProfileRepository } from '../../users/repositories/user-profile.repository';
import { StorageManagerService } from '../../files/services/storage-manager.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  ProfileResponseDto,
  ProfileCompletionDto,
} from '../../users/dto/profile.dto';
import {
  UserProfile,
  ProfilePrivacyLevel,
} from '../../users/entities/user-profile.entity';
import { JwtPayload } from '@app/shared';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly profileRepository: UserProfileRepository,
    private readonly storageManagerService: StorageManagerService
  ) {}

  async createProfile(
    createProfileDto: CreateProfileDto,
    user: JwtPayload
  ): Promise<ProfileResponseDto> {
    this.logger.log(`Creating profile for user ${user.sub}`);

    // Check if profile already exists
    const existingProfile = await this.profileRepository.findByUserId(user.sub);
    if (existingProfile) {
      throw new BadRequestException('Profile already exists for this user');
    }

    const profile = await this.profileRepository.create(
      createProfileDto,
      user.sub
    );

    // Calculate completion status
    const completionStatus =
      await this.profileRepository.getCompletionStatus(profile);
    await this.profileRepository.updateCompletionStatus(
      profile.id,
      completionStatus
    );

    return this.mapToResponseDto(profile);
  }

  async getProfile(user: JwtPayload): Promise<ProfileResponseDto> {
    this.logger.log(`Getting profile for user ${user.sub}`);

    const profile = await this.profileRepository.findByUserId(user.sub);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.mapToResponseDto(profile);
  }

  async getProfileById(
    id: string,
    user: JwtPayload
  ): Promise<ProfileResponseDto> {
    this.logger.log(`Getting profile ${id} for user ${user.sub}`);

    const profile = await this.profileRepository.findById(id);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Check privacy level
    if (
      profile.privacyLevel === ProfilePrivacyLevel.PRIVATE &&
      profile.userId !== user.sub
    ) {
      throw new NotFoundException('Profile not found');
    }

    return this.mapToResponseDto(profile);
  }

  async updateProfile(
    updateProfileDto: UpdateProfileDto,
    user: JwtPayload
  ): Promise<ProfileResponseDto> {
    this.logger.log(`Updating profile for user ${user.sub}`);

    const profile = await this.profileRepository.findByUserId(user.sub);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updatedProfile = await this.profileRepository.update(
      profile.id,
      updateProfileDto
    );
    if (!updatedProfile) {
      throw new NotFoundException('Profile not found');
    }

    // Recalculate completion status
    const completionStatus =
      await this.profileRepository.getCompletionStatus(updatedProfile);
    await this.profileRepository.updateCompletionStatus(
      updatedProfile.id,
      completionStatus
    );

    return this.mapToResponseDto(updatedProfile);
  }

  async uploadAvatar(
    file: Express.Multer.File,
    user: JwtPayload
  ): Promise<ProfileResponseDto> {
    this.logger.log(`Uploading avatar for user ${user.sub}`);

    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB');
    }

    const profile = await this.profileRepository.findByUserId(user.sub);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    try {
      // Upload file to storage
      const key = `avatars/${user.sub}/${Date.now()}-${file.originalname}`;
      const uploadResult = await this.storageManagerService.upload(
        key,
        file.buffer,
        {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedBy: user.sub,
            fileType: 'avatar',
          },
        }
      );

      // Update profile with new avatar
      const updatedProfile = await this.profileRepository.updateAvatar(
        profile.id,
        uploadResult.url || '',
        uploadResult.key || ''
      );

      if (!updatedProfile) {
        throw new NotFoundException('Profile not found');
      }

      // Delete old avatar if exists
      if (profile.avatarFileKey) {
        try {
          await this.storageManagerService.delete(profile.avatarFileKey);
        } catch (error) {
          this.logger.warn(
            `Failed to delete old avatar: ${error instanceof Error ? (error instanceof Error ? error.message : 'Unknown error') : 'Unknown error'}`
          );
        }
      }

      return this.mapToResponseDto(updatedProfile);
    } catch (error) {
      this.logger.error(
        `Failed to upload avatar: ${error instanceof Error ? (error instanceof Error ? error.message : 'Unknown error') : 'Unknown error'}`
      );
      throw new BadRequestException('Failed to upload avatar');
    }
  }

  async deleteAvatar(user: JwtPayload): Promise<ProfileResponseDto> {
    this.logger.log(`Deleting avatar for user ${user.sub}`);

    const profile = await this.profileRepository.findByUserId(user.sub);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Delete file from storage
    if (profile.avatarFileKey) {
      try {
        await this.storageManagerService.delete(profile.avatarFileKey);
      } catch (error) {
        this.logger.warn(
          `Failed to delete avatar file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Update profile
    const updatedProfile = await this.profileRepository.deleteAvatar(
      profile.id
    );
    if (!updatedProfile) {
      throw new NotFoundException('Profile not found');
    }

    return this.mapToResponseDto(updatedProfile);
  }

  async deleteProfile(user: JwtPayload): Promise<void> {
    this.logger.log(`Deleting profile for user ${user.sub}`);

    const profile = await this.profileRepository.findByUserId(user.sub);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Delete avatar file if exists
    if (profile.avatarFileKey) {
      try {
        await this.storageManagerService.delete(profile.avatarFileKey);
      } catch (error) {
        this.logger.warn(
          `Failed to delete avatar file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Delete profile
    const deleted = await this.profileRepository.delete(profile.id);
    if (!deleted) {
      throw new NotFoundException('Profile not found');
    }
  }

  async getProfileCompletion(user: JwtPayload): Promise<ProfileCompletionDto> {
    this.logger.log(`Getting profile completion for user ${user.sub}`);

    const profile = await this.profileRepository.findByUserId(user.sub);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const completionPercentage =
      await this.profileRepository.calculateCompletionPercentage(profile);
    const missingFields =
      await this.profileRepository.getMissingRequiredFields(profile);
    const completionStatus =
      await this.profileRepository.getCompletionStatus(profile);

    const requiredFields = [
      'firstName',
      'lastName',
      'displayName',
      'jobTitle',
      'department',
      'location',
    ];

    return {
      completionStatus,
      completionPercentage,
      missingFields,
      totalRequiredFields: requiredFields.length,
      completedRequiredFields: requiredFields.length - missingFields.length,
    };
  }

  private mapToResponseDto(profile: UserProfile): ProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      tenantId: profile.tenantId || undefined,
      firstName: profile.firstName || undefined,
      lastName: profile.lastName || undefined,
      displayName: profile.displayName || undefined,
      bio: profile.bio || undefined,
      avatarUrl: profile.avatarUrl || undefined,
      avatarFileKey: profile.avatarFileKey || undefined,
      phoneNumber: profile.phoneNumber || undefined,
      jobTitle: profile.jobTitle || undefined,
      department: profile.department || undefined,
      location: profile.location || undefined,
      website: profile.website || undefined,
      linkedinUrl: profile.linkedinUrl || undefined,
      twitterUrl: profile.twitterUrl || undefined,
      githubUrl: profile.githubUrl || undefined,
      privacyLevel: profile.privacyLevel,
      completionStatus: profile.completionStatus,
      preferences: profile.preferences || undefined,
      metadata: profile.metadata || undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    } as ProfileResponseDto;
  }
}
