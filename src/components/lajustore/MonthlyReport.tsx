import {useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import axios from "axios";
import {api} from "../../utils/axios";
import {useAuth} from "../../context/AuthContext";
import "./MonthlyReport.css";

type Report={
 de:string;ate:string;
 totais:{vendas:number;faturamento:number};
 canais:Array<{canal:string;vendas:number;total:string}>;
 maisVendidos:Array<{nome:string;tamanho:string;cor:string;pecas:number}>;
 dias:Array<{dia:string;vendas:number;bruto:string}>;
};
type Finance={
 de:string;ate:string;vendas:number;faturamento:number;descontos:number;
 custo_pecas_conhecido:number;margem_vendas_estimada:number;
 despesas_operacionais:number;resultado_operacional_estimado:number;
 entradas_caixa:number;saidas_caixa:number;saldo_caixa:number;
 pecas_sem_custo:number;aviso:string;
};
type Alerts={total:number;zerados:number;itens:Array<{
 variante_id:number;nome:string;tamanho:string;cor:string;quantidade:number;minimo:number
}>};
const currency=(value:unknown)=>Number(value||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const monthNow=()=>{
 const parts=new Intl.DateTimeFormat("en-CA",{
  timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit"
 }).formatToParts(new Date());
 const year=parts.find(part=>part.type==="year")?.value;
 const month=parts.find(part=>part.type==="month")?.value;
 return `${year}-${month}`;
};
const formatDay=(iso:string)=>{
 const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||"");
 return m?`${m[3]}/${m[2]}/${m[1]}`:"—";
};
const monthLabel=(value:string)=>{
 const [y,m]=value.split("-").map(Number);
 return new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC",month:"long",year:"numeric"}).format(new Date(Date.UTC(y,m-1,1)));
};
function datesForMonth(month:string){
 const [year,number]=month.split("-").map(Number);
 if(!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month)||!Number.isInteger(year)||!Number.isInteger(number))return null;
 return {de:month+"-01",ate:new Date(Date.UTC(year,number,0)).toISOString().slice(0,10)};
}
const errorText=(e:unknown)=>axios.isAxiosError(e)
 ?(typeof e.response?.data?.mensagem==="string"?e.response.data.mensagem:"Não foi possível consultar o relatório.")
 :e instanceof Error?e.message:"Não foi possível consultar o relatório.";

