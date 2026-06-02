import { useState, useEffect, useCallback } from "react";

// =============================================
// CONFIGURAÇÃO SUPABASE
// =============================================
const SUPABASE_URL = "https://iqcqcpjbxjwzmwrpoiya.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxY3FjcGpieGp3em13cnBvaXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNjI1MTUsImV4cCI6MjA5NTkzODUxNX0.g0vSYtwKjoQQ4a4XKTB4rd658I46HHov2vsAcW60vKg";

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

// =============================================
// CORES E ESTILOS
// =============================================
const C = {
  azul: "#1A3A8F",
  azulClaro: "#2450B5",
  amarelo: "#F5A800",
  amareloClaro: "#FFD166",
  vermelho: "#D72B2B",
  verde: "#16A34A",
  verdeClaro: "#22C55E",
  laranja: "#EA580C",
  branco: "#FFFFFF",
  cinzaF: "#F4F6FA",
  cinzaE: "#E8ECF4",
  cinzaD: "#D1D9E6",
  cinzaT: "#6B7A99",
  cinzaP: "#374151",
  preto: "#0F172A",
};

const urgenciaCor = { normal: C.verde, urgente: C.amarelo, critico: C.vermelho, emergencia: C.vermelho };
const urgenciaLabel = { normal: "Normal", urgente: "Urgente", critico: "Crítico", emergencia: "Emergência" };
const statusCor = { pendente: C.amarelo, em_andamento: C.azulClaro, entregue: C.verde, cancelado: C.cinzaT, aberto: C.vermelho, resolvido: C.verde };
const statusLabel = { pendente: "Pendente", em_andamento: "Em andamento", entregue: "Entregue", cancelado: "Cancelado", aberto: "Aberto", resolvido: "Resolvido" };
const categoriaLabel = { generico: "Genérico", etico: "Ético", equipamento: "Equipamento", outro: "Outro" };
const categoriaCor = { generico: C.azulClaro, etico: "#7C3AED", equipamento: C.laranja, outro: C.cinzaT };

// =============================================
// ÍCONES SVG
// =============================================
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    home: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>,
    pedidos: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></>,
    manutencao: <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></>,
    farmacias: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>,
    grafico: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    previsao: <><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></>,
    relatorio: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></>,
    sair: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    mais: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    fechar: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    sino: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    olho: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    check: <><polyline points="20,6 9,17 4,12"/></>,
    alerta: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    pdf: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h3"/></>,
    filtro: <><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"/></>,
    lupa: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    msg: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
    configs: <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></>,
    farmaciaIcon: <><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>,
    cruz: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// =============================================
// COMPONENTES BASE
// =============================================
const Badge = ({ label, cor }) => (
  <span style={{ background: cor + "20", color: cor, border: `1px solid ${cor}40`, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
    {label}
  </span>
);

const Btn = ({ children, onClick, cor = C.azul, outline = false, small = false, disabled = false, full = false }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: outline ? "transparent" : cor,
    color: outline ? cor : C.branco,
    border: `2px solid ${cor}`,
    borderRadius: 10,
    padding: small ? "6px 14px" : "10px 20px",
    fontWeight: 700,
    fontSize: small ? 12 : 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: full ? "100%" : "auto",
    justifyContent: full ? "center" : "flex-start",
    transition: "all 0.15s",
    fontFamily: "inherit",
  }}>
    {children}
  </button>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.branco, borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(26,58,143,0.08)", border: `1px solid ${C.cinzaE}`, ...style }}>
    {children}
  </div>
);

const Input = ({ label, value, onChange, type = "text", placeholder = "", required = false }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>{label}{required && <span style={{ color: C.vermelho }}> *</span>}</label>}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        border: `1.5px solid ${C.cinzaD}`,
        fontSize: 14,
        color: C.preto,
        background: C.branco,
        boxSizing: "border-box",
        fontFamily: "inherit",
        outline: "none",
        transition: "border 0.15s",
      }}
    />
  </div>
);

