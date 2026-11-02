import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read=file=>fs.readFile(new URL("../"+file,import.meta.url),"utf8");

test("PDV da Julia oferece Conta do cliente e exige cliente e parcelas",async()=>{
 const source=await read("src/components/lajustore/V6.tsx");
 assert.match(source,/Conta do cliente \/ Crediário/);
 assert.match(source,/payment==="crediario"&&manager/);
 assert.match(source,/required=\{payment==="crediario"\}/);
 assert.match(source,/numero_parcelas:Number\(creditInstallments\)/);
 assert.match(source,/primeiro_vencimento:creditFirstDue/);
 assert.match(source,/intervalo_dias:Number\(creditDays\)/);
 assert.match(source,/setPdvMobileView\(isCredit\?"crediario":"vendas"\)/);
});

test("Clientes e PDV compartilham painel Em aberto protegido",async()=>{
 const source=await read("src/components/lajustore/V6.tsx");
 const panel=await read("src/components/lajustore/CrediarioPanel.tsx");
 assert.match(source,/showClientCredit/);
 assert.match(source,/selectedCreditClient/);
 assert.match(source,/CrediarioPanel refreshKey=\{creditRefreshKey\}/);
 assert.match(panel,/\/api\/v8\/crediario/);
 assert.match(panel,/situacao:filter/);
 assert.match(panel,/clientId\?\{cliente_id:clientId\}/);
 assert.match(panel,/resumo/);
 assert.match(panel,/parcelas/);
 assert.match(panel,/pagamentos/);
});

test("registro de Pix exige confirmação, chave de idempotência e conferência do banco",async()=>{
 const panel=await read("src/components/lajustore/CrediarioPanel.tsx");
 assert.match(panel,/crypto\.randomUUID\(\)/);
 assert.match(panel,/chave_operacao:key/);
 assert.match(panel,/window\.confirm/);
 assert.match(panel,/Registre somente após confirmar o recebimento no banco/);
 assert.match(panel,/saldo em aberto/);
});

test("CSS mantém crediário utilizável em celular e desktop",async()=>{
 const css=await read("src/components/lajustore/Crediario.css");
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.lz-pdv-mode-crediario/);
 assert.match(css,/\.lz-clients-mode-crediario/);
 assert.match(css,/\.lz-crediario-pay/);
});
