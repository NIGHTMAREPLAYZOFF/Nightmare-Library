/**
 * Storage Provider Abstraction
 * Supports R2, S3, GCS, Backblaze, and GitHub fallback
 */

export interface StorageConfig {
  type: 'r2' | 's3' | 'gcs' | 'backblaze' | 'github';
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
  endpoint?: string;
  region?: string;
  githubToken?: string;
  githubOwner?: string;
}

export interface StorageResult {
  success: boolean;
  storageId?: string;
  url?: string;
  error?: string;
}

/**
 * Upload file to storage provider
 */
export async function uploadFile(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  try {
    switch (config.type) {
      case 'r2':
      case 's3':
        return await uploadToS3Compatible(config, fileId, data, contentType);
      case 'github':
        return await uploadToGitHub(config, fileId, data);
      default:
        return { success: false, error: `Unsupported storage type: ${config.type}` };
    }
  } catch (error) {
    console.error('Storage upload error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Download file from storage provider
 */
export async function downloadFile(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  try {
    switch (config.type) {
      case 'r2':
      case 's3':
        return await downloadFromS3Compatible(config, storageId);
      case 'github':
        return await downloadFromGitHub(config, storageId);
      default:
        return { success: false, error: `Unsupported storage type: ${config.type}` };
    }
  } catch (error) {
    console.error('Storage download error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete file from storage provider
 */
export async function deleteFile(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (config.type) {
      case 'r2':
      case 's3':
        return await deleteFromS3Compatible(config, storageId);
      case 'github':
        return await deleteFromGitHub(config, storageId);
      default:
        return { success: false, error: `Unsupported storage type: ${config.type}` };
    }
  } catch (error) {
    console.error('Storage delete error:', error);
    return { success: false, error: String(error) };
  }
}

// S3-Compatible Storage (R2, S3, Backblaze)
async function uploadToS3Compatible(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  const endpoint = config.endpoint || `https://s3.${config.region || 'us-east-1'}.amazonaws.com`;
  const url = `${endpoint}/${config.bucket}/${fileId}`;

  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateShort = date.slice(0, 8);

  // Simplified signing for demo - in production use proper AWS4 signing
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date': date,
      'Authorization': `AWS ${config.accessKey}:${config.secretKey}`
    },
    body: data
  });

  if (response.ok) {
    return { success: true, storageId: fileId, url };
  }

  return { success: false, error: `S3 upload failed: ${response.status}` };
}

async function downloadFromS3Compatible(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  const endpoint = config.endpoint || `https://s3.${config.region || 'us-east-1'}.amazonaws.com`;
  const url = `${endpoint}/${config.bucket}/${storageId}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `AWS ${config.accessKey}:${config.secretKey}`
    }
  });

  if (response.ok) {
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    return { success: true, data, contentType };
  }

  return { success: false, error: `S3 download failed: ${response.status}` };
}

async function deleteFromS3Compatible(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const endpoint = config.endpoint || `https://s3.${config.region || 'us-east-1'}.amazonaws.com`;
  const url = `${endpoint}/${config.bucket}/${storageId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `AWS ${config.accessKey}:${config.secretKey}`
    }
  });

  if (response.ok || response.status === 204) {
    return { success: true };
  }

  return { success: false, error: `S3 delete failed: ${response.status}` };
}

// GitHub Storage (Fallback)
async function uploadToGitHub(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer
): Promise<StorageResult> {
  const repoName = `nightmare-library-storage-${Date.now()}`;
  
  // Create private repo if needed
  const createRepoResponse = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.githubToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json'
    },
    body: JSON.stringify({
      name: repoName,
      private: true,
      description: 'Nightmare Library Storage Fallback'
    })
  });

  if (!createRepoResponse.ok && createRepoResponse.status !== 422) {
    return { success: false, error: 'Failed to create GitHub repo' };
  }

  // Upload file
  const base64Content = arrayBufferToBase64(data);
  const filePath = `books/${fileId}`;
  
  const uploadResponse = await fetch(
    `https://api.github.com/repos/${config.githubOwner}/${repoName}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify({
        message: `Upload ${fileId}`,
        content: base64Content
      })
    }
  );

  if (uploadResponse.ok) {
    return { 
      success: true, 
      storageId: `${repoName}/${filePath}`,
      url: `https://raw.githubusercontent.com/${config.githubOwner}/${repoName}/main/${filePath}`
    };
  }

  return { success: false, error: 'GitHub upload failed' };
}

async function downloadFromGitHub(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  const [repoName, ...pathParts] = storageId.split('/');
  const filePath = pathParts.join('/');
  
  const response = await fetch(
    `https://api.github.com/repos/${config.githubOwner}/${repoName}/contents/${filePath}`,
    {
      headers: {
        'Authorization': `Bearer ${config.githubToken}`,
        'Accept': 'application/vnd.github+json'
      }
    }
  );

  if (response.ok) {
    const json = await response.json() as { content: string };
    const data = base64ToArrayBuffer(json.content);
    return { success: true, data, contentType: 'application/octet-stream' };
  }

  return { success: false, error: 'GitHub download failed' };
}

async function deleteFromGitHub(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const [repoName, ...pathParts] = storageId.split('/');
  const filePath = pathParts.join('/');

  // Get file SHA first
  const getResponse = await fetch(
    `https://api.github.com/repos/${config.githubOwner}/${repoName}/contents/${filePath}`,
    {
      headers: {
        'Authorization': `Bearer ${config.githubToken}`,
        'Accept': 'application/vnd.github+json'
      }
    }
  );

  if (!getResponse.ok) {
    return { success: false, error: 'File not found' };
  }

  const fileInfo = await getResponse.json() as { sha: string };

  const deleteResponse = await fetch(
    `https://api.github.com/repos/${config.githubOwner}/${repoName}/contents/${filePath}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify({
        message: `Delete ${filePath}`,
        sha: fileInfo.sha
      })
    }
  );

  if (deleteResponse.ok) {
    return { success: true };
  }

  return { success: false, error: 'GitHub delete failed' };
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Get storage config from environment
 */
export function getStorageConfig(env: Record<string, string>): StorageConfig {
  const type = (env.STORAGE_PROVIDER_1_TYPE || 'github') as StorageConfig['type'];
  
  return {
    type,
    bucket: env.STORAGE_PROVIDER_1_BUCKET,
    accessKey: env.STORAGE_PROVIDER_1_ACCESS_KEY,
    secretKey: env.STORAGE_PROVIDER_1_SECRET_KEY,
    endpoint: env.STORAGE_PROVIDER_1_ENDPOINT,
    region: env.STORAGE_PROVIDER_1_REGION,
    githubToken: env.GITHUB_FALLBACK_TOKEN,
    githubOwner: env.GITHUB_FALLBACK_OWNER
  };
}

/**
 * Get GitHub fallback config
 */
export function getGitHubFallbackConfig(env: Record<string, string>): StorageConfig {
  return {
    type: 'github',
    githubToken: env.GITHUB_FALLBACK_TOKEN,
    githubOwner: env.GITHUB_FALLBACK_OWNER
  };
}
