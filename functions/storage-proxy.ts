import { 
  uploadToGitHub, 
  downloadFromGitHub, 
  deleteFromGitHub 
} from './storage-github';

/**
 * Storage Provider Abstraction
 * Supports 10 storage providers with cascading fallback:
 * 1. Google Drive, 2. Dropbox, 3. OneDrive, 4. pCloud, 5. Box, 
 * 6. Yandex Disk, 7. Koofr, 8. Backblaze B2, 9. Mega.nz, 10. GitHub (4GB limit)
 */

export type StorageType = 'gdrive' | 'dropbox' | 'onedrive' | 'pcloud' | 'box' | 
                          'yandex' | 'koofr' | 'b2' | 'mega' | 'github';

export interface StorageConfig {
  type: StorageType;
  priority?: number;
  // Google Drive
  gdriveAccessToken?: string;
  gdriveFolderId?: string;
  // Dropbox
  dropboxAccessToken?: string;
  dropboxPath?: string;
  // OneDrive
  onedriveAccessToken?: string;
  onedriveFolderId?: string;
  // pCloud
  pcloudAccessToken?: string;
  pcloudFolderId?: string;
  // Box
  boxAccessToken?: string;
  boxFolderId?: string;
  // Yandex Disk
  yandexAccessToken?: string;
  yandexPath?: string;
  // Koofr
  koofrAccessToken?: string;
  koofrMountId?: string;
  koofrPath?: string;
  // Backblaze B2
  b2KeyId?: string;
  b2ApplicationKey?: string;
  b2BucketId?: string;
  b2BucketName?: string;
  // Mega.nz (single free account)
  megaEmail?: string;
  megaPassword?: string;
  megaFolderId?: string;
  // GitHub (4GB limit fallback)
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
}

export interface StorageResult {
  success: boolean;
  storageId?: string;
  url?: string;
  provider?: StorageType;
  error?: string;
}

export interface ProviderHealth {
  type: StorageType;
  healthy: boolean;
  lastCheck: number;
  errorCount: number;
}

// GITHUB_MAX_SIZE removed as it's now handled in storage-github.ts
// let githubTotalSize = 0;

// Provider health tracking for intelligent failover
const providerHealth: Map<StorageType, ProviderHealth> = new Map();

function updateProviderHealth(type: StorageType, success: boolean): void {
  const health = providerHealth.get(type) || { type, healthy: true, lastCheck: 0, errorCount: 0 };
  health.lastCheck = Date.now();
  if (success) {
    health.healthy = true;
    health.errorCount = 0;
  } else {
    health.errorCount++;
    if (health.errorCount >= 3) {
      health.healthy = false;
    }
  }
  providerHealth.set(type, health);
}

function isProviderHealthy(type: StorageType): boolean {
  const health = providerHealth.get(type);
  if (!health) return true;
  // Reset health after 5 minutes
  if (Date.now() - health.lastCheck > 5 * 60 * 1000) {
    health.healthy = true;
    health.errorCount = 0;
    return true;
  }
  return health.healthy;
}

/**
 * Upload file to storage provider with cascading fallback
 */
