import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const prisma = new PrismaClient();
const pastaDados = join(process.cwd(), 'prisma', 'seed-assets', 'catalogo');
const categorias = [
  'Mercado',
  'Farmácia',
  'Beleza',
  'Moda',
  'Eletrônicos',
  'Jogos',
  'Brinquedos',
  'Casa',
];
const subcategoriasEletronicos = [
  'Celulares',
  'Notebooks',
  'TVs',
  'Acessórios',
  'Outros',
];

type ProdutoSeed = {
  nome: string;
  preco: string;
  stock: number;
  categoria: string;
  nomeLoja: string;
  descricao: string | null;
  imagens: string[];
  logoLoja: string;
};

function precoEmNumero(preco: string): number {
  return Number(preco.replace('R$', '').replaceAll('.', '').replace(',', '.').trim());
}

async function salvarImagem(caminho: string): Promise<string> {
  const origem = join(pastaDados, caminho.slice(1));
  const conteudo = await readFile(origem);
  const hash = createHash('sha256').update(conteudo).digest('hex');
  const nome = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}${extname(caminho)}`;
  const pasta = caminho.startsWith('/lojas/') ? 'lojas' : 'products';
  const destino = join(process.cwd(), 'uploads', pasta);

  await mkdir(destino, { recursive: true });
  try {
    await copyFile(origem, join(destino, nome), constants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }

  return `/uploads/${pasta}/${nome}`;
}

async function main() {
  const produtos = JSON.parse(
    await readFile(join(pastaDados, 'produtos.json'), 'utf8'),
  ) as ProdutoSeed[];

  // Confere todos os arquivos antes de alterar o banco.
  for (const produto of produtos) {
    if (![...categorias, ...subcategoriasEletronicos].some((nome) => nome.toLowerCase() === produto.categoria)) {
      throw new Error(`Categoria desconhecida: ${produto.categoria}`);
    }
    if (produto.imagens.length === 0 || produto.imagens.length > 4) {
      throw new Error(`${produto.nome} precisa ter entre 1 e 4 imagens.`);
    }
    if (!Number.isFinite(precoEmNumero(produto.preco)) || precoEmNumero(produto.preco) <= 0) {
      throw new Error(`Preço inválido: ${produto.nome}`);
    }
    if (!Number.isInteger(produto.stock) || produto.stock < 0) {
      throw new Error(`Estoque inválido: ${produto.nome}`);
    }
    for (const imagem of [...produto.imagens, produto.logoLoja]) {
      if (!/^\/(produtos|lojas)\/[a-z0-9-]+\.(png|jpg|jpeg|webp)$/.test(imagem)) {
        throw new Error(`Caminho de imagem inválido: ${imagem}`);
      }
      await access(join(pastaDados, imagem.slice(1)));
    }
  }

  if (!process.argv.includes('--apply')) {
    const lojas = new Set(produtos.map((produto) => produto.nomeLoja));
    console.log(`Prévia: ${categorias.length} categorias principais, ${subcategoriasEletronicos.length} subcategorias, ${lojas.size} lojas e ${produtos.length} produtos. Nada foi gravado no banco.`);
    return;
  }

  const email = process.env.SEED_OWNER_EMAIL?.trim();
  if (!email) {
    throw new Error('Informe SEED_OWNER_EMAIL com o e-mail do dono das lojas.');
  }

  const dono = await prisma.usuario.findUnique({ where: { email } });
  if (!dono) {
    throw new Error(`Não existe usuário cadastrado com o e-mail ${email}.`);
  }

  const categoriasPorNome = new Map<string, number>();
  for (const nome of categorias) {
    const existente = await prisma.categorias.findFirst({
      where: { nome, categoria_principal_id: null },
    });
    const categoria = existente ?? await prisma.categorias.create({ data: { nome } });
    categoriasPorNome.set(nome.toLowerCase(), categoria.id);
  }
  const eletronicosId = categoriasPorNome.get('eletrônicos')!;
  for (const nome of subcategoriasEletronicos) {
    const existente = await prisma.categorias.findFirst({
      where: { nome, categoria_principal_id: eletronicosId },
    });
    const categoria = existente ?? await prisma.categorias.create({
      data: { nome, categoria_principal_id: eletronicosId },
    });
    categoriasPorNome.set(nome.toLowerCase(), categoria.id);
  }

  const lojasPorNome = new Map<string, number>();
  let lojasCriadas = 0;
  let produtosCriados = 0;
  let imagensCriadas = 0;

  for (const produto of produtos) {
    const categoriaId = categoriasPorNome.get(produto.categoria)!;
    const categoriaLojaId = subcategoriasEletronicos.some((nome) => nome.toLowerCase() === produto.categoria)
      ? eletronicosId
      : categoriaId;
    let lojaId = lojasPorNome.get(produto.nomeLoja);

    if (!lojaId) {
      const existente = await prisma.lojas.findFirst({
        where: { nome: produto.nomeLoja, usuario_id: dono.id },
      });
      if (existente) {
        lojaId = existente.id;
        if (existente.categoria_id !== categoriaLojaId) {
          console.warn(`A loja ${produto.nomeLoja} já existe em outra categoria; ela será mantida como está.`);
        }
      } else {
        const logoUrl = await salvarImagem(produto.logoLoja);
        const loja = await prisma.lojas.create({
          data: {
            nome: produto.nomeLoja,
            usuario_id: dono.id,
            categoria_id: categoriaLojaId,
            logo_url: logoUrl,
          },
        });
        lojaId = loja.id;
        lojasCriadas++;
      }
      lojasPorNome.set(produto.nomeLoja, lojaId);
    }

    const existente = await prisma.produtos.findFirst({
      where: { nome: produto.nome, loja_id: lojaId },
    });
    const registro = existente ?? await prisma.produtos.create({
      data: {
        nome: produto.nome,
        loja_id: lojaId,
        categoria_id: categoriaId,
        descricao: produto.descricao,
        preco: precoEmNumero(produto.preco),
        stock: produto.stock,
      },
    });
    if (!existente) produtosCriados++;

    const imagensExistentes = await prisma.imagensProduto.findMany({
      where: { produto_id: registro.id },
    });
    const urlsExistentes = new Set(imagensExistentes.map((item) => item.image_url));
    let quantidadeImagens = imagensExistentes.length;
    let proximoPedido = Math.max(0, ...imagensExistentes.map((item) => item.pedido)) + 1;
    for (const imagem of produto.imagens) {
      if (quantidadeImagens >= 4) break;
      const imageUrl = await salvarImagem(imagem);
      if (urlsExistentes.has(imageUrl)) continue;
      await prisma.imagensProduto.create({
        data: { produto_id: registro.id, image_url: imageUrl, pedido: proximoPedido },
      });
      urlsExistentes.add(imageUrl);
      quantidadeImagens++;
      proximoPedido++;
      imagensCriadas++;
    }
  }

  console.log(`Catálogo pronto: ${lojasCriadas} lojas, ${produtosCriados} produtos e ${imagensCriadas} imagens adicionados.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
