# KIGELO Financeiro

Sistema completo de controle financeiro da KIGELO. Next.js 14 (App Router) +
PostgreSQL + autenticação com hash bcrypt e sessão JWT em cookie httpOnly +
permissões validadas sempre no backend + lançamentos imutáveis (correção só
via estorno) + fechamento de mês + relatórios diário/semanal/mensal com
exportação.

## Sobre a cor dos valores
Os valores em destaque (R$) aparecem em **branco**, dentro de cartões/faixas
coloridas com as cores da marca KIGELO (rosa, verde, azul-marinho, roxo).
Isso porque branco sobre fundo branco ficaria ilegível — então o valor em
branco vive sempre num fundo colorido, para manter contraste e leitura fácil
em qualquer tela. Valores dentro de tabelas (histórico, dashboard) continuam
em cor escura, pois ali o fundo é branco.

## Como rodar

1. Instale as dependências:
   ```
   npm install
   ```

2. Crie um banco Postgres gratuito em [neon.tech](https://neon.tech) ou
   [supabase.com](https://supabase.com) e copie a `DATABASE_URL`.

3. Copie `.env.example` para `.env.local` e preencha `DATABASE_URL` e
   `AUTH_SECRET` (gere com `openssl rand -hex 32`). O `BLOB_READ_WRITE_TOKEN`
   só é necessário se for usar upload de notas fiscais — pode deixar em
   branco por enquanto e adicionar depois.

4. Crie as tabelas:
   ```
   npm run db:migrate
   ```

5. Crie o primeiro administrador:
   ```
   DATABASE_URL="sua-url-aqui" node scripts/seed-admin.js "Seu Nome" "voce@kigelo.com" "senha-forte-123"
   ```

6. Rode localmente:
   ```
   npm run dev
   ```
   Acesse http://localhost:3000 — você será redirecionado para o login.

## Como publicar (deixar acessível de qualquer dispositivo)

1. Crie um repositório no GitHub com esses arquivos.
2. Conecte o repositório na [vercel.com](https://vercel.com) (plano gratuito
   é suficiente para começar).
3. Nas variáveis de ambiente do projeto na Vercel, adicione `DATABASE_URL` e
   `AUTH_SECRET`.
4. (Opcional, para upload de notas) Na aba Storage da Vercel, crie um "Blob
   Store" e conecte ao projeto — isso preenche `BLOB_READ_WRITE_TOKEN`
   automaticamente.
5. Rode `npm run db:migrate` apontando para o banco de produção, e crie o
   admin de produção com `scripts/seed-admin.js`.

## Todas as telas incluídas

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/login` | Todos | Autenticação |
| `/dashboard` | Todos | Visão do dia, atalhos de lançamento |
| `/nova-entrada` | Todos | Lançar entrada (dinheiro/PIX/débito/crédito) |
| `/nova-saida` | Todos | Lançar saída com categoria |
| `/novo-custo` | Todos | Lançar custo com fornecedor, nota e anexo |
| `/historico` | Todos | Lançamentos com filtros; admin pode estornar |
| `/relatorio-diario` | Admin | Totais do dia por forma de pagamento |
| `/relatorio-semanal` | Admin | Totais por dia da semana, gráfico |
| `/relatorio-mensal` | Admin | Totais do mês, ranking de categorias |
| `/fechamento` | Admin | Fechar/reabrir meses |
| `/usuarios` | Admin | Criar, bloquear/ativar usuários |
| `/categorias` | Admin | Gerenciar categorias de saída/custo |
| `/formas-pagamento` | Admin | Ativar/desativar formas de pagamento |
| `/operadoras` | Admin | Gerenciar maquininhas |
| `/auditoria` | Admin | Log de todas as ações sensíveis |

Todas as rotas administrativas são bloqueadas em três camadas: o menu nem
aparece para funcionário, o `middleware.ts` barra o acesso direto pela URL, e
cada API confere a role de novo no backend antes de responder.

## Regras de negócio garantidas no backend (não só na tela)
- Lançamento confirmado é imutável: não existe rota de editar/excluir
  transação. A única correção possível é `POST /api/transactions/estornar`
  (somente admin, exige motivo), que marca o original como `ESTORNADO` sem
  apagá-lo.
- Funcionário só lança com a data de hoje; só vê os próprios lançamentos.
- Mês fechado bloqueia novos lançamentos e estornos naquele período, até
  reabertura pelo admin.
- Usuário nunca é excluído do banco, apenas bloqueado — preserva o vínculo
  com o histórico.
- Senhas com hash bcrypt (12 rounds); sessão em cookie httpOnly assinado.

## Exportação de relatórios
- **CSV/Excel**: `/api/reports/export` gera um CSV com acentuação correta,
  que abre nativamente no Excel/Google Sheets.
- **PDF**: os relatórios têm um botão "Exportar PDF (imprimir)" que usa a
  função de impressão do navegador — o usuário escolhe "Salvar como PDF" no
  diálogo de impressão. É a forma mais simples e confiável sem depender de
  bibliotecas pesadas; se quiser PDF gerado automaticamente no servidor
  (com timbre, cabeçalho fixo etc.), posso adicionar isso depois com uma
  biblioteca como `@react-pdf/renderer`.

## Limitações conhecidas desta entrega
- Sem testes automatizados (a seção de testes do briefing vira um roteiro
  de testes manuais a fazer antes de ir para produção).
- Sem paginação na tela de histórico ainda (a API já pagina, falta o botão
  "carregar mais" na interface).
- PDF é gerado via impressão do navegador, não binário no servidor.
