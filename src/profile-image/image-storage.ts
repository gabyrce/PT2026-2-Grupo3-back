import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

export function profileImageDirectory(): string {
  return join(process.cwd(), 'uploads', 'profiles');
}

export function profileImageUrl(filename: string): string {
  return `/uploads/profiles/${filename}`;
}

export async function removeStoredProfileImage(url: string): Promise<void> {
  if (!/^\/uploads\/profiles\/[0-9a-f-]+\.(jpg|png|webp)$/.test(url)) {
    return;
  }

  const filename = url.split('/').at(-1)!;

  try {
    await unlink(join(profileImageDirectory(), filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
