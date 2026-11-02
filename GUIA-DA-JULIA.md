# Guia rápido da Julia — LajuStore

A LajuStore é usada pela Julia e pelas funcionárias autorizadas para
controlar a loja física, WhatsApp e Instagram.

## No início do dia
1. Entre com seu usuário e senha.
2. Abra **Dashboard** e confira **Estoque em atenção**.
3. Veja as roupas esgotadas ou abaixo do mínimo e programe a reposição.
4. Abra **Vendas / PDV** e confira se existem pedidos aguardando pagamento.

## Cadastrar roupas
1. Em **Estoque**, toque **Cadastrar / ajustar** (celular).
2. Informe nome, categoria, preço de venda e **custo unitário**, se conhecido.
3. Indique cor, tamanho, SKU e quantidade inicial; defina mínimo de reposição.
4. Para adicionar outro tamanho/cor, use **Adicionar tamanho ou cor**.
5. Para corrigir quantidade, use o ajuste de estoque com motivo.
6. Evite alterar a quantidade vendida manualmente sem justificativa.

## Registrar uma venda na loja
1. Em **Vendas**, selecione a peça e a quantidade.
2. Confira o total, desconto e cliente (se houver).
3. Se o pagamento já foi recebido, selecione Pix/dinheiro/cartão
   e **confirme a venda**.
4. Confira que a peça saiu do estoque e a venda apareceu no Financeiro.
5. O sistema registra a forma de pagamento informada; não confirma a
   transferência Pix nem realiza cobrança.

## Vender pelo WhatsApp/Instagram
1. Escolha a origem WhatsApp ou Instagram e adicione as peças.
2. Se ainda não recebeu, **salve como pedido pendente**.
3. Pendente NÃO reserva produto: antes de confirmar o pagamento,
   veja se as peças continuam disponíveis.
4. Após receber, conclua o pedido para fazer a baixa.

## Clientes
- Pesquise por nome, número ou Instagram.
- Cadastre apenas informações úteis para atender a cliente.
- Abra o histórico pelo botão **Compras**.
- Os links para WhatsApp e Instagram apenas abrem os aplicativos;
  não enviam mensagens automaticamente.
- Trate números e nomes como informações privadas.

## Financeiro e relatórios (administradora)
- **Faturamento:** valor das vendas concluídas.
- **Margem estimada:** faturamento menos custo conhecido das peças.
- **Resultado operacional estimado:** margem menos despesas operacionais
  cadastradas (não é lucro contábil).
- **Saldo de caixa:** entradas recebidas menos saídas registradas.
- Cadastre aluguel, embalagens e outras despesas para melhorar as estimativas.
- Cadastre o custo de cada roupa; se faltar, o sistema sinaliza a imprecisão.

## Segurança e cópia dos dados
- Nunca compartilhe sua senha e saia da conta em aparelhos compartilhados.
- Somente a administradora pode criar funcionários e exportar dados comerciais.
- O botão **Exportar dados comerciais** gera um JSON de consulta com
  informações de clientes. Armazene-o em local privado e protegido.
- Essa exportação NÃO é um backup completo e NÃO recupera as contas.
- O responsável técnico precisa realizar backups completos com pg_dump
  e testar restauração em um banco separado.

## Quando surgir um problema
- Se aparecer **401**, saia da conta e entre novamente.
- Se aparecer **500**, informe o horário e a mensagem ao responsável
  técnico; não reinicie ou limpe o banco por conta própria.
- Se o estoque não bate, confira Histórico de movimentações e pedidos
  antes de fazer ajuste com motivo.
- Nunca execute scripts SQL de limpeza quando houver vendas reais.

Boa operação com a LajuStore!
