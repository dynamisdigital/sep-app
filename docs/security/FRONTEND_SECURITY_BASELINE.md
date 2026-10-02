# SEP — Baseline de Segurança do Frontend (Frontend Security Baseline)

**Sistema:** SEP — Sociedade de Empréstimo entre Pessoas  
**Escopo:** Aplicação Web Frontend (Angular 20 / TypeScript / SCSS)  
**Classificação:** Aplicação Financeira Regulada (Resolução CMN 4.656/2018)  
**Versão:** 1.0.0 — Setembro/2026  
**Responsável:** Application Security / Frontend Security Architect  

---

## 1. Princípios Arquiteturais e Regra de Ouro

> [!IMPORTANT]
> **REGRA DE OURO DA SEGURANÇA NO FRONTEND:**
> O navegador do usuário é um ambiente não confiável e passível de inspeção e manipulação. Ocultação de interface, botões desabilitados ou guards de rota no cliente **não constituem autorização real nem substituem validações de negócio**.
> **Toda operação crítica, transação financeira, cálculo de liquidação e regra de autorização deve ser estritamente validada pelo Backend.**

### Pilares Fundamentais
1. **Defesa em Profundidade:** Múltiplas camadas de proteção (CSP estrita, sanitização de entrada e saída, interceptors com validação de escopo, stores de curta duração).
2. **Princípio do Menor Privilégio:** Usuários e papéis têm acesso visual estritamente restrito às suas atribuições operacionais (`ADMIN`, `FINANCEIRO`, `BACKOFFICE`, `CLIENTE`).
3. **Isolamento de Ambiente:** Nenhum artefato, credencial, mock ou utilitário de teste/desenvolvimento pode permanecer ativo ou acessível no bundle de produção.
4. **Preservação da Experiência Homologada:** A segurança é incorporada de forma não intrusiva, preservando 100% da identidade visual, responsividade, contratos de API e ergonomia de uso.

---

## 2. Controles de Entrada, Saída e Sanitização

### 2.1 Prevenção contra Cross-Site Scripting (XSS)
- **Zero Bypasses de Sanitização:** O projeto possui diretriz estrita de **proibição absoluta** de métodos `DomSanitizer.bypassSecurityTrust*` (`bypassSecurityTrustHtml`, `bypassSecurityTrustScript`, `bypassSecurityTrustUrl`, etc.). A auditoria confirmou 0 ocorrências no código.
- **Interpolação Segura do Angular:** Toda renderização de texto dinâmico utiliza interpolação padrão (`{{ texto }}`) ou property bindings seguros (`[textContent]`, `[value]`).
- **Eliminação de Manipulação Direta do DOM:** Proibido uso de `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ou `eval()`. Todas as alterações de visual são orquestradas via Signals e templates declarativos.

### 2.2 Prevenção contra Injeção em Planilhas (CSV / Formula Injection - CWE-1236)
- **Ameaça:** Dados cadastrais ou financeiros contendo prefixos `=`, `+`, `-`, `@`, `\t` ou `\r` quando abertos no Microsoft Excel ou LibreOffice podem disparar comandos do sistema operacional (DDE) ou conexões não autorizadas (`HYPERLINK`).
- **Controle Implementado:** Todas as 9 telas de exportação utilizam o utilitário institucional `src/app/core/format/csv-format.ts` (`formatarCelulaCsv` e `gerarLinhaCsv`).
- **Regra de Sanitização:** Células que iniciam com caracteres executáveis recebem prefixo de apóstrofo `'` defensivo, aspas duplas internas são duplicadas e a célula é encapsulada em aspas duplas, forçando o interpretador de planilhas a tratar o dado como texto literal puro.

