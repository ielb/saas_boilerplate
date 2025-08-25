import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { StorageManagerService } from '../../files/services/storage-manager.service';
import {
  UserProfile,
  ProfilePrivacyLevel,
  ProfileCompletionStatus,
} from '../entities/user-profile.entity';
import { CreateProfileDto, UpdateProfileDto } from '../dto/profile.dto';
import { JwtPayload, UserRole } from '@app/shared';

describe('ProfileService', () => {
  let service: ProfileService;
  let profileRepository: UserProfileRepository;
  let storageManagerService: StorageManagerService;

  const mockUser: JwtPayload = {
    sub: 'test-user-id',
    email: 'test@example.com',
    role: UserRole.MEMBER,
    tenantId: 'test-tenant-id',
  };

  const mockProfile: UserProfile = {
    id: 'profile-id',
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John Doe',
    bio: 'Test bio',
    jobTitle: 'Developer',
    department: 'Engineering',
    location: 'New York',
    privacyLevel: ProfilePrivacyLevel.TENANT_ONLY,
    completionStatus: ProfileCompletionStatus.BASIC,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserProfile;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: UserProfileRepository,
          useValue: {
            create: jest.fn(),
            findByUserId: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            updateAvatar: jest.fn(),
            deleteAvatar: jest.fn(),
            delete: jest.fn(),
            updateCompletionStatus: jest.fn(),
            calculateCompletionPercentage: jest.fn(),
            getMissingRequiredFields: jest.fn(),
            getCompletionStatus: jest.fn(),
          },
        },
        {
          provide: StorageManagerService,
          useValue: {
            upload: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    profileRepository = module.get<UserProfileRepository>(
      UserProfileRepository
    );
    storageManagerService = module.get<StorageManagerService>(
      StorageManagerService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProfile', () => {
    it('should create a new profile', async () => {
      const createProfileDto: CreateProfileDto = {
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        bio: 'Test bio',
        jobTitle: 'Developer',
        department: 'Engineering',
        location: 'New York',
      };

      jest.spyOn(profileRepository, 'findByUserId').mockResolvedValue(null);
      jest.spyOn(profileRepository, 'create').mockResolvedValue(mockProfile);
      jest
        .spyOn(profileRepository, 'getCompletionStatus')
        .mockResolvedValue(ProfileCompletionStatus.BASIC);
      jest
        .spyOn(profileRepository, 'updateCompletionStatus')
        .mockResolvedValue(mockProfile);

      const result = await service.createProfile(createProfileDto, mockUser);

      expect(result).toBeDefined();
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.displayName).toBe('John Doe');
      expect(profileRepository.create).toHaveBeenCalledWith(
        createProfileDto,
        mockUser.sub
      );
    });

    it('should throw error if profile already exists', async () => {
      const createProfileDto: CreateProfileDto = {
        firstName: 'John',
        lastName: 'Doe',
      };

      jest
        .spyOn(profileRepository, 'findByUserId')
        .mockResolvedValue(mockProfile);

      await expect(
        service.createProfile(createProfileDto, mockUser)
      ).rejects.toThrow('Profile already exists for this user');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      jest
        .spyOn(profileRepository, 'findByUserId')
        .mockResolvedValue(mockProfile);

      const result = await service.getProfile(mockUser);

      expect(result).toBeDefined();
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should throw error if profile not found', async () => {
      jest.spyOn(profileRepository, 'findByUserId').mockResolvedValue(null);

      await expect(service.getProfile(mockUser)).rejects.toThrow(
        'Profile not found'
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateProfileDto: UpdateProfileDto = {
        firstName: 'John Updated',
        bio: 'Updated bio',
      };

      jest
        .spyOn(profileRepository, 'findByUserId')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(profileRepository, 'update')
        .mockResolvedValue({ ...mockProfile, ...updateProfileDto });
      jest
        .spyOn(profileRepository, 'getCompletionStatus')
        .mockResolvedValue(ProfileCompletionStatus.COMPLETE);
      jest
        .spyOn(profileRepository, 'updateCompletionStatus')
        .mockResolvedValue({ ...mockProfile, ...updateProfileDto });

      const result = await service.updateProfile(updateProfileDto, mockUser);

      expect(result).toBeDefined();
      expect(result.firstName).toBe('John Updated');
      expect(result.bio).toBe('Updated bio');
    });
  });

  describe('getProfileCompletion', () => {
    it('should return profile completion status', async () => {
      jest
        .spyOn(profileRepository, 'findByUserId')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(profileRepository, 'calculateCompletionPercentage')
        .mockResolvedValue(75);
      jest
        .spyOn(profileRepository, 'getMissingRequiredFields')
        .mockResolvedValue(['location']);
      jest
        .spyOn(profileRepository, 'getCompletionStatus')
        .mockResolvedValue(ProfileCompletionStatus.BASIC);

      const result = await service.getProfileCompletion(mockUser);

      expect(result).toBeDefined();
      expect(result.completionStatus).toBe(ProfileCompletionStatus.BASIC);
      expect(result.completionPercentage).toBe(75);
      expect(result.missingFields).toEqual(['location']);
      expect(result.totalRequiredFields).toBe(6);
      expect(result.completedRequiredFields).toBe(5);
    });
  });
});
