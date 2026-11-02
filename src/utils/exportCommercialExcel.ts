/**
 * Gera uma planilha Excel XLSX real, sem bibliotecas externas.
 * O arquivo contém um resumo e as 11 tabelas comerciais exportadas pela API.
 * Todas as células de texto são inline strings (nunca fórmulas).
 * Não há importação/restauração automática a partir da planilha.
 */

export type CommercialExport = {
 formato: string;
 exportado_em: string;
 contem_senhas: boolean;
 restauracao_automatica: boolean;
 tabelas: Record<string, Array<Record<string, unknown>>>;
};

const TABLES: ReadonlyArray<{table: string; title: string; fields: string[]}> = [
 {table:"loja_produtos",title:"Produtos",fields:["id","nome","descricao","categoria","preco","custo","ativo","criado_em"]},
 {table:"loja_variantes",title:"Variacoes",fields:["id","produto_id","sku","tamanho","cor","quantidade","minimo"]},
 {table:"loja_clientes",title:"Clientes",fields:["id","nome","telefone","instagram","criado_em"]},
 {table:"loja_pedidos",title:"Pedidos",fields:["id","cliente_id","canal","status","criado_em","desconto","forma_pagamento","observacao","finalizado_em","criado_por","origem_fluxo"]},
 {table:"loja_pedido_itens",title:"Itens de pedidos",fields:["id","pedido_id","variante_id","quantidade","preco_unitario","custo_unitario"]},
 {table:"loja_financeiro",title:"Financeiro",fields:["id","tipo","categoria","descricao","valor","status","data_movimento","pedido_id","compra_id","criado_em","registrado_por"]},
 {table:"loja_fornecedores",title:"Fornecedores",fields:["id","nome","telefone","email","observacao","ativo","criado_em"]},
 {table:"loja_compras",title:"Compras",fields:["id","fornecedor_id","observacao","total","criado_em","registrado_por"]},
 {table:"loja_compra_itens",title:"Itens de compras",fields:["id","compra_id","variante_id","quantidade","custo_unitario"]},
 {table:"loja_movimentos",title:"Movimentacoes",fields:["id","variante_id","pedido_id","diferenca","motivo","criado_em"]},
 {table:"loja_auditoria_v7",title:"Auditoria V7",fields:["id","usuario_id","entidade","registro_id","operacao","detalhes","criado_em"]}
];

const esc=(value:string)=>value
 .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"")
 .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;").replace(/'/g,"&apos;");

