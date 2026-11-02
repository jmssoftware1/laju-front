import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {formatFinancialDate} from "../src/utils/formatFinancialDate.ts";

test("PostgreSQL DATE sem hora mostra o dia correto",()=>{
  assert.equal(formatFinancialDate("2026-11-01"),"01/11/2026");
  assert.equal(formatFinancialDate("2026-01-09"),"09/01/2026");
});
test("aceita DATE serializado como ISO com horário ou fuso sem mudar o dia",()=>{
  assert.equal(formatFinancialDate("2026-11-01T00:00:00.000Z"),"01/11/2026");
  assert.equal(formatFinancialDate("2026-11-01T12:00:00"),"01/11/2026");
  assert.equal(formatFinancialDate("2026-11-01 00:00:00"),"01/11/2026");
  assert.equal(formatFinancialDate("2026-11-01T00:00:00-03:00"),"01/11/2026");
});
test("nunca exibe Invalid Date nem aceita dia impossível",()=>{
  for(const value of ["","invalido","2026-02-29","2026-13-01","2026-11-00","2026-11-01T12:00:00T12:00:00",null,undefined]){
    assert.equal(formatFinancialDate(value),"—");
  }
  assert.equal(formatFinancialDate("2024-02-29"),"29/02/2024");
});
test("a tela financeira usa o formatador e não acrescenta outro horário",async()=>{
  const source=await fs.readFile(new URL("../src/components/lajustore/V6.tsx",import.meta.url),"utf8");
  assert.match(source,/formatFinancialDate\(l\.data_movimento\)/);
  assert.doesNotMatch(source,/l\.data_movimento\s*\+\s*"T12:00:00"/);
});

test("datas diárias dos relatórios não recebem horário duplicado",async()=>{
  const source=await fs.readFile(new URL("../src/components/lajustore/V6.tsx",import.meta.url),"utf8");
  const monthly=await fs.readFile(new URL("../src/components/lajustore/MonthlyReport.tsx",import.meta.url),"utf8");

  assert.match(source, /formatFinancialDate\(d\.dia\)/);
  assert.doesNotMatch(source, /d\.dia\s*\+\s*"T12:00:00"/);
  assert.match(source, /report\.dias\.map\(d=>\[formatFinancialDate\(d\.dia\)/);

  assert.match(monthly, /formatFinancialDate\(d\.dia\)/);
  assert.doesNotMatch(monthly, /const formatDay=/);

  // O PostgreSQL pode devolver DATE como timestamp ISO, sem mudar o dia civil.
  assert.equal(formatFinancialDate("2026-11-01T00:00:00.000Z"),"01/11/2026");
  assert.equal(formatFinancialDate("2026-11-02T00:00:00.000Z"),"02/11/2026");
  assert.equal(formatFinancialDate("2026-11-02"),"02/11/2026");
});
