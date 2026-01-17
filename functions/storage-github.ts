const GITHUB_MAX_SIZE = 4 * 1024 * 1024 * 1024; // 4GB hard limit per repo

/**
 * Upload file to GitHub with automatic repository rotation when limit is reached
 */
async function uploadToGitHub(
  config: StorageConfig,
  fileId: string,
  data: ArrayBuffer
): Promise<StorageResult> {
  const token = config.githubToken;
  const owner = config.githubOwner;
  let repo = config.githubRepo || 'nightmare-library-storage-1';

  const uploadToRepo = async (currentRepo: string) => {
    const content = btoa(String.fromCharCode(...new Uint8Array(data)));
    const path = `books/${fileId}`;
    
    const response = await fetch(`https://api.github.com/repos/${owner}/${currentRepo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NightmareLibrary'
      },
      body: JSON.stringify({
        message: `Upload book: ${fileId}`,
        content: content
      })
    });

    return response;
  };

  let response = await uploadToRepo(repo);

  // If repo doesn't exist or limit reached, try to rotate
  if (response.status === 404 || response.status === 403 || response.status === 422) {
    for (let i = 1; i <= 100; i++) {
      const nextRepo = `nightmare-library-storage-${i}`;
      const checkRepo = await fetch(`https://api.github.com/repos/${owner}/${nextRepo}`, {
        headers: { 'Authorization': `token ${token}`, 'User-Agent': 'NightmareLibrary' }
      });

      if (checkRepo.status === 404) {
        const createRes = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'NightmareLibrary'
          },
          body: JSON.stringify({ name: nextRepo, private: true })
        });
        if (createRes.ok) {
          repo = nextRepo;
          response = await uploadToRepo(repo);
          break;
        }
      } else if (checkRepo.ok) {
        const repoData = await checkRepo.json() as { size: number };
        if (repoData.size * 1024 < GITHUB_MAX_SIZE) {
          repo = nextRepo;
          response = await uploadToRepo(repo);
          if (response.ok) break;
        }
      }
    }
  }

  if (response.ok) {
    return {
      success: true,
      storageId: `${repo}:${fileId}`,
      url: `https://github.com/${owner}/${repo}/blob/main/books/${fileId}`
    };
  }

  return { success: false, error: `GitHub upload failed: ${response.status}` };
}

/**
 * Download file from GitHub
 */
async function downloadFromGitHub(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; data?: ArrayBuffer; contentType?: string; error?: string }> {
  const [repo, fileId] = storageId.includes(':') ? storageId.split(':') : [config.githubRepo, storageId];
  const response = await fetch(`https://api.github.com/repos/${config.githubOwner}/${repo}/contents/books/${fileId}`, {
    headers: {
      'Authorization': `token ${config.githubToken}`,
      'Accept': 'application/vnd.github.v3.raw',
      'User-Agent': 'NightmareLibrary'
    }
  });

  if (response.ok) {
    const data = await response.arrayBuffer();
    return { success: true, data, contentType: 'application/octet-stream' };
  }
  return { success: false, error: `GitHub download failed: ${response.status}` };
}

/**
 * Delete file from GitHub
 */
async function deleteFromGitHub(
  config: StorageConfig,
  storageId: string
): Promise<{ success: boolean; error?: string }> {
  const [repo, fileId] = storageId.includes(':') ? storageId.split(':') : [config.githubRepo, storageId];
  
  // Get file SHA first
  const getRes = await fetch(`https://api.github.com/repos/${config.githubOwner}/${repo}/contents/books/${fileId}`, {
    headers: {
      'Authorization': `token ${config.githubToken}`,
      'User-Agent': 'NightmareLibrary'
    }
  });

  if (!getRes.ok) return { success: false, error: 'File not found on GitHub' };
  const { sha } = await getRes.json() as { sha: string };

  const response = await fetch(`https://api.github.com/repos/${config.githubOwner}/${repo}/contents/books/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${config.githubToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'NightmareLibrary'
    },
    body: JSON.stringify({
      message: `Delete book: ${fileId}`,
      sha
    })
  });

  return { success: response.ok };
}
