# LajuStore — PDV e Clientes no celular

## O que mudou
Esta versão é **apenas frontend**: nenhum dado foi excluído, nenhuma migração SQL, e nenhuma rota foi modificada.

### PDV
- Seletor de tarefas: **Nova venda / Pendentes / Histórico**.
- Busca por nome, SKU, cor e tamanho; mostra variações com saldo maior que zero.
- Botão **Adicionar** coloca 1 peça no carrinho.
- Carrinho com botões **+ e −**, limite pelo saldo disponível e subtotal.
- Mantidos os fluxos atuais de venda paga (baixa imediata) e pedido pendente (não reserva estoque).
- Pendentes e vendas recentes em cartões, sem tabela horizontal no celular.
- Alertas quando um pedido pendente já não possui peças suficientes.

### Clientes
- Abre na consulta de clientes. Alterna entre **Meus clientes** e **Novo cliente**.
- Pesquisa por nome, telefone e Instagram.
- Cartões com telefone, Instagram, links para WhatsApp/Instagram, compras e edição.
- Link WhatsApp **só é exibido quando o número contém 10/11 dígitos brasileiros**, ou 12/13 com prefixo 55. Outros formatos não geram link.
- Histórico de compras aparece em cartões com opção de voltar.
- Desktop preserva formulário e tabela, agora com busca adicional.

## Segurança e escopo
- Não envia mensagens automaticamente; abre WhatsApp ou Instagram por clique.
- Não realiza cobrança via Pix/cartão: apenas registra pagamento informado.
- Não reserva mercadorias para pedidos pendentes; a verificação do estoque é feita novamente pelo backend ao concluir.
- Não foram alterados usuários, permissões, banco, API, configurações do Render ou Supabase.
- Sem fotos de produtos, conforme definição do projeto.

## Conferência antes de publicar
1. Abra o Deploy Preview da Netlify para o PR (se disponível).
2. No celular, entre em **Vendas**, procure uma blusa por nome/cor/tamanho e adicione 2 unidades.
3. Diminua e aumente a quantidade, até o limite disponível. Confira o total.
4. Salve um pedido fictício como **pendente**. Ele deverá aparecer em Pendentes e não reduzir o estoque.
5. Confirme o pagamento fictício e confira o estoque e o financeiro.
6. Veja **Histórico** e confira o pedido concluído.
7. Entre em **Clientes**: teste busca, cadastro, edição e histórico.
8. Se usar contato com telefone válido, teste abrir WhatsApp; ele não deve enviar mensagem automaticamente.
9. Verifique Vendas e Clientes também no computador; a versão desktop mantém seus formulários e tabelas.
10. Confira o mobile em 320, 375, 390 e 768px, incluindo teclado virtual.

## Voltar à versão anterior
Antes do merge, feche o PR e mantenha a versão atual. Depois, use GitHub **Revert** e publique o revert na Netlify, ou publique temporariamente um deploy antigo bem-sucedido. **Retornar a versão do frontend não desfaz vendas/dados do banco**.
