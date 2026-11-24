import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

// Execute depois do seed-catalogo.ts, usando o e-mail do dono das lojas criadas.
// Prévia (não altera o banco):
// SEED_OWNER_EMAIL='seu@email.com' npx ts-node --transpile-only prisma/seed-avaliacoes.ts
// Gravação no SQLite local:
// SEED_OWNER_EMAIL='seu@email.com' npx ts-node --transpile-only prisma/seed-avaliacoes.ts --apply
// Os clientes de demonstração recebem senhas aleatórias; seus IDs variam entre bancos.

const prisma = new PrismaClient();

// As contas deixam claro que estas avaliações são exemplos para a demonstração.
const clientes = [
  {
    chave: 'cliente1',
    nome: 'Cliente Demonstração 1',
    username: 'cliente_demo_stockio_1',
    email: 'cliente.demo1@stockio.invalid',
  },
  {
    chave: 'cliente2',
    nome: 'Cliente Demonstração 2',
    username: 'cliente_demo_stockio_2',
    email: 'cliente.demo2@stockio.invalid',
  },
] as const;

const avaliacoesLojas = [
  { cliente: 'cliente1', loja: 'CJR', nota: 5, texto: 'Os produtos vieram bem embalados e a descrição ajudou na escolha.' },
  { cliente: 'cliente2', loja: 'MauMau Hortifruti', nota: 5, texto: 'Gostei da variedade e encontrei frutas frescas com facilidade.' },
  { cliente: 'cliente1', loja: 'Rare Beauty', nota: 4, texto: 'A loja apresenta bem os produtos e as opções são fáceis de encontrar.' },
  { cliente: 'cliente2', loja: 'Hobby', nota: 5, texto: 'Boa seleção de produtos para jogos e acessórios.' },
  { cliente: 'cliente1', loja: 'Repiit', nota: 4, texto: 'Consegui comparar os eletrônicos e encontrar o que procurava.' },
] as const;

const avaliacoesProdutos = [
  { cliente: 'cliente2', loja: 'CJR', produto: 'Brownie Meio Amargo', nota: 5, texto: 'Gostei da textura e do sabor do chocolate meio amargo.' },
  { cliente: 'cliente1', loja: 'MauMau Hortifruti', produto: 'Banana', nota: 4, texto: 'As bananas estavam maduras e em boas condições.' },
  { cliente: 'cliente2', loja: 'Rare Beauty', produto: 'Blush', nota: 5, texto: 'A cor ficou bonita e foi fácil de espalhar.' },
  { cliente: 'cliente1', loja: 'Mélina Couture', produto: 'Saia', nota: 4, texto: 'O tecido é confortável e o caimento ficou bom.' },
  { cliente: 'cliente2', loja: 'Hobby', produto: 'Headset Gamer', nota: 4, texto: 'O áudio é claro e o headset é confortável durante o uso.' },
  { cliente: 'cliente1', loja: 'Repiit', produto: 'Comp. Samsung', nota: 5, texto: 'O computador atende bem às tarefas do dia a dia.' },
] as const;

async function main() {
  const emailDono = process.env.SEED_OWNER_EMAIL?.trim();
  if (!emailDono) {
    throw new Error('Informe SEED_OWNER_EMAIL com o e-mail do dono das lojas do catálogo.');
  }

  const dono = await prisma.usuario.findUnique({ where: { email: emailDono } });
  if (!dono) {
    throw new Error('Não existe usuário cadastrado com o e-mail informado.');
  }

  const lojas = await prisma.lojas.findMany({
    where: { usuario_id: dono.id },
    select: { id: true, nome: true },
  });
  const produtos = await prisma.produtos.findMany({
    where: { loja_id: { in: lojas.map((loja) => loja.id) } },
    select: { id: true, nome: true, loja_id: true },
  });

  // Confere todos os destinos antes de criar qualquer registro.
  const lojaIdPorNome = new Map<string, number>();
  for (const avaliacao of [...avaliacoesLojas, ...avaliacoesProdutos]) {
    const encontradas = lojas.filter((loja) => loja.nome === avaliacao.loja);
    if (encontradas.length !== 1) {
      throw new Error(`A loja ${avaliacao.loja} não foi encontrada de forma única para este dono.`);
    }
    lojaIdPorNome.set(avaliacao.loja, encontradas[0].id);
  }

  const produtoIdPorLojaENome = new Map<string, number>();
  for (const avaliacao of avaliacoesProdutos) {
    const lojaId = lojaIdPorNome.get(avaliacao.loja)!;
    const encontrados = produtos.filter(
      (produto) => produto.loja_id === lojaId && produto.nome === avaliacao.produto,
    );
    if (encontrados.length !== 1) {
      throw new Error(`O produto ${avaliacao.produto} não foi encontrado de forma única na loja ${avaliacao.loja}.`);
    }
    produtoIdPorLojaENome.set(`${lojaId}:${avaliacao.produto}`, encontrados[0].id);
  }

  if (!process.argv.includes('--apply')) {
    console.log(`Prévia: ${clientes.length} clientes de demonstração, ${avaliacoesLojas.length} avaliações de lojas e ${avaliacoesProdutos.length} avaliações de produtos. Nada foi gravado no banco.`);
    return;
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const clienteIdPorChave = new Map<string, number>();
    let clientesCriados = 0;
    let lojasAvaliadas = 0;
    let produtosAvaliados = 0;

    for (const cliente of clientes) {
      const existente = await tx.usuario.findUnique({ where: { email: cliente.email } });
      if (existente && existente.username !== cliente.username) {
        throw new Error(`O e-mail de demonstração ${cliente.email} pertence a outra conta.`);
      }

      const usuario = existente ?? await tx.usuario.create({
        data: {
          nome: cliente.nome,
          username: cliente.username,
          email: cliente.email,
          senhaHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
        },
      });
      if (!existente) clientesCriados++;
      clienteIdPorChave.set(cliente.chave, usuario.id);
    }

    for (const avaliacao of avaliacoesLojas) {
      const usuarioId = clienteIdPorChave.get(avaliacao.cliente)!;
      const lojaId = lojaIdPorNome.get(avaliacao.loja)!;
      const existente = await tx.avaliacaoLojas.findFirst({
        where: { usuario_id: usuarioId, loja_id: lojaId },
      });
      if (existente) continue;

      await tx.avaliacaoLojas.create({
        data: { usuario_id: usuarioId, loja_id: lojaId, nota: avaliacao.nota, comentario: avaliacao.texto },
      });
      lojasAvaliadas++;
    }

    for (const avaliacao of avaliacoesProdutos) {
      const usuarioId = clienteIdPorChave.get(avaliacao.cliente)!;
      const lojaId = lojaIdPorNome.get(avaliacao.loja)!;
      const produtoId = produtoIdPorLojaENome.get(`${lojaId}:${avaliacao.produto}`)!;
      const existente = await tx.avaliacaoProdutos.findFirst({
        where: { usuario_id: usuarioId, produto_id: produtoId },
      });
      if (existente) continue;

      await tx.avaliacaoProdutos.create({
        data: { usuario_id: usuarioId, produto_id: produtoId, nota: avaliacao.nota, comentario: avaliacao.texto },
      });
      produtosAvaliados++;
    }

    return { clientesCriados, lojasAvaliadas, produtosAvaliados };
  });

  console.log(`Avaliações prontas: ${resultado.clientesCriados} clientes, ${resultado.lojasAvaliadas} avaliações de lojas e ${resultado.produtosAvaliados} avaliações de produtos adicionados.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
