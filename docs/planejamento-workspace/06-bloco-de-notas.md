# Ferramenta 6: bloco de notas (ideias do dia)

Complexidade: baixa. Segunda na ordem (depois da fundação). Serve de molde para as outras.

## Objetivo
Lista compartilhada entre Clemilson e Dra. Darleny para anotar ideias rápidas ao longo do dia e marcar quando resolvidas. Moderna, rápida no celular, atualiza na hora na tela da outra pessoa.

## Banco (migração `ws_notas_criar`)
```sql
create table public.ws_notas (
  id uuid primary key default gen_random_uuid(),
  texto text not null check (length(texto) between 1 and 2000),
  resolvida boolean not null default false,
  fixada boolean not null default false,
  autor_email text not null default lower(auth.jwt() ->> 'email'),
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  resolvida_em timestamptz
);
create index on public.ws_notas (resolvida, criada_em desc);
```
- RLS com as 4 políticas padrão do `00` (`eh_membro_workspace()`).
- Trigger `before update` que atualiza `atualizada_em` e preenche/limpa `resolvida_em` conforme `resolvida`.
- Realtime: `alter publication supabase_realtime add table public.ws_notas;`

## Tela (`notas/index.html` + `notas/notas.js`)
- Campo no topo "Anotar uma ideia…" (textarea que cresce). Enter salva; Shift+Enter quebra linha. Botão "Salvar" visível no celular.
- Lista em duas seções: **Abertas** (mais novas primeiro; fixadas no topo) e **Resolvidas** (recolhida por padrão, com contador).
- Cada nota: checkbox grande (alvo de toque ≥ 44 px), texto, quem anotou (iniciais "C" ou "D" num círculo) e "há 2 h". Menu de 3 pontos: Editar, Fixar/Desafixar, Apagar (com confirmação).
- Marcar a checkbox move a nota para Resolvidas com animação curta (respeitar `prefers-reduced-motion`). Desmarcar volta.
- Busca simples por texto no topo da lista (filtra no navegador).
- Atualização ao vivo: `client.channel('ws_notas').on('postgres_changes', …)`; ao receber evento, recarregar a lista. CSP da página precisa de `wss://xuucobklnhxaxqhabnvg.supabase.co` em `connect-src`.
- Escrita otimista: mostrar a nota na hora e reverter com aviso se o servidor recusar.
- Links dentro do texto viram clicáveis (detectar `https://…`; montar com `textContent` + elementos `<a>`, nunca `innerHTML` com texto do usuário).

## Fora do escopo (agora)
Etiquetas, prazos, responsáveis, anexos. Se pedirem depois, entram como colunas novas.

## Pronto quando
- [ ] Criar, editar, marcar, desmarcar, fixar, apagar funcionando.
- [ ] Nota criada no celular do Clemilson aparece no da Dra. sem recarregar.
- [ ] Conta fora da lista não lê nem grava (testar com `execute_sql` simulando outro e-mail, ou conferir políticas).
- [ ] `get_advisors` sem aviso novo.
- [ ] Cartão "Notas" ativo no hub.
