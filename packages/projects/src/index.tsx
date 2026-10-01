import { prisma } from '@sentinelqa/database';
import { validateTargetUrl, encryptCredential, decryptCredential } from '@sentinelqa/security';
import { logger } from '@sentinelqa/logger';

// Create project, checking that the domain target is valid
export async function createProject(
  organizationId: string,
  name: string,
  domain: string
) {
  const targetUrl = domain.includes('://') ? domain : `https://${domain}`;
  const isValid = await validateTargetUrl(targetUrl);
  if (!isValid) {
    logger.warn('Refused project creation for invalid domain');
    throw new Error('PROJ_INVALID_DOMAIN');
  }

  const hostname = new URL(targetUrl).host;
  logger.info({ organizationId, name, hostname }, 'Creating project');
  return prisma.project.create({
    data: {
      organizationId,
      name,
      domain: hostname
    }
  });
}

// Create environment under project
export async function createEnvironment(
  projectId: string,
  name: string,
  targetUrl: string
) {
  const isValid = await validateTargetUrl(targetUrl);
  if (!isValid) {
    logger.warn('Refused environment creation for invalid target URL');
    throw new Error('ENV_INVALID_URL');
  }

  logger.info({ projectId, name, targetHost: new URL(targetUrl).host }, 'Creating environment');
  return prisma.environment.create({
    data: {
      projectId,
      name,
      targetUrl
    }
  });
}

// Store credential with envelope encryption
export async function saveCredential(
  projectId: string,
  type: string,
  key: string,
  plainValue: string
) {
  logger.info({ projectId, type, key }, 'Encrypting and saving credential');
  const encryptedValue = encryptCredential(plainValue);

  return prisma.credential.create({
    data: {
      projectId,
      type,
      key,
      encryptedValue
    }
  });
}

// Retrieve decrypted credentials for background execution
export async function getDecryptedCredentials(projectId: string) {
  const credentials = await prisma.credential.findMany({
    where: { projectId }
  });

  return credentials.map((cred) => ({
    id: cred.id,
    type: cred.type,
    key: cred.key,
    value: decryptCredential(cred.encryptedValue)
  }));
}