const Select = ({ label, value, onChange, options, required = false }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>{label}{required && <span style={{ color: C.vermelho }}> *</span>}</label>}
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      width: "100%", padding: "10px 14px", borderRadius: 10,
      border: `1.5px solid ${C.cinzaD}`, fontSize: 14, color: C.preto,
      background: C.branco, boxSizing: "border-box", fontFamily: "inherit", outline: "none",
    }}>
      <option value="">Selecione...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Modal = ({ title, onClose, children, width = 560 }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: C.branco, borderRadius: 20, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${C.cinzaE}`, position: "sticky", top: 0, background: C.branco, zIndex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.azul }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.cinzaT, padding: 4 }}><Icon name="fechar" size={20} /></button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

// =============================================
// TELA DE LOGIN
// =============================================
const Login = ({ onLogin }) => {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleLogin = async () => {
    if (!usuario || !senha) { setErro("Preencha usuário e senha."); return; }
    setLoading(true); setErro("");
    try {
      const dados = await sb(`farmacias?usuario=eq.${encodeURIComponent(usuario)}&senha_hash=eq.${encodeURIComponent(senha)}&ativa=eq.true`);
      if (dados.length === 0) { setErro("Usuário ou senha incorretos."); setLoading(false); return; }
      const farmacia = dados[0];
      onLogin({ ...farmacia, isDono: farmacia.usuario === "admin" });
    } catch {
      setErro("Erro ao conectar. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.azul} 0%, ${C.azulClaro} 50%, #3B6FD4 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.branco, borderRadius: 24, padding: 40, width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, background: `linear-gradient(135deg, ${C.azul}, ${C.azulClaro})`, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke={C.amarelo} strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.azul, letterSpacing: -0.5 }}>
            Hipera<span style={{ color: C.amarelo }}>farma</span>
          </h1>
          <p style={{ margin: "4px 0 0", color: C.cinzaT, fontSize: 13 }}>Drogarias — Sistema de Gestão</p>
        </div>

        <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700, color: C.preto }}>Acesso ao Sistema</h2>

        <Input label="Usuário" value={usuario} onChange={setUsuario} placeholder="Digite seu usuário" />
        <Input label="Senha" value={senha} onChange={setSenha} type="password" placeholder="Digite sua senha" />

        {erro && (
          <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: C.vermelho, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="alerta" size={16} color={C.vermelho} /> {erro}
          </div>
        )}

        <Btn onClick={handleLogin} disabled={loading} full cor={C.azul}>
          {loading ? "Entrando..." : "Entrar no Sistema"}
        </Btn>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: C.cinzaT }}>
          🔒 Sistema Seguro — Hiperafarma © 2025
        </p>
      </div>
    </div>
  );
};

// =============================================
// SIDEBAR
// =============================================
const Sidebar = ({ ativo, setAtivo, isDono, farmacia, onSair }) => {
  const menuDono = [
    { id: "dashboard", label: "Painel Central", icon: "home" },
    { id: "pedidos", label: "Pedidos", icon: "pedidos" },
    { id: "manutencoes", label: "Manutenções", icon: "manutencao" },
    { id: "farmacias", label: "Farmácias", icon: "farmacias" },
    { id: "graficos", label: "Relatórios", icon: "grafico" },
    { id: "previsao", label: "Previsão", icon: "previsao" },
  ];
  const menuFarmacia = [
    { id: "meus-pedidos", label: "Meus Pedidos", icon: "pedidos" },
    { id: "nova-solicitacao", label: "Nova Solicitação", icon: "mais" },
    { id: "manutencao-farm", label: "Manutenção", icon: "manutencao" },
    { id: "previsao-farm", label: "Previsão", icon: "previsao" },
  ];
  const menu = isDono ? menuDono : menuFarmacia;

  return (
    <div style={{ width: 240, minHeight: "100vh", background: C.azul, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, background: C.amarelo, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke={C.azul} strokeWidth="3" strokeLinecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke={C.azul} strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ color: C.branco, fontWeight: 800, fontSize: 15, lineHeight: 1 }}>Hipera<span style={{ color: C.amarelo }}>farma</span></div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 2 }}>Drogarias</div>
          </div>
        </div>
        <div style={{ marginTop: 16, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginBottom: 2 }}>{isDono ? "ADMINISTRADOR" : "FARMÁCIA"}</div>
          <div style={{ color: C.branco, fontWeight: 700, fontSize: 13 }}>{farmacia.nome}</div>
        </div>
      </div>

      {/* Menu */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {menu.map(item => (
          <button key={item.id} onClick={() => setAtivo(item.id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer",
            background: ativo === item.id ? C.amarelo : "transparent",
            color: ativo === item.id ? C.azul : "rgba(255,255,255,0.7)",
            fontWeight: ativo === item.id ? 700 : 500, fontSize: 14,
            marginBottom: 4, textAlign: "left", transition: "all 0.15s", fontFamily: "inherit",
          }}>
            <Icon name={item.icon} size={18} color={ativo === item.id ? C.azul : "rgba(255,255,255,0.7)"} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Sair */}
      <div style={{ padding: "16px 12px", borderTop: `1px solid rgba(255,255,255,0.1)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0 12px" }}>
          <div style={{ width: 8, height: 8, background: C.verdeClaro, borderRadius: "50%" }} />
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Sistema Online</span>
        </div>
        <button onClick={onSair} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer",
          background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
          fontWeight: 500, fontSize: 14, fontFamily: "inherit",
        }}>
          <Icon name="sair" size={18} color="rgba(255,255,255,0.7)" /> Sair
        </button>
      </div>
    </div>
  );
};

