# ConcretoBase — Backend + Frontend integrados

Sistema completo rodando junto: `npm start` sobe a API e também serve a tela
(`public/index.html`) no mesmo endereço. Banco de dados persistente em arquivo
SQLite (usa o módulo nativo `node:sqlite` do Node — não precisa instalar
pacote de banco).

## Requisitos
- Node.js 22.5 ou mais recente (`node -v` para conferir)

## Como rodar

```bash
cd backend
npm install
npm start
```

Abra **http://localhost:3001** no navegador.

Na primeira execução ele cria o arquivo `concretobase.db` já com dados de
exemplo e os usuários abaixo.

## Usuários de teste

| Usuário     | Senha           | Acesso                          |
|-------------|-----------------|----------------------------------|
| admin       | admin123        | Todos os módulos                |
| vendas      | vendas123       | Vendas e Notas                  |
| compras     | compras123      | Compras, fornecedores e estoque |
| logistica   | logistica123    | Logística e Programação         |
| financeiro  | financeiro123   | Financeiro                      |
| rh          | rh123           | Funcionários                    |

**Troque essas senhas antes de usar com dados reais** — elas existem só para
você testar os perfis. Para trocar: apague `concretobase.db`, edite a lista de
`perfis` em `db/database.js` e rode `npm start` de novo (ele semeia o banco
apenas se as tabelas estiverem vazias).

## Como funciona a autenticação
- Login em `POST /api/login` cria uma sessão e devolve um cookie `httpOnly`.
- Toda rota em `/api/*` (exceto login) exige esse cookie válido.
- Cada rota também exige um perfil específico (ex: `/api/financeiro` só libera
  para `financeiro` ou `admin`) — ver `permitirPerfis(...)` em `auth.js` e o
  uso em `server.js`.
- Sessões ficam em memória e duram 8h; reiniciar o servidor derruba todo
  mundo (próximo passo natural: mover sessões para uma tabela do banco).

## Estrutura
```
backend/
  server.js          -> rotas da API + login/logout + serve o frontend
  auth.js             -> hash de senha, sessões, permissão por perfil
  programacao.js      -> regra de cálculo de viagens/caminhões
  db/database.js      -> tabelas SQLite + dados de exemplo (seed)
  public/index.html   -> frontend (login + telas), servido pelo Express
  concretobase.db      -> criado na primeira execução (não versionar no git)
```

## Cálculo da programação (`POST /api/programacao`)
Corpo:
```json
{ "volumeTotal": 240, "capacidadeCaminhao": 8, "caminhoesDisponiveis": 6, "entregasMin": 3, "entregasMax": 4 }
```
Calcula viagens necessárias (`volumeTotal / capacidadeCaminhao`), a faixa de
caminhões (melhor caso com o máximo de entregas/dia, pior caso com o mínimo)
e, se a frota de hoje for informada, se ela dá conta e como distribuir as
viagens.

## Próximos passos sugeridos (quando fizer sentido pra você)
- Trocar o SQLite por um banco com mais recursos (Postgres) se um dia isso rodar em nuvem
- Persistir sessões e permitir "lembrar de mim"
- Tela de administração de usuários (hoje é só editando o código)
- Deploy: quando sair do uso local, dá pra subir isso como está em qualquer
  serviço que rode Node (Railway, Render, uma VPS) — não precisa reescrever nada
