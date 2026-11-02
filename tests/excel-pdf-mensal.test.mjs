import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {makeCommercialWorkbook} from "../src/utils/exportCommercialExcel.ts";

const names=["loja_produtos","loja_variantes","loja_clientes","loja_pedidos",
 "loja_pedido_itens","loja_financeiro","loja_fornecedores","loja_compras",
 "loja_compra_itens","loja_movimentos","loja_auditoria_v7",
 "loja_crediario","loja_crediario_parcelas","loja_crediario_pagamentos"];
function fixture(){
 const tables=Object.fromEntries(names.map(name=>[name,[]]));
 tables.loja_produtos=[{id:"1",nome:'=HYPERLINK("https://evil.example","click")',preco:"100.50",custo:"40.00",ativo:true}];
 tables.loja_clientes=[{id:"2",nome:"Cliente <Laju> & Julia",telefone:"01600012345",instagram:"@teste"}];
 tables.loja_financeiro=[{id:"3",tipo:"entrada",valor:"100.50",data_movimento:"2026-11-01T00:00:00.000Z"}];
 return {formato:"lajustore-exportacao-comercial-v1",exportado_em:"2026-11-01T12:00:00.000Z",
  contem_senhas:false,restauracao_automatica:false,tabelas:tables};
}
async function unzipStored(blob){
 const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer);
 let offset=0;const entries={};const decoder=new TextDecoder();
 while(offset+30<=bytes.length&&view.getUint32(offset,true)===0x04034b50){
  const nameLength=view.getUint16(offset+26,true);
  const extraLength=view.getUint16(offset+28,true);
  const size=view.getUint32(offset+18,true);
  const mode=view.getUint16(offset+8,true);
  assert.equal(mode,0,"XLSX deve usar ZIP armazenado");
  const name=decoder.decode(bytes.subarray(offset+30,offset+30+nameLength));
  const dataStart=offset+30+nameLength+extraLength;
  entries[name]=decoder.decode(bytes.subarray(dataStart,dataStart+size));
  offset=dataStart+size;
 }
 assert.equal(view.getUint32(offset,true),0x02014b50,"Diretório central do ZIP presente");
 return entries;
}
test("gera XLSX ZIP real com 15 abas (resumo + 14 tabelas comerciais)",async()=>{
 const file=makeCommercialWorkbook(fixture());
 assert.equal(file.type,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
 const entries=await unzipStored(file);
 assert.ok(entries["[Content_Types].xml"]);
 assert.ok(entries["xl/workbook.xml"]);
 assert.ok(entries["xl/styles.xml"]);
 assert.ok(entries["xl/worksheets/sheet15.xml"]);
 assert.equal(Object.keys(entries).filter(x=>x.startsWith("xl/worksheets/sheet")).length,15);
 assert.match(entries["xl/workbook.xml"],/name="Financeiro"/);
 assert.match(entries["xl/worksheets/sheet1.xml"],/NÃO é backup restaurável/);
});
test("mantém dados em colunas e não interpreta textos com = como fórmulas",async()=>{
 const entries=await unzipStored(makeCommercialWorkbook(fixture()));
 const products=entries["xl/worksheets/sheet2.xml"];
 assert.match(products,/=HYPERLINK/);
 assert.doesNotMatch(products,/<f>/);
 assert.match(products,/<v>100.5<\/v>/);
 const clients=entries["xl/worksheets/sheet4.xml"];
 assert.match(clients,/Cliente &lt;Laju&gt; &amp; Julia/);
 assert.match(clients,/01600012345/);
});
test("recusa exportação incompatível ou com dados incompletos",()=>{
 assert.throws(()=>makeCommercialWorkbook({...fixture(),contem_senhas:true}),/compatível/);
 const bad=fixture();delete bad.tabelas.loja_pedidos;
 assert.throws(()=>makeCommercialWorkbook(bad),/incompleta/);
});
test("relatório do mês exige gestora, autenticação e impressão A4",async()=>{
 const app=await fs.readFile(new URL("../src/app/index.tsx",import.meta.url),"utf8");
 const screen=await fs.readFile(new URL("../src/components/lajustore/MonthlyReport.tsx",import.meta.url),"utf8");
 const css=await fs.readFile(new URL("../src/components/lajustore/MonthlyReport.css",import.meta.url),"utf8");
 const panel=await fs.readFile(new URL("../src/components/lajustore/V6.tsx",import.meta.url),"utf8");
 assert.match(app,/relatorio-mensal" element=\{<Private><MonthlyReport\/><\/Private>\}/);
 assert.match(screen,/operador\?\.role==="gestor"/);
 assert.match(screen,/api\/operacao\/financeiro\/indicadores/);
 assert.match(screen,/api\/v6\/relatorios/);
 assert.match(screen,/api\/operacao\/estoque\/alertas/);
 assert.match(screen,/window\.print\(\)/);
 assert.match(css,/@page\{size:A4/);
 assert.match(css,/@media print/);
 assert.match(panel,/makeCommercialWorkbook\(data\)/);
 assert.match(panel,/exportCommercialData/);
 assert.match(panel,/openMonthlyReport/);
});
