import { PrismaClient } from '@prisma/client';
import { access, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL?.trim();

  if (!email) {
    throw new Error(
      'Informe SEED_OWNER_EMAIL com o e-mail de um usuário já cadastrado.',
    );
  }

  const dono = await prisma.usuario.findUnique({ where: { email } });

  if (!dono) {
    throw new Error('Não existe usuário cadastrado com o e-mail informado.');
  }

  const origem = join(
    process.cwd(),
    'prisma',
    'seed-assets',
    'comp-lenovo.png',
  );
  const pasta = join(process.cwd(), 'uploads', 'products');
  const destino = join(pasta, 'comp-lenovo-seed.png');
  const imageUrl = '/uploads/products/comp-lenovo-seed.png';

  await access(origem);

  const eletronicos =
    (await prisma.categorias.findFirst({
      where: { nome: 'Eletrônicos', categoria_principal_id: null },
    })) ?? (await prisma.categorias.create({ data: { nome: 'Eletrônicos' } }));

  const notebooks =
    (await prisma.categorias.findFirst({
      where: { nome: 'Notebooks', categoria_principal_id: eletronicos.id },
    })) ??
    (await prisma.categorias.create({
      data: { nome: 'Notebooks', categoria_principal_id: eletronicos.id },
    }));

  const loja =
    (await prisma.lojas.findFirst({
      where: { nome: 'Repiit', usuario_id: dono.id },
    })) ??
    (await prisma.lojas.create({
      data: {
        nome: 'Repiit',
        usuario_id: dono.id,
        categoria_id: eletronicos.id,
        logo_url: '/lojas/repiit.png',
      },
    }));

  const produto =
    (await prisma.produtos.findFirst({
      where: { nome: 'Comp. Lenovo', loja_id: loja.id },
    })) ??
    (await prisma.produtos.create({
      data: {
        nome: 'Comp. Lenovo',
        loja_id: loja.id,
        categoria_id: notebooks.id,
        preco: 3899.99,
        stock: 10,
      },
    }));

  await mkdir(pasta, { recursive: true });
  await copyFile(origem, destino);

  const imagem = await prisma.imagensProduto.findFirst({
    where: { produto_id: produto.id, image_url: imageUrl },
  });

  if (!imagem) {
    await prisma.imagensProduto.create({
      data: { produto_id: produto.id, image_url: imageUrl, pedido: 1 },
    });
  }

  console.log(`Exemplo pronto: loja ${loja.id}, produto ${produto.id}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