export async function uploadFile(
  configs: StorageConfig[],
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  // Sort by priority and health
  const sortedConfigs = [...configs].sort((a, b) => {
    const priorityDiff = (a.priority || 0) - (b.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    // Prefer healthy providers
    const aHealthy = isProviderHealthy(a.type) ? 0 : 1;
    const bHealthy = isProviderHealthy(b.type) ? 0 : 1;
    return aHealthy - bHealthy;
  });

  for (const config of sortedConfigs) {
    // Skip unhealthy providers unless it's the last resort
    if (!isProviderHealthy(config.type) && sortedConfigs.indexOf(config) < sortedConfigs.length - 1) {
      continue;
    }

    try {
      let result: StorageResult;

      switch (config.type) {
        case 'gdrive':
          result = await uploadToGoogleDrive(config, fileId, data, contentType);
          break;
        case 'dropbox':
          result = await uploadToDropbox(config, fileId, data, contentType);
          break;
        case 'onedrive':
          result = await uploadToOneDrive(config, fileId, data, contentType);
          break;
        case 'pcloud':
          result = await uploadToPCloud(config, fileId, data, contentType);
          break;
        case 'box':
          result = await uploadToBox(config, fileId, data, contentType);
          break;
        case 'yandex':
          result = await uploadToYandexDisk(config, fileId, data, contentType);
          break;
        case 'koofr':
          result = await uploadToKoofr(config, fileId, data, contentType);
          break;
        case 'b2':
          result = await uploadToBackblazeB2(config, fileId, data, contentType);
          break;
        case 'mega':
          result = await uploadToMega(config, fileId, data, contentType);
          break;
        case 'github':
          result = await uploadToGitHub(config, fileId, data);
          break;
        default:
          result = { success: false, error: `Unsupported storage type: ${config.type}` };
      }

      if (result.success) {
        updateProviderHealth(config.type, true);
        result.provider = config.type;
        return result;
      }

      updateProviderHealth(config.type, false);
      console.log(`${config.type} upload failed, trying next provider...`);
    } catch (error) {
      updateProviderHealth(config.type, false);
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
      case 'onedrive':
        return await downloadFromOneDrive(config, storageId);
      case 'pcloud':
        return await downloadFromPCloud(config, storageId);
      case 'box':
        return await downloadFromBox(config, storageId);
      case 'yandex':
        return await downloadFromYandexDisk(config, storageId);
      case 'koofr':
        return await downloadFromKoofr(config, storageId);
      case 'b2':
        return await downloadFromBackblazeB2(config, storageId);
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
      case 'onedrive':
        result = await deleteFromOneDrive(config, storageId);
        break;
      case 'pcloud':
        result = await deleteFromPCloud(config, storageId);
        break;
      case 'box':
        result = await deleteFromBox(config, storageId);
        break;
      case 'yandex':
        result = await deleteFromYandexDisk(config, storageId);
        break;
      case 'koofr':
        result = await deleteFromKoofr(config, storageId);
        break;
      case 'b2':
        result = await deleteFromBackblazeB2(config, storageId);
        break;
      case 'mega':
        result = await deleteFromMega(config, storageId);
        break;
      case 'github':
        result = await deleteFromGitHub(config, storageId);
        if (result.success) {
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

// ==================== OneDrive ====================

async function uploadToOneDrive(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  const folder = config.onedriveFolderId || 'root';
  const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folder}:/${fileId}:/content`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.onedriveAccessToken}`,
      'Content-Type': contentType
    },
    body: data
  });

  if (response.ok) {
    const result = await response.json() as { id: string; webUrl: string };
    return {
      success: true,
      storageId: result.id,
      url: result.webUrl
    };
  }

  return { success: false, error: `OneDrive upload failed: ${response.status}` };
}

async function downloadFromOneDrive(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${storageId}/content`, {
    headers: {
      'Authorization': `Bearer ${config.onedriveAccessToken}`
    }
  });

  if (response.ok) {
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    return { success: true, data, contentType };
  }

  return { success: false, error: `OneDrive download failed: ${response.status}` };
}

async function deleteFromOneDrive(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${storageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${config.onedriveAccessToken}`
    }
  });

  if (response.ok || response.status === 204) {
    return { success: true };
  }

  return { success: false, error: `OneDrive delete failed: ${response.status}` };
}

// ==================== pCloud ====================

async function uploadToPCloud(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  const folderId = config.pcloudFolderId || '0';
  
  const form = new FormData();
  form.append('file', new Blob([data], { type: contentType }), fileId);

  const response = await fetch(`https://api.pcloud.com/uploadfile?access_token=${config.pcloudAccessToken}&folderid=${folderId}&filename=${encodeURIComponent(fileId)}`, {
    method: 'POST',
    body: form
  });

  if (response.ok) {
    const result = await response.json() as { metadata: Array<{ fileid: number; path: string }> };
    if (result.metadata && result.metadata[0]) {
      return {
        success: true,
        storageId: String(result.metadata[0].fileid),
        url: `https://my.pcloud.com/#page=filemanager&folder=${folderId}`
      };
    }
  }

  return { success: false, error: `pCloud upload failed: ${response.status}` };
}

async function downloadFromPCloud(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  // Get download link first
  const linkResponse = await fetch(`https://api.pcloud.com/getfilelink?access_token=${config.pcloudAccessToken}&fileid=${storageId}`);
  
  if (!linkResponse.ok) {
    return { success: false, error: `pCloud link failed: ${linkResponse.status}` };
  }

  const linkData = await linkResponse.json() as { hosts: string[]; path: string };
  const downloadUrl = `https://${linkData.hosts[0]}${linkData.path}`;

  const response = await fetch(downloadUrl);
  if (response.ok) {
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    return { success: true, data, contentType };
  }

  return { success: false, error: `pCloud download failed: ${response.status}` };
}

