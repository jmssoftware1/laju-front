# LajuStore — Planilha Excel e Relatório Mensal PDF

## Para a Julia (sem instalar programas)

Em **Configurações → Permissões** (entrar como administradora):

### 1. Planilha Excel completa
- Clique em **Baixar planilha Excel completa (.xlsx)**.
- O arquivo abre no Microsoft Excel, LibreOffice ou Google Sheets.
- Ele possui uma aba de resumo e **11 abas** com registros comerciais:
  produtos, variações, clientes, pedidos, itens de pedidos, financeiro,
  fornecedores, compras, itens de compras, movimentações e auditoria.
- A planilha contém **todos os registros retornados pela exportação comercial**.
  A API impõe limite de 5.000 registros por tabela e 15 MB de JSON.
  Se atingir o limite, a operação falha; não será entregue um backup parcial
  fingindo ser completo.
- Números de telefone são preservados como texto; dados começando com = são
  tratados como texto para evitar fórmulas perigosas.
- **Não contém usuários, senhas, tokens nem hashes de senha.**
- Guarde criptografado e compartilhe apenas com pessoas autorizadas: a
  planilha pode conter informações pessoais de clientes.

### 2. PDF mensal bonito
- Em **Mês para o relatório PDF**, selecione o mês.
- Clique em **Abrir relatório mensal para salvar em PDF**.
- Após carregar, clique em **Imprimir / Salvar em PDF**.
- No navegador escolha **Salvar como PDF**, não impressora física.
- O relatório segue as cores oficiais da LajuStore, em páginas A4.
- Contém faturamento, margem estimada, despesas, resultado operacional,
  entradas e saídas de caixa, vendas por canal, peças mais vendidas,
  vendas diárias e um retrato do estoque ATUAL.
- O estoque é atual, **não é o saldo de estoque no último dia daquele mês**.
- O resultado é estimado: taxas, tributos, custos/despesas faltantes alteram a
  análise. Não é emissão de nota fiscal nem balanço contábil.

### 3. JSON original
- A opção **Exportar JSON original** continua disponível para uma possível
  recuperação técnica futura.
- Não há mecanismo automático de importar e restaurar esse arquivo.

## Frequência recomendada
- Excel: **diariamente ao fim do expediente**, especialmente com vendas reais;
  guardar pelo menos uma cópia fora do mesmo dispositivo em local protegido.
- PDF: **uma vez por mês** para acompanhamento de resultados.
- JSON: junto da exportação de Excel, para conservar estrutura de relações.
- Backup PostgreSQL completo: ainda necessário para recuperação de banco e
  usuários. Ver `ENTREGA-JULIA.md` no repositório `laju-back`.

**Importante:** nem Excel nem PDF impedem a perda dos registros gerados
após o último download. Não existe agendamento automático por esta versão.

## Antes de publicar
- [ ] GitHub Actions: compilação TypeScript + Vite + testes XLSX/PDF aprovados
- [ ] Teste com conta da Julia (gestora): Excel abre com as 12 abas
- [ ] Confira no Excel valores e IDs sem arredondamento incorreto
- [ ] PDF mensal abre para selecionar mês e imprimir/salvar em PDF
- [ ] Confira PDF em celular e desktop: páginas legíveis, sem blocos cortados
- [ ] Teste mês sem vendas e mês com vendas
- [ ] Funcionária não pode abrir a tela de relatório nem exportações
- [ ] Não foi alterado Render, Supabase nem registros existentes

## Reversão
Mudança apenas de frontend. Antes do merge, feche o PR sem afetar produção.
Depois do merge, use Revert no GitHub e publique a versão antiga pela Netlify.
Dados existentes do Supabase não são alterados por esses downloads.
