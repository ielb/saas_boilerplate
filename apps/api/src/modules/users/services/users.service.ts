import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly customUserRepository: UserRepository
  ) {}

  async create(createUserDto: CreateUserDto, tenantId: string): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email, tenantId },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      tenantId,
    });

    return this.userRepository.save(user);
  }

  async findAll(
    query: UserQueryDto,
    tenantId: string
  ): Promise<{ users: User[]; total: number }> {
    return this.customUserRepository.findWithPagination(
      query.page,
      query.limit,
      query.search
    );
  }

  async findOne(id: string, tenantId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: id, tenantId },
      relations: ['roles', 'tenant'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, tenantId },
      relations: ['roles'],
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    tenantId: string
  ): Promise<User> {
    const user = await this.findOne(id, tenantId);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(
        updateUserDto.email,
        tenantId
      );
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('User with this email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const user = await this.findOne(id, tenantId);
    await this.userRepository.remove(user);
  }

  async activate(id: string, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);
    await user.markAsActive();
    return this.userRepository.save(user);
  }

  async deactivate(id: string, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);
    await user.markAsSuspended();
    return this.userRepository.save(user);
  }
}
