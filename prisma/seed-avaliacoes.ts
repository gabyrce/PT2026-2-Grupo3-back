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
  { cliente: 'cliente2', loja: 'CJR', nota: 4, texto: 'Achei os brownies com facilidade. Gostaria de ver mais informações sobre os sabores.' },
  { cliente: 'cliente1', loja: "D'Carts & Baskets", nota: 5, texto: 'A loja tem uma seleção interessante de produtos para montar uma cesta.' },
  { cliente: 'cliente2', loja: "D'Carts & Baskets", nota: 4, texto: 'Gostei da proposta, mas senti falta de mais opções no catálogo.' },
  { cliente: 'cliente1', loja: 'MauMau Hortifruti', nota: 4, texto: 'Os produtos parecem bem escolhidos. A navegação pela loja foi simples.' },
  { cliente: 'cliente1', loja: 'Creamy', nota: 5, texto: 'Encontrei os produtos de cuidado facial que estava procurando sem dificuldade.' },
  { cliente: 'cliente2', loja: 'Creamy', nota: 4, texto: 'Gostei da apresentação dos produtos; poderia ter mais detalhes sobre como usar cada um.' },
  { cliente: 'cliente2', loja: 'Rare Beauty', nota: 5, texto: 'As cores dos produtos chamaram minha atenção e as fotos ajudam a comparar.' },
  { cliente: 'cliente1', loja: 'Roots', nota: 4, texto: 'Gostei de encontrar as informações do produto logo na página da loja.' },
  { cliente: 'cliente2', loja: 'Roots', nota: 5, texto: 'A loja é fácil de explorar e o catálogo tem uma apresentação agradável.' },
  { cliente: 'cliente1', loja: 'Mélina Couture', nota: 5, texto: 'Gostei das peças e das fotos; dá para ter uma boa ideia dos detalhes.' },
  { cliente: 'cliente2', loja: 'Mélina Couture', nota: 4, texto: 'As roupas são bonitas. Seria útil ver mais medidas nas descrições.' },
  { cliente: 'cliente1', loja: 'Footshop', nota: 4, texto: 'Encontrei os calçados rapidamente e gostei das opções mostradas.' },
  { cliente: 'cliente2', loja: 'Footshop', nota: 5, texto: 'As fotos ajudam bastante na hora de escolher entre os modelos.' },
  { cliente: 'cliente1', loja: 'Bersay', nota: 4, texto: 'Foi fácil encontrar o celular e conferir o preço antes de decidir.' },
  { cliente: 'cliente2', loja: 'Bersay', nota: 5, texto: 'Página organizada e produto apresentado de um jeito claro.' },
  { cliente: 'cliente1', loja: 'Hobby', nota: 4, texto: 'Gostei da seleção, especialmente dos acessórios. Queria ver mais modelos.' },
  { cliente: 'cliente2', loja: 'Repiit', nota: 5, texto: 'Achei os notebooks e a TV sem precisar procurar muito.' },
] as const;