### 2.3 Hardening no Upload de Documentos
- **Whitelist de Extensões:** Permitidos estritamente `.pdf`, `.jpg`, `.jpeg`, `.png`.
- **Bloqueio de Extensões Perigosas:** Proibição programática de executáveis (`.exe`, `.bat`, `.cmd`, `.sh`, `.msi`), scripts (`.js`, `.vbs`, `.ps1`), e formatos que suportam código ativo (`.svg`, `.html`, `.htm`).
- **Bloqueio de Dupla Extensão:** Rejeição de nomes com extensões camufladas (ex: `documento.exe.pdf`, `comprovante.svg.png`).
- **Validação de MIME Type:** Validação defensiva de `file.type` coincidente com a extensão.
- **Limite de Tamanho:** 10 MB por arquivo no frontend.
- **Diretriz de Servidor:** O servidor deve executar verificação de Magic Bytes e antivírus no bucket de armazenamento.

---

## 3. Autenticação, Autorização e Gestão de Sessão

### 3.1 Ciclo de Vida dos Tokens
| Token | Armazenamento | Transmissão | Escopo & Expiração |
|---|---|---|---|
| **Access Token (JWT)** | `localStorage` (`SEP_ACCESS_TOKEN`) | Header `Authorization: Bearer <token>` | Curta duração (15 minutos). Limpo em logout ou HTTP 401. |
| **Refresh Token** | **Nunca acessível via JavaScript** | Cookie HTTP `sep-refresh` com `HttpOnly`, `Secure`, `SameSite=Lax` | Rotação automática no backend via endpoint `/auth/refresh` com `withCredentials: true`. |
| **MFA Challenge ID** | `localStorage` (`SEP_PENDING_MFA_CHALLENGE`) | Body em `/auth/totp/verify` | Sobrevive a reload entre `/login` e `/verify-totp`. Limpo após verificação. |
| **Step-Up Token** | **Memória Pura (`StepUpTokenStore`)** | Header `X-Step-Up-Token` | Uso único (one-time token), consumido e descartado imediatamente após o primeiro uso sensível. |

### 3.2 Interceptors e Escopo de Domínio (SEC-03)
- Todos os interceptors de segurança (`authInterceptor`, `stepUpInterceptor`, `clientChannelInterceptor`, `errorInterceptor`) validam obrigatoriamente:
  ```typescript
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }
  ```
- **Garantia:** O token JWT e o token de Step-Up **nunca vazam** para endpoints externos, CDNs ou serviços de terceiros.
- **Tratamento de Sessão:** Erros 401 (não autenticado), 403 (acesso negado) e 423 (conta bloqueada por lockout) redirecionam para as telas adequadas e limpam a sessão apenas quando emitidos pela API institucional.

