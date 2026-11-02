import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");

test("login começa oculto e alterna visibilidade sem alterar a senha enviada",async()=>{
  const source=await read("src/components/auth/Login.tsx");
  assert.match(source,/const \[mostrarSenha, setMostrarSenha\] = useState\(false\)/);
  assert.match(source,/type=\{mostrarSenha \? "text" : "password"\}/);
  assert.match(source,/onClick=\{\(\) => setMostrarSenha\(visible => !visible\)\}/);
  assert.match(source,/value=\{pin\}/);
  assert.match(source,/senha: pin/);
  assert.match(source,/setMostrarSenha\(false\)/);
});

test("olho é um botão acessível, não submete o formulário e funciona com teclado",async()=>{
  const source=await read("src/components/auth/Login.tsx");
  assert.match(source,/className="auth-password-toggle"/);
  assert.match(source,/type="button"\s+className="auth-password-toggle"/);
  assert.match(source,/aria-label=\{mostrarSenha \? "Ocultar senha" : "Mostrar senha"\}/);
  assert.match(source,/aria-pressed=\{mostrarSenha\}/);
  assert.match(source,/aria-controls="input-senha"/);
  assert.match(source,/aria-hidden="true"/);
  assert.match(source,/mostrarSenha \? "visibility_off" : "visibility"/);
  assert.match(source,/autoComplete="current-password"/);
  assert.match(source,/disabled=\{carregando\}/);
});

test("botão do olho respeita a identidade rosé e o tamanho mínimo de toque no celular",async()=>{
  const css=await read("src/components/auth/AuthV8.css");
  assert.match(css,/\.auth-page \.auth-password-control\s*\{\s*position:relative/);
  assert.match(css,/\.auth-page \.auth-field \.auth-password-control input\[type="password"\]/);
  assert.match(css,/padding-right:61px/);
  assert.match(css,/\.auth-page \.auth-password-toggle\s*\{/);
  assert.match(css,/width:44px/);
  assert.match(css,/height:44px/);
  assert.match(css,/\.auth-page \.auth-password-toggle:focus-visible/);
});
