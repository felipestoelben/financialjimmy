# Jimmy Finanças

App de controle financeiro pessoal (PWA). Login com Google, dados sincronizados
na nuvem entre celular e computador. Sem build step: é HTML/CSS/JS puro,
publicado direto pelo GitHub Pages.

## 1. Criar o projeto Firebase (gratuito)

1. Acesse https://console.firebase.google.com e entre com sua conta Google.
2. **Criar projeto** → dê um nome (ex.: `jimmy-financas`) → pode desativar o
   Google Analytics, não é necessário.
3. Dentro do projeto, clique no ícone **`</>`** ("Adicionar app" → Web).
   Registre o app (não precisa marcar Firebase Hosting). Ele vai mostrar um
   objeto `firebaseConfig` — copie esses valores.
4. Cole os valores copiados em [`js/firebase-config.js`](js/firebase-config.js),
   substituindo os campos `'SUBSTITUA_AQUI'`.

## 2. Ativar login com Google

1. No menu lateral: **Build → Authentication → Get started**.
2. Aba **Sign-in method** → habilite o provedor **Google**.
3. Ainda em Authentication, aba **Settings → Authorized domains**, adicione o
   domínio onde o app vai ficar publicado, por exemplo:
   `felipestoelben.github.io` (o domínio do GitHub Pages).

## 3. Criar o banco de dados (Firestore)

1. Menu lateral: **Build → Firestore Database → Create database**.
2. Escolha uma região (ex.: `southamerica-east1` para o Brasil) e comece em
   **modo de produção**.
3. Aba **Rules**, substitua o conteúdo pelas regras abaixo (garante que cada
   pessoa só acessa as próprias transações) e clique em **Publish**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/transactions/{txId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

## 4. Publicar no GitHub Pages

1. No repositório, vá em **Settings → Pages** e em "Build and deployment"
   escolha **Source: GitHub Actions** (só precisa fazer isso uma vez).
2. O workflow em `.github/workflows/deploy.yml` publica automaticamente a
   cada push na branch `main`. Depois que este branch for revisado e
   mesclado (merge) em `main`, o app fica disponível em:
   `https://felipestoelben.github.io/financialjimmy/`

## 5. Usar no celular e no computador

- Abra o link acima no navegador do celular (Chrome/Safari) e escolha
  **"Adicionar à tela inicial"** — vira um app instalado, com ícone próprio.
- No computador, abra o mesmo link no Chrome/Edge e clique no ícone de
  instalar (⊕) na barra de endereço.
- Em qualquer um dos dois, faça login com **Continuar com Google** usando a
  mesma conta — as transações lançadas em um aparelho aparecem
  automaticamente no outro.

## O que já funciona

- Login/cadastro por e-mail e senha, login com Google, "esqueci minha senha".
- Lançar receitas e despesas por categoria, forma de pagamento e data.
- Painel inicial com saldo do mês, entradas/saídas e gráfico por categoria.
- Histórico com filtro por mês e busca por texto, exclusão de lançamentos.
- Tudo sincronizado em tempo real via Firestore, por usuário.

## O que ficou como próximo passo (não implementado ainda)

- Telas de "Metas financeiras", "Categorias personalizadas", "Formas de
  pagamento", "Notificações" e "Dados pessoais/Segurança" do menu de
  Configurações são apenas a tela de perfil básica por enquanto.
- Relatórios/gráficos históricos (comparar meses) ainda não existem.
