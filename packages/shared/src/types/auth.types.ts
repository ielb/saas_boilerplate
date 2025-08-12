export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  GITHUB = 'github',
}

export enum MembershipStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    tenantId: string;
    avatar?: string;
  };
  requiresMfa?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantName: string;
  acceptTerms: boolean;
  marketingConsent?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface TwoFactorAuthSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorAuthVerify {
  token: string;
  backupCode?: string;
}

export interface TwoFactorAuthStatus {
  isEnabled: boolean;
  isVerified: boolean;
  backupCodesRemaining: number;
}

export interface BackupCode {
  code: string;
  isUsed: boolean;
  usedAt?: Date;
}

export interface MFAConfig {
  issuer: string;
  algorithm: 'sha1' | 'sha256' | 'sha512';
  digits: number;
  period: number;
  window: number;
}

export interface SocialLoginRequest {
  provider: AuthProvider;
  accessToken: string;
  redirectUri?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  os?: string;
  ip?: string;
  userAgent?: string;
  lastUsedAt: Date;
}

export interface SessionInfo {
  id: string;
  deviceId: string;
  deviceInfo: DeviceInfo;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

export interface TenantContext {
  id: string;
  name: string;
  domain?: string;
  settings: Record<string, any>;
  features: string[];
}

export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
  };
  tenant: TenantContext;
  session: {
    id: string;
    deviceId: string;
  };
  permissions: Permission[];
}
