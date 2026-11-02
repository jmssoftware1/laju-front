import {useCallback,useEffect,useState,type FormEvent} from "react";
import axios from "axios";
import {api} from "../../utils/axios";
import "./Crediario.css";

export type CreditAccount={
 id:number;pedido_id:number;cliente_id:number;cliente:string;canal:string;
 criado_em:string;observacao:string;status:"aberto"|"quitado"|"cancelado";
 total:number;recebido:number;saldo:number;vencimento_proximo:string|null;atrasado:boolean;
 parcelas:{numero:number;valor:number;vencimento:string;pago:number;saldo:number;situacao:string}[];
 pagamentos:{id:number;valor:number;forma_pagamento:string;observacao:string;recebido_em:string}[];
};
type Summary={contas:number;clientes:number;saldo:number};
const cash=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const date=(v:string|null)=>v?(()=>{
 const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(v);
 return match?`${match[3]}/${match[2]}/${match[1]}`:"—";
})():"—";
const errorMsg=(e:unknown)=>axios.isAxiosError(e)?
 (e.response?.data?.mensagem||"Falha de comunicação com a API do crediário."):
 (e instanceof Error?e.message:"Não foi possível carregar o crediário.");
const exactCents=(value:string)=>{
 if(!/^\d{1,8}(?:[.,]\d{1,2})?$/.test(value.trim()))return null;
 const [major,minor=""]=value.trim().replace(",",".").split(".");
 const cents=Number(major)*100+Number(minor.padEnd(2,"0"));
 return Number.isSafeInteger(cents)&&cents>0?cents:null;
};

