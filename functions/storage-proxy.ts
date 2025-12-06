
/**
 * Storage Provider Abstraction
 * Supports Google Drive, Dropbox, Mega.nz, and GitHub fallback (4GB limit)
 */

export interface StorageConfig {
  type: 'gdrive' | 'dropbox' | 'mega' | 'github';
  // Google Drive
  gdriveAccessToken?: string;
  gdriveFolderId?: string;
  // Dropbox
  dropboxAccessToken?: string;
  dropboxPath?: string;
  // Mega.nz
  megaEmail?: string;
  megaPassword?: string;
  megaFolderId?: string;
  // GitHub
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
}

export interface StorageResult {
  success: boolean;
  storageId?: string;
  url?: string;
  error?: string;
}

const GITHUB_MAX_SIZE = 4 * 1024 * 1024 * 1024; // 4GB
let githubTotalSize = 0;

/**
 * Upload file to storage provider with cascading fallback
 */
export async function uploadFile(
  configs: StorageConfig[],
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  for (const config of configs) {
    try {
      let result: StorageResult;

      switch (config.type) {
        case 'gdrive':
          result = await uploadToGoogleDrive(config, fileId, data, contentType);
          break;
        case 'dropbox':
          result = await uploadToDropbox(config, fileId, data, contentType);
          break;
        case 'mega':
          result = await uploadToMega(config, fileId, data, contentType);
          break;
        case 'github':
          // Check size limit for GitHub
          if (githubTotalSize + data.byteLength > GITHUB_MAX_SIZE) {
            result = { success: false, error: 'GitHub storage limit (4GB) exceeded' };
          } else {
            result = await uploadToGitHub(config, fileId, data);
            if (result.success) {
              githubTotalSize += data.byteLength;
            }
          }
          break;
        default:
          result = { success: false, error: `Unsupported storage type: ${config.type}` };
      }

      if (result.success) {
        return result;
      }

      console.log(`${config.type} upload failed, trying next provider...`);
    } catch (error) {
      console.error(`${config.type} error:`, error);
    }
  }

  return { success: false, error: 'All storage providers failed' };
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
      case 'gdrive':
        return await downloadFromGoogleDrive(config, storageId);
      case 'dropbox':
        return await downloadFromDropbox(config, storageId);
      case 'mega':
        return await downloadFromMega(config, storageId);
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
    let result: { success: boolean; error?: string };

    switch (config.type) {
      case 'gdrive':
        result = await deleteFromGoogleDrive(config, storageId);
        break;
      case 'dropbox':
        result = await deleteFromDropbox(config, storageId);
        break;
      case 'mega':
        result = await deleteFromMega(config, storageId);
        break;
      case 'github':
        result = await deleteFromGitHub(config, storageId);
        if (result.success) {
          // We can't accurately track deleted size, so reset on delete
          githubTotalSize = Math.max(0, githubTotalSize - 1024 * 1024);
        }
        break;
      default:
        result = { success: false, error: `Unsupported storage type: ${config.type}` };
    }

    return result;
  } catch (error) {
    console.error('Storage delete error:', error);
    return { success: false, error: String(error) };
  }
}

// ==================== Google Drive ====================

async function uploadToGoogleDrive(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  const metadata = {
    name: fileId,
    parents: config.gdriveFolderId ? [config.gdriveFolderId] : []
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([data], { type: contentType }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.gdriveAccessToken}`
    },
    body: form
  });

  if (response.ok) {
    const result = await response.json() as { id: string };
    return {
      success: true,
      storageId: result.id,
      url: `https://drive.google.com/file/d/${result.id}/view`
    };
  }

  return { success: false, error: `Google Drive upload failed: ${response.status}` };
}

async function downloadFromGoogleDrive(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${storageId}?alt=media`, {
    headers: {
      'Authorization': `Bearer ${config.gdriveAccessToken}`
    }
  });

  if (response.ok) {
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    return { success: true, data, contentType };
  }

  return { success: false, error: `Google Drive download failed: ${response.status}` };
}

async function deleteFromGoogleDrive(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${storageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${config.gdriveAccessToken}`
    }
  });

  if (response.ok || response.status === 204) {
    return { success: true };
  }

  return { success: false, error: `Google Drive delete failed: ${response.status}` };
}

// ==================== Dropbox ====================

