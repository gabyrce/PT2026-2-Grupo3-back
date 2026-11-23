import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

export function storeImageDirectory(): string {
  return join(process.cwd(), 'uploads', 'lojas');
}

export function storeImageUrl(filename: string): string {
  return `/uploads/lojas/${filename}`;
}

export async function removeStoredStoreImage(url: string): Promise<void> {
  if (!/^\/uploads\/lojas\/[0-9a-f-]+\.(jpg|png|webp)$/.test(url)) {
    return;
  }

  const filename = url.split('/').at(-1)!;

  try {
    await unlink(join(storeImageDirectory(), filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}