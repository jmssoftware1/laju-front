import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");

test("Apenas a gestora pode desfazer vendas canceladas elegíveis",async()=>{
 const app=await read("src/components/lajustore/V6.tsx");
 assert.match(app,/cancelamento_reversivel\?:boolean/);
 assert.match(app,/manager&&o\.status==="cancelado"&&o\.cancelamento_reversivel/);
 assert.match(app,/openUndoCancel\(o\)/);
 assert.match(app,/Desfazer cancelamento/);
 assert.match(app,/undoTarget\.status/); // cheque de proteção na UI
});

test("Reversão exige justificativa, confirmação de ausência de devolução e servidor V9",async()=>{
 const app=await read("src/components/lajustore/V6.tsx");
 assert.match(app,/\/api\/v9\/vendas\/\$\{undoTarget\.id\}\/desfazer-cancelamento/);
 assert.match(app,/motivo:reason,confirmar_sem_devolucao:true/);
 assert.match(app,/undoReason\.trim\(\)\.length<8/);
 assert.match(app,/!undoNoRefund/);
 assert.match(app,/type="checkbox" required checked=\{undoNoRefund\}/);
 assert.match(app,/aria-modal="true"/);
 assert.match(app,/Nenhuma devolução real de dinheiro/i);
 assert.match(app,/Voltar sem alterar/);
 assert.match(app,/Cancelar venda/);
});

test("Exibição responsiva inclui CSS de confirmação",async()=>{
 const app=await read("src/components/lajustore/V6.tsx");
 const css=await read("src/components/lajustore/UndoCancellation.css");
 assert.match(app,/import "\.\/UndoCancellation\.css"/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/\.lz-undo-overlay/);
 assert.match(css,/\.lz-undo-dialog/);
 assert.match(css,/\.lz-undo-checkbox/);
});
