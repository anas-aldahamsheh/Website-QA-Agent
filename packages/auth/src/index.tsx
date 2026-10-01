import { betterAuth } from 'better-auth';
import { prisma } from '@sentinelqa/database';
import { logger } from '@sentinelqa/logger';

// Initialize better-auth instance with prisma adapter
export const auth = betterAuth({
  database: {
    db: prisma,
    type: 'sqlite'
  },
  emailAndPassword: {
    enabled: true
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5 minutes
    }
  }
});

// RBAC Permissions List
export const PERMISSIONS = {
  ORG_VIEW: 'org:view',
  ORG_UPDATE: 'org:update',
  ORG_DELETE: 'org:delete',
  MEMBER_INVITE: 'member:invite',
  MEMBER_ROLE_UPDATE: 'member:role-update',
  MEMBER_REMOVE: 'member:remove',
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  RUN_TRIGGER: 'run:trigger',
  RUN_CANCEL: 'run:cancel',
  ISSUE_TRIAGE: 'issue:triage'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: Object.values(PERMISSIONS),
  ADMIN: [
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_UPDATE,
    PERMISSIONS.MEMBER_INVITE,
    PERMISSIONS.MEMBER_ROLE_UPDATE,
    PERMISSIONS.MEMBER_REMOVE,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_DELETE,
    PERMISSIONS.RUN_TRIGGER,
    PERMISSIONS.RUN_CANCEL,
    PERMISSIONS.ISSUE_TRIAGE
  ],
  QA_ENGINEER: [
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.RUN_TRIGGER,
    PERMISSIONS.RUN_CANCEL,
    PERMISSIONS.ISSUE_TRIAGE
  ],
  DEVELOPER: [
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.RUN_TRIGGER,
    PERMISSIONS.ISSUE_TRIAGE
  ],
  VIEWER: [
    PERMISSIONS.ORG_VIEW
  ]
};

// Check if a user has a specific permission in an organization
export async function checkPermission(
  userId: string,
  organizationId: string,
  requiredPermission: Permission
): Promise<boolean> {
  try {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        organizationId
      }
    });

    if (!membership) {
      logger.warn({ userId, organizationId }, 'User is not a member of organization');
      return false;
    }

    const permissions = ROLE_PERMISSIONS[membership.role];
    if (!permissions) {
      logger.error({ role: membership.role }, 'Unknown membership role');
      return false;
    }

    const hasAccess = permissions.includes(requiredPermission);
    if (!hasAccess) {
      logger.info({ userId, requiredPermission, role: membership.role }, 'RBAC Access Denied');
    }
    return hasAccess;
  } catch (error) {
    logger.error({ error, userId, organizationId }, 'Error checking permission');
    return false;
  }
}