// =============================================
// DASHBOARD DO DONO
// =============================================
const Dashboard = ({ stats, pedidos, manutencoes, farmacias }) => {
  const cards = [
    { label: "Pedidos Pendentes", valor: stats.pendentes, cor: C.amarelo, icon: "pedidos" },
    { label: "Pedidos Urgentes/Críticos", valor: stats.urgentes, cor: C.vermelho, icon: "alerta" },
    { label: "Manutenções Abertas", valor: stats.manutencoes, cor: C.laranja, icon: "manutencao" },
    { label: "Farmácias Ativas", valor: stats.farmacias, cor: C.verde, icon: "farmacias" },
    { label: "Pedidos Hoje", valor: stats.hoje, cor: C.azulClaro, icon: "home" },
  ];

  const recentesPedidos = pedidos.slice(0, 5);

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Painel Central</h2>
      <p style={{ margin: "0 0 28px", color: C.cinzaT, fontSize: 14 }}>Visão geral da rede Hiperafarma</p>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        {cards.map(c => (
          <Card key={c.label} style={{ borderTop: `4px solid ${c.cor}`, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, background: c.cor + "20", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={c.icon} size={18} color={c.cor} />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.preto, lineHeight: 1 }}>{c.valor}</div>
            <div style={{ fontSize: 12, color: C.cinzaT, marginTop: 6 }}>{c.label}</div>
          </Card>
        ))}
      </div>

      {/* Últimos pedidos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.preto, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="pedidos" size={18} color={C.azul} /> Últimos Pedidos
          </h3>
          {recentesPedidos.length === 0 ? (
            <p style={{ color: C.cinzaT, fontSize: 14 }}>Nenhum pedido ainda.</p>
          ) : recentesPedidos.map(p => {
            const farm = farmacias.find(f => f.id === p.farmacia_id);
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.cinzaE}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>{farm?.nome || "Farmácia"}</div>
                  <div style={{ fontSize: 12, color: C.cinzaT }}>{new Date(p.criado_em).toLocaleDateString("pt-BR")}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Badge label={urgenciaLabel[p.urgencia]} cor={urgenciaCor[p.urgencia]} />
                  <Badge label={statusLabel[p.status]} cor={statusCor[p.status]} />
                </div>
              </div>
            );
          })}
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.preto, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="manutencao" size={18} color={C.laranja} /> Manutenções Recentes
          </h3>
          {manutencoes.slice(0, 5).length === 0 ? (
            <p style={{ color: C.cinzaT, fontSize: 14 }}>Nenhuma manutenção aberta.</p>
          ) : manutencoes.slice(0, 5).map(m => {
            const farm = farmacias.find(f => f.id === m.farmacia_id);
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.cinzaE}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>{farm?.nome || "Farmácia"}</div>
                  <div style={{ fontSize: 12, color: C.cinzaT }}>{m.descricao.slice(0, 40)}...</div>
                </div>
                <Badge label={statusLabel[m.status]} cor={statusCor[m.status]} />
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
};

// =============================================
// PEDIDOS DO DONO
// =============================================
const PedidosDono = ({ pedidos, farmacias, laboratorios, onAtualizar }) => {
  const [filtroFarmacia, setFiltroFarmacia] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroUrgencia, setFiltroUrgencia] = useState("");
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [itensPedido, setItensPedido] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [geraPDF, setGeraPDF] = useState(false);
  const [labPDF, setLabPDF] = useState("");

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroFarmacia && p.farmacia_id !== filtroFarmacia) return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    if (filtroUrgencia && p.urgencia !== filtroUrgencia) return false;
    return true;
  });

  const abrirPedido = async (pedido) => {
    setPedidoSelecionado(pedido);
    const itens = await sb(`pedido_itens?pedido_id=eq.${pedido.id}&order=criado_em.asc`);
    const comts = await sb(`comentarios?pedido_id=eq.${pedido.id}&order=criado_em.asc`);
    setItensPedido(itens);
    setComentarios(comts);
  };

  const enviarComentario = async () => {
    if (!novoComentario.trim()) return;
    await sb(`comentarios`, { method: "POST", body: JSON.stringify({ pedido_id: pedidoSelecionado.id, autor: "dono", mensagem: novoComentario }) });
    setNovoComentario("");
    const comts = await sb(`comentarios?pedido_id=eq.${pedidoSelecionado.id}&order=criado_em.asc`);
    setComentarios(comts);
  };

  const atualizarStatus = async (novoStatus) => {
    await sb(`pedidos?id=eq.${pedidoSelecionado.id}`, { method: "PATCH", body: JSON.stringify({ status: novoStatus }) });
    await sb(`logs`, { method: "POST", body: JSON.stringify({ pedido_id: pedidoSelecionado.id, farmacia_id: pedidoSelecionado.farmacia_id, acao: `Status atualizado para: ${statusLabel[novoStatus]}` }) });
    onAtualizar();
    setPedidoSelecionado({ ...pedidoSelecionado, status: novoStatus });
  };

  const gerarPDFLab = () => {
    if (!labPDF) return;
    const lab = laboratorios.find(l => l.id === labPDF);
    const itensDoCab = [];
    pedidos.filter(p => p.status === "pendente" || p.status === "em_andamento").forEach(p => {
      const farm = farmacias.find(f => f.id === p.farmacia_id);
    });
    alert(`PDF para o laboratório "${lab?.nome}" seria gerado aqui com todos os itens pendentes desse laboratório!`);
    setGeraPDF(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Pedidos</h2>
          <p style={{ margin: 0, color: C.cinzaT, fontSize: 14 }}>{pedidosFiltrados.length} pedidos encontrados</p>
        </div>
        <Btn onClick={() => setGeraPDF(true)} cor={C.vermelho}>
          <Icon name="pdf" size={16} color={C.branco} /> Gerar PDF por Laboratório
        </Btn>
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>FARMÁCIA</label>
            <select value={filtroFarmacia} onChange={e => setFiltroFarmacia(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 13, fontFamily: "inherit", background: C.branco }}>
              <option value="">Todas</option>
              {farmacias.filter(f => f.usuario !== "admin").map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>STATUS</label>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 13, fontFamily: "inherit", background: C.branco }}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="entregue">Entregue</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>URGÊNCIA</label>
            <select value={filtroUrgencia} onChange={e => setFiltroUrgencia(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 13, fontFamily: "inherit", background: C.branco }}>
              <option value="">Todas</option>
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
              <option value="critico">Crítico</option>
            </select>
          </div>
          <Btn onClick={() => { setFiltroFarmacia(""); setFiltroStatus(""); setFiltroUrgencia(""); }} outline cor={C.cinzaT} small>Limpar</Btn>
        </div>
      </Card>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pedidosFiltrados.length === 0 ? (
          <Card><p style={{ color: C.cinzaT, textAlign: "center", margin: 0 }}>Nenhum pedido encontrado.</p></Card>
        ) : pedidosFiltrados.map(p => {
          const farm = farmacias.find(f => f.id === p.farmacia_id);
          return (
            <Card key={p.id} style={{ padding: 16, cursor: "pointer", transition: "box-shadow 0.15s" }} onClick={() => abrirPedido(p)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, background: urgenciaCor[p.urgencia] + "20", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="pedidos" size={20} color={urgenciaCor[p.urgencia]} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.preto }}>{farm?.nome || "Farmácia"}</div>
                    <div style={{ fontSize: 12, color: C.cinzaT }}>{new Date(p.criado_em).toLocaleString("pt-BR")}</div>
                    {p.observacao && <div style={{ fontSize: 12, color: C.cinzaP, marginTop: 2 }}>{p.observacao.slice(0, 60)}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge label={urgenciaLabel[p.urgencia]} cor={urgenciaCor[p.urgencia]} />
                  <Badge label={statusLabel[p.status]} cor={statusCor[p.status]} />
                  <Icon name="olho" size={18} color={C.cinzaT} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Pedido */}
      {pedidoSelecionado && (
        <Modal title={`Pedido — ${farmacias.find(f => f.id === pedidoSelecionado.farmacia_id)?.nome}`} onClose={() => setPedidoSelecionado(null)} width={680}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <Badge label={urgenciaLabel[pedidoSelecionado.urgencia]} cor={urgenciaCor[pedidoSelecionado.urgencia]} />
            <Badge label={statusLabel[pedidoSelecionado.status]} cor={statusCor[pedidoSelecionado.status]} />
            <span style={{ fontSize: 12, color: C.cinzaT, marginLeft: "auto" }}>{new Date(pedidoSelecionado.criado_em).toLocaleString("pt-BR")}</span>
          </div>

          {pedidoSelecionado.observacao && (
            <div style={{ background: C.cinzaF, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14, color: C.cinzaP }}>
              📝 {pedidoSelecionado.observacao}
            </div>
          )}

          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.cinzaT }}>ITENS DO PEDIDO</h4>
          <div style={{ background: C.cinzaF, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            {itensPedido.length === 0 ? <p style={{ padding: 16, color: C.cinzaT, margin: 0 }}>Carregando itens...</p> :
              itensPedido.map((item, i) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < itensPedido.length - 1 ? `1px solid ${C.cinzaE}` : "none" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>{item.nome_produto}</div>
                    <div style={{ fontSize: 12, color: C.cinzaT }}>{item.nome_laboratorio || "Sem laboratório"} • {categoriaLabel[item.categoria]}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge label={categoriaLabel[item.categoria]} cor={categoriaCor[item.categoria]} />
                    <span style={{ fontWeight: 700, fontSize: 16, color: C.azul }}>×{item.quantidade}</span>
                  </div>
                </div>
              ))
            }
          </div>

          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.cinzaT }}>ATUALIZAR STATUS</h4>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {["pendente", "em_andamento", "entregue"].map(s => (
              <Btn key={s} onClick={() => atualizarStatus(s)} cor={statusCor[s]} small outline={pedidoSelecionado.status !== s}>
                {statusLabel[s]}
              </Btn>
            ))}
          </div>

          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.cinzaT }}>COMENTÁRIOS</h4>
          <div style={{ background: C.cinzaF, borderRadius: 12, padding: 12, marginBottom: 12, maxHeight: 200, overflowY: "auto" }}>
            {comentarios.length === 0 ? <p style={{ color: C.cinzaT, fontSize: 13, margin: 0 }}>Nenhum comentário ainda.</p> :
              comentarios.map(c => (
                <div key={c.id} style={{ marginBottom: 10, display: "flex", flexDirection: c.autor === "dono" ? "row-reverse" : "row", gap: 8 }}>
                  <div style={{ background: c.autor === "dono" ? C.azul : C.branco, color: c.autor === "dono" ? C.branco : C.preto, padding: "8px 12px", borderRadius: 12, fontSize: 13, maxWidth: "80%", border: `1px solid ${C.cinzaE}` }}>
                    <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{c.autor === "dono" ? "Você" : "Farmácia"} • {new Date(c.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    {c.mensagem}
                  </div>
                </div>
              ))
            }
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={novoComentario} onChange={e => setNovoComentario(e.target.value)} placeholder="Escreva uma mensagem..." onKeyDown={e => e.key === "Enter" && enviarComentario()} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <Btn onClick={enviarComentario} cor={C.azul}><Icon name="msg" size={16} color={C.branco} /></Btn>
          </div>
        </Modal>
      )}

      {/* Modal PDF */}
      {geraPDF && (
        <Modal title="Gerar PDF por Laboratório" onClose={() => setGeraPDF(false)} width={440}>
          <p style={{ color: C.cinzaT, fontSize: 14, marginBottom: 20 }}>Selecione o laboratório para gerar o PDF com todos os itens pendentes.</p>
          <Select label="Laboratório" value={labPDF} onChange={setLabPDF} options={laboratorios.map(l => ({ value: l.id, label: l.nome }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn onClick={gerarPDFLab} cor={C.vermelho} disabled={!labPDF} full>
              <Icon name="pdf" size={16} color={C.branco} /> Gerar PDF
            </Btn>
            <Btn onClick={() => setGeraPDF(false)} outline cor={C.cinzaT}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// =============================================
// FARMÁCIAS (gerenciar)
// =============================================
const GerenciarFarmacias = ({ farmacias, onAtualizar }) => {
  const [modal, setModal] = useState(false);
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  const cadastrar = async () => {
    if (!nome || !usuario || !senha) return;
    setLoading(true);
    try {
      await sb("farmacias", { method: "POST", body: JSON.stringify({ nome, usuario, senha_hash: senha, endereco, telefone }) });
      setModal(false); setNome(""); setUsuario(""); setSenha(""); setEndereco(""); setTelefone("");
      onAtualizar();
    } catch (e) { alert("Erro ao cadastrar: " + e.message); }
    setLoading(false);
  };

  const listaFarmacias = farmacias.filter(f => f.usuario !== "admin");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Farmácias</h2>
          <p style={{ margin: 0, color: C.cinzaT, fontSize: 14 }}>{listaFarmacias.length} farmácias cadastradas</p>
        </div>
        <Btn onClick={() => setModal(true)} cor={C.azul}><Icon name="mais" size={16} color={C.branco} /> Nova Farmácia</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {listaFarmacias.map(f => (
          <Card key={f.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, background: C.azul + "15", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="farmacias" size={22} color={C.azul} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.preto }}>{f.nome}</div>
                <div style={{ fontSize: 12, color: C.cinzaT }}>@{f.usuario}</div>
              </div>
              <Badge label={f.ativa ? "Ativa" : "Inativa"} cor={f.ativa ? C.verde : C.cinzaT} />
            </div>
            {f.endereco && <div style={{ fontSize: 13, color: C.cinzaT, marginBottom: 4 }}>📍 {f.endereco}</div>}
            {f.telefone && <div style={{ fontSize: 13, color: C.cinzaT }}>📞 {f.telefone}</div>}
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title="Cadastrar Nova Farmácia" onClose={() => setModal(false)}>
          <Input label="Nome da Farmácia" value={nome} onChange={setNome} placeholder="Ex: Hiperafarma Centro" required />
          <Input label="Usuário (login)" value={usuario} onChange={setUsuario} placeholder="Ex: hiperafarma_centro" required />
          <Input label="Senha" value={senha} onChange={setSenha} type="password" placeholder="Senha de acesso" required />
          <Input label="Endereço" value={endereco} onChange={setEndereco} placeholder="Rua, número, bairro" />
          <Input label="Telefone" value={telefone} onChange={setTelefone} placeholder="(99) 99999-9999" />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn onClick={cadastrar} disabled={loading} cor={C.azul} full>{loading ? "Salvando..." : "Cadastrar Farmácia"}</Btn>
            <Btn onClick={() => setModal(false)} outline cor={C.cinzaT}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// =============================================
// NOVA SOLICITAÇÃO (farmácia)
// =============================================
const NovaSolicitacao = ({ farmaciaId, laboratorios, onSalvo }) => {
  const [urgencia, setUrgencia] = useState("normal");
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState([{ nome: "", categoria: "generico", laboratorio_id: "", quantidade: 1, motivo: "esgotou" }]);
  const [sugestoes, setSugestoes] = useState([]);
  const [indexAtivo, setIndexAtivo] = useState(null);
  const [loading, setLoading] = useState(false);

  const buscarSugestoes = async (texto, index) => {
    setIndexAtivo(index);
    if (texto.length < 2) { setSugestoes([]); return; }
    const res = await sb(`produtos?nome=ilike.${encodeURIComponent("%" + texto + "%")}&limit=6`);
    setSugestoes(res);
  };

  const selecionarSugestao = (produto, index) => {
    const novos = [...itens];
    novos[index].nome = produto.nome;
    novos[index].categoria = produto.categoria;
    if (produto.laboratorio_id) novos[index].laboratorio_id = produto.laboratorio_id;
    setItens(novos);
    setSugestoes([]);
    setIndexAtivo(null);
  };

  const addItem = () => setItens([...itens, { nome: "", categoria: "generico", laboratorio_id: "", quantidade: 1, motivo: "esgotou" }]);
  const remItem = (i) => setItens(itens.filter((_, idx) => idx !== i));
  const editItem = (i, campo, val) => { const n = [...itens]; n[i][campo] = val; setItens(n); };

  const salvar = async () => {
    if (itens.some(i => !i.nome)) { alert("Preencha o nome de todos os itens."); return; }
    setLoading(true);
    try {
      const pedido = await sb("pedidos", { method: "POST", body: JSON.stringify({ farmacia_id: farmaciaId, urgencia, observacao }) });
      const pedidoId = pedido[0].id;

      for (const item of itens) {
        // Cadastrar produto no catálogo se novo
        let produtoId = null;
        try {
          const prods = await sb(`produtos?nome=ilike.${encodeURIComponent(item.nome)}&limit=1`);
          if (prods.length > 0) {
            produtoId = prods[0].id;
            await sb(`produtos?id=eq.${produtoId}`, { method: "PATCH", prefer: "", body: JSON.stringify({ total_pedidos: prods[0].total_pedidos + 1 }) });
          } else {
            const novoProd = await sb("produtos", { method: "POST", body: JSON.stringify({ nome: item.nome.toUpperCase(), categoria: item.categoria, laboratorio_id: item.laboratorio_id || null }) });
            produtoId = novoProd[0].id;
          }
        } catch {}

        const lab = laboratorios.find(l => l.id === item.laboratorio_id);
        await sb("pedido_itens", { method: "POST", body: JSON.stringify({ pedido_id: pedidoId, produto_id: produtoId, nome_produto: item.nome.toUpperCase(), categoria: item.categoria, laboratorio_id: item.laboratorio_id || null, nome_laboratorio: lab?.nome || null, quantidade: item.quantidade, motivo: item.motivo }) });
      }

      await sb("logs", { method: "POST", body: JSON.stringify({ farmacia_id: farmaciaId, pedido_id: pedidoId, acao: "Pedido criado", detalhes: `${itens.length} itens` }) });
      onSalvo();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Nova Solicitação</h2>
      <p style={{ margin: "0 0 28px", color: C.cinzaT, fontSize: 14 }}>Adicione os itens que estão faltando</p>

      <Card style={{ marginBottom: 20 }}>
        <Select label="Urgência do Pedido" value={urgencia} onChange={setUrgencia} options={[{ value: "normal", label: "Normal" }, { value: "urgente", label: "Urgente" }, { value: "critico", label: "Crítico" }]} />
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>Observação (opcional)</label>
          <textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Alguma observação geral sobre o pedido..." rows={2} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
        </div>
      </Card>

      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.preto }}>Itens do Pedido</h3>

      {itens.map((item, i) => (
        <Card key={i} style={{ marginBottom: 12, borderLeft: `4px solid ${categoriaCor[item.categoria]}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.azul }}>Item #{i + 1}</span>
            {itens.length > 1 && <button onClick={() => remItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.vermelho }}><Icon name="fechar" size={18} color={C.vermelho} /></button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <Input label="Nome do Produto" value={item.nome} onChange={v => { editItem(i, "nome", v); buscarSugestoes(v, i); }} placeholder="Digite para buscar..." required />
              {indexAtivo === i && sugestoes.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.branco, border: `1.5px solid ${C.cinzaD}`, borderRadius: 10, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                  {sugestoes.map(s => (
                    <div key={s.id} onClick={() => selecionarSugestao(s, i)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.cinzaE}`, fontSize: 13, color: C.preto }}>
                      {s.nome} <span style={{ color: C.cinzaT, fontSize: 11 }}>— {categoriaLabel[s.categoria]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Select label="Categoria" value={item.categoria} onChange={v => editItem(i, "categoria", v)} options={[{ value: "generico", label: "Genérico" }, { value: "etico", label: "Ético" }, { value: "equipamento", label: "Equipamento" }, { value: "outro", label: "Outro" }]} />
            <Select label="Laboratório" value={item.laboratorio_id} onChange={v => editItem(i, "laboratorio_id", v)} options={laboratorios.map(l => ({ value: l.id, label: l.nome }))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Quantidade" value={item.quantidade} onChange={v => editItem(i, "quantidade", parseInt(v) || 1)} type="number" />
              <Select label="Motivo" value={item.motivo} onChange={v => editItem(i, "motivo", v)} options={[{ value: "esgotou", label: "Esgotou" }, { value: "venceu", label: "Venceu" }, { value: "nunca_tivemos", label: "Nunca tivemos" }, { value: "outro", label: "Outro" }]} />
            </div>
          </div>
        </Card>
      ))}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn onClick={addItem} outline cor={C.azul}><Icon name="mais" size={16} color={C.azul} /> Adicionar Item</Btn>
        <Btn onClick={salvar} disabled={loading} cor={C.azul}>{loading ? "Enviando..." : "Enviar Pedido"}</Btn>
      </div>
    </div>
  );
};

// =============================================
// PEDIDOS DA FARMÁCIA
// =============================================
const MeusPedidos = ({ farmaciaId }) => {
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSel, setPedidoSel] = useState(null);
  const [itens, setItens] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb(`pedidos?farmacia_id=eq.${farmaciaId}&order=criado_em.desc`).then(d => { setPedidos(d); setLoading(false); });
  }, [farmaciaId]);

  const abrirPedido = async (p) => {
    setPedidoSel(p);
    const it = await sb(`pedido_itens?pedido_id=eq.${p.id}&order=criado_em.asc`);
    const co = await sb(`comentarios?pedido_id=eq.${p.id}&order=criado_em.asc`);
    setItens(it); setComentarios(co);
  };

  const enviarComentario = async () => {
    if (!novoComentario.trim()) return;
    await sb("comentarios", { method: "POST", body: JSON.stringify({ pedido_id: pedidoSel.id, autor: "farmacia", mensagem: novoComentario }) });
    setNovoComentario("");
    const co = await sb(`comentarios?pedido_id=eq.${pedidoSel.id}&order=criado_em.asc`);
    setComentarios(co);
  };

  const confirmarRecebimento = async () => {
    await sb(`pedidos?id=eq.${pedidoSel.id}`, { method: "PATCH", prefer: "", body: JSON.stringify({ status: "entregue" }) });
    setPedidoSel({ ...pedidoSel, status: "entregue" });
    setPedidos(pedidos.map(p => p.id === pedidoSel.id ? { ...p, status: "entregue" } : p));
  };

  if (loading) return <p style={{ color: C.cinzaT }}>Carregando pedidos...</p>;

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Meus Pedidos</h2>
      <p style={{ margin: "0 0 28px", color: C.cinzaT, fontSize: 14 }}>{pedidos.length} pedidos realizados</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pedidos.length === 0 ? <Card><p style={{ color: C.cinzaT, textAlign: "center", margin: 0 }}>Você ainda não fez nenhum pedido.</p></Card> :
          pedidos.map(p => (
            <Card key={p.id} style={{ padding: 16, cursor: "pointer" }} onClick={() => abrirPedido(p)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, background: statusCor[p.status] + "20", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="pedidos" size={20} color={statusCor[p.status]} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.preto }}>Pedido #{p.id.slice(0, 8).toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: C.cinzaT }}>{new Date(p.criado_em).toLocaleString("pt-BR")}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Badge label={urgenciaLabel[p.urgencia]} cor={urgenciaCor[p.urgencia]} />
                  <Badge label={statusLabel[p.status]} cor={statusCor[p.status]} />
                </div>
              </div>
            </Card>
          ))
        }
      </div>

      {pedidoSel && (
        <Modal title={`Pedido #${pedidoSel.id.slice(0, 8).toUpperCase()}`} onClose={() => setPedidoSel(null)} width={600}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Badge label={urgenciaLabel[pedidoSel.urgencia]} cor={urgenciaCor[pedidoSel.urgencia]} />
            <Badge label={statusLabel[pedidoSel.status]} cor={statusCor[pedidoSel.status]} />
          </div>
          <div style={{ background: C.cinzaF, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            {itens.map((item, i) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < itens.length - 1 ? `1px solid ${C.cinzaE}` : "none" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.nome_produto}</div>
                  <div style={{ fontSize: 12, color: C.cinzaT }}>{item.nome_laboratorio || "Sem laboratório"}</div>
                </div>
                <span style={{ fontWeight: 700, color: C.azul }}>×{item.quantidade}</span>
              </div>
            ))}
          </div>

          {pedidoSel.status !== "entregue" && (
            <div style={{ marginBottom: 16 }}>
              <Btn onClick={confirmarRecebimento} cor={C.verde} full><Icon name="check" size={16} color={C.branco} /> Confirmar Recebimento</Btn>
            </div>
          )}

          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.cinzaT }}>COMENTÁRIOS DO DONO</h4>
          <div style={{ background: C.cinzaF, borderRadius: 12, padding: 12, marginBottom: 12, maxHeight: 180, overflowY: "auto" }}>
            {comentarios.length === 0 ? <p style={{ color: C.cinzaT, fontSize: 13, margin: 0 }}>Nenhum comentário.</p> :
              comentarios.map(c => (
                <div key={c.id} style={{ marginBottom: 8, display: "flex", flexDirection: c.autor === "farmacia" ? "row-reverse" : "row", gap: 8 }}>
                  <div style={{ background: c.autor === "farmacia" ? C.azul : C.branco, color: c.autor === "farmacia" ? C.branco : C.preto, padding: "8px 12px", borderRadius: 12, fontSize: 13, border: `1px solid ${C.cinzaE}` }}>
                    <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{c.autor === "farmacia" ? "Você" : "Dono"}</div>
                    {c.mensagem}
                  </div>
                </div>
              ))
            }
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={novoComentario} onChange={e => setNovoComentario(e.target.value)} placeholder="Responder..." onKeyDown={e => e.key === "Enter" && enviarComentario()} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <Btn onClick={enviarComentario} cor={C.azul}><Icon name="msg" size={16} /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// =============================================
// MANUTENÇÃO (farmácia)
// =============================================
const ManutencaoFarmacia = ({ farmaciaId, onSalvo }) => {
  const [tipo, setTipo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [urgencia, setUrgencia] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [manutencoes, setManutencoes] = useState([]);

  useEffect(() => {
    sb(`manutencoes?farmacia_id=eq.${farmaciaId}&order=criado_em.desc`).then(setManutencoes);
  }, [farmaciaId]);

  const salvar = async () => {
    if (!tipo || !descricao) { alert("Preencha tipo e descrição."); return; }
    setLoading(true);
    try {
      await sb("manutencoes", { method: "POST", body: JSON.stringify({ farmacia_id: farmaciaId, tipo, descricao, urgencia }) });
      setTipo(""); setDescricao(""); setUrgencia("normal");
      const man = await sb(`manutencoes?farmacia_id=eq.${farmaciaId}&order=criado_em.desc`);
      setManutencoes(man);
    } catch (e) { alert("Erro: " + e.message); }
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Manutenção</h2>
      <p style={{ margin: "0 0 28px", color: C.cinzaT, fontSize: 14 }}>Abra um chamado de manutenção</p>

      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.preto }}>Novo Chamado</h3>
        <Select label="Tipo do Problema" value={tipo} onChange={setTipo} required options={[{ value: "eletrica", label: "Elétrica (lâmpada, tomada...)" }, { value: "hidraulica", label: "Hidráulica (vazamento...)" }, { value: "moveis", label: "Móveis / Estrutura" }, { value: "equipamentos", label: "Equipamentos" }, { value: "outro", label: "Outro" }]} />
        <Select label="Urgência" value={urgencia} onChange={setUrgencia} options={[{ value: "normal", label: "Normal" }, { value: "urgente", label: "Urgente" }, { value: "emergencia", label: "Emergência" }]} />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>Descrição do Problema <span style={{ color: C.vermelho }}>*</span></label>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descreva o problema com detalhes..." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
        </div>
        <Btn onClick={salvar} disabled={loading} cor={C.laranja}>{loading ? "Enviando..." : "Abrir Chamado"}</Btn>
      </Card>

      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.preto }}>Meus Chamados</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {manutencoes.length === 0 ? <Card><p style={{ color: C.cinzaT, margin: 0, textAlign: "center" }}>Nenhum chamado aberto.</p></Card> :
          manutencoes.map(m => (
            <Card key={m.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.preto, marginBottom: 4 }}>{m.descricao}</div>
                  <div style={{ fontSize: 12, color: C.cinzaT }}>{new Date(m.criado_em).toLocaleDateString("pt-BR")}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Badge label={urgenciaLabel[m.urgencia]} cor={urgenciaCor[m.urgencia]} />
                  <Badge label={m.status === "aberto" ? "Aberto" : m.status === "em_andamento" ? "Em andamento" : "Resolvido"} cor={statusCor[m.status]} />
                </div>
              </div>
            </Card>
          ))
        }
      </div>
    </div>
  );
};

// =============================================
// PREVISÃO SIMPLES
// =============================================
const Previsao = ({ farmaciaId, isDono, farmacias }) => {
  const [dados, setDados] = useState([]);
  const [filtroFarm, setFiltroFarm] = useState(farmaciaId || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarPrevisao = async () => {
      setLoading(true);
      try {
        let query = `pedido_itens?order=criado_em.desc&limit=200`;
        if (!isDono && farmaciaId) {
          const pedidos = await sb(`pedidos?farmacia_id=eq.${farmaciaId}&select=id`);
          const ids = pedidos.map(p => p.id).join(",");
          if (!ids) { setDados([]); setLoading(false); return; }
          query = `pedido_itens?pedido_id=in.(${ids})&order=criado_em.desc`;
        }
        const itens = await sb(query);
        const contagem = {};
        itens.forEach(item => {
          const key = item.nome_produto;
          contagem[key] = (contagem[key] || 0) + item.quantidade;
        });
        const ordenado = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([nome, total]) => ({ nome, total, previsao: Math.round(total * 1.1) }));
        setDados(ordenado);
      } catch {}
      setLoading(false);
    };
    carregarPrevisao();
  }, [farmaciaId, isDono, filtroFarm]);

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Previsão de Demanda</h2>
      <p style={{ margin: "0 0 28px", color: C.cinzaT, fontSize: 14 }}>Baseado no histórico de pedidos</p>

      {loading ? <p style={{ color: C.cinzaT }}>Calculando previsão...</p> : (
        <Card>
          {dados.length === 0 ? <p style={{ color: C.cinzaT, textAlign: "center" }}>Histórico insuficiente para previsão. Continue usando o sistema!</p> :
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px 16px", alignItems: "center", marginBottom: 12, padding: "8px 0", borderBottom: `2px solid ${C.cinzaE}` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.cinzaT }}>PRODUTO</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.cinzaT }}>HISTÓRICO</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.azul }}>PREVISÃO</span>
              </div>
              {dados.map((d, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px 16px", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.cinzaF}` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>{d.nome}</div>
                    <div style={{ height: 4, background: C.cinzaE, borderRadius: 4, marginTop: 6 }}>
                      <div style={{ height: 4, background: C.azul, borderRadius: 4, width: `${Math.min((d.total / dados[0].total) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <span style={{ fontWeight: 600, color: C.cinzaP, textAlign: "right" }}>{d.total} un.</span>
                  <span style={{ fontWeight: 700, color: C.azul, textAlign: "right", background: C.azul + "15", padding: "4px 10px", borderRadius: 8 }}>~{d.previsao} un.</span>
                </div>
              ))}
            </>
          }
        </Card>
      )}
    </div>
  );
};

// =============================================
// MANUTENÇÕES DO DONO
// =============================================
const ManutencoesDono = ({ farmacias }) => {
  const [manutencoes, setManutencoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb("manutencoes?order=criado_em.desc").then(d => { setManutencoes(d); setLoading(false); });
  }, []);

  const atualizarStatus = async (id, status) => {
    await sb(`manutencoes?id=eq.${id}`, { method: "PATCH", prefer: "", body: JSON.stringify({ status }) });
    setManutencoes(manutencoes.map(m => m.id === id ? { ...m, status } : m));
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Manutenções</h2>
      <p style={{ margin: "0 0 28px", color: C.cinzaT, fontSize: 14 }}>{manutencoes.filter(m => m.status === "aberto").length} chamados abertos</p>

      {loading ? <p style={{ color: C.cinzaT }}>Carregando...</p> :
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {manutencoes.length === 0 ? <Card><p style={{ color: C.cinzaT, textAlign: "center", margin: 0 }}>Nenhum chamado de manutenção.</p></Card> :
            manutencoes.map(m => {
              const farm = farmacias.find(f => f.id === m.farmacia_id);
              return (
                <Card key={m.id} style={{ padding: 16, borderLeft: `4px solid ${statusCor[m.status]}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.preto, marginBottom: 4 }}>{farm?.nome}</div>
                      <div style={{ fontSize: 14, color: C.cinzaP, marginBottom: 8 }}>{m.descricao}</div>
                      <div style={{ fontSize: 12, color: C.cinzaT }}>{new Date(m.criado_em).toLocaleString("pt-BR")}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Badge label={urgenciaLabel[m.urgencia]} cor={urgenciaCor[m.urgencia]} />
                        <Badge label={m.status === "aberto" ? "Aberto" : m.status === "em_andamento" ? "Em andamento" : "Resolvido"} cor={statusCor[m.status]} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {m.status === "aberto" && <Btn onClick={() => atualizarStatus(m.id, "em_andamento")} cor={C.azulClaro} small>Em andamento</Btn>}
                        {m.status !== "resolvido" && <Btn onClick={() => atualizarStatus(m.id, "resolvido")} cor={C.verde} small>Resolver</Btn>}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          }
        </div>
      }
    </div>
  );
};

// =============================================
// APP PRINCIPAL
// =============================================
export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [ativo, setAtivo] = useState("dashboard");
  const [pedidos, setPedidos] = useState([]);
  const [farmacias, setFarmacias] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);
    try {
      const [farms, labs, peds, mans] = await Promise.all([
        sb("farmacias?order=nome.asc"),
        sb("laboratorios?order=nome.asc"),
        sb("pedidos?order=criado_em.desc"),
        sb("manutencoes?order=criado_em.desc&status=eq.aberto"),
      ]);
      setFarmacias(farms);
      setLaboratorios(labs);
      setPedidos(usuario.isDono ? peds : peds.filter(p => p.farmacia_id === usuario.id));
      setManutencoes(mans);
    } catch (e) { console.error(e); }
    setCarregando(false);
  }, [usuario]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  useEffect(() => {
    if (!usuario?.isDono) return;
    const interval = setInterval(carregarDados, 30000);
    return () => clearInterval(interval);
  }, [usuario, carregarDados]);

  if (!usuario) return <Login onLogin={(u) => { setUsuario(u); setAtivo(u.isDono ? "dashboard" : "meus-pedidos"); }} />;

  const stats = {
    pendentes: pedidos.filter(p => p.status === "pendente").length,
    urgentes: pedidos.filter(p => p.urgencia === "urgente" || p.urgencia === "critico").length,
    manutencoes: manutencoes.length,
    farmacias: farmacias.filter(f => f.usuario !== "admin").length,
    hoje: pedidos.filter(p => new Date(p.criado_em).toDateString() === new Date().toDateString()).length,
  };

  const renderConteudo = () => {
    if (usuario.isDono) {
      switch (ativo) {
        case "dashboard": return <Dashboard stats={stats} pedidos={pedidos} manutencoes={manutencoes} farmacias={farmacias} />;
        case "pedidos": return <PedidosDono pedidos={pedidos} farmacias={farmacias} laboratorios={laboratorios} onAtualizar={carregarDados} />;
        case "manutencoes": return <ManutencoesDono farmacias={farmacias} />;
        case "farmacias": return <GerenciarFarmacias farmacias={farmacias} onAtualizar={carregarDados} />;
        case "previsao": return <Previsao isDono={true} farmacias={farmacias} />;
        case "graficos": return (
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Relatórios</h2>
            <p style={{ margin: "0 0 28px", color: C.cinzaT }}>Em breve: gráficos e relatório mensal automático</p>
            <Card><p style={{ color: C.cinzaT, textAlign: "center" }}>📊 Módulo de relatórios em desenvolvimento.</p></Card>
          </div>
        );
        default: return null;
      }
    } else {
      switch (ativo) {
        case "meus-pedidos": return <MeusPedidos farmaciaId={usuario.id} />;
        case "nova-solicitacao": return <NovaSolicitacao farmaciaId={usuario.id} laboratorios={laboratorios} onSalvo={() => { setAtivo("meus-pedidos"); carregarDados(); }} />;
        case "manutencao-farm": return <ManutencaoFarmacia farmaciaId={usuario.id} />;
        case "previsao-farm": return <Previsao farmaciaId={usuario.id} isDono={false} farmacias={farmacias} />;
        default: return null;
      }
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.cinzaF, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar ativo={ativo} setAtivo={setAtivo} isDono={usuario.isDono} farmacia={usuario} onSair={() => setUsuario(null)} />
      <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        {carregando && !pedidos.length ? <p style={{ color: C.cinzaT }}>Carregando...</p> : renderConteudo()}
      </main>
    </div>
  );
}
