import { Platform } from 'react-native';

import { apiFetch } from './fetch';

export type FileUploadResult = {
  fileOriginalName: string;
  fileSize: number;
  filePath: string;
  fileExtensionName: string;
};

function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function fileNameFromUri(uri: string): string {
  const parts = uri.split(/[/\\]/);
  const last = parts.at(-1)?.split('?')[0];
  if (last?.includes('.')) return last;
  return `image_${Date.now()}.jpg`;
}

function parseUploadResponse(json: unknown): FileUploadResult | null {
  const root = json as { code?: string; data?: unknown };
  if (root?.code !== 'SUC001' || root.data == null || typeof root.data !== 'object') {
    return null;
  }
  const d = root.data as Record<string, unknown>;
  const filePath = typeof d.filePath === 'string' ? d.filePath.trim() : '';
  if (!filePath) return null;
  const fileOriginalName =
    typeof d.fileOriginalName === 'string' ? d.fileOriginalName : String(d.fileOriginalName ?? '');
  const fileExtensionName =
    typeof d.fileExtensionName === 'string' ? d.fileExtensionName : String(d.fileExtensionName ?? '');
  return {
    fileOriginalName,
    fileSize: typeof d.fileSize === 'number' ? d.fileSize : Number(d.fileSize) || 0,
    filePath,
    fileExtensionName,
  };
}

async function appendFileToFormData(
  formData: FormData,
  params: { uri: string; fileName: string; mimeType: string; webFile?: File },
): Promise<void> {
  if (Platform.OS === 'web') {
    if (params.webFile instanceof File) {
      formData.append('file', params.webFile, params.webFile.name || params.fileName);
      return;
    }
    const uri = params.uri.trim();
    if (uri.startsWith('blob:') || uri.startsWith('data:')) {
      const blob = await fetch(uri).then((r) => r.blob());
      formData.append('file', blob, params.fileName);
      return;
    }
    throw new Error('웹에서는 이미지 파일을 선택해 주세요. (URL 탭은 업로드 없이 URL만 저장됩니다)');
  }

  formData.append('file', {
    uri: params.uri,
    name: params.fileName,
    type: params.mimeType,
  } as unknown as Blob);
}

/** multipart/form-data 로 이미지 파일 업로드 */
export async function uploadFile(params: {
  uri: string;
  fileName?: string;
  mimeType?: string;
  webFile?: File;
}): Promise<FileUploadResult> {
  const fileName = params.fileName ?? fileNameFromUri(params.uri);
  const mimeType = params.mimeType ?? guessMimeType(fileName);

  const formData = new FormData();
  await appendFileToFormData(formData, {
    uri: params.uri,
    fileName,
    mimeType,
    webFile: params.webFile,
  });

  const res = await apiFetch('/api/file/upload', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message ?? `파일 업로드 실패 (${res.status})`);
  }
  if (json?.code !== 'SUC001') {
    throw new Error(json?.message ?? '파일 업로드에 실패했습니다.');
  }

  const parsed = parseUploadResponse(json);
  if (!parsed) {
    throw new Error('업로드 응답에서 filePath를 찾을 수 없습니다.');
  }
  return parsed;
}

export function isLocalImageUri(uri: string): boolean {
  const u = uri.trim().toLowerCase();
  return (
    u.startsWith('file:') ||
    u.startsWith('content:') ||
    u.startsWith('ph:') ||
    u.startsWith('assets-library:') ||
    u.startsWith('blob:') ||
    u.startsWith('data:')
  );
}
