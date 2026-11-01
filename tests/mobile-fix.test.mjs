import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(new URL("../"+path,import.meta.url),"utf8");

test("sobrescreve o menu horizontal herdado da V6 no tablet/celular",async()=>{
  const v6=await read("src/components/lajustore/V6.css");
  const fix=await read("src/components/lajustore/MobileFix.css");
  const source=await read("src/components/lajustore/V6.tsx");
  assert.match(v6,/\.lz-sidebar nav\{display:flex;overflow-x:auto/);
  assert.match(fix,/@media\s*\(max-width:1024px\)/);
  assert.match(fix,/\.lz-shell \.lz-sidebar nav\s*\{\s*display:grid;/);
  assert.match(fix,/grid-template-columns:minmax\(0,1fr\)/);
  assert.match(fix,/overflow:visible/);
  assert.match(fix,/\.lz-shell \.lz-side-bottom\s*\{\s*display:block;/);
  assert.ok(source.indexOf('import "./MobileFix.css";') > source.indexOf('import "./V8.css";'),
    "Estilo de correção deve ser importado depois da V8");
});

test("o estoque possui alternância mobile e cartões sem fotos",async()=>{
  const source=await read("src/components/lajustore/V6.tsx");
  const css=await read("src/components/lajustore/MobileFix.css");
  assert.match(source,/stockMobileView/);
  assert.match(source,/lz-mobile-stock-toggle/);
  assert.match(source,/lz-mobile-stock-cards/);
  assert.match(source,/lz-stock-card-count/);
  assert.match(source,/aria-pressed=\{stockMobileView==="lista"\}/);
  assert.match(source,/setStockMobileView\("lista"\)/);
  assert.match(css,/\.lz-shell \.lz-stock-lista \.lz-stock-edit-area/);
  assert.match(css,/\.lz-shell \.lz-stock-cadastro \.lz-stock-list-panel/);
  assert.match(css,/\.lz-shell \.lz-stock-table\s*\{\s*display:none/);
});

test("navegação inferior e acessibilidade continuam presentes",async()=>{
  const source=await read("src/components/lajustore/V6.tsx");
  const css=await read("src/components/lajustore/MobileFix.css");
  assert.match(source,/lz-mobile-bottom-nav/);
  assert.match(source,/aria-controls="lz-navigation"/);
  assert.match(source,/event\.key==="Escape"/);
  assert.match(source,/document\.body\.style\.overflow="hidden"/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/min-height:49px/);
});
