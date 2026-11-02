import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read=file=>fs.readFile(new URL("../"+file,import.meta.url),"utf8");

test("painel consulta alertas reais de reposição e filtra estoque",async()=>{
 const src=await read("src/components/lajustore/V6.tsx");
 assert.match(src,/\/api\/operacao\/estoque\/alertas/);
 assert.match(src,/stockAlerts\.itens\.slice\(0,5\)/);
 assert.match(src,/setOnlyLow\(true\)/);
 assert.match(src,/setStockMobileView\("lista"\)/);
});

test("relatórios separam vendas, despesas e caixa",async()=>{
 const src=await read("src/components/lajustore/V6.tsx");
 assert.match(src,/\/api\/operacao\/financeiro\/indicadores/);
 assert.match(src,/indicators\.resultado_operacional_estimado/);
 assert.match(src,/indicators\.despesas_operacionais/);
 assert.match(src,/indicators\.saldo_caixa/);
 assert.match(src,/indicators\.pecas_sem_custo/);
 assert.match(src,/Margem de vendas estimada/);
});

test("exportação pede autorização da API e não confunde com backup",async()=>{
 const src=await read("src/components/lajustore/V6.tsx");
 assert.match(src,/\/api\/operacao\/exportacao\/dados-comerciais/);
 assert.match(src,/responseType:"blob"/);
 assert.match(src,/if\(!manager \|\| busy\)return/);
 assert.match(src,/URL\.revokeObjectURL/);
 assert.match(src,/Não recuperam automaticamente o banco/);
});

test("layout financeiro é responsivo e data respeita fuso comercial",async()=>{
 const src=await read("src/components/lajustore/V6.tsx");
 const css=await read("src/components/lajustore/Operacao.css");
 assert.match(src,/timeZone:"America\/Sao_Paulo"/);
 assert.match(src,/import "\.\/Operacao.css"/);
 assert.match(css,/@media\(max-width:1200px\)/);
 assert.match(css,/@media\(max-width:540px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
});
