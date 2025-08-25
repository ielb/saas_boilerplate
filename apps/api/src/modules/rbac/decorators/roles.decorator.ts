import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@app/shared';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
