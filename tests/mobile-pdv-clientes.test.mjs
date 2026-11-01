import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const load=path=>fs.readFile(new URL("../"+path,import.meta.url),"utf8");

test("PDV possui busca rápida, limite de saldo e carrinho com quantidades",async()=>{
 const jsx=await load("src/components/lajustore/V6.tsx");
 for(const item of ["pdvMobileView","filteredSaleVariants","addOneToCart","changeCartQuantity","lz-pdv-quick-picker","lz-cart-adjust","lz-mobile-pending-cards","lz-mobile-sales-cards"]){
  assert.ok(jsx.includes(item),item+" não encontrado");
 }
 assert.match(jsx,/if\(existing>=v\.quantidade\)/);
 assert.match(jsx,/if\(next>available\)/);
 assert.match(jsx,/disabled=\{busy\|\|insufficient\}/);
 assert.match(jsx,/setPdvMobileView\("pendentes"\)/);
 assert.match(jsx,/setPdvMobileView\("vendas"\)/);
});

test("Clientes possuem pesquisa, histórico e links apenas com telefone válido",async()=>{
 const jsx=await load("src/components/lajustore/V6.tsx");
 for(const item of ["clientMobileView","filteredClients","lz-mobile-client-cards","lz-client-search","lz-mobile-client-orders","whatsappCliente","instagramCliente"]){
  assert.ok(jsx.includes(item),item+" não encontrado");
 }
 assert.match(jsx,/digits\.length===10\|\|digits\.length===11/);
 assert.match(jsx,/digits\.startsWith\("55"\)/);
 assert.match(jsx,/rel="noopener noreferrer"/);
 assert.match(jsx,/startEditClient\(c\)/);
 assert.match(jsx,/setClientMobileView\("historico"\)/);
});

test("modos mobile escondem telas não selecionadas e preservam desktop",async()=>{
 const css=await load("src/components/lajustore/MobilePdvClients.css");
 const jsx=await load("src/components/lajustore/V6.tsx");
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.lz-pdv-mode-nova \.lz-pdv-pending-panel/);
 assert.match(css,/\.lz-pdv-mode-pendentes \.lz-pdv-create-area/);
 assert.match(css,/\.lz-clients-mode-lista \.lz-client-form-panel/);
 assert.match(css,/\.lz-clients-mode-formulario \.lz-client-list-panel/);
 assert.match(css,/\.lz-clients-mode-historico \.lz-client-list-panel/);
 assert.match(css,/\.lz-pdv-pending-panel>\.lz-table-wrap/);
 assert.match(css,/\.lz-client-list-panel>\.lz-table-wrap/);
 assert.ok(jsx.indexOf('import "./MobilePdvClients.css";')>jsx.indexOf('import "./MobileFix.css";'),
   "Os estilos para PDV/Clientes devem ser importados após o layout mobile V8");
});

test("cadastros e vendas ainda usam endpoints existentes; sem alterações no backend",async()=>{
 const jsx=await load("src/components/lajustore/V6.tsx");
 assert.match(jsx,/api\.post\("\/api\/v6\/vendas"/);
 assert.match(jsx,/api\.post\("\/api\/v7\/pendentes"/);
 assert.match(jsx,/api\.post\("\/api\/lajustore\/clientes"/);
 assert.match(jsx,/api\.patch\(\`\/api\/v6\/clientes\//);
 assert.match(jsx,/api\.get<Order\[\]>\(\`\/api\/v6\/clientes\//);
});