async function deleteFromPCloud(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`https://api.pcloud.com/deletefile?access_token=${config.pcloudAccessToken}&fileid=${storageId}`);

  if (response.ok) {
    return { success: true };
  }

  return { success: false, error: `pCloud delete failed: ${response.status}` };
}

// ==================== Box ====================

async function uploadToBox(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  const folderId = config.boxFolderId || '0';

  const form = new FormData();
  form.append('attributes', JSON.stringify({
    name: fileId,
    parent: { id: folderId }
  }));
  form.append('file', new Blob([data], { type: contentType }), fileId);

  const response = await fetch('https://upload.box.com/api/2.0/files/content', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.boxAccessToken}`
    },
    body: form
  });

  if (response.ok) {
    const result = await response.json() as { entries: Array<{ id: string }> };
    if (result.entries && result.entries[0]) {
      return {
        success: true,
        storageId: result.entries[0].id,
        url: `https://app.box.com/file/${result.entries[0].id}`
      };
    }
  }

  return { success: false, error: `Box upload failed: ${response.status}` };
}

async function downloadFromBox(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  const response = await fetch(`https://api.box.com/2.0/files/${storageId}/content`, {
    headers: {
      'Authorization': `Bearer ${config.boxAccessToken}`
    }
  });

  if (response.ok) {
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    return { success: true, data, contentType };
  }

  return { success: false, error: `Box download failed: ${response.status}` };
}

async function deleteFromBox(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`https://api.box.com/2.0/files/${storageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${config.boxAccessToken}`
    }
  });

  if (response.ok || response.status === 204) {
    return { success: true };
  }

  return { success: false, error: `Box delete failed: ${response.status}` };
}

// ==================== Yandex Disk ====================

async function uploadToYandexDisk(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  const path = `${config.yandexPath || 'NightmareLibrary'}/${fileId}`;
  
  // Get upload URL
  const urlResponse = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, {
    headers: {
      'Authorization': `OAuth ${config.yandexAccessToken}`
    }
  });

  if (!urlResponse.ok) {
    return { success: false, error: `Yandex Disk URL failed: ${urlResponse.status}` };
  }

  const urlData = await urlResponse.json() as { href: string };

  // Upload to the provided URL
  const response = await fetch(urlData.href, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType
    },
    body: data
  });

  if (response.ok || response.status === 201) {
    return {
      success: true,
      storageId: path,
      url: `https://disk.yandex.com/client/disk/${encodeURIComponent(config.yandexPath || 'NightmareLibrary')}`
    };
  }

  return { success: false, error: `Yandex Disk upload failed: ${response.status}` };
}

async function downloadFromYandexDisk(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  // Get download URL
  const urlResponse = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(storageId)}`, {
    headers: {
      'Authorization': `OAuth ${config.yandexAccessToken}`
    }
  });

  if (!urlResponse.ok) {
    return { success: false, error: `Yandex Disk URL failed: ${urlResponse.status}` };
  }

  const urlData = await urlResponse.json() as { href: string };

  const response = await fetch(urlData.href);
  if (response.ok) {
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    return { success: true, data, contentType };
  }

  return { success: false, error: `Yandex Disk download failed: ${response.status}` };
}

async function deleteFromYandexDisk(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(storageId)}&permanently=false`, {
    method: 'DELETE',
    headers: {
      'Authorization': `OAuth ${config.yandexAccessToken}`
    }
  });

  if (response.ok || response.status === 202 || response.status === 204) {
    return { success: true };
  }

  return { success: false, error: `Yandex Disk delete failed: ${response.status}` };
}

// ==================== Koofr ====================

async function uploadToKoofr(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  const mountId = config.koofrMountId || 'primary';
  const path = `${config.koofrPath || '/NightmareLibrary'}/${fileId}`;

  const response = await fetch(`https://app.koofr.net/api/v2/mounts/${mountId}/files/put?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.koofrAccessToken}`,
      'Content-Type': contentType
    },
    body: data
  });

  if (response.ok) {
    return {
      success: true,
      storageId: `${mountId}:${path}`,
      url: 'https://app.koofr.net/app/'
    };
  }

  return { success: false, error: `Koofr upload failed: ${response.status}` };
}

