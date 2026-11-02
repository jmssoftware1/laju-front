import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {AuthProvider,useAuth} from '../context/AuthContext';
import Login from '../components/auth/Login';
import LajuStore from '../components/lajustore/V6';
import MonthlyReport from '../components/lajustore/MonthlyReport';
import {ToastProvider} from '../context/alerts/ToastContext';
function Private({children}:{children:React.ReactNode}){const {operador,loading}=useAuth();if(loading)return <div role="status" style={{padding:32}}>Carregando sessão...</div>;return operador?<>{children}</>:<Navigate to="/"/>}
export default function App(){return <AuthProvider><ToastProvider><BrowserRouter><Routes>
<Route path="/" element={<Login/>}/>
<Route path="/lajustore" element={<Private><LajuStore/></Private>}/>
<Route path="/lajustore/relatorio-mensal" element={<Private><MonthlyReport/></Private>}/>
<Route path="*" element={<Navigate to="/lajustore"/>}/>
</Routes></BrowserRouter></ToastProvider></AuthProvider>}
