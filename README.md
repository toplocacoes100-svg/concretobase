# ConcretoBase — versão Firebase (Firestore + Auth + Hosting)

Sem servidor próprio: o navegador fala direto com o Firebase.
Mesmo padrão dos seus outros projetos (Top Locações, Carteira B3).

## 1. Criar o projeto no Firebase
1. Acesse https://console.firebase.google.com → **Adicionar projeto**
   (do mesmo jeito que você fez para o `carteira-b3-5da75`)
2. No projeto, ative:
   - **Authentication** → aba "Sign-in method" → ative **E-mail/senha**
   - **Firestore Database** → **Criar banco de dados** → modo produção

## 2. Pegar as chaves do projeto
No Firebase Console: ⚙️ **Configurações do projeto** → role até "Seus apps" →
crie um app **Web** (ícone `</>`) → copie o objeto `firebaseConfig`.

Cole esses valores em `public/index.html`, substituindo o bloco:
```js
const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  ...
};
```

## 3. Publicar as regras de segurança do Firestore
No Firebase Console → **Firestore Database** → aba **Regras** → cole o
conteúdo do arquivo `firestore.rules` deste projeto → **Publicar**.

(Se preferir pelo terminal: `firebase deploy --only firestore:rules`,
depois de rodar `firebase init` e `firebase login` uma vez.)

## 4. Criar os primeiros usuários
No Firebase Console → **Authentication** → **Add user** → crie, por exemplo:
- admin@suaempresa.com / uma senha forte
- vendas@suaempresa.com
- compras@suaempresa.com
- logistica@suaempresa.com
- financeiro@suaempresa.com
- rh@suaempresa.com

**Depois de criar cada usuário:**
1. Faça login uma vez com esse usuário no sistema (ele vai cair na tela
   "aguardando liberação" — isso é esperado)
2. No Firebase Console → **Firestore Database** → coleção `usuarios` →
   encontre o documento desse usuário (identifique pelo campo `email`)
3. Edite o campo `role` de `"pendente"` para o perfil certo:
   `admin`, `vendas`, `compras`, `logistica`, `financeiro` ou `rh`
4. Peça pra pessoa recarregar a página — o acesso libera na hora

## 5. Publicar o site (Firebase Hosting)
```bash
npm install -g firebase-tools   # só na primeira vez
firebase login
cd firebase-app
firebase init hosting            # escolha o projeto, pasta "public", SPA: yes
firebase deploy
```
Ele te dá uma URL tipo `seu-projeto.web.app`.

## 6. Dados de exemplo
Faça login como `admin` → na aba **Painel** tem um botão
**"Carregar dados de exemplo"** que popula o Firestore com os mesmos
dados fictícios do protótipo anterior (só rode uma vez).

## Estrutura
```
firebase-app/
  firebase.json       -> config do Hosting
  firestore.rules      -> permissões por perfil (a mesma lógica de antes)
  .firebaserc           -> qual projeto Firebase usar
  public/index.html     -> todo o frontend (login, telas, lógica)
```

## Como funciona o controle de acesso
- Login: Firebase Authentication (e-mail/senha)
- Perfil de cada usuário: campo `role` no documento `usuarios/{uid}` no Firestore
- Permissão por módulo: `firestore.rules` — cada coleção só libera leitura/escrita
  pro perfil certo (ex: só quem é `financeiro` ou `admin` lê `financeiro_receber`)
- Usuário novo sempre nasce com `role: "pendente"` (sem acesso a nada) até o
  admin liberar manualmente — evita que alguém se autopromova

## Limitação a saber
A numeração de pedidos (PV-1043, PC-330...) usa um contador simples no
Firestore. Com pouca gente lançando pedido ao mesmo tempo funciona bem;
em alto volume simultâneo, dois lançamentos rápidos poderiam pegar o
mesmo número (o Firestore tem `transactions` pra resolver isso com
segurança total — dá pra evoluir depois se virar necessidade).