export default function MonthlyReport(){
 const navigate=useNavigate();
 const {operador}=useAuth();
 const isManager=operador?.role==="gestor";
 const [month,setMonth]=useState(()=>{
  const supplied=new URLSearchParams(window.location.search).get("mes")||"";
  return datesForMonth(supplied)?supplied:monthNow();
 });
 const [report,setReport]=useState<Report|null>(null);
 const [finance,setFinance]=useState<Finance|null>(null);
 const [alerts,setAlerts]=useState<Alerts|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [retry,setRetry]=useState(0);
 const dates=useMemo(()=>datesForMonth(month),[month]);
 useEffect(()=>{
  if(!isManager||!dates){setLoading(false);return;}
  let cancelled=false;
  setLoading(true);setError("");setReport(null);setFinance(null);setAlerts(null);
  void Promise.all([
   api.get<Report>("/api/v6/relatorios",{params:dates}),
   api.get<Finance>("/api/operacao/financeiro/indicadores",{params:dates}),
   api.get<Alerts>("/api/operacao/estoque/alertas")
  ]).then(([a,b,c])=>{
   if(!cancelled){setReport(a.data);setFinance(b.data);setAlerts(c.data);}
  }).catch(e=>{if(!cancelled)setError(errorText(e));})
   .finally(()=>{if(!cancelled)setLoading(false);});
  return ()=>{cancelled=true;};
 },[isManager,dates,retry]);
 if(!isManager)return <main className="monthly-screen"><p>Somente a administradora pode consultar relatórios financeiros.</p>
  <button className="monthly-button" onClick={()=>navigate("/lajustore")}>Voltar para a loja</button></main>;
 const channels=report?.canais||[];
 const top=Math.max(1,...channels.map(c=>Number(c.total)));
 const sellers=report?.maisVendidos.slice(0,6)||[];
 const label=monthLabel(month);
 return <div className="monthly-screen">
  <div className="monthly-toolbar">
   <button type="button" className="monthly-back" onClick={()=>navigate("/lajustore")}>← Voltar para a LajuStore</button>
   <label>Mês de referência <input type="month" value={month} min="2020-01" max="2099-12" onChange={e=>setMonth(e.target.value)}/></label>
   <button type="button" className="monthly-button" disabled={loading||!finance||!report} onClick={()=>window.print()}>
    <span aria-hidden="true">▤</span> Imprimir / Salvar em PDF
   </button>
  </div>
  <main className="monthly-page" aria-label="Relatório mensal LajuStore">
   <header className="monthly-head">
    <div className="monthly-brand"><img src="/brand/laju-store-logo.jpg" alt="Laju Store" width="58" height="58"/>
     <div><strong>LAJU STORE</strong><small>GESTÃO DA LOJA • RELATÓRIO MENSAL</small></div></div>
    <div className="monthly-heading">
     <p>RESUMO DO MÊS</p><h1>{label}</h1>
     <span>Vendas, caixa e desempenho da loja</span>
    </div>
   </header>
   {loading&&<section className="monthly-message" role="status">Preparando o relatório do mês...</section>}
   {error&&<section className="monthly-message monthly-error" role="alert">{error}
    <button type="button" onClick={()=>setRetry(n=>n+1)}>Tentar novamente</button>
   </section>}
   {!loading&&!error&&finance&&report&&<div className="monthly-report-body">
    <section className="monthly-kpis" aria-label="Indicadores principais">
     <article><span>Faturamento de vendas</span><strong>{currency(finance.faturamento)}</strong><small>{finance.vendas} vendas concluídas</small></article>
     <article><span>Margem de vendas estimada</span><strong>{currency(finance.margem_vendas_estimada)}</strong><small>Descontado custo conhecido das peças</small></article>
     <article><span>Despesas operacionais</span><strong>{currency(finance.despesas_operacionais)}</strong><small>Despesas registradas no mês</small></article>
     <article className="monthly-accent"><span>Resultado operacional estimado</span><strong>{currency(finance.resultado_operacional_estimado)}</strong><small>Não equivale a lucro contábil</small></article>
    </section>
    <section className="monthly-section monthly-cash">
     <div className="monthly-section-heading"><span>01</span><div><h2>Movimentação do caixa</h2><p>Entradas e saídas efetivamente registradas no período</p></div></div>
     <div className="monthly-cash-grid">
      <div><small>Entradas</small><strong>{currency(finance.entradas_caixa)}</strong></div>
      <div><small>Saídas</small><strong>{currency(finance.saidas_caixa)}</strong></div>
      <div className="monthly-cash-balance"><small>Saldo do período</small><strong>{currency(finance.saldo_caixa)}</strong></div>
     </div>
     <p className="monthly-note">Caixa e resultado operacional são indicadores diferentes. Compras de mercadorias e estornos podem afetar o caixa.</p>
    </section>
    <div className="monthly-columns">
     <section className="monthly-section">
      <div className="monthly-section-heading"><span>02</span><div><h2>Vendas por canal</h2><p>Participação no faturamento</p></div></div>
      {channels.length?channels.map(c=><div key={c.canal} className="monthly-channel">
       <div><strong>{c.canal==="loja"?"Loja física":c.canal==="whatsapp"?"WhatsApp":c.canal==="instagram"?"Instagram":c.canal}</strong>
        <small>{c.vendas} vendas · {currency(c.total)}</small></div>
       <div className="monthly-bar"><span style={{width:`${Math.max(0,Math.min(100,Number(c.total)/top*100))}%`}}/></div>
      </div>):<p className="monthly-empty">Sem vendas no período.</p>}
     </section>
     <section className="monthly-section">
      <div className="monthly-section-heading"><span>03</span><div><h2>Peças mais vendidas</h2><p>Ranking por quantidade</p></div></div>
      {sellers.length?<ol className="monthly-products">
       {sellers.map((p,i)=><li key={i}><span>{String(i+1).padStart(2,"0")}</span>
        <div><strong>{p.nome}</strong><small>{p.tamanho} · {p.cor}</small></div>
        <b>{p.pecas} {p.pecas===1?"peça":"peças"}</b></li>)}
      </ol>:<p className="monthly-empty">Sem produtos vendidos no período.</p>}
     </section>
    </div>
    <section className="monthly-section monthly-days">
     <div className="monthly-section-heading"><span>04</span><div><h2>Movimento por dia</h2><p>Histórico de vendas concluídas</p></div></div>
     <table><thead><tr><th>Data</th><th>Vendas</th><th>Valor bruto</th></tr></thead>
      <tbody>{report.dias.length?report.dias.map(d=><tr key={d.dia}><td>{formatDay(d.dia)}</td><td>{d.vendas}</td><td>{currency(d.bruto)}</td></tr>):
       <tr><td colSpan={3}>Nenhum registro nesse mês.</td></tr>}</tbody></table>
    </section>
    <section className="monthly-section">
     <div className="monthly-section-heading"><span>05</span><div><h2>Posição atual do estoque</h2><p>Fotografia do estoque no momento da emissão — não é histórico do mês</p></div></div>
     <div className="monthly-stock-summary">
      <div><strong>{alerts?.total??0}</strong><span>Variações no mínimo ou abaixo</span></div>
      <div><strong>{alerts?.zerados??0}</strong><span>Variações esgotadas</span></div>
     </div>
     {!!alerts?.itens.length&&<ul className="monthly-stock-items">{alerts.itens.slice(0,5).map(v=><li key={v.variante_id}>
      <strong>{v.nome} · {v.tamanho}/{v.cor}</strong><span>{v.quantidade} em estoque • mínimo {v.minimo}</span>
     </li>)}</ul>}
    </section>
    {finance.pecas_sem_custo>0&&<p className="monthly-warning">Atenção: {finance.pecas_sem_custo} peças vendidas sem custo cadastrado. A estimativa de resultado pode estar superestimada.</p>}
    <footer className="monthly-footer">
     <span>LajuStore • Relatório de consulta • Valores estimados e sujeitos à conferência</span>
     <span>Emitido em {new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</span>
     <p>Este PDF é um relatório gerencial, não um backup recuperável do banco de dados. Preserve também os dados comerciais exportados e as cópias do PostgreSQL.</p>
    </footer>
   </div>}
  </main>
  <p className="monthly-print-help">Para baixar: clique em <strong>Imprimir / Salvar em PDF</strong> e escolha <strong>Salvar como PDF</strong> no seu navegador. Nenhum dado é enviado para terceiros por essa ação.</p>
 </div>;
}