### 3.3 Prevenção contra Open Redirect (SEC-05)
- O fluxo de confirmação adicional (`/app/step-up?next=...`) valida rigorosamente o parâmetro de retorno.
- Apenas caminhos relativos internos iniciando por `/app/` são aceitos. URLs absolutas (`https://...`), esquemas relativos (`//evil.com`), backslashes (`\`) ou URLs fora da área autenticada são rejeitados, aplicando fallback seguro para `/app/profile`.

---

## 4. Isolamento de Ambientes e Proteção do Bundle de Produção

### 4.1 Mock Service Worker (MSW) e Credenciais de Demonstração (SEC-01 / SEC-02)
- Em desenvolvimento (`npm start`, `environment.dev-offline.ts`), o sistema provê facilidades para agilidade de desenvolvimento (mocks locais e atalhos de contas demonstrativas).
- No build de produção (`ng build`, `environment.prod.ts`):
  1. `iniciarMocks()` é substituído pelo stub nulo `iniciar-mocks.prod.ts` via `fileReplacements` no `angular.json`.
  2. `mockServiceWorker.js` é explicitamente ignorado na cópia de assets do build.
  3. A função `ehAmbienteDemo()` força `false` incondicional quando `environment.production === true`, ignorando qualquer chave no `localStorage`.
  4. O bloco de alternância de contas fictícias e o atalho com senha fixa `'123456'` são completamente desativados e removidos da árvore do DOM em produção.

### 4.2 Source Maps e Diagnósticos (SEC-08)
- `sourceMap: false` configurado no `angular.json` para o build de produção, impedindo engenharia reversa de código-fonte e lógica interna por atacantes.
- Logs técnicos de console desativados em produção no `main.ts` (`if (!environment.production) console.error(err)`).
- Mensagens de erro de API são sanitizadas via `extrairMensagemErroSegura` para ocultar stack traces e detalhes internos de banco em erros 5xx.

---

## 5. Content Security Policy (CSP) & Hardening Web

### 5.1 CSP do Frontend (Angular 20 autoCsp)
O `angular.json` possui `security: { autoCsp: true }` ativado, gerando hashes criptográficos (SHA-256) dos scripts de bootstrap e inserindo a política estrita:
```http
script-src 'strict-dynamic' 'sha256-...' https: 'unsafe-inline';
object-src 'none';
base-uri 'self';
```

### 5.2 Recomendações Mandatórias para Backend e Infraestrutura (Proxy / Gateway)
| Header HTTP | Valor Recomendado | Justificativa |
|---|---|---|
| **Content-Security-Policy** | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.sep.com.br; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';` | Blindagem completa contra XSS, injeção de scripts remotos e sequestro de formulários. |
| **Strict-Transport-Security** | `max-age=63072000; includeSubDomains; preload` | Força tráfego exclusivamente via HTTPS com HSTS ativo por 2 anos. |
| **X-Content-Type-Options** | `nosniff` | Impede MIME-sniffing e execução indevida de arquivos como scripts. |
| **X-Frame-Options** | `DENY` | Proteção contra Clickjacking e incorporação da aplicação em iframes. |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Impede vazamento de identificadores de rotas financeiras no cabeçalho Referer. |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Desativa APIs de hardware desnecessárias à aplicação financeira. |
| **Cross-Origin-Opener-Policy** | `same-origin` | Isola o contexto de navegação contra ataques de janelas cruzadas (Spectre/COOP). |
| **Cross-Origin-Resource-Policy** | `same-origin` | Restringe carregamento de recursos a mesma origem. |

---

## 6. Diretrizes para Novos Desenvolvedores e Componentes

Ao criar novas telas, serviços ou componentes no Frontend do SEP:
1. **Nunca utilize `bypassSecurityTrust*`:** Se o Angular sanitizar um conteúdo, verifique por que o conteúdo contém tags ativas em vez de contornar a proteção.
2. **Utilize `gerarLinhaCsv` / `formatarCelulaCsv` para qualquer exportação:** Nunca junte colunas CSV com `.join(';')` diretamente sem passar pelo formatador seguro.
3. **Não armazene dados bancários sensíveis em `localStorage`:** O `localStorage` é acessível por qualquer script no mesmo domínio. Persista apenas identificadores de sessão transitórios.
4. **Chamadas HTTP sempre via `apiBaseUrl`:** Nunca codifique URLs completas com host hardcoded nos serviços; utilize a constante `environment.apiBaseUrl`.
5. **Erros de API tratados com `extrairMensagemErroSegura`:** Assegure que exceções de servidor não vazem detalhes de infraestrutura na interface.
6. **Proteja rotas autenticadas:** Toda nova rota em `/app` deve conter `canActivate: [authGuard]` e, caso exija perfil restrito, `canActivate: [roleGuard]` com os papéis autorizados em `data.roles`.

---

## 7. Critérios de Homologação e Conclusão

Uma release do Frontend do SEP só é aprovada quando:
- [x] Suíte de testes unitários (`npm test`) com 100% de aprovação.
- [x] Verificação de linter (`npm run lint`) com 0 erros.
- [x] Compilação de produção (`npm run build`) bem-sucedida com `autoCsp` ativo e sem source maps.
- [x] Zero ocorrências de bypass de segurança.
- [x] Exportações CSV blindadas contra CWE-1236.
- [x] Interceptors com validação de escopo ativo.
- [x] Mocks e credenciais demo completamente isolados de produção.
