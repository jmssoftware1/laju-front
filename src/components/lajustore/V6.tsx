import {useCallback, useEffect, useMemo, useState, type FormEvent} from "react";
import axios from "axios";
import {useNavigate} from "react-router-dom";
import {api} from "../../utils/axios";
import {useAuth} from "../../context/AuthContext";
import "./V6.css";

type Tab = "inicio"|"estoque"|"pdv"|"clientes"|"financeiro"|"fornecedores"|"relatorios"|"config";
type Variant = {id:number;sku:string;tamanho:string;cor:string;quantidade:number;minimo:number};
type Product = {id:number;nome:string;categoria:string|null;descricao?:string|null;preco:string;custo?:string|null;ativo:boolean;variantes:Variant[]};
type Client = {id:number;nome:string;telefone:string|null;instagram:string|null};
type Order = {id:number;cliente?:string|null;canal:string;status:string;total:string;desconto?:string;forma_pagamento?:string;criado_em:string};
type Supplier = {id:number;nome:string;telefone?:string|null;email?:string|null;observacao?:string|null};
type Purchase = {id:number;fornecedor:string|null;total:string;criado_em:string};
type Entry = {id:number;tipo:"entrada"|"saida";categoria:string;descricao:string;valor:string;status:string;data_movimento:string};
type User = {id:number;nome:string;role:"gestor"|"funcionario";ativo:boolean};
type Movement = {id:number;criado_em:string;nome:string;sku:string;tamanho:string;cor:string;diferenca:number;motivo:string};
type Report = {de:string;ate:string;totais:{vendas:number;bruto:string;descontos:string;faturamento:number;lucro_estimado:number};canais:{canal:string;vendas:number;total:string}[];maisVendidos:{nome:string;tamanho:string;cor:string;pecas:number}[];dias:{dia:string;vendas:number;bruto:string}[];nota:string};
type Dashboard = {produtos:number;pecas:number;alertas:number;vendas_hoje:number;faturamento_hoje:number;lucro_hoje_estimado:number;top:{nome:string;pecas:number}[]};
type CartItem = {id:number;nome:string;sku:string;quantidade:number;preco:number};
type Pending = {id:number;canal:string;cliente:string|null;criado_em:string;total:string;desconto:string;observacao:string|null;itens:{roupa:string;tamanho:string;cor:string;quantidade:number;preco_unitario:string;saldo_atual:number|null}[]};

