import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const load = file => fs.readFile(new URL("../" + file, import.meta.url),"utf8");

test("logo oficial está preservada como arquivo local e não depende de URL externa", async()=>{
  const img=await fs.readFile(new URL("../public/brand/laju-store-logo.jpg",import.meta.url));
  assert.ok(img.length>500,"Arquivo da marca está vazio");
  assert.equal(img[0],0xff);
  assert.equal(img[1],0xd8);
  assert.equal(img.at(-2),0xff);
  assert.equal(img.at(-1),0xd9);
});

test("a tela de login utiliza a marca oficial e mantém o formulário",async()=>{
  const s=await load("src/components/auth/Login.tsx");
  assert.match(s,/\/brand\/laju-store-logo\.jpg/);
  assert.match(s,/autoComplete="username"/);
  assert.match(s,/autoComplete="current-password"/);
  assert.match(s,/type="submit"/);
});

test("navegação completa e navegação mobile respeitam os mesmos destinos",async()=>{
  const s=await load("src/components/lajustore/V6.tsx");
  for(const id of ['inicio','estoque','pdv','clientes','financeiro','fornecedores','relatorios','config']){
    assert.ok(s.includes('id:"'+id+'"'),"Módulo ausente: "+id);
  }
  assert.match(s,/lz-mobile-topbar/);
  assert.match(s,/lz-mobile-bottom-nav/);
  assert.match(s,/lz-drawer-backdrop/);
  assert.match(s,/aria-expanded=\{navOpen\}/);
  assert.match(s,/setNavOpen\(false\)/);
});

test("tema contempla tablet, celular e acessibilidade",async()=>{
  const css=await load("src/components/lajustore/V8.css");
  assert.match(css,/@media\(max-width:1024px\)/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:540px\)/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/focus-visible/);
});

test("favicon e configuração PWA usam a marca rosé",async()=>{
  const html=await load("index.html");
  assert.match(html,/\/brand\/laju-mark.svg/);
  const manifest=JSON.parse(await load("public/manifest.json"));
  assert.equal(manifest.theme_color,"#f0b1aa");
  assert.ok(manifest.icons.some(icon=>icon.src.includes("laju")));
});