async function downloadFromKoofr(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  const [mountId, ...pathParts] = storageId.split(':');
  const path = pathParts.join(':');

  const response = await fetch(`https://app.koofr.net/api/v2/mounts/${mountId}/files/get?path=${encodeURIComponent(path)}`, {
    headers: {
      'Authorization': `Bearer ${config.koofrAccessToken}`
    }
  });

  if (response.ok) {
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    return { success: true, data, contentType };
  }

  return { success: false, error: `Koofr download failed: ${response.status}` };
}

async function deleteFromKoofr(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const [mountId, ...pathParts] = storageId.split(':');
  const path = pathParts.join(':');

  const response = await fetch(`https://app.koofr.net/api/v2/mounts/${mountId}/files/remove?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${config.koofrAccessToken}`
    }
  });

  if (response.ok || response.status === 204) {
    return { success: true };
  }

  return { success: false, error: `Koofr delete failed: ${response.status}` };
}

// ==================== Backblaze B2 ====================

async function uploadToBackblazeB2(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  // Authorize with B2
  const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: {
      'Authorization': `Basic ${btoa(`${config.b2KeyId}:${config.b2ApplicationKey}`)}`
    }
  });

  if (!authResponse.ok) {
    return { success: false, error: `B2 auth failed: ${authResponse.status}` };
  }

  const auth = await authResponse.json() as { 
    authorizationToken: string; 
    apiUrl: string;
    downloadUrl: string;
  };

  // Get upload URL
  const uploadUrlResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      'Authorization': auth.authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bucketId: config.b2BucketId })
  });

  if (!uploadUrlResponse.ok) {
    return { success: false, error: `B2 upload URL failed: ${uploadUrlResponse.status}` };
  }

  const uploadUrl = await uploadUrlResponse.json() as { 
    uploadUrl: string; 
    authorizationToken: string 
  };

  // Calculate SHA1
  const sha1 = await calculateSHA1(data);

  // Upload file
  const response = await fetch(uploadUrl.uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': uploadUrl.authorizationToken,
      'Content-Type': contentType,
      'Content-Length': String(data.byteLength),
      'X-Bz-File-Name': encodeURIComponent(fileId),
      'X-Bz-Content-Sha1': sha1
    },
    body: data
  });

  if (response.ok) {
    const result = await response.json() as { fileId: string; fileName: string };
    return {
      success: true,
      storageId: result.fileId,
      url: `${auth.downloadUrl}/file/${config.b2BucketName}/${fileId}`
    };
  }

  return { success: false, error: `B2 upload failed: ${response.status}` };
}

async function downloadFromBackblazeB2(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  // Authorize first
  const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: {
      'Authorization': `Basic ${btoa(`${config.b2KeyId}:${config.b2ApplicationKey}`)}`
    }
  });

  if (!authResponse.ok) {
    return { success: false, error: `B2 auth failed: ${authResponse.status}` };
  }

  const auth = await authResponse.json() as { 
    authorizationToken: string;
    downloadUrl: string;
  };

  const response = await fetch(`${auth.downloadUrl}/b2api/v2/b2_download_file_by_id?fileId=${storageId}`, {
    headers: {
      'Authorization': auth.authorizationToken
    }
  });

  if (response.ok) {
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    return { success: true, data, contentType };
  }

  return { success: false, error: `B2 download failed: ${response.status}` };
}