const cash=(v:unknown)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const date=(v:string)=>new Date(v).toLocaleDateString("pt-BR");
const errorMessage=(e:unknown)=>{
 if(axios.isAxiosError(e)){if(e.response?.status===401)return "Sua sessão expirou. Saia e entre novamente.";return e.response?.data?.mensagem||"Falha de comunicação com a API da LajuStore.";}
 return e instanceof Error ? e.message : "Não foi possível concluir a operação.";
};
const today=()=>new Date().toISOString().slice(0,10);
const downloadCsv=(filename:string,rows:(string|number)[][])=>{
 const csv="\uFEFF"+rows.map(row=>row.map(value=>{
  const raw=String(value??"");
  const safe=/^[\s]*[=+@\-]/.test(raw)?"'"+raw:raw;
  return '"'+safe.replace(/"/g,'""')+'"';
 }).join(";")).join("\r\n");
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 const link=document.createElement("a");link.href=url;link.download=filename;
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const menus:{id:Tab;label:string;icon:string;gestor?:boolean}[]=[
 {id:"inicio",label:"Dashboard",icon:"▦"},
 {id:"estoque",label:"Estoque",icon:"▤"},
 {id:"pdv",label:"Vendas / PDV",icon:"◈"},
 {id:"clientes",label:"Clientes",icon:"♧"},
 {id:"financeiro",label:"Financeiro",icon:"◎",gestor:true},
 {id:"fornecedores",label:"Fornecedores",icon:"▣",gestor:true},
 {id:"relatorios",label:"Relatórios",icon:"▥",gestor:true},
 {id:"config",label:"Configurações",icon:"⚙",gestor:true}
];

export default function LajuStoreV6(){
 const navigate=useNavigate();
 const {operador,logout}=useAuth();
 const manager=operador?.role==="gestor";
 const [tab,setTab]=useState<Tab>("inicio"),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [products,setProducts]=useState<Product[]>([]),[clients,setClients]=useState<Client[]>([]),[orders,setOrders]=useState<Order[]>([]);
 const [pendentes,setPendentes]=useState<Pending[]>([]),[pendingPayment,setPendingPayment]=useState("pix"),[pendingFilter,setPendingFilter]=useState("todos");
 const [suppliers,setSuppliers]=useState<Supplier[]>([]),[purchases,setPurchases]=useState<Purchase[]>([]);
 const [entries,setEntries]=useState<Entry[]>([]),[financeSummary,setFinanceSummary]=useState({entradas:0,saidas:0,pendentes:0});
 const [users,setUsers]=useState<User[]>([]),[movements,setMovements]=useState<Movement[]>([]);
 const [dashboard,setDashboard]=useState<Dashboard|null>(null),[report,setReport]=useState<Report|null>(null);
 const [rangeStart,setRangeStart]=useState(new Date(Date.now()-30*86400000).toISOString().slice(0,10));
 const [rangeEnd,setRangeEnd]=useState(today());

 const [prodName,setProdName]=useState(""),[prodCategory,setProdCategory]=useState(""),[prodDesc,setProdDesc]=useState("");
 const [prodPrice,setProdPrice]=useState(""),[prodCost,setProdCost]=useState("");
 const [size,setSize]=useState("M"),[color,setColor]=useState(""),[sku,setSku]=useState(""),[quantity,setQuantity]=useState("0"),[minQty,setMinQty]=useState("2");
 const [newVariantProduct,setNewVariantProduct]=useState(""),[editProduct,setEditProduct]=useState<Product|null>(null);
 const [adjustVariant,setAdjustVariant]=useState(""),[adjustQty,setAdjustQty]=useState(""),[adjustReason,setAdjustReason]=useState("Reposição de estoque");
 const [search,setSearch]=useState("");
 const [categoryFilter,setCategoryFilter]=useState("todas"),[onlyLow,setOnlyLow]=useState(false);
 const [variantEdit,setVariantEdit]=useState<Variant|null>(null);
 const [sellVariant,setSellVariant]=useState(""),[sellQuantity,setSellQuantity]=useState("1"),[cart,setCart]=useState<CartItem[]>([]);
 const [sellClient,setSellClient]=useState(""),[sellChannel,setSellChannel]=useState("loja"),[payment,setPayment]=useState("pix"),[discount,setDiscount]=useState("0"),[sellNote,setSellNote]=useState("");
 const [clientName,setClientName]=useState(""),[clientPhone,setClientPhone]=useState(""),[clientInstagram,setClientInstagram]=useState("");
 const [editingClient,setEditingClient]=useState<number|null>(null),[clientHistory,setClientHistory]=useState<Order[]>([]),[historyTitle,setHistoryTitle]=useState("");
 const [supplierName,setSupplierName]=useState(""),[supplierPhone,setSupplierPhone]=useState(""),[supplierEmail,setSupplierEmail]=useState("");
 const [supplierId,setSupplierId]=useState(""),[purchaseVariant,setPurchaseVariant]=useState(""),[purchaseQty,setPurchaseQty]=useState("1"),[purchaseCost,setPurchaseCost]=useState("0");
 const [financeType,setFinanceType]=useState("saida"),[financeCategory,setFinanceCategory]=useState("despesas"),[financeDescription,setFinanceDescription]=useState("");
 const [financeAmount,setFinanceAmount]=useState(""),[financeStatus,setFinanceStatus]=useState("pago");
 const [userName,setUserName]=useState(""),[userPassword,setUserPassword]=useState(""),[userRole,setUserRole]=useState("funcionario");
 const [resetUser,setResetUser]=useState(""),[resetPassword,setResetPassword]=useState("");

 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   if(tab==="inicio"){const {data}=await api.get<Dashboard>("/api/v6/dashboard");setDashboard(data);}
   if(tab==="estoque"){
    const [a,b]=await Promise.all([api.get<Product[]>("/api/lajustore/produtos"),api.get<Movement[]>("/api/v6/movimentos")]);
    setProducts(a.data);setMovements(b.data);
   }
   if(tab==="pdv"){
    const [a,b,c,d]=await Promise.all([api.get<Product[]>("/api/lajustore/produtos"),api.get<Client[]>("/api/lajustore/clientes"),api.get<Order[]>("/api/v6/vendas"),api.get<Pending[]>("/api/v7/pendentes")]);
    setProducts(a.data);setClients(b.data);setOrders(c.data);setPendentes(d.data);
   }
   if(tab==="clientes"){const {data}=await api.get<Client[]>("/api/lajustore/clientes");setClients(data);}
   if(tab==="financeiro"&&manager){const {data}=await api.get("/api/v6/financeiro");setEntries(data.lancamentos);setFinanceSummary(data.resumo);}
   if(tab==="fornecedores"&&manager){
    const [a,b,c]=await Promise.all([api.get<Supplier[]>("/api/v6/fornecedores"),api.get<Purchase[]>("/api/v6/compras"),api.get<Product[]>("/api/lajustore/produtos")]);
    setSuppliers(a.data);setPurchases(b.data);setProducts(c.data);
   }
   if(tab==="relatorios"&&manager){const {data}=await api.get<Report>("/api/v6/relatorios",{params:{de:rangeStart,ate:rangeEnd}});setReport(data);}
   if(tab==="config"&&manager){const {data}=await api.get<User[]>("/api/v6/usuarios");setUsers(data);}
  }catch(e){setError(errorMessage(e));}
  finally{setLoading(false);}
 },[tab,manager,rangeStart,rangeEnd]);
 useEffect(()=>{void refresh();},[refresh]);
 const run=async(task:()=>Promise<void>,success:string)=>{
  setBusy(true);setNotice("");setError("");
  try{await task();setNotice(success);await refresh();}
  catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 };
 const go=(target:Tab)=>{setNotice("");setError("");setTab(target);};
 const variants=useMemo(()=>products.flatMap(p=>p.variantes.map(v=>({...v,produto:p.nome,preco:Number(p.preco),custo:Number(p.custo||0)}))),[products]);
 const cartTotal=cart.reduce((s,i)=>s+i.quantidade*i.preco,0);
 const pendingShown=pendentes.filter(p=>pendingFilter==="todos"||p.canal===pendingFilter);
 const safeDiscount=Number(discount)||0;
 const categories=useMemo(()=>[...new Set(products.map(p=>p.categoria).filter((v):v is string=>Boolean(v)))].sort(),[products]);
 const filteredRows=products.filter(p=>
  (categoryFilter==="todas" || p.categoria===categoryFilter)
 ).flatMap(p=>p.variantes.map(v=>({p,v}))).filter(({p,v})=>
  `${p.nome} ${p.categoria||""} ${v.sku} ${v.tamanho} ${v.cor}`.toLowerCase().includes(search.toLowerCase())
  &&(!onlyLow||v.quantidade<=v.minimo)
 );
 const exportStock=()=>downloadCsv("lajustore-estoque.csv",[
  ["Produto","Categoria","SKU","Tamanho","Cor","Quantidade","Mínimo","Preço"],
  ...filteredRows.map(({p,v})=>[p.nome,p.categoria||"",v.sku,v.tamanho,v.cor,v.quantidade,v.minimo,String(p.preco)])
 ]);
 const exportReport=()=>{
  if(!report)return;
  downloadCsv(`lajustore-relatorio-${report.de}-${report.ate}.csv`,[
   ["Relatório LajuStore","Início",report.de,"Fim",report.ate],
   ["Vendas",report.totais.vendas,"Faturamento",String(report.totais.faturamento),"Lucro estimado",String(report.totais.lucro_estimado)],
   [],
   ["Vendas por dia","Vendas","Bruto"],
   ...report.dias.map(d=>[d.dia,d.vendas,String(d.bruto)]),
   [],
   ["Canal","Vendas","Faturamento"],
   ...report.canais.map(c=>[c.canal,c.vendas,String(c.total)]),
   [],
   ["Mais vendidos","Tamanho","Cor","Peças"],
   ...report.maisVendidos.map(p=>[p.nome,p.tamanho,p.cor,p.pecas])
  ]);
 };
 const signOut=()=>{logout();navigate("/");};

 const addProduct=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
  await api.post("/api/v6/produtos",{nome:prodName,categoria:prodCategory,descricao:prodDesc,preco:prodPrice,custo:prodCost||null,variantes:[{sku,tamanho:size,cor:color,quantidade:Number(quantity),minimo:Number(minQty)}]});
  setProdName("");setColor("");setSku("");setQuantity("0");
 },"Roupa cadastrada no estoque.")};
 const addVariant=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
  await api.post(`/api/v6/produtos/${newVariantProduct}/variantes`,{sku,tamanho:size,cor:color,quantidade:Number(quantity),minimo:Number(minQty)});
  setSku("");setColor("");setQuantity("0");
 },"Nova variação cadastrada.")};
 const saveProduct=(e:FormEvent)=>{e.preventDefault();if(!editProduct)return;void run(async()=>{
  await api.patch(`/api/v6/produtos/${editProduct.id}`,{nome:prodName,categoria:prodCategory,descricao:prodDesc,preco:prodPrice,custo:prodCost||null,ativo:true});
  setEditProduct(null);setProdName("");
 },"Produto atualizado.")};
 const adjust=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
  await api.post(`/api/v6/variantes/${adjustVariant}/ajuste`,{diferenca:Number(adjustQty),motivo:adjustReason});
  setAdjustQty("");
 },"Movimentação registrada.")};
 const saveVariantEdit=(e:FormEvent)=>{
  e.preventDefault();if(!variantEdit)return;
  void run(async()=>{
   await api.patch(`/api/v7/variantes/${variantEdit.id}`,{
    sku:variantEdit.sku,tamanho:variantEdit.tamanho,cor:variantEdit.cor,minimo:variantEdit.minimo
   });
   setVariantEdit(null);
  },"Variação atualizada. O saldo do estoque não foi alterado.");
 };
 const addCart=()=>{
  const v=variants.find(x=>x.id===Number(sellVariant)),q=Number(sellQuantity);
  if(!v||!Number.isSafeInteger(q)||q<=0){setError("Escolha a peça e uma quantidade válida.");return;}
  const existing=cart.find(x=>x.id===v.id)?.quantidade||0;
  if(existing+q>v.quantidade){setError("Quantidade acima do estoque disponível.");return;}
  setCart(prev=>existing?prev.map(x=>x.id===v.id?{...x,quantidade:x.quantidade+q}:x):[...prev,{id:v.id,nome:`${v.produto} · ${v.tamanho} · ${v.cor}`,sku:v.sku,quantidade:q,preco:v.preco}]);
  setError("");setSellVariant("");setSellQuantity("1");
 };
 const sell=(e:FormEvent)=>{e.preventDefault();if(cart.length===0){setError("Adicione ao menos uma peça ao carrinho.");return;}
  if(safeDiscount<0||safeDiscount>cartTotal){setError("Desconto inválido.");return;}
  void run(async()=>{
   const {data}=await api.post("/api/v6/vendas",{cliente_id:sellClient?Number(sellClient):null,canal:sellChannel,forma_pagamento:payment,desconto:safeDiscount,observacao:sellNote,
    itens:cart.map(x=>({variante_id:x.id,quantidade:x.quantidade}))});
   setCart([]);setDiscount("0");setSellNote("");
   setNotice(`Venda #${data.id} registrada!`);
  },"Venda concluída e estoque atualizado.");
 };
 const savePending=()=>{
  if(!cart.length || safeDiscount<0 || safeDiscount>cartTotal){setError("Confira as peças e o desconto.");return;}
  void run(async()=>{
   await api.post("/api/v7/pendentes",{
    cliente_id:sellClient?Number(sellClient):null,canal:sellChannel,
    desconto:safeDiscount,observacao:sellNote,
    itens:cart.map(x=>({variante_id:x.id,quantidade:x.quantidade}))
   });
   setCart([]);setDiscount("0");setSellNote("");
  },"Pedido aguardando pagamento salvo. O estoque não foi reservado.");
 };
 const concludePending=(order:Pending)=>{
  if(!window.confirm(`Confirmar que o pagamento do pedido #${order.id} foi recebido por ${pendingPayment}?`))return;
  void run(async()=>{
   await api.post(`/api/v7/pendentes/${order.id}/concluir`,{forma_pagamento:pendingPayment});
  },"Pagamento registrado: venda concluída e estoque atualizado.");
 };
 const cancelPending=(order:Pending)=>{
  if(!window.confirm(`Cancelar o pedido pendente #${order.id}? Nenhuma peça será retirada do estoque.`))return;
  void run(async()=>{await api.post(`/api/v7/pendentes/${order.id}/cancelar`);},"Pedido pendente cancelado.");
 };
 const saveClient=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
  const payload={nome:clientName,telefone:clientPhone,instagram:clientInstagram};
  if(editingClient)await api.patch(`/api/v6/clientes/${editingClient}`,payload);
  else await api.post("/api/lajustore/clientes",payload);
  setEditingClient(null);setClientName("");setClientPhone("");setClientInstagram("");
 },"Cliente salvo.")};
 const showClientOrders=async(client:Client)=>{
  try{setHistoryTitle(client.nome);const {data}=await api.get<Order[]>(`/api/v6/clientes/${client.id}/compras`);setClientHistory(data);}
  catch(e){setError(errorMessage(e));}
 };
 const saveSupplier=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
  await api.post("/api/v6/fornecedores",{nome:supplierName,telefone:supplierPhone,email:supplierEmail});
  setSupplierName("");setSupplierPhone("");setSupplierEmail("");
 },"Fornecedor cadastrado.")};
 const receive=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
  await api.post("/api/v6/compras",{fornecedor_id:supplierId?Number(supplierId):null,itens:[{variante_id:Number(purchaseVariant),quantidade:Number(purchaseQty),custo_unitario:Number(purchaseCost)}]});
  setPurchaseQty("1");
 },"Compra registrada e estoque atualizado.")};
 const finance=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
  await api.post("/api/v6/financeiro",{tipo:financeType,categoria:financeCategory,descricao:financeDescription,valor:Number(financeAmount),status:financeStatus});
  setFinanceDescription("");setFinanceAmount("");
 },"Lançamento registrado.")};
 const addUser=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
  await api.post("/api/v6/usuarios",{nome:userName,senha:userPassword,role:userRole});
  setUserName("");setUserPassword("");
 },"Funcionário cadastrado.")};

 return <div className="lz-shell">
  <aside className="lz-sidebar">
   <div className="lz-brand"><span className="lz-brand-mark">✦</span><div><strong>LajuStore</strong><small>GESTÃO DA LOJA</small></div></div>
   <div className="lz-side-label">MENU PRINCIPAL</div>
   <nav aria-label="Menu da LajuStore">
    {menus.filter(m=>!m.gestor||manager).map(m=><button key={m.id} type="button" className={tab===m.id?"selected":""} onClick={()=>go(m.id)}><span className="lz-menu-icon" aria-hidden>{m.icon}</span>{m.label}</button>)}
   </nav>
   <div className="lz-side-bottom"><div className="lz-profile"><div className="lz-avatar">{operador?.nome?.charAt(0).toUpperCase()||"L"}</div><div><strong>{operador?.nome}</strong><small>{manager?"Administradora":"Funcionária"}</small></div></div>
   <button type="button" className="lz-logout" onClick={signOut}>Sair da conta ↗</button></div>
  </aside>
  <main className="lz-main">
   <div className="lz-top"><div><div className="lz-overline">LAJUSTORE / GESTÃO</div><h1>{menus.find(x=>x.id===tab)?.label}</h1><p>Loja física, WhatsApp e Instagram • tudo em um só lugar</p></div>
    <div className="lz-top-right"><span className="lz-live"><i/>Sistema online</span><button className="lz-btn lz-outline" onClick={()=>void refresh()} disabled={loading}>↻ Atualizar</button></div></div>
   {error&&<div role="alert" className="lz-alert">{error}</div>}
   {notice&&<div role="status" className="lz-notice">{notice}</div>}
   {loading&&<div className="lz-loading" role="status">Atualizando informações…</div>}

   {tab==="inicio"&&<div className="lz-content">
    <section className="lz-metrics">
     {[{icon:"▤",title:"Peças disponíveis",value:dashboard?.pecas??"—",sub:"Quantidade em estoque"},{icon:"◈",title:"Produtos ativos",value:dashboard?.produtos??"—",sub:"Modelos cadastrados"},{icon:"▥",title:"Vendas hoje",value:dashboard?.vendas_hoje??"—",sub:"Vendas concluídas"},{icon:"R$",title:"Faturamento hoje",value:dashboard?cash(dashboard.faturamento_hoje):"—",sub:"Receita de vendas"},{icon:"↗",title:"Lucro estimado hoje",value:dashboard?cash(dashboard.lucro_hoje_estimado):"—",sub:"Margem das peças, antes das despesas"}].map(m=><article className="lz-metric" key={m.title}><span className="lz-metric-icon">{m.icon}</span><small>{m.title}</small><strong>{m.value}</strong><p>{m.sub}</p></article>)}
    </section>
    <div className="lz-two">
     <section className="lz-panel"><div className="lz-section-head"><h2>Estoque em atenção</h2><span className="lz-chip">Reposição</span></div>
      <div className="lz-big-number">{dashboard?.alertas??"—"}<span>variações</span></div>
      <p>Roupas com quantidade igual ou inferior ao mínimo definido.</p><button className="lz-btn" onClick={()=>go("estoque")}>Gerenciar estoque →</button></section>
     <section className="lz-panel"><div className="lz-section-head"><h2>Mais vendidos</h2><span className="lz-chip">Histórico</span></div>
      {dashboard?.top?.length?dashboard.top.map((x,i)=><div className="lz-top-product" key={x.nome}><span>{i+1}</span><strong>{x.nome}</strong><small>{x.pecas} peças</small></div>):<div className="lz-empty">As primeiras vendas aparecerão aqui.</div>}
     </section>
    </div>
   </div>}

   {tab==="estoque"&&<div className="lz-content">
    <div className="lz-two">
     <section className="lz-panel"><h2>{editProduct?"Editar produto":"Cadastrar roupa"}</h2><p>Sem fotos. Cada tamanho/cor tem seu próprio código e quantidade.</p>
      <form className="lz-form" onSubmit={editProduct?saveProduct:addProduct}>
       <label className="lz-span-2">Nome da roupa<input required value={prodName} onChange={e=>setProdName(e.target.value)} placeholder="Ex.: Blusa canelada"/></label>
       <label>Categoria<input value={prodCategory} onChange={e=>setProdCategory(e.target.value)} placeholder="Blusas"/></label>
       <label>Preço de venda (R$)<input required type="number" min="0" step=".01" value={prodPrice} onChange={e=>setProdPrice(e.target.value)}/></label>
       <label>Custo unitário (R$)<input type="number" min="0" step=".01" value={prodCost} onChange={e=>setProdCost(e.target.value)}/></label>
       <label className="lz-span-2">Descrição<input value={prodDesc} onChange={e=>setProdDesc(e.target.value)} placeholder="Modelo, tecido, observações"/></label>
       {!editProduct&&<><label>Tamanho<input value={size} onChange={e=>setSize(e.target.value)} required/></label>
        <label>Cor<input value={color} onChange={e=>setColor(e.target.value)} required/></label>
        <label>Código SKU<input value={sku} onChange={e=>setSku(e.target.value)} placeholder="BLU-PRE-M" required/></label>
        <label>Quantidade inicial<input type="number" min="0" value={quantity} onChange={e=>setQuantity(e.target.value)} required/></label>
        <label>Estoque mínimo<input type="number" min="0" value={minQty} onChange={e=>setMinQty(e.target.value)} required/></label></>}
       <button className="lz-btn" type="submit" disabled={busy}>{editProduct?"Salvar alterações":"Cadastrar roupa"}</button>
       {editProduct&&<button type="button" className="lz-btn lz-outline" onClick={()=>{setEditProduct(null);setProdName("");}}>Cancelar edição</button>}
      </form>
     </section>
     <div className="lz-stack">
      <section className="lz-panel"><h2>Adicionar tamanho ou cor</h2><form className="lz-form" onSubmit={addVariant}>
       <label className="lz-span-2">Produto<select required value={newVariantProduct} onChange={e=>setNewVariantProduct(e.target.value)}><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
       <label>Tamanho<input value={size} required onChange={e=>setSize(e.target.value)}/></label>
       <label>Cor<input value={color} required onChange={e=>setColor(e.target.value)}/></label>
       <label>SKU<input value={sku} required onChange={e=>setSku(e.target.value)}/></label>
       <label>Quantidade<input type="number" min="0" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
       <button className="lz-btn" disabled={busy}>Adicionar variação</button></form></section>
      {manager&&<section className="lz-panel"><h2>Entrada, saída ou correção</h2><form className="lz-form" onSubmit={adjust}>
       <label className="lz-span-2">Variação<select required value={adjustVariant} onChange={e=>setAdjustVariant(e.target.value)}><option value="">Selecione</option>{variants.map(v=><option key={v.id} value={v.id}>{v.produto} · {v.tamanho} · {v.cor} ({v.quantidade})</option>)}</select></label>
       <label>Diferença na quantidade<input required type="number" step="1" value={adjustQty} onChange={e=>setAdjustQty(e.target.value)} placeholder="+5 ou -2"/></label>
       <label>Motivo<input required value={adjustReason} onChange={e=>setAdjustReason(e.target.value)}/></label>
       <button className="lz-btn" disabled={busy}>Registrar movimentação</button></form></section>}
     </div>
    </div>
    <section className="lz-panel"><div className="lz-section-head"><h2>Roupas cadastradas</h2>
     <button type="button" className="lz-btn lz-outline" onClick={exportStock}>Exportar estoque CSV</button>
     </div>
     <div className="lz-filters">
      <input className="lz-search" aria-label="Buscar roupa" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nome, tamanho, cor ou SKU"/>
      <select aria-label="Filtrar categoria" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
       <option value="todas">Todas as categorias</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <label className="lz-check"><input type="checkbox" checked={onlyLow} onChange={e=>setOnlyLow(e.target.checked)}/> Apenas estoque baixo</label>
     </div>
     <div className="lz-table-wrap"><table><thead><tr><th>Produto / SKU</th><th>Categoria</th><th>Tamanho / cor</th><th>Preço</th><th>Saldo</th>{manager&&<th>Ação</th>}</tr></thead>
      <tbody>{filteredRows.map(({p,v})=><tr key={v.id}><td><strong>{p.nome}</strong><small>{v.sku}</small></td><td>{p.categoria||"—"}</td><td>{v.tamanho} · {v.cor}</td><td>{cash(p.preco)}</td><td><span className={v.quantidade<=v.minimo?"lz-danger":"lz-good"}>{v.quantidade} peças</span></td>{manager&&<td><button className="lz-link" onClick={()=>{setEditProduct(p);setProdName(p.nome);setProdCategory(p.categoria||"");setProdDesc(p.descricao||"");setProdPrice(p.preco);setProdCost(p.custo||"");window.scrollTo({top:0,behavior:"smooth"});}}>Produto</button>
       <button className="lz-link" onClick={()=>setVariantEdit({...v})}>Variação</button></td>}</tr>)}
      {filteredRows.length===0&&<tr><td colSpan={6} className="lz-empty">Nenhuma roupa encontrada.</td></tr>}</tbody></table></div>
    </section>
    {manager&&variantEdit&&<section className="lz-panel">
     <h2>Editar variação — {variantEdit.id}</h2>
     <p>Atualize o código, tamanho, cor e estoque mínimo. Para alterar a quantidade, utilize uma movimentação de estoque.</p>
     <form className="lz-form lz-form-wide" onSubmit={saveVariantEdit}>
      <label>SKU<input required value={variantEdit.sku} onChange={e=>setVariantEdit(v=>v?{...v,sku:e.target.value}:v)}/></label>
      <label>Tamanho<input required value={variantEdit.tamanho} onChange={e=>setVariantEdit(v=>v?{...v,tamanho:e.target.value}:v)}/></label>
      <label>Cor<input required value={variantEdit.cor} onChange={e=>setVariantEdit(v=>v?{...v,cor:e.target.value}:v)}/></label>
      <label>Mínimo<input required type="number" min="0" step="1" value={variantEdit.minimo} onChange={e=>setVariantEdit(v=>v?{...v,minimo:Number(e.target.value)}:v)}/></label>
      <button className="lz-btn" disabled={busy}>Salvar variação</button>
      <button type="button" className="lz-btn lz-outline" onClick={()=>setVariantEdit(null)}>Cancelar</button>
     </form>
    </section>}
    <section className="lz-panel"><h2>Últimas movimentações</h2><div className="lz-table-wrap"><table><thead><tr><th>Data</th><th>Peça</th><th>Quantidade</th><th>Motivo</th></tr></thead><tbody>
    {movements.map(m=><tr key={m.id}><td>{date(m.criado_em)}</td><td>{m.nome} · {m.tamanho} · {m.cor}<small>{m.sku}</small></td><td className={m.diferenca>=0?"lz-good":"lz-danger"}>{m.diferenca>0?"+":""}{m.diferenca}</td><td>{m.motivo}</td></tr>)}
    {movements.length===0&&<tr><td colSpan={4} className="lz-empty">Sem movimentações.</td></tr>}</tbody></table></div></section>
   </div>}

   {tab==="pdv"&&<div className="lz-content">
    <div className="lz-two"><section className="lz-panel"><h2>Nova venda</h2><p>Escolha as peças do pedido, depois registre o pagamento recebido.</p>
     <div className="lz-form"><label className="lz-span-2">Roupa e variação<select value={sellVariant} onChange={e=>setSellVariant(e.target.value)}><option value="">Selecionar roupa</option>{variants.filter(v=>v.quantidade>0).map(v=><option key={v.id} value={v.id}>{v.produto} · {v.tamanho} · {v.cor} | {cash(v.preco)} ({v.quantidade})</option>)}</select></label>
      <label>Quantidade<input type="number" min="1" step="1" value={sellQuantity} onChange={e=>setSellQuantity(e.target.value)}/></label><button type="button" className="lz-btn" onClick={addCart}>+ Adicionar ao carrinho</button>
     </div>
     <div className="lz-cart">{cart.length===0?<div className="lz-empty">Seu carrinho está vazio.</div>:cart.map(c=><div className="lz-cart-row" key={c.id}><div><strong>{c.nome}</strong><small>{c.quantidade} × {cash(c.preco)}</small></div><b>{cash(c.quantidade*c.preco)}</b><button aria-label={`Remover ${c.nome}`} type="button" className="lz-link" onClick={()=>setCart(x=>x.filter(y=>y.id!==c.id))}>Remover</button></div>)}</div>
     <div className="lz-cart-total"><span>Subtotal</span><strong>{cash(cartTotal)}</strong></div>
    </section><section className="lz-panel"><h2>Concluir venda</h2>
      <form className="lz-form" onSubmit={sell}>
       <label>Canal<select value={sellChannel} onChange={e=>setSellChannel(e.target.value)}><option value="loja">Loja física</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option></select></label>
       <label>Pagamento recebido<select value={payment} onChange={e=>setPayment(e.target.value)}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="debito">Cartão de débito</option><option value="credito">Cartão de crédito</option><option value="outro">Outro</option></select></label>
       <label className="lz-span-2">Cliente (opcional)<select value={sellClient} onChange={e=>setSellClient(e.target.value)}><option value="">Venda sem cadastro</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
       <label>Desconto (R$)<input type="number" min="0" max={cartTotal} step=".01" value={discount} onChange={e=>setDiscount(e.target.value)}/></label>
       <label className="lz-span-2">Observações<input value={sellNote} onChange={e=>setSellNote(e.target.value)} placeholder="Retirada, entrega, observações"/></label>
       <div className="lz-total lz-span-2"><span>Total da venda</span><strong>{cash(Math.max(0,cartTotal-safeDiscount))}</strong></div>
       <button disabled={busy||cart.length===0} className="lz-btn lz-span-2">Confirmar venda e baixar estoque</button>
       <button type="button" disabled={busy||cart.length===0} className="lz-btn lz-outline lz-span-2" onClick={savePending}>Salvar pedido aguardando pagamento</button>
      </form>
      <p className="lz-hint">Venda confirmada: baixa imediata. Pedido pendente: sem baixa e sem reserva; confirme a disponibilidade no pagamento. O sistema registra, mas não processa pagamentos.</p>
     </section></div>
     <section className="lz-panel"><div className="lz-section-head"><h2>Pedidos aguardando pagamento <span className="lz-chip">{pendentes.length}</span></h2>
      <label className="lz-payment-select">Canal
       <select value={pendingFilter} onChange={e=>setPendingFilter(e.target.value)}>
        <option value="todos">Todos</option><option value="loja">Loja física</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option>
       </select>
      </label>
      <label className="lz-payment-select">Pagamento na conclusão
       <select value={pendingPayment} onChange={e=>setPendingPayment(e.target.value)}>
        <option value="pix">Pix</option><option value="dinheiro">Dinheiro</option>
        <option value="debito">Cartão débito</option><option value="credito">Cartão crédito</option><option value="outro">Outro</option>
       </select>
      </label></div>
      <p className="lz-hint">Pedidos do WhatsApp, Instagram ou loja física. Não há reserva de peças; o estoque só é reduzido quando o pagamento for confirmado.</p>
      <div className="lz-table-wrap"><table><thead><tr><th>Pedido</th><th>Origem / cliente</th><th>Peças</th><th>Total</th><th>Ações</th></tr></thead><tbody>
       {pendingShown.map(p=><tr key={p.id}><td>#{p.id}<small>{date(p.criado_em)}</small></td>
        <td>{p.canal}<small>{p.cliente||"Sem cadastro"}</small></td>
        <td>{p.itens.map(i=>`${i.quantidade}× ${i.roupa} (${i.tamanho}/${i.cor})`).join(", ")}
        {p.itens.some(i=>Number(i.saldo_atual??0)<i.quantidade)&&<small className="lz-danger">Estoque insuficiente para confirmar: revise as peças</small>}</td>
        <td>{cash(p.total)}</td>
        <td><button className="lz-link lz-good" disabled={busy||p.itens.some(i=>Number(i.saldo_atual??0)<i.quantidade)} onClick={()=>concludePending(p)}>Confirmar pagamento</button>
         {manager&&<button className="lz-link lz-danger" disabled={busy} onClick={()=>cancelPending(p)}>Cancelar</button>}</td>
       </tr>)}
       {pendingShown.length===0&&<tr><td colSpan={5} className="lz-empty">Nenhum pedido aguardando pagamento neste filtro.</td></tr>}
      </tbody></table></div>
     </section>
     <section className="lz-panel"><h2>Últimas vendas</h2><div className="lz-table-wrap"><table><thead><tr><th>Pedido</th><th>Data</th><th>Canal</th><th>Cliente</th><th>Pagamento</th><th>Total</th><th>Status</th>{manager&&<th>Ação</th>}</tr></thead><tbody>
      {orders.map(o=><tr key={o.id}><td>#{o.id}</td><td>{date(o.criado_em)}</td><td>{o.canal}</td><td>{o.cliente||"—"}</td><td>{o.forma_pagamento||"—"}</td><td>{cash(o.total)}</td><td><span className={o.status==="pago"?"lz-good":"lz-danger"}>{o.status}</span></td>{manager&&<td>{o.status==="pago"&&<button className="lz-link lz-danger" onClick={()=>{if(window.confirm(`Cancelar a venda #${o.id}, devolver as peças ao estoque e lançar o estorno no financeiro?`))void run(async()=>{await api.post(`/api/v6/vendas/${o.id}/cancelar`);},"Venda cancelada e estoque devolvido.");}}>Cancelar</button>}</td>}</tr>)}
      {orders.length===0&&<tr><td colSpan={8} className="lz-empty">Nenhuma venda registrada.</td></tr>}</tbody></table></div></section>
   </div>}

   {tab==="clientes"&&<div className="lz-content"><section className="lz-panel"><h2>{editingClient?"Editar cliente":"Cadastrar cliente"}</h2>
    <form className="lz-form lz-form-wide" onSubmit={saveClient}><label>Nome<input required value={clientName} onChange={e=>setClientName(e.target.value)}/></label><label>WhatsApp / telefone<input value={clientPhone} onChange={e=>setClientPhone(e.target.value)}/></label><label>Instagram<input value={clientInstagram} onChange={e=>setClientInstagram(e.target.value)} placeholder="@usuario"/></label><button className="lz-btn" disabled={busy}>{editingClient?"Salvar cliente":"Cadastrar cliente"}</button>
    {editingClient&&<button type="button" className="lz-btn lz-outline" onClick={()=>{setEditingClient(null);setClientName("");setClientPhone("");setClientInstagram("");}}>Cancelar</button>}</form></section>
    <section className="lz-panel"><h2>Clientes da loja</h2><div className="lz-table-wrap"><table><thead><tr><th>Nome</th><th>Contato</th><th>Instagram</th><th>Ações</th></tr></thead><tbody>
    {clients.map(c=><tr key={c.id}><td><strong>{c.nome}</strong></td><td>{c.telefone||"—"}</td><td>{c.instagram||"—"}</td><td><button className="lz-link" onClick={()=>{setEditingClient(c.id);setClientName(c.nome);setClientPhone(c.telefone||"");setClientInstagram(c.instagram||"");window.scrollTo({top:0,behavior:"smooth"});}}>Editar</button><button className="lz-link" onClick={()=>void showClientOrders(c)}>Histórico</button></td></tr>)}
    {clients.length===0&&<tr><td colSpan={4} className="lz-empty">Nenhum cliente cadastrado.</td></tr>}</tbody></table></div></section>
    {historyTitle&&<section className="lz-panel"><h2>Compras de {historyTitle}</h2><div className="lz-table-wrap"><table><thead><tr><th>Pedido</th><th>Data</th><th>Canal</th><th>Total</th><th>Status</th></tr></thead><tbody>{clientHistory.map(o=><tr key={o.id}><td>#{o.id}</td><td>{date(o.criado_em)}</td><td>{o.canal}</td><td>{cash(o.total)}</td><td>{o.status}</td></tr>)}{clientHistory.length===0&&<tr><td colSpan={5} className="lz-empty">Nenhuma compra encontrada.</td></tr>}</tbody></table></div></section>}
   </div>}

   {tab==="financeiro"&&manager&&<div className="lz-content">
    <div className="lz-metrics lz-three"><article className="lz-metric"><small>Entradas confirmadas</small><strong>{cash(financeSummary.entradas)}</strong></article><article className="lz-metric"><small>Saídas confirmadas</small><strong>{cash(financeSummary.saidas)}</strong></article><article className="lz-metric"><small>Saldo de caixa registrado</small><strong>{cash(Number(financeSummary.entradas)-Number(financeSummary.saidas))}</strong></article></div>
    <section className="lz-panel"><h2>Novo lançamento financeiro</h2><p>Vendas e compras já geram lançamentos automaticamente. Use este formulário para despesas e receitas adicionais.</p>
     <form className="lz-form lz-form-wide" onSubmit={finance}>
      <label>Tipo<select value={financeType} onChange={e=>setFinanceType(e.target.value)}><option value="saida">Despesa / saída</option><option value="entrada">Receita / entrada</option></select></label>
      <label>Categoria<input required value={financeCategory} onChange={e=>setFinanceCategory(e.target.value)}/></label>
      <label>Descrição<input required value={financeDescription} onChange={e=>setFinanceDescription(e.target.value)} placeholder="Ex.: Aluguel da loja"/></label>
      <label>Valor (R$)<input required min=".01" step=".01" type="number" value={financeAmount} onChange={e=>setFinanceAmount(e.target.value)}/></label>
      <label>Situação<select value={financeStatus} onChange={e=>setFinanceStatus(e.target.value)}><option value="pago">Pago / recebido</option><option value="pendente">Pendente</option></select></label>
      <button className="lz-btn" disabled={busy}>Salvar lançamento</button>
     </form>
    </section>
    <section className="lz-panel"><h2>Movimentações financeiras</h2><div className="lz-table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Status</th><th>Valor</th></tr></thead><tbody>
    {entries.map(l=><tr key={l.id}><td>{date(l.data_movimento+"T12:00:00")}</td><td>{l.descricao}</td><td>{l.categoria}</td><td>{l.status}</td><td className={l.tipo==="entrada"?"lz-good":"lz-danger"}>{l.tipo==="entrada"?"+":"-"}{cash(l.valor)}</td></tr>)}
    {entries.length===0&&<tr><td colSpan={5} className="lz-empty">Nenhum lançamento financeiro.</td></tr>}</tbody></table></div></section>
   </div>}

   {tab==="fornecedores"&&manager&&<div className="lz-content">
    <div className="lz-two"><section className="lz-panel"><h2>Cadastrar fornecedor</h2><form className="lz-form" onSubmit={saveSupplier}>
     <label className="lz-span-2">Nome<input required value={supplierName} onChange={e=>setSupplierName(e.target.value)}/></label>
     <label>Telefone<input value={supplierPhone} onChange={e=>setSupplierPhone(e.target.value)}/></label>
     <label>E-mail<input type="email" value={supplierEmail} onChange={e=>setSupplierEmail(e.target.value)}/></label>
     <button className="lz-btn" disabled={busy}>Cadastrar fornecedor</button></form></section>
     <section className="lz-panel"><h2>Entrada de mercadorias</h2><p>Registre uma compra de uma variação por vez; o estoque e o financeiro serão atualizados.</p>
      <form className="lz-form" onSubmit={receive}>
       <label className="lz-span-2">Fornecedor<select value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Não informado</option>{suppliers.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>
       <label className="lz-span-2">Peça<select required value={purchaseVariant} onChange={e=>setPurchaseVariant(e.target.value)}><option value="">Selecione</option>{variants.map(v=><option key={v.id} value={v.id}>{v.produto} · {v.tamanho} · {v.cor}</option>)}</select></label>
       <label>Quantidade<input type="number" min="1" step="1" required value={purchaseQty} onChange={e=>setPurchaseQty(e.target.value)}/></label>
       <label>Custo por peça (R$)<input type="number" min="0" step=".01" required value={purchaseCost} onChange={e=>setPurchaseCost(e.target.value)}/></label>
       <button className="lz-btn" disabled={busy}>Receber mercadoria</button></form></section></div>
    <div className="lz-two">
     <section className="lz-panel"><h2>Fornecedores</h2><div className="lz-table-wrap"><table><thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th></tr></thead><tbody>{suppliers.map(f=><tr key={f.id}><td>{f.nome}</td><td>{f.telefone||"—"}</td><td>{f.email||"—"}</td></tr>)}{suppliers.length===0&&<tr><td colSpan={3} className="lz-empty">Nenhum fornecedor.</td></tr>}</tbody></table></div></section>
     <section className="lz-panel"><h2>Compras recentes</h2><div className="lz-table-wrap"><table><thead><tr><th>Compra</th><th>Fornecedor</th><th>Data</th><th>Total</th></tr></thead><tbody>{purchases.map(p=><tr key={p.id}><td>#{p.id}</td><td>{p.fornecedor||"—"}</td><td>{date(p.criado_em)}</td><td>{cash(p.total)}</td></tr>)}{purchases.length===0&&<tr><td colSpan={4} className="lz-empty">Nenhuma compra.</td></tr>}</tbody></table></div></section>
    </div>
   </div>}

   {tab==="relatorios"&&manager&&<div className="lz-content">
    <section className="lz-panel"><div className="lz-section-head"><h2>Período da análise</h2><button className="lz-btn lz-outline" disabled={!report} onClick={exportReport}>Exportar relatório CSV</button><div className="lz-range"><label>De<input aria-label="Data inicial" type="date" value={rangeStart} onChange={e=>setRangeStart(e.target.value)}/></label><label>Até<input aria-label="Data final" type="date" value={rangeEnd} onChange={e=>setRangeEnd(e.target.value)}/></label><button className="lz-btn" onClick={()=>void refresh()}>Consultar</button></div></div></section>
    <div className="lz-metrics lz-three"><article className="lz-metric"><small>Vendas no período</small><strong>{report?.totais.vendas??"—"}</strong></article><article className="lz-metric"><small>Faturamento líquido</small><strong>{report?cash(report.totais.faturamento):"—"}</strong></article><article className="lz-metric"><small>Lucro bruto estimado</small><strong>{report?cash(report.totais.lucro_estimado):"—"}</strong></article></div>
    <div className="lz-two"><section className="lz-panel"><h2>Vendas por canal</h2>{report?.canais.length?report.canais.map(c=><div className="lz-breakdown" key={c.canal}><div><strong>{c.canal}</strong><small>{c.vendas} vendas · {cash(c.total)}</small></div><div className="lz-bar"><span style={{width:`${Math.min(100,100*Number(c.total)/Math.max(1,...report.canais.map(x=>Number(x.total))))}%`}}/></div></div>):<div className="lz-empty">Sem vendas neste período.</div>}</section>
     <section className="lz-panel"><h2>Produtos mais vendidos</h2>{report?.maisVendidos.length?report.maisVendidos.map((p,i)=><div className="lz-top-product" key={`${p.nome}-${p.tamanho}-${p.cor}`}><span>{i+1}</span><strong>{p.nome}<small>{p.tamanho} · {p.cor}</small></strong><small>{p.pecas} peças</small></div>):<div className="lz-empty">Sem dados neste período.</div>}</section></div>
    <section className="lz-panel"><h2>Vendas por dia</h2><div className="lz-table-wrap"><table><thead><tr><th>Dia</th><th>Vendas</th><th>Bruto</th></tr></thead><tbody>{report?.dias.map(d=><tr key={d.dia}><td>{date(d.dia+"T12:00:00")}</td><td>{d.vendas}</td><td>{cash(d.bruto)}</td></tr>)}{!report?.dias.length&&<tr><td colSpan={3} className="lz-empty">Sem registros no intervalo.</td></tr>}</tbody></table></div><p className="lz-hint">{report?.nota}</p></section>
   </div>}

   {tab==="config"&&manager&&<div className="lz-content">
    <div className="lz-two">
     <section className="lz-panel"><h2>Adicionar funcionária ou gestor</h2><p>A conta é criada pela administradora. Não há cadastro público.</p>
      <form className="lz-form" onSubmit={addUser}><label>Nome de acesso<input required value={userName} onChange={e=>setUserName(e.target.value)}/></label>
       <label>Função<select value={userRole} onChange={e=>setUserRole(e.target.value)}><option value="funcionario">Funcionária</option><option value="gestor">Administradora</option></select></label>
       <label className="lz-span-2">Senha inicial (mínimo 10 caracteres)<input autoComplete="new-password" type="password" required minLength={10} value={userPassword} onChange={e=>setUserPassword(e.target.value)}/></label>
       <button className="lz-btn" disabled={busy}>Criar acesso</button></form></section>
     <section className="lz-panel"><h2>Permissões</h2><p><strong>Administradora:</strong> vendas, estoque, clientes, funcionários, fornecedores, financeiro e relatórios.</p>
      <p><strong>Funcionária:</strong> dashboard, consulta/cadastro de produtos, clientes e registro de vendas.</p>
      <div className="lz-warning">Os backups são configurados na infraestrutura do Supabase. Não existe backup automático criado por esta tela.</div>
      <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="lz-help">Abrir painel Supabase ↗</a>
     </section>
    </div>
    <section className="lz-panel"><h2>Contas cadastradas</h2><div className="lz-table-wrap"><table><thead><tr><th>Usuário</th><th>Função</th><th>Status</th><th>Ações</th></tr></thead><tbody>
     {users.map(u=><tr key={u.id}><td>{u.nome}{u.id===operador?.id_operador&&<small>Você</small>}</td><td>{u.role==="gestor"?"Administradora":"Funcionária"}</td><td>{u.ativo?"Ativo":"Desativado"}</td>
      <td><button type="button" className="lz-link" disabled={busy||u.id===operador?.id_operador} onClick={()=>void run(async()=>{await api.patch(`/api/v6/usuarios/${u.id}`,{role:u.role==="gestor"?"funcionario":"gestor",ativo:u.ativo});},"Permissão atualizada.")}>Alterar função</button>
      <button type="button" className="lz-link" disabled={busy||u.id===operador?.id_operador} onClick={()=>{if(window.confirm(`${u.ativo?"Desativar":"Reativar"} ${u.nome}?`))void run(async()=>{await api.patch(`/api/v6/usuarios/${u.id}`,{role:u.role,ativo:!u.ativo});},"Acesso atualizado.");}}>{u.ativo?"Desativar":"Reativar"}</button></td></tr>)}
     {users.length===0&&<tr><td colSpan={4} className="lz-empty">Nenhum usuário encontrado.</td></tr>}</tbody></table></div></section>
    <section className="lz-panel"><h2>Redefinir senha de uma conta</h2><form className="lz-form lz-form-wide" onSubmit={e=>{e.preventDefault();void run(async()=>{await api.post(`/api/v6/usuarios/${resetUser}/senha`,{senha:resetPassword});setResetPassword("");},"Senha alterada.");}}>
     <label>Usuário<select required value={resetUser} onChange={e=>setResetUser(e.target.value)}><option value="">Selecione</option>{users.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}</select></label>
     <label>Nova senha<input type="password" autoComplete="new-password" required minLength={10} value={resetPassword} onChange={e=>setResetPassword(e.target.value)}/></label>
     <button className="lz-btn" disabled={busy}>Atualizar senha</button></form></section>
   </div>}
  </main>
 </div>;
}