function colName(index:number){
 let x=index+1,s="";
 while(x>0){x--;s=String.fromCharCode(65+(x%26))+s;x=Math.floor(x/26);}
 return s;
}
const numberFields=new Set(["preco","custo","quantidade","minimo","diferenca","preco_unitario","custo_unitario","desconto","valor","total"]);
const currencyFields=new Set(["preco","custo","preco_unitario","custo_unitario","desconto","valor","total"]);
function xmlCell(value:unknown,ref:string,key:string,style=0){
 if(value===null||value===undefined||value==="")return "";
 const raw=typeof value==="object"?JSON.stringify(value):String(value);
 const numeric=numberFields.has(key)&&/^-?\d+(?:\.\d+)?$/.test(raw)&&Number.isFinite(Number(raw))&&Math.abs(Number(raw))<1e14;
 if(numeric)return `<c r="${ref}" s="${currencyFields.has(key)?3:style}"><v>${Number(raw)}</v></c>`;
 return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(raw)}</t></is></c>`;
}
function sheetXml(title:string,records:Array<Record<string,unknown>>,preferred:string[],subtitle:string){
 const extras=Array.from(new Set(records.flatMap(row=>Object.keys(row)))).filter(key=>!preferred.includes(key));
 const fields=[...preferred,...extras];
 if(!fields.length)fields.push("informacao");
 const last=colName(fields.length-1);
 const rows=[
  `<row r="1" ht="38" customHeight="1">${xmlCell(title,"A1","",1)}</row>`,
  `<row r="2" ht="23" customHeight="1">${xmlCell(subtitle,"A2","")}</row>`,
  `<row r="4" ht="26" customHeight="1">${fields.map((x,i)=>xmlCell(x,colName(i)+"4","",2)).join("")}</row>`
 ];
 for(let i=0;i<records.length;i++){
  const record=records[i],r=i+5;
  rows.push(`<row r="${r}">${fields.map((key,j)=>xmlCell(record[key],colName(j)+r,key)).join("")}</row>`);
 }
 const columns=fields.map((field,i)=>{
  const width=field.includes("descricao")||field==="observacao"||field==="detalhes"?34:
   field.includes("criado")||field.includes("finalizado")||field.includes("movimento")?26:
   field==="nome"?27:field.includes("sku")?21:field.includes("telefone")?20:17;
  return `<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`;
 }).join("");
 const endRow=Math.max(4,records.length+4);
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${last}${endRow}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="19"/>
<cols>${columns}</cols>
<sheetData>${rows.join("")}</sheetData>
<mergeCells count="2"><mergeCell ref="A1:${last}1"/><mergeCell ref="A2:${last}2"/></mergeCells>
<autoFilter ref="A4:${last}${endRow}"/>
<pageMargins left="0.4" right="0.4" top="0.7" bottom="0.7" header="0.3" footer="0.3"/>
</worksheet>`;
}
function summarySheet(exported:CommercialExport){
 const date=exported.exportado_em;
 const rows: Array<Record<string,unknown>> = [
  {informacao:"Origem",valor:"LajuStore — exportação comercial"},
  {informacao:"Gerado em",valor:date},
  {informacao:"Finalidade",valor:"Consulta e arquivo de referência; NÃO é backup restaurável."},
  {informacao:"Importação automática",valor:"Não disponível"},
  {informacao:"Usuários e senhas",valor:"Não incluídos"},
  {informacao:"Segurança",valor:"Contém informações de clientes. Guarde em local privado."},
  ...TABLES.map(t=>({informacao:t.title,valor:exported.tabelas[t.table].length}))
 ];
 return sheetXml("LAJU STORE | DADOS COMERCIAIS",rows,["informacao","valor"],"Arquivo completo para consulta • não substitui backup PostgreSQL");
}
function stylesXml(){
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="18"/><color rgb="FF9A455C"/><name val="Aptos Display"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF9A455C"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

type Entry={name:string;data:Uint8Array};
const encoder=new TextEncoder();
const crcTable=Array.from({length:256},(_,i)=>{
 let n=i;
 for(let j=0;j<8;j++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;
 return n>>>0;
});
function crc32(bytes:Uint8Array){
 let crc=0xffffffff;
 for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);
 return (crc^0xffffffff)>>>0;
}
function zipStore(entries:Entry[]){
 const local:Uint8Array[]=[];const directory:Uint8Array[]=[];let offset=0;
 for(const {name,data} of entries){
  const n=encoder.encode(name),crc=crc32(data);
  const l=new Uint8Array(30+n.length+data.length),v=new DataView(l.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);
  v.setUint16(8,0,true);v.setUint32(14,crc,true);
  v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);
  v.setUint16(26,n.length,true);l.set(n,30);l.set(data,30+n.length);local.push(l);
  const c=new Uint8Array(46+n.length),w=new DataView(c.buffer);
  w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);
  w.setUint16(8,0x0800,true);w.setUint16(10,0,true);
  w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);
  w.setUint16(28,n.length,true);w.setUint32(42,offset,true);c.set(n,46);
  directory.push(c);offset+=l.length;
 }
 const size=directory.reduce((sum,b)=>sum+b.length,0);
 const end=new Uint8Array(22),e=new DataView(end.buffer);
 e.setUint32(0,0x06054b50,true);
 e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);
 e.setUint32(12,size,true);e.setUint32(16,offset,true);
 return new Blob([...local,...directory,end] as BlobPart[],{
  type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
 });
}

export function makeCommercialWorkbook(data:CommercialExport):Blob{
 if(data?.formato!=="lajustore-exportacao-comercial-v1"||!data.tabelas||data.contem_senhas!==false){
  throw Error("A exportação recebida não é um arquivo comercial compatível com a LajuStore.");
 }
 for(const spec of TABLES){
  if(!Array.isArray(data.tabelas[spec.table]))throw Error("A exportação está incompleta: "+spec.title);
  if(data.tabelas[spec.table].length>5000)throw Error("Tabela acima do limite de segurança: "+spec.title);
 }
 const sheets=[{title:"Resumo",xml:summarySheet(data)},...TABLES.map(t=>({
  title:t.title,
  xml:sheetXml(t.title.toLocaleUpperCase("pt-BR"),data.tabelas[t.table],t.fields,
   `${data.tabelas[t.table].length} registros • dados comerciais da LajuStore`)
 }))];
 const worksheetTypes=sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
 const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${worksheetTypes}</Types>`;
 const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
 const book=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${esc(s.title)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`;
 const bookRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
 const file=(name:string,source:string):Entry=>({name,data:encoder.encode(source)});
 return zipStore([
  file("[Content_Types].xml",contentTypes),
  file("_rels/.rels",rootRels),
  file("xl/workbook.xml",book),
  file("xl/_rels/workbook.xml.rels",bookRels),
  file("xl/styles.xml",stylesXml()),
  ...sheets.map((sheet,i)=>file(`xl/worksheets/sheet${i+1}.xml`,sheet.xml))
 ]);
}