type Props={clientId?:number|null;onBack?:()=>void;refreshKey?:number};
export default function CrediarioPanel({clientId=null,onBack,refreshKey=0}:Props){
 const [all,setAll]=useState<CreditAccount[]>([]);
 const [summary,setSummary]=useState<Summary|null>(null);
 const [filter,setFilter]=useState<"aberto"|"todas">("aberto");
 const [search,setSearch]=useState("");
 const [selected,setSelected]=useState<number|null>(null);
 const [amount,setAmount]=useState("");
 const [method,setMethod]=useState("pix");
 const [note,setNote]=useState("");
 const [operationKey,setOperationKey]=useState<string|null>(null);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [a,b]=await Promise.all([
    api.get<CreditAccount[]>("/api/v8/crediario",{params:{
     situacao:filter,...(clientId?{cliente_id:clientId}:{})
    }}),
    api.get<Summary>("/api/v8/crediario/resumo")
   ]);
   setAll(a.data);setSummary(b.data);
  }catch(e){setError(errorMsg(e));}finally{setLoading(false);}
 },[filter,clientId]);
 useEffect(()=>{void load();},[load,refreshKey]);
 const visible=all.filter(a=>
  !search.trim()||`${a.cliente} ${a.pedido_id}`.toLowerCase().includes(search.toLowerCase().trim()));
 const current=all.find(a=>a.id===selected);
 const choose=(a:CreditAccount)=>{
  setSelected(prev=>prev===a.id?null:a.id);
  setAmount(a.saldo.toFixed(2));setMethod("pix");setNote("");setOperationKey(null);
  setNotice("");setError("");
 };
 const submit=async(e:FormEvent)=>{
  e.preventDefault();
  if(!current||busy||current.status!=="aberto")return;
  const value=exactCents(amount),remaining=Math.round(current.saldo*100);
  if(value===null||value>remaining){setError("Informe um valor válido, maior que zero e até o saldo em aberto.");return;}
  if(!window.confirm(`Confirmar que a LajuStore RECEBEU ${cash(value/100)} de ${current.cliente} por ${method}? Isso registrará uma entrada no caixa.`))return;
  const key=operationKey||crypto.randomUUID();
  setOperationKey(key);setBusy(true);setError("");setNotice("");
  try{
   await api.post(`/api/v8/crediario/${current.id}/pagamentos`,{
    valor:value/100,forma_pagamento:method,observacao:note,chave_operacao:key
   });
   setNotice(`Pagamento de ${cash(value/100)} registrado. O saldo da cliente foi atualizado.`);
   setSelected(null);setAmount("");setOperationKey(null);
   await load();
  }catch(err){
   setError(errorMsg(err)+
    " Se houve erro de conexão, não registre outro pagamento antes de conferir o histórico.");
  }finally{setBusy(false);}
 };
 return <section className="lz-panel lz-crediario">
  <div className="lz-crediario-heading">
   <div><h2>Contas de clientes — Em aberto</h2>
    <p>Vendas já entregues e ainda não totalmente pagas. Pedidos pendentes continuam separados.</p></div>
   {onBack&&<button type="button" className="lz-btn lz-outline" onClick={onBack}>Voltar para clientes</button>}
  </div>
  <div className="lz-crediario-metrics">
   <div><small>Saldo total a receber</small><strong>{summary?cash(summary.saldo):"—"}</strong></div>
   <div><small>Contas em aberto</small><strong>{summary?.contas??"—"}</strong></div>
   <div><small>Clientes com dívida</small><strong>{summary?.clientes??"—"}</strong></div>
  </div>
  <p className="lz-hint">Os totais acima são de toda a loja. O filtro por cliente altera apenas a lista abaixo.</p>
  <div className="lz-crediario-filters">
   <label>Buscar cliente ou número da venda
    <input type="search" value={search} placeholder="Nome da cliente ou # da venda" onChange={e=>setSearch(e.target.value)}/>
   </label>
   <label>Situação
    <select value={filter} onChange={e=>{setFilter(e.target.value as "aberto"|"todas");setSelected(null);}}>
     <option value="aberto">Somente em aberto</option>
     <option value="todas">Todas (incluindo quitadas)</option>
    </select>
   </label>
   <button type="button" className="lz-btn lz-outline" disabled={loading||busy} onClick={()=>void load()}>Atualizar</button>
  </div>
  {loading&&<p className="lz-hint" role="status">Atualizando contas...</p>}
  {error&&<p className="lz-crediario-error" role="alert">{error}</p>}
  {notice&&<p className="lz-crediario-success" role="status">{notice}</p>}
  <div className="lz-crediario-list">
   {!loading&&visible.length===0&&<p className="lz-mini-empty">{filter==="aberto"?"Nenhuma conta em aberto neste filtro.":"Nenhuma conta encontrada."}</p>}
   {visible.map(account=><article key={account.id} className={`lz-crediario-item ${account.atrasado?"is-late":""}`}>
    <div className="lz-crediario-item-heading">
     <div><strong>{account.cliente}</strong><small>Venda #{account.pedido_id} · {date(account.criado_em)} · {account.canal}</small></div>
     <span className={`lz-crediario-status ${account.status==="quitado"?"is-paid":account.atrasado?"is-late":""}`}>
      {account.status==="cancelado"?"Cancelada":account.status==="quitado"?"Quitada":account.atrasado?"Em atraso":"Em aberto"}</span>
    </div>
    <div className="lz-crediario-item-values">
     <div><small>Venda</small><strong>{cash(account.total)}</strong></div>
     <div><small>Já recebido</small><strong>{cash(account.recebido)}</strong></div>
     <div><small>Falta receber</small><strong className="lz-crediario-outstanding">{cash(account.saldo)}</strong></div>
     <div><small>Próximo vencimento</small><strong>{date(account.vencimento_proximo)}</strong></div>
    </div>
    <button type="button" className="lz-btn lz-outline lz-crediario-expand" onClick={()=>choose(account)}>
     {selected===account.id?"Fechar detalhes":"Ver parcelas e registrar Pix"}
    </button>
    {selected===account.id&&<div className="lz-crediario-details">
     <h3>Parcelas previstas</h3>
     <div className="lz-crediario-parcels">
      {account.parcelas.map(part=><div key={part.numero}>
       <strong>{part.numero}ª parcela · {cash(part.valor)}</strong>
       <small>{date(part.vencimento)} · {part.situacao==="quitada"?"Paga":part.situacao==="atrasada"?"Atrasada":"Em aberto"} · saldo {cash(part.saldo)}</small>
      </div>)}
     </div>
     <h3>Histórico dos recebimentos</h3>
     {account.pagamentos.length===0?<p className="lz-hint">Nenhum valor recebido ainda.</p>:
      <div className="lz-crediario-receipts">
       {account.pagamentos.map(receipt=><div key={receipt.id}>
        <span>{date(receipt.recebido_em)} · {receipt.forma_pagamento}</span>
        <strong>+{cash(receipt.valor)}</strong>
        {receipt.observacao&&<small>{receipt.observacao}</small>}
       </div>)}
      </div>}
     {account.status==="aberto"&&<form className="lz-form lz-crediario-pay" onSubmit={e=>void submit(e)}>
      <h3>Registrar pagamento recebido</h3>
      <label>Valor recebido (R$)
       <input required inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setOperationKey(null);}} placeholder="50,00"/>
      </label>
      <label>Recebido por
       <select value={method} onChange={e=>{setMethod(e.target.value);setOperationKey(null);}}>
        <option value="pix">Pix</option><option value="dinheiro">Dinheiro</option>
        <option value="debito">Cartão débito</option><option value="credito">Cartão crédito</option>
        <option value="outro">Outro</option>
       </select>
      </label>
      <label className="lz-span-2">Observação (opcional)
       <input value={note} onChange={e=>{setNote(e.target.value);setOperationKey(null);}} placeholder="Ex.: 1º Pix da cliente"/>
      </label>
      <p className="lz-hint lz-span-2">Registre somente após confirmar o recebimento no banco. O valor será lançado no Financeiro uma única vez.</p>
      <button type="submit" disabled={busy} className="lz-btn lz-span-2">Confirmar valor recebido</button>
     </form>}
     {account.status==="cancelado"&&<p className="lz-hint">Esta venda foi cancelada sem recebimentos; não há saldo ativo.</p>}
    </div>}
   </article>)}
  </div>
  {all.length>=500&&<p className="lz-crediario-error">Limite de 500 contas por consulta. Utilize o filtro por cliente para encontrar contas antigas.</p>}
 </section>;
}
