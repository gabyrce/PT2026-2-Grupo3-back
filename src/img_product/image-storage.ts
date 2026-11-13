import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

export function productImageDirectory(): string {
  return join(process.cwd(), 'uploads', 'products');
}

export function productImageUrl(filename: string): string {
  return `/uploads/products/${filename}`;
}

export async function removeStoredProductImage(url: string): Promise<void> {
  if (!/^\/uploads\/products\/[0-9a-f-]+\.(jpg|png|webp)$/.test(url)) {
    return;
  }

  const filename = url.split('/').at(-1)!;

  try {
    await unlink(join(productImageDirectory(), filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