async function uploadToDropbox(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  const path = `${config.dropboxPath || ''}/books/${fileId}`;

  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.dropboxAccessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: 'add',
        autorename: true,
        mute: false
      })
    },
    body: data
  });

  if (response.ok) {
    const result = await response.json() as { path_display: string; id: string };
    return {
      success: true,
      storageId: result.path_display,
      url: result.id
    };
  }

  return { success: false, error: `Dropbox upload failed: ${response.status}` };
}

async function downloadFromDropbox(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.dropboxAccessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path: storageId })
    }
  });

  if (response.ok) {
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    return { success: true, data, contentType };
  }

  return { success: false, error: `Dropbox download failed: ${response.status}` };
}

async function deleteFromDropbox(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.dropboxAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path: storageId })
  });

  if (response.ok) {
    return { success: true };
  }

  return { success: false, error: `Dropbox delete failed: ${response.status}` };
}

// ==================== Mega.nz ====================

async function uploadToMega(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  // Mega.nz requires a complex encryption and API flow
  // This is a simplified implementation using their public API
  
  const loginResponse = await fetch('https://g.api.mega.co.nz/cs?id=0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      a: 'us',
      user: config.megaEmail,
      uh: await hashPassword(config.megaPassword || '')
    }])
  });

  if (!loginResponse.ok) {
    return { success: false, error: 'Mega.nz login failed' };
  }

  const loginData = await loginResponse.json() as Array<{ k: string }>;
  const sessionId = loginData[0]?.k;

  if (!sessionId) {
    return { success: false, error: 'Mega.nz session failed' };
  }

  // Upload file (simplified - actual Mega upload requires encryption)
  const uploadResponse = await fetch('https://g.api.mega.co.nz/cs?id=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: data
  });

  if (uploadResponse.ok) {
    const result = await uploadResponse.json() as { h: string };
    return {
      success: true,
      storageId: result.h,
      url: `https://mega.nz/file/${result.h}`
    };
  }

  return { success: false, error: 'Mega.nz upload failed' };
}

async function downloadFromMega(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  // Simplified download - actual Mega requires decryption
  const response = await fetch(`https://g.api.mega.co.nz/cs?id=2&n=${storageId}`);

  if (response.ok) {
    const data = await response.arrayBuffer();
    return { success: true, data, contentType: 'application/octet-stream' };
  }

  return { success: false, error: 'Mega.nz download failed' };
}

async function deleteFromMega(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('https://g.api.mega.co.nz/cs?id=3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ a: 'd', n: storageId }])
  });

  if (response.ok) {
    return { success: true };
  }

  return { success: false, error: 'Mega.nz delete failed' };
}

// ==================== GitHub ====================

async function uploadToGitHub(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer
): Promise<StorageResult> {
  const repoName = config.githubRepo || 'nightmare-library-storage';
  
  // Create private repo if it doesn't exist
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
      description: 'Nightmare Library Storage (Max 4GB)'
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

// ==================== Utility Functions ====================

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

async function hashPassword(password: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get cascading storage configs from environment
 */
export function getStorageConfigs(env: Record<string, string>): StorageConfig[] {
  const configs: StorageConfig[] = [];

  // Google Drive
  if (env.GDRIVE_ACCESS_TOKEN) {
    configs.push({
      type: 'gdrive',
      gdriveAccessToken: env.GDRIVE_ACCESS_TOKEN,
      gdriveFolderId: env.GDRIVE_FOLDER_ID
    });
  }

  // Dropbox
  if (env.DROPBOX_ACCESS_TOKEN) {
    configs.push({
      type: 'dropbox',
      dropboxAccessToken: env.DROPBOX_ACCESS_TOKEN,
      dropboxPath: env.DROPBOX_PATH
    });
  }

  // Mega.nz
  if (env.MEGA_EMAIL && env.MEGA_PASSWORD) {
    configs.push({
      type: 'mega',
      megaEmail: env.MEGA_EMAIL,
      megaPassword: env.MEGA_PASSWORD,
      megaFolderId: env.MEGA_FOLDER_ID
    });
  }

  // GitHub (always last as fallback)
  if (env.GITHUB_TOKEN && env.GITHUB_OWNER) {
    configs.push({
      type: 'github',
      githubToken: env.GITHUB_TOKEN,
      githubOwner: env.GITHUB_OWNER,
      githubRepo: env.GITHUB_REPO || 'nightmare-library-storage'
    });
  }

  return configs;
}
