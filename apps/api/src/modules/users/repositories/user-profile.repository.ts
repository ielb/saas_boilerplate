import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserProfile,
  ProfilePrivacyLevel,
  ProfileCompletionStatus,
} from '../entities/user-profile.entity';
import { CreateProfileDto, UpdateProfileDto } from '../dto/profile.dto';

@Injectable()
export class UserProfileRepository {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>
  ) {}

  async create(
    createProfileDto: CreateProfileDto,
    userId: string
  ): Promise<UserProfile> {
    const profile = this.profileRepository.create({
      ...createProfileDto,
      userId,
    });
    return this.profileRepository.save(profile);
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    const query = this.profileRepository
      .createQueryBuilder('profile')
      .where('profile.userId = :userId', { userId });

    return query.getOne();
  }

  async findById(id: string): Promise<UserProfile | null> {
    const query = this.profileRepository
      .createQueryBuilder('profile')
      .where('profile.id = :id', { id });

    return query.getOne();
  }

  async update(
    id: string,
    updateProfileDto: UpdateProfileDto
  ): Promise<UserProfile | null> {
    const query = this.profileRepository
      .createQueryBuilder()
      .update(UserProfile)
      .set(updateProfileDto)
      .where('id = :id', { id });

    await query.execute();
    return this.findById(id);
  }

  async updateAvatar(
    id: string,
    avatarUrl: string,
    avatarFileKey: string
  ): Promise<UserProfile | null> {
    const query = this.profileRepository
      .createQueryBuilder()
      .update(UserProfile)
      .set({ avatarUrl, avatarFileKey })
      .where('id = :id', { id });

    await query.execute();
    return this.findById(id);
  }

  async deleteAvatar(id: string): Promise<UserProfile | null> {
    const query = this.profileRepository
      .createQueryBuilder()
      .update(UserProfile)
      .set({ avatarUrl: null as any, avatarFileKey: null as any })
      .where('id = :id', { id });

    await query.execute();
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const query = this.profileRepository
      .createQueryBuilder()
      .delete()
      .from(UserProfile)
      .where('id = :id', { id });

    const result = await query.execute();
    return (result.affected || 0) > 0;
  }

  async updateCompletionStatus(
    id: string,
    completionStatus: ProfileCompletionStatus
  ): Promise<UserProfile | null> {
    const query = this.profileRepository
      .createQueryBuilder()
      .update(UserProfile)
      .set({ completionStatus })
      .where('id = :id', { id });

    await query.execute();
    return this.findById(id);
  }

  async calculateCompletionPercentage(profile: UserProfile): Promise<number> {
    const requiredFields = [
      'firstName',
      'lastName',
      'displayName',
      'jobTitle',
      'department',
      'location',
    ];

    const completedFields = requiredFields.filter(field => {
      const value = profile[field as keyof UserProfile];
      return value && value.toString().trim().length > 0;
    });

    return Math.round((completedFields.length / requiredFields.length) * 100);
  }

  async getMissingRequiredFields(profile: UserProfile): Promise<string[]> {
    const requiredFields = [
      'firstName',
      'lastName',
      'displayName',
      'jobTitle',
      'department',
      'location',
    ];

    return requiredFields.filter(field => {
      const value = profile[field as keyof UserProfile];
      return !value || value.toString().trim().length === 0;
    });
  }

  async getCompletionStatus(
    profile: UserProfile
  ): Promise<ProfileCompletionStatus> {
    const completionPercentage =
      await this.calculateCompletionPercentage(profile);

    if (completionPercentage === 100) {
      return ProfileCompletionStatus.COMPLETE;
    } else if (completionPercentage >= 50) {
      return ProfileCompletionStatus.BASIC;
    } else {
      return ProfileCompletionStatus.INCOMPLETE;
    }
  }
}
