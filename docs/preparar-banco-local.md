# Preparar o banco local para a demonstração

Cada pessoa da equipe precisa executar estes passos **no próprio computador**. O banco `prisma/dev.db` e a pasta `uploads/` são locais e não são enviados ao GitHub. Os arquivos de origem das imagens estão em `prisma/seed-assets/catalogo/`; o seed os copia para `uploads/`.

## 1. Preparar o SQLite e cadastrar o dono

Na pasta raiz do backend, instale as dependências com `npm ci`. Crie o arquivo `.env`, se ainda não existir, e configure `DATABASE_URL="file:./dev.db"`. Preserve outras variáveis que seu ambiente já usa. Depois execute:

```bash
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

Cadastre uma conta pela tela de cadastro do frontend ou por `POST http://localhost:3001/user` com `nome`, `username`, `email` e `senha`. Guarde o **e-mail dessa conta**: os scripts usarão esse usuário como dono das lojas. IDs como `6` ou `10` são apenas exemplos de um banco específico e podem mudar em outro computador.

Os próximos comandos devem ser executados na raiz do backend. Substitua `seu-email@exemplo.com` pelo e-mail da conta cadastrada.

## 2. Carregar categorias, lojas, produtos e imagens

Confira a prévia, que não grava nada:

```bash
SEED_OWNER_EMAIL='seu-email@exemplo.com' npx ts-node --transpile-only prisma/seed-catalogo.ts
```

Para gravar no SQLite local:

```bash
SEED_OWNER_EMAIL='seu-email@exemplo.com' npx ts-node --transpile-only prisma/seed-catalogo.ts --apply
```

Esse script lê `prisma/seed-assets/catalogo/produtos.json` e as imagens da mesma pasta. Ele cria as categorias, lojas e produtos que ainda não existem para esse dono, registra as imagens e copia os arquivos para `uploads/lojas/` e `uploads/products/`. O seed foi feito para evitar duplicar os mesmos registros em novas execuções; não apague ou altere o banco manualmente para executá-lo novamente.

## 3. Carregar avaliações de exemplo

Execute **depois** do catálogo. A prévia não grava nada:

```bash
SEED_OWNER_EMAIL='seu-email@exemplo.com' npx ts-node --transpile-only prisma/seed-avaliacoes.ts
```

Para gravar:

```bash
SEED_OWNER_EMAIL='seu-email@exemplo.com' npx ts-node --transpile-only prisma/seed-avaliacoes.ts --apply
```

O script cria dois clientes de demonstração e duas avaliações com nota e texto para cada uma das 11 lojas e dos 25 produtos do catálogo: 22 avaliações de lojas e 50 de produtos. Ele pode ser executado novamente sem duplicar essas avaliações. Essas contas recebem senhas aleatórias; servem como autores das avaliações, **não** como contas para testar login. Para testar permissões de dono, cadastre uma segunda conta normal com senha conhecida.

O texto da avaliação fica no campo `comentario` das tabelas `AvaliacaoLojas` e `AvaliacaoProdutos`. A tabela separada `Comentarios`, usada para respostas a avaliações, não é povoada por esses scripts.

## 4. Conferir o resultado

- Rode `npx prisma studio` para ver `Categorias`, `Lojas`, `Produtos`, `ImagensProduto`, `AvaliacaoLojas` e `AvaliacaoProdutos`.
- Com o backend em execução, abra `http://localhost:3001/product` para conferir os produtos e `http://localhost:3001/avaliacao/produto?alvoId=ID_DO_PRODUTO` para conferir as avaliações de um produto.
- Abra no navegador uma `image_url` retornada pelo backend, prefixada por `http://localhost:3001`, para conferir se a imagem foi copiada.

O catálogo não precisa preencher `NovaSenha`. Respostas a avaliações e banners adicionais só precisam de dados se forem usados na demonstração.
