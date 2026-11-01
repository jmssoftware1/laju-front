# LajuStore V8 — Branding + Mobile Experience

## Resumo
Atualização **exclusivamente visual** do frontend. Nenhuma rota de API, tabela SQL,
senha ou regra de estoque/venda foi alterada.

### Marca
- Logo exata recebida da loja: public/brand/laju-store-logo.jpg (150 × 150 px)
- Favicon e ícone vetorial complementar: public/brand/laju-mark.svg
- Rosa da arte original: #F0B1AA
- Botões: #A2475B (mais escuro para permitir texto branco com contraste)
- Fundos: #FFF8F7; cartões: branco; menu: #402D38
- Logo incluída na tela de login, sidebar e cabeçalho adaptativo
- Manifesto PWA, cor da barra mobile e ícone de navegador ajustados

### Navegação adaptativa
- Desktop acima de 1024px: sidebar lateral fixa
- Tablet até 1024px: menu em gaveta com botão de abertura
- Celular até 760px: menu em gaveta + navegação inferior fixa
- Celular estreito até 540px: indicadores em coluna e formulários em uma coluna
- Telas muito estreitas até 360px: textos, espaçamento e logo reduzidos
- Tables: área com rolagem horizontal controlada (sem cortar informações)
- Elementos interativos com dimensões para toque (44–50px)
- Suporte a safe-area em celulares com gestos, foco de teclado e movimento reduzido

### Checklist de aceitação
Abra o deploy preview na Netlify e confira:
1. 320 × 640, 375 × 812, 390 × 844: a barra inferior está visível,
   o menu "Mais" abre todos os módulos, sem barra de rolagem horizontal da página.
2. 768 × 1024 e 1024 × 768: botão de menu e cards em 2 colunas.
3. 1280 × 800 e 1440 × 900: sidebar fixa e dashboard em grade.
4. Login: a logo, os campos de usuário/senha e o botão continuam funcionais.
5. Estoque: editar, filtrar e cadastrar produtos/variações.
6. PDV: carrinho e botões confirmar/pendente continuam acessíveis no celular.
7. Clientes/Financeiro/Fornecedores/Relatórios/Configurações: acessar pelo menu,
   rolar tabelas sem sobrepor botões, conferir permissões da funcionária.
8. Navegar com teclado: Escape fecha o menu; focos são visíveis.
9. Testar Safari iOS e Chrome Android, especialmente teclado virtual e safe-area.

## Passo a passo seguro para publicar
1. Não faça merge até concluir a revisão do Deploy Preview.
2. Abra o PR da V8 e espere TypeScript + Vite + testes visuais estruturais passarem.
3. Na Netlify, use o Deploy Preview associado ao PR, se essa opção estiver habilitada.
4. Teste em celular e computador. O frontend da produção continua na main.
5. Se estiver aprovado, integre o PR na main. A Netlify publicará automaticamente
   se o Auto-Deploy estiver habilitado para o repositório.

## Voltar à versão anterior
- **Antes do merge:** basta fechar o PR. Nada muda na produção.
- **Depois do merge:** no GitHub, reverta o merge/commit com um novo PR de Revert.
  A Netlify publicará automaticamente o estado revertido após o merge.
- **Emergência:** Netlify → Deploys → selecione um deploy anterior bem-sucedido
  → Publish deploy (caso a conta/plano ofereça o botão).
  É uma restauração temporária: novos deploys podem sobrescrever a versão escolhida.

## Limites
- A logo recebida é de 150 × 150 px, então foi exibida abaixo desse tamanho para
  preservar nitidez. Se recebermos um SVG/PNG de alta resolução, podemos trocá-la.
- Os testes de CI verificam compilação e estrutura, não substituem testes em
  aparelhos reais. Não há necessidade de alterar Render ou Supabase.
