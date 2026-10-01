import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@sentinelqa/logger';

const s3Client = new S3Client({
  endpoint: `http://${process.env['STORAGE_ENDPOINT'] || 'localhost'}:${process.env['STORAGE_PORT'] || '9000'}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env['STORAGE_ACCESS_KEY'] || 'minioadmin',
    secretAccessKey: process.env['STORAGE_SECRET_KEY'] || 'minioadmin_password'
  },
  forcePathStyle: true // Needed for MinIO
});

const BUCKET_NAME = process.env['STORAGE_BUCKET'] || 'sentinelqa-artifacts';

// Upload visual screenshot, video, or trace archive to MinIO
export async function uploadArtifact(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  logger.info({ key, contentType }, 'Uploading file to object storage');
  
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
    return key;
  } catch (error) {
    logger.error({ error, key }, 'Failed to upload artifact');
    throw new Error('STORAGE_UPLOAD_FAIL');
  }
}

// Generate direct access links
export async function getDownloadUrl(key: string): Promise<string> {
  const endpoint = process.env['STORAGE_ENDPOINT'] || 'localhost';
  const port = process.env['STORAGE_PORT'] || '9000';
  return `http://${endpoint}:${port}/${BUCKET_NAME}/${key}`;
}