const avaliacoesProdutos = [
  { cliente: 'cliente2', loja: 'CJR', produto: 'Brownie Meio Amargo', nota: 5, texto: 'Gostei da textura e do sabor do chocolate meio amargo.' },
  { cliente: 'cliente1', loja: 'MauMau Hortifruti', produto: 'Banana', nota: 4, texto: 'As bananas estavam maduras e em boas condições.' },
  { cliente: 'cliente2', loja: 'Rare Beauty', produto: 'Blush', nota: 5, texto: 'A cor ficou bonita e foi fácil de espalhar.' },
  { cliente: 'cliente1', loja: 'Mélina Couture', produto: 'Saia', nota: 4, texto: 'O tecido é confortável e o caimento ficou bom.' },
  { cliente: 'cliente2', loja: 'Hobby', produto: 'Headset Gamer', nota: 4, texto: 'O áudio é claro e o headset é confortável durante o uso.' },
  { cliente: 'cliente1', loja: 'Repiit', produto: 'Comp. Samsung', nota: 5, texto: 'O computador atende bem às tarefas do dia a dia.' },
  { cliente: 'cliente1', loja: 'CJR', produto: 'Brownie Meio Amargo', nota: 4, texto: 'O chocolate é marcante sem ficar enjoativo. Eu só queria uma porção um pouco maior.' },
  { cliente: 'cliente1', loja: 'CJR', produto: 'Brownie Trad.', nota: 5, texto: 'Macio por dentro e com sabor de brownie caseiro. Compraria de novo.' },
  { cliente: 'cliente2', loja: 'CJR', produto: 'Brownie Trad.', nota: 4, texto: 'Gostei bastante do sabor; ficou ainda melhor com café.' },
  { cliente: 'cliente1', loja: 'CJR', produto: 'Brownie Doce L.', nota: 4, texto: 'O recheio é bem doce, do jeito que eu esperava. Uma unidade já mata a vontade.' },
  { cliente: 'cliente2', loja: 'CJR', produto: 'Brownie Doce L.', nota: 5, texto: 'A combinação do brownie com doce de leite ficou muito boa.' },
  { cliente: 'cliente1', loja: 'CJR', produto: 'Brownie Nozes', nota: 5, texto: 'As nozes dão uma crocância boa e combinam com o chocolate.' },
  { cliente: 'cliente2', loja: 'CJR', produto: 'Brownie Nozes', nota: 4, texto: 'Gostei da textura. Para mim, podia ter um pouco mais de nozes.' },
  { cliente: 'cliente1', loja: 'CJR', produto: 'Brownie Cookies', nota: 4, texto: 'Tem uma textura diferente do brownie tradicional e ficou gostoso.' },
  { cliente: 'cliente2', loja: 'CJR', produto: 'Brownie Cookies', nota: 5, texto: 'A mistura de cookie e brownie foi a minha favorita até agora.' },
  { cliente: 'cliente1', loja: 'CJR', produto: 'Brownie M&Ms', nota: 5, texto: 'Colorido e bem chocolatudo. Fez sucesso aqui em casa.' },
  { cliente: 'cliente2', loja: 'CJR', produto: 'Brownie M&Ms', nota: 4, texto: 'É mais doce que os outros sabores, mas gostei da cobertura.' },
  { cliente: 'cliente1', loja: "D'Carts & Baskets", produto: 'Nozes', nota: 5, texto: 'Vieram crocantes e foram ótimas para colocar na salada.' },
  { cliente: 'cliente2', loja: "D'Carts & Baskets", produto: 'Nozes', nota: 4, texto: 'Gostei da qualidade. A quantidade serviu bem para uma receita.' },
  { cliente: 'cliente2', loja: 'MauMau Hortifruti', produto: 'Banana', nota: 5, texto: 'Vieram no ponto para comer ao longo da semana, sem partes machucadas.' },
  { cliente: 'cliente1', loja: 'MauMau Hortifruti', produto: 'Limão Siciliano', nota: 5, texto: 'Bem aromático. Usei as raspas e o suco numa receita.' },
  { cliente: 'cliente2', loja: 'MauMau Hortifruti', produto: 'Limão Siciliano', nota: 4, texto: 'Gostei do frescor; os frutos chegaram em bom estado.' },
  { cliente: 'cliente1', loja: 'Creamy', produto: 'Limpador Facial', nota: 4, texto: 'Limpou bem sem deixar minha pele repuxando.' },
  { cliente: 'cliente2', loja: 'Creamy', produto: 'Limpador Facial', nota: 5, texto: 'Uso à noite e gosto da sensação leve depois de enxaguar.' },
  { cliente: 'cliente1', loja: 'Rare Beauty', produto: 'Blush', nota: 4, texto: 'É bem pigmentado; uma gotinha já rende bastante.' },
  { cliente: 'cliente1', loja: 'Creamy', produto: 'Sérum Facial', nota: 5, texto: 'Espalha fácil e não deixou sensação pegajosa na minha pele.' },
  { cliente: 'cliente2', loja: 'Creamy', produto: 'Sérum Facial', nota: 4, texto: 'Gostei da textura. Ainda estou usando há pouco tempo para avaliar o resultado.' },
  { cliente: 'cliente1', loja: 'Rare Beauty', produto: 'Iluminador', nota: 4, texto: 'Deixa um brilho bonito sem parecer exagerado.' },
  { cliente: 'cliente2', loja: 'Rare Beauty', produto: 'Iluminador', nota: 5, texto: 'Fácil de aplicar e dá para construir o brilho aos poucos.' },
  { cliente: 'cliente1', loja: 'Roots', produto: 'Body Splash', nota: 4, texto: 'Cheiro agradável para usar no dia a dia, mas em mim dura poucas horas.' },
  { cliente: 'cliente2', loja: 'Roots', produto: 'Body Splash', nota: 5, texto: 'Gostei do perfume leve, principalmente para dias quentes.' },
  { cliente: 'cliente2', loja: 'Mélina Couture', produto: 'Saia', nota: 5, texto: 'Gostei do movimento da peça e achei fácil combinar com outras roupas.' },
  { cliente: 'cliente1', loja: 'Footshop', produto: 'New Balance', nota: 5, texto: 'Tênis confortável para caminhar e fácil de combinar.' },
  { cliente: 'cliente2', loja: 'Footshop', produto: 'New Balance', nota: 4, texto: 'Gostei do visual e do apoio nos pés. Precisei ajustar bem o cadarço.' },
  { cliente: 'cliente1', loja: 'Footshop', produto: 'Bota', nota: 4, texto: 'A bota é bonita e parece firme. No começo ficou um pouco rígida.' },
  { cliente: 'cliente2', loja: 'Footshop', produto: 'Bota', nota: 5, texto: 'Gostei do acabamento e usei por algumas horas sem desconforto.' },
  { cliente: 'cliente1', loja: 'Mélina Couture', produto: 'Bolsa', nota: 5, texto: 'Tem espaço para o essencial e as alças são confortáveis.' },
  { cliente: 'cliente2', loja: 'Mélina Couture', produto: 'Bolsa', nota: 4, texto: 'Achei bonita e prática. Uma divisória interna a mais seria ótima.' },
  { cliente: 'cliente1', loja: 'Mélina Couture', produto: 'Calça Jeans', nota: 4, texto: 'O jeans é confortável e a modelagem ficou boa para mim.' },
  { cliente: 'cliente2', loja: 'Mélina Couture', produto: 'Calça Jeans', nota: 5, texto: 'Gostei do caimento e da cor; já usei em várias combinações.' },
  { cliente: 'cliente1', loja: 'Repiit', produto: 'Comp. Lenovo', nota: 4, texto: 'Atende bem para estudar e navegar. Gostei do teclado.' },
  { cliente: 'cliente2', loja: 'Repiit', produto: 'Comp. Lenovo', nota: 5, texto: 'Liga rápido e dá conta das tarefas que faço todos os dias.' },
  { cliente: 'cliente2', loja: 'Repiit', produto: 'Comp. Samsung', nota: 4, texto: 'Gostei da tela e do desempenho para trabalhar. Achei o preço um pouco alto.' },
  { cliente: 'cliente1', loja: 'Bersay', produto: 'Iphone 15', nota: 5, texto: 'A câmera é ótima para fotos do dia a dia e o aparelho responde rápido.' },
  { cliente: 'cliente2', loja: 'Bersay', produto: 'Iphone 15', nota: 4, texto: 'Gostei do tamanho e da tela. Senti falta de mais opções de cor.' },
  { cliente: 'cliente1', loja: 'Repiit', produto: 'Smart Tv Philips', nota: 4, texto: 'Boa imagem para filmes e o menu foi fácil de entender.' },
  { cliente: 'cliente2', loja: 'Repiit', produto: 'Smart Tv Philips', nota: 5, texto: 'O som e a imagem me agradaram, especialmente para séries.' },
  { cliente: 'cliente1', loja: 'Hobby', produto: 'Xbox Series X', nota: 5, texto: 'Os jogos carregam rápido e o console ficou silencioso aqui.' },
  { cliente: 'cliente2', loja: 'Hobby', produto: 'Xbox Series X', nota: 4, texto: 'Gostei do desempenho, mas ele ocupa mais espaço do que eu esperava.' },
  { cliente: 'cliente1', loja: 'Hobby', produto: 'Headset Gamer', nota: 5, texto: 'O microfone ficou nítido nas chamadas e não apertou minha cabeça.' },
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
