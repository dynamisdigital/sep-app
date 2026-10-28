# SEP — Checklist de Liberação de Segurança do Frontend
## (Frontend Security Release Checklist)

**Aplicação:** SEP — Sociedade de Empréstimo entre Pessoas  
**Ambiente Alvo:** Produção / Staging Regulado  
**Periodicidade:** Obrigatório a cada novo release, deploy ou tag de versão  

---

### 1. Auditoria Estática & Dependências (Supply Chain)
- [ ] **npm audit revisado:** Nenhuma vulnerabilidade crítica ou alta introduzida em dependências diretas de produção (`jspdf`, `lucide-angular`, `@angular/*`, `rxjs`, `zone.js`).
- [ ] **Scripts de instalação verificados:** Nenhum pacote suspeito com scripts `postinstall` adicionado ao `package.json`.
- [ ] **Registry verificado:** Todas as dependências resolvidas a partir de `https://registry.npmjs.org/`.

### 2. Segredos e Credenciais
- [ ] **Nenhum segredo no Frontend:** Ausência total de API keys privadas, senhas de banco, client secrets ou chaves criptográficas no código-fonte.
- [ ] **Ambiente de produção sem contas demo:** Verificado que `environment.prod.ts` possui `production: true` e `useMsw: false`.
- [ ] **Atalho de troca de contas inativo:** Confirmado que o bloco de troca de usuários com senha `'123456'` está desativado e não é renderizado em produção.
- [ ] **Mock Service Worker desativado:** Confirmado que `iniciar-mocks.prod.ts` é utilizado no build de produção e `mockServiceWorker.js` é ignorado nos assets.

### 3. Sanitização & Prevenção de Injeções
- [ ] **Zero bypasses do DomSanitizer:** Confirmado que `bypassSecurityTrust*` não é utilizado em nenhum componente ou diretiva.
- [ ] **Ausência de innerHTML dinâmico desprotegido:** Nenhum dado não confiável atinge o DOM via `innerHTML`, `outerHTML` ou `document.write`.
- [ ] **CSV / Formula Injection mitigado (CWE-1236):** Todas as exportações de relatórios CSV utilizam `formatarCelulaCsv` / `gerarLinhaCsv`, prefixando células com `'` seguro quando iniciadas por `=`, `+`, `-`, `@`, `\t`, `\r`.
- [ ] **Upload de arquivos validado:** Extensões estritamente restritas a `.pdf`, `.jpg`, `.jpeg`, `.png`, com rejeição de executáveis, SVGs, HTML e nomes de arquivo com extensão dupla.

### 4. Gestão de Sessão, Tokens e APIs
- [ ] **Escopo de envio de tokens (SEC-03):** Confirmado que `authInterceptor` e `stepUpInterceptor` anexam `Authorization: Bearer` e `X-Step-Up-Token` estritamente a URLs iniciadas por `environment.apiBaseUrl`.
- [ ] **Refresh Token isolado em HttpOnly Cookie:** O JavaScript do navegador não tem acesso direto ao refresh token (`X-Client-Channel: WEB` via `Set-Cookie HttpOnly`).
- [ ] **Step-Up Token em memória:** `StepUpTokenStore` mantém o token de confirmação estritamente em memória volátil, com descarte imediato após o primeiro uso.
- [ ] **Limpeza de sessão em 401/423:** Erros de autenticação expiram e limpam a sessão do navegador imediatamente.
- [ ] **Sanitização de mensagens de erro:** Exceções 5xx sanitizadas via `extrairMensagemErroSegura` para evitar exposição de stack traces ou queries SQL.

### 5. Roteamento & Navegação
- [ ] **Proteção de rotas com Guards:** Todas as rotas autenticadas sob `/app` protegidas por `authGuard` e `roleGuard`.
- [ ] **Prevenção contra Open Redirect:** O parâmetro de retorno de step-up (`next`) é validado para aceitar apenas caminhos relativos internos iniciando com `/app/`.
- [ ] **Tratamento de 403 (Acesso Negado):** Usuários sem autorização para a rota são direcionados para `/access-denied` com preservação de auditoria.

### 6. Build de Produção & Headers
- [ ] **Source Maps desativados:** `sourceMap: false` configurado em produção para impedir exposição do código original desminificado.
- [ ] **CSP ativa (autoCsp):** `angular.json` configurado com `security: { autoCsp: true }` para geração de hashes SHA-256 de scripts inline.
- [ ] **Console limpo:** Ausência de `console.log` com dados de usuários, CPFs, tokens ou payloads sensíveis.
- [ ] **Testes unitários e Lint aprovados:**
  - `npx vitest run` -> 100% aprovado.
  - `npx ng lint` -> 0 erros.
  - `npx ng build` -> 0 erros de compilação.
- [ ] **Recomendações para Gateway / Infraestrutura aplicadas:** Headers HSTS, CSP de servidor, X-Frame-Options: DENY, X-Content-Type-Options: nosniff e SameSite nos cookies.

---

**Assinatura de Aprovação Técnica:**  
Engenheiro de Segurança de Aplicações / Arquiteto Frontend  
Data: ____ / ____ / ________  
Versão da Release: ____________________  
Status: [ ] APROVADO PARA PRODUÇÃO   [ ] REPROVADO (Pendências registradas)
