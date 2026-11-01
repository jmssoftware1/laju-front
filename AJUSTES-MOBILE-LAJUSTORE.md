# LajuStore — Ajustes de celular (menu + estoque)

## O que foi corrigido
- **Menu "Mais" no celular:** os 8 módulos voltam a aparecer em uma lista vertical, com ícones, nomes completos e rolagem dentro da gaveta.
- **Perfil e "Sair da conta":** visíveis no final do menu.
- **Navegação inferior:** preserva Dashboard, Estoque, Vendas, Clientes e Mais; maior área de toque.
- **Estoque no celular:** dois modos, "Roupas cadastradas" e "Cadastrar / ajustar". A tela abre na lista de roupas para consulta rápida.
- **Lista em cartões:** nome, categoria, SKU, tamanho, cor, saldo, mínimo e preço, além de ações de edição para administradora.
- **Desktop:** mantém formulário e tabela existentes. Regras de negócios, endpoints, usuários e Supabase inalterados.
- **Edição:** o botão "Editar produto" mostra o formulário; "Tamanho / cor" abre o editor da variação.
- **Sem fotos:** cadastro continua independente de imagens, conforme definido.

## Como testar antes de publicar
Abra o Deploy Preview da Netlify (se habilitado) e:
1. No Android e iPhone: toque **Mais**; deve abrir uma lista vertical com os oito módulos. Role até o fim e veja "Sair da conta".
2. Abra o estoque: deve mostrar "Roupas cadastradas" primeiro, sem precisar passar por um formulário longo.
3. Toque "Cadastrar / ajustar": veja formulário de roupa, variações e movimentações.
4. Cadastre uma roupa de teste e confirme que ela aparece na lista.
5. Toque para editar uma roupa e a variação (administradora). Confirme que as quantidades não se alteram sozinhas.
6. Confira Dashboard, Vendas, Clientes, Financeiro e Relatórios no menu "Mais".
7. Teste orientação retrato/paisagem e rolagem com teclado virtual.
8. Confira a mesma página no notebook; a tabela e os dois painéis continuam normalmente.

## Publicação e reversão
Esta mudança afeta só o frontend, sem migração ou atualização do Render.
Se estiver aprovada no preview, integre o PR na `main` para a Netlify atualizar.
Se der problema, use `Revert` no PR/commit com um novo PR ou publique um
deploy anterior pela Netlify e reverta o código para evitar nova sobrescrita.