async function deleteFromBackblazeB2(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  // Authorize first
  const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: {
      'Authorization': `Basic ${btoa(`${config.b2KeyId}:${config.b2ApplicationKey}`)}`
    }
  });

  if (!authResponse.ok) {
    return { success: false, error: `B2 auth failed: ${authResponse.status}` };
  }

  const auth = await authResponse.json() as { 
    authorizationToken: string;
    apiUrl: string;
  };

  // Get file info to get the fileName
  const infoResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_file_info`, {
    method: 'POST',
    headers: {
      'Authorization': auth.authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileId: storageId })
  });

  if (!infoResponse.ok) {
    return { success: false, error: `B2 get info failed: ${infoResponse.status}` };
  }

  const fileInfo = await infoResponse.json() as { fileName: string };

  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
    method: 'POST',
    headers: {
      'Authorization': auth.authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileId: storageId,
      fileName: fileInfo.fileName
    })
  });

  if (response.ok) {
    return { success: true };
  }

  return { success: false, error: `B2 delete failed: ${response.status}` };
}

// ==================== Mega.nz ====================

async function uploadToMega(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<StorageResult> {
  // Note: Mega.nz requires complex encryption - this is a simplified version
  // For full implementation, use the megajs library or similar
  
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

  // Note: Actual Mega upload requires client-side encryption
  // This is a placeholder - full implementation would need encryption logic
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

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function calculateSHA1(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get cascading storage configs from environment
 * Supports 10 providers with automatic failover
 */
export function getStorageConfigs(env: Record<string, string>): StorageConfig[] {
  const configs: StorageConfig[] = [];

  // 1. Google Drive (priority: 1)
  if (env.GDRIVE_ACCESS_TOKEN) {
    configs.push({
      type: 'gdrive',
      priority: 1,
      gdriveAccessToken: env.GDRIVE_ACCESS_TOKEN,
      gdriveFolderId: env.GDRIVE_FOLDER_ID
    });
  }

  // 2. Dropbox (priority: 2)
  if (env.DROPBOX_ACCESS_TOKEN) {
    configs.push({
      type: 'dropbox',
      priority: 2,
      dropboxAccessToken: env.DROPBOX_ACCESS_TOKEN,
      dropboxPath: env.DROPBOX_PATH
    });
  }

  // 3. OneDrive (priority: 3)
  if (env.ONEDRIVE_ACCESS_TOKEN) {
    configs.push({
      type: 'onedrive',
      priority: 3,
      onedriveAccessToken: env.ONEDRIVE_ACCESS_TOKEN,
      onedriveFolderId: env.ONEDRIVE_FOLDER_ID
    });
  }

  // 4. pCloud (priority: 4)
  if (env.PCLOUD_ACCESS_TOKEN) {
    configs.push({
      type: 'pcloud',
      priority: 4,
      pcloudAccessToken: env.PCLOUD_ACCESS_TOKEN,
      pcloudFolderId: env.PCLOUD_FOLDER_ID
    });
  }

  // 5. Box (priority: 5)
  if (env.BOX_ACCESS_TOKEN) {
    configs.push({
      type: 'box',
      priority: 5,
      boxAccessToken: env.BOX_ACCESS_TOKEN,
      boxFolderId: env.BOX_FOLDER_ID
    });
  }

  // 6. Yandex Disk (priority: 6)
  if (env.YANDEX_ACCESS_TOKEN) {
    configs.push({
      type: 'yandex',
      priority: 6,
      yandexAccessToken: env.YANDEX_ACCESS_TOKEN,
      yandexPath: env.YANDEX_PATH
    });
  }

  // 7. Koofr (priority: 7)
  if (env.KOOFR_ACCESS_TOKEN) {
    configs.push({
      type: 'koofr',
      priority: 7,
      koofrAccessToken: env.KOOFR_ACCESS_TOKEN,
      koofrMountId: env.KOOFR_MOUNT_ID,
      koofrPath: env.KOOFR_PATH
    });
  }

  // 8. Backblaze B2 (priority: 8)
  if (env.B2_KEY_ID && env.B2_APPLICATION_KEY && env.B2_BUCKET_ID) {
    configs.push({
      type: 'b2',
      priority: 8,
      b2KeyId: env.B2_KEY_ID,
      b2ApplicationKey: env.B2_APPLICATION_KEY,
      b2BucketId: env.B2_BUCKET_ID,
      b2BucketName: env.B2_BUCKET_NAME
    });
  }

  // 9. Mega.nz (priority: 9, single free account)
  if (env.MEGA_EMAIL && env.MEGA_PASSWORD) {
    configs.push({
      type: 'mega',
      priority: 9,
      megaEmail: env.MEGA_EMAIL,
      megaPassword: env.MEGA_PASSWORD,
      megaFolderId: env.MEGA_FOLDER_ID
    });
  }

  // 10. GitHub (priority: 10, always last as fallback with 4GB limit)
  if (env.GITHUB_TOKEN && env.GITHUB_OWNER) {
    configs.push({
      type: 'github',
      priority: 10,
      githubToken: env.GITHUB_TOKEN,
      githubOwner: env.GITHUB_OWNER,
      githubRepo: env.GITHUB_REPO || 'nightmare-library-storage'
    });
  }

  return configs;
}

/**
 * Get provider health status
 */
export function getProviderHealthStatus(): Record<StorageType, ProviderHealth> {
  const status: Partial<Record<StorageType, ProviderHealth>> = {};
  for (const [type, health] of providerHealth) {
    status[type] = health;
  }
  return status as Record<StorageType, ProviderHealth>;
}
