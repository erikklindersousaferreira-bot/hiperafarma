import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

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
const statusCor = { pendente: C.amarelo, em_andamento: C.azulClaro, entregue: C.verde, cancelado: C.cinzaT, aberto: C.vermelho, resolvido: C.verde, revisado: C.verde };
const statusLabel = { pendente: "Pendente", em_andamento: "Em andamento", entregue: "Entregue", cancelado: "Cancelado", aberto: "Aberto", resolvido: "Resolvido", revisado: "Revisado" };
const categoriaLabel = {
  eticos: "Éticos",
  genericos: "Genéricos",
  vitaminas: "Vitaminas",
  controlados: "Controlados",
  mercearia: "Mercearia",
  perfumaria: "Perfumaria",
  fraldas: "Fraldas",
  leites: "Leites",
  preservativos: "Preservativos",
  suplementos: "Suplementos",
  injetaveis: "Injetáveis",
  bebidas: "Bebidas",
  varejo: "Varejo",
  mamadeiras_chupetas: "Mamadeiras e chupetas",
  produtos_hospitalar: "Produtos hospitalar",
  ortopedicos: "Ortopédicos",
};
const categoriaCor = {
  eticos: "#7C3AED",
  genericos: C.azulClaro,
  vitaminas: C.verde,
  controlados: C.vermelho,
  mercearia: C.laranja,
  perfumaria: "#DB2777",
  fraldas: "#0891B2",
  leites: "#CA8A04",
  preservativos: "#E11D48",
  suplementos: C.verdeClaro,
  injetaveis: "#0EA5E9",
  bebidas: C.amarelo,
  varejo: C.cinzaP,
  mamadeiras_chupetas: "#F97316",
  produtos_hospitalar: "#B91C1C",
  ortopedicos: "#64748B",
};
const categoriaOptions = Object.entries(categoriaLabel).map(([value, label]) => ({ value, label }));

// Tipo/origem de um pedido: Depósito (fluxo padrão de revisão de estoque), ou compras
// diretas via ED/CA. Escolhido pela farmácia ao criar a solicitação.
const tipoPedidoLabel = { deposito: "Depósito", compras_ed: "Compras ED", compras_ca: "Compras CA" };
const tipoPedidoCor = { deposito: C.azulClaro, compras_ed: C.laranja, compras_ca: "#7C3AED" };
const tipoPedidoOptions = Object.entries(tipoPedidoLabel).map(([value, label]) => ({ value, label }));

// Unidade de contagem de um item de pedido: cada item guarda a sua própria (caixa ou
// unidade). Pedidos antigos, salvos antes desse campo existir, ficam com unidade_medida
// nula — tratados como "não informado" em vez de assumirem um valor inventado.
const unidadeOptions = [{ value: "caixa", label: "Caixa" }, { value: "unidade", label: "Unidade" }];
const unidadeLabelSingular = { caixa: "Caixa", unidade: "Unidade" };
const unidadeLabelPlural = { caixa: "Caixas", unidade: "Unidades" };
const unidadeLabelQtd = (unidade, qtd) => {
  if (!unidade) return null;
  const mapa = qtd === 1 ? unidadeLabelSingular : unidadeLabelPlural;
  return mapa[unidade] || null;
};
const qtdPdfLabel = (item) => {
  if (!item.unidade_medida) return `${item.quantidade}`;
  const singular = item.unidade_medida === "caixa" ? "CAIXA" : "UNIDADE";
  const plural = item.unidade_medida === "caixa" ? "CAIXAS" : "UNIDADES";
  return `${item.quantidade} ${item.quantidade === 1 ? singular : plural}`;
};

const escHtml = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const MobileCtx = createContext(false);
const useMobile = () => useContext(MobileCtx);

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
    farmaciaIcon: <><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>,
    cruz: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    lapis: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    lixeira: <><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    laboratorio: <><line x1="9" y1="3" x2="15" y2="3"/><polyline points="9,3 5,20 19,20 15,3"/><line x1="7" y1="13" x2="17" y2="13"/></>,
    hamburger: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    deposito: <><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3.27 8L12 13l8.73-5"/><line x1="12" y1="22" x2="12" y2="13"/></>,
    repetir: <><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0020.49 15"/></>,
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

// Botão segmentado simples (ex: Caixa/Unidade, Todas/Hoje/Período) — reaproveita o
// visual dos selects do sistema em vez de introduzir um novo padrão visual.
const Segmented = ({ options, value, onChange, small = false }) => (
  <div style={{ display: "flex", border: `1.5px solid ${C.cinzaD}`, borderRadius: 10, overflow: "hidden" }}>
    {options.map((o, i) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        style={{
          flex: 1,
          padding: small ? "6px 10px" : "9px 12px",
          border: "none",
          borderLeft: i > 0 ? `1.5px solid ${value === o.value || value === options[i - 1].value ? "transparent" : C.cinzaD}` : "none",
          cursor: "pointer",
          background: value === o.value ? C.azul : C.branco,
          color: value === o.value ? C.branco : C.cinzaP,
          fontWeight: 700,
          fontSize: small ? 12 : 13,
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        {o.label}
      </button>
    ))}
  </div>
);

// Mostra a quantidade de um item de pedido junto da unidade (caixa/unidade), quando
// essa informação existir. Itens antigos sem unidade registrada mostram só a quantidade.
const QtdUnidade = ({ quantidade, unidade, align = "flex-end" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: align, minWidth: 40 }}>
    <span style={{ fontWeight: 800, fontSize: 18, color: C.azul, lineHeight: 1.1 }}>×{quantidade}</span>
    {unidadeLabelQtd(unidade, quantidade) && (
      <span style={{ fontSize: 10, fontWeight: 700, color: C.cinzaT, textTransform: "uppercase", letterSpacing: 0.3 }}>
        {unidadeLabelQtd(unidade, quantidade)}
      </span>
    )}
  </div>
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

const BtnIcon = ({ icon, onClick, cor = C.cinzaT, title = "" }) => (
  <button onClick={onClick} title={title} style={{
    background: cor + "15",
    color: cor,
    border: `1.5px solid ${cor}30`,
    borderRadius: 8,
    padding: "6px 8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
    fontFamily: "inherit",
  }}>
    <Icon name={icon} size={15} color={cor} />
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

const Modal = ({ title, onClose, children, width = 560 }) => {
  const isMobile = useMobile();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
      <div style={{ background: C.branco, borderRadius: isMobile ? "20px 20px 0 0" : 20, width: "100%", maxWidth: isMobile ? "100%" : width, maxHeight: isMobile ? "92vh" : "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${C.cinzaE}`, position: "sticky", top: 0, background: C.branco, zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: C.azul }}>{title}</h3>
          <button onClick={onClose} style={{ background: C.cinzaF, border: "none", cursor: "pointer", color: C.cinzaT, padding: 8, borderRadius: 8, display: "flex" }}><Icon name="fechar" size={20} /></button>
        </div>
        <div style={{ padding: isMobile ? 16 : 24 }}>{children}</div>
      </div>
    </div>
  );
};

const PdfViewerOverlay = ({ html, onClose }) => {
  const iframeRef = useRef(null);
  return (
    <div style={{ position: "fixed", inset: 0, background: C.branco, zIndex: 2000, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${C.cinzaE}`, flexShrink: 0 }}>
        <Btn onClick={() => iframeRef.current?.contentWindow?.print()} outline cor={C.azul} small>Imprimir</Btn>
        <button onClick={onClose} style={{ background: C.cinzaF, border: "none", cursor: "pointer", color: C.cinzaT, padding: 10, borderRadius: 8, display: "flex" }}><Icon name="fechar" size={20} /></button>
      </div>
      <iframe ref={iframeRef} title="Documento" srcDoc={html} style={{ flex: 1, width: "100%", border: "none" }} />
    </div>
  );
};

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
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${C.azul} 0%, ${C.azulClaro} 50%, #3B6FD4 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ background: C.branco, borderRadius: 24, padding: 40, width: "100%", maxWidth: 420, margin: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src="https://i.postimg.cc/pVwVTC9j/LOGO-VERTICALL-EM-PNG.png"
            alt="Hiperafarma"
            style={{ width: 190, height: "auto", marginBottom: 8 }}
          />
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
const Sidebar = ({ ativo, setAtivo, isDono, farmacia, onSair, isOpen, onClose, aguardandoDeposito = 0 }) => {
  const isMobile = useMobile();
  const menuDono = [
    { id: "dashboard", label: "Painel Central", icon: "home" },
    { id: "pedidos", label: "Pedidos", icon: "pedidos" },
    { id: "deposito", label: "Depósito", icon: "deposito", badge: aguardandoDeposito },
    { id: "manutencoes", label: "Manutenções", icon: "manutencao" },
    { id: "farmacias", label: "Farmácias", icon: "farmacias" },
    { id: "laboratorios", label: "Laboratórios", icon: "laboratorio" },
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
  const handleNav = (id) => { setAtivo(id); if (isMobile && onClose) onClose(); };

  if (isMobile && !isOpen) return null;

  return (
    <>
      {isMobile && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 900 }} />}
      <div style={{
        width: 240, background: C.azul, display: "flex", flexDirection: "column", flexShrink: 0,
        ...(isMobile ? { position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 1000, overflowY: "auto" } : { minHeight: "100vh" }),
      }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid rgba(255,255,255,0.1)`, position: "relative" }}>
          {isMobile && (
            <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer" }}>
              <Icon name="fechar" size={20} color="rgba(255,255,255,0.7)" />
            </button>
          )}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <img src="https://i.postimg.cc/pVwVTC9j/LOGO-VERTICALL-EM-PNG.png" alt="Hiperafarma" style={{ width: 120, height: "auto" }} />
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginBottom: 2 }}>{isDono ? "ADMINISTRADOR" : "FARMÁCIA"}</div>
            <div style={{ color: C.branco, fontWeight: 700, fontSize: 13 }}>{farmacia.nome}</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {menu.map(item => (
            <button key={item.id} onClick={() => handleNav(item.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer",
              background: ativo === item.id ? C.amarelo : "transparent",
              color: ativo === item.id ? C.azul : "rgba(255,255,255,0.7)",
              fontWeight: ativo === item.id ? 700 : 500, fontSize: 14,
              marginBottom: 4, textAlign: "left", transition: "all 0.15s", fontFamily: "inherit",
            }}>
              <Icon name={item.icon} size={18} color={ativo === item.id ? C.azul : "rgba(255,255,255,0.7)"} />
              {item.label}
              {!!item.badge && (
                <span style={{ marginLeft: "auto", background: ativo === item.id ? C.vermelho : C.amarelo, color: C.branco, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
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
    </>
  );
};

// =============================================
// TOPBAR + BOTTOM NAV (mobile)
// =============================================
const TopBar = ({ onMenuOpen }) => (
  <div style={{
    position: "fixed", top: 0, left: 0, right: 0, height: 56, zIndex: 800,
    background: C.azul, display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "0 8px 0 4px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  }}>
    <button onClick={onMenuOpen} style={{ background: "none", border: "none", cursor: "pointer", padding: 12, display: "flex", alignItems: "center" }}>
      <Icon name="hamburger" size={24} color={C.branco} />
    </button>
    <img src="https://i.postimg.cc/pVwVTC9j/LOGO-VERTICALL-EM-PNG.png" alt="Hiperafarma" style={{ height: 40, width: "auto" }} />
    <div style={{ width: 48 }} />
  </div>
);

const BottomNav = ({ ativo, setAtivo, isDono }) => {
  const menuDono = [
    { id: "dashboard", label: "Painel", icon: "home" },
    { id: "pedidos", label: "Pedidos", icon: "pedidos" },
    { id: "farmacias", label: "Farmácias", icon: "farmacias" },
    { id: "graficos", label: "Relatórios", icon: "grafico" },
  ];
  const menuFarm = [
    { id: "meus-pedidos", label: "Pedidos", icon: "pedidos" },
    { id: "nova-solicitacao", label: "Novo", icon: "mais" },
    { id: "manutencao-farm", label: "Manutenção", icon: "manutencao" },
    { id: "previsao-farm", label: "Previsão", icon: "previsao" },
  ];
  const menu = isDono ? menuDono : menuFarm;
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 60, zIndex: 800,
      background: C.branco, borderTop: `1px solid ${C.cinzaE}`,
      display: "flex", alignItems: "stretch",
    }}>
      {menu.map(item => (
        <button key={item.id} onClick={() => setAtivo(item.id)} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          background: "none", border: "none", cursor: "pointer",
          color: ativo === item.id ? C.azul : C.cinzaT, fontFamily: "inherit",
          borderTop: ativo === item.id ? `2px solid ${C.azul}` : "2px solid transparent",
        }}>
          <Icon name={item.icon} size={22} color={ativo === item.id ? C.azul : C.cinzaT} />
          <span style={{ fontSize: 10, fontWeight: ativo === item.id ? 700 : 400 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

// =============================================
// DASHBOARD DO DONO
// =============================================
const Dashboard = ({ stats, pedidos, manutencoes, farmacias, aguardandoDeposito = 0, onIrDeposito }) => {
  const isMobile = useMobile();
  const cardsDesktop = [
    { label: "Pedidos Pendentes", valor: stats.pendentes, cor: C.amarelo, icon: "pedidos" },
    { label: "Pedidos Urgentes/Críticos", valor: stats.urgentes, cor: C.vermelho, icon: "alerta" },
    { label: "Manutenções Abertas", valor: stats.manutencoes, cor: C.laranja, icon: "manutencao" },
    { label: "Farmácias Ativas", valor: stats.farmacias, cor: C.verde, icon: "farmacias" },
    { label: "Pedidos Hoje", valor: stats.hoje, cor: C.azulClaro, icon: "home" },
  ];
  const cardsMobile = [
    { label: "Pedidos Pendentes", valor: stats.pendentes, cor: C.amarelo, icon: "pedidos" },
    { label: "Urgentes/Críticos", valor: stats.urgentes, cor: C.vermelho, icon: "alerta" },
    { label: "Manutenções", valor: stats.manutencoes, cor: C.laranja, icon: "manutencao" },
    { label: "Pedidos Hoje", valor: stats.hoje, cor: C.azulClaro, icon: "home" },
  ];
  const cards = isMobile ? cardsMobile : cardsDesktop;

  const recentesPedidos = pedidos.slice(0, 5);

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Painel Central</h2>
      <p style={{ margin: "0 0 28px", color: C.cinzaT, fontSize: 14 }}>Visão geral da rede Hiperafarma</p>

      {aguardandoDeposito > 0 && (
        <div onClick={onIrDeposito} style={{
          display: "flex", alignItems: "center", gap: 14, cursor: onIrDeposito ? "pointer" : "default",
          background: "#FFF7E6", border: `1.5px solid ${C.amarelo}`, borderRadius: 14, padding: "16px 20px", marginBottom: 24,
        }}>
          <div style={{ width: 42, height: 42, background: C.amarelo + "30", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="deposito" size={20} color={C.amarelo} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.preto }}>
              {aguardandoDeposito} pedido{aguardandoDeposito > 1 ? "s" : ""} aguardando conferência no Depósito
            </div>
            <div style={{ fontSize: 13, color: C.cinzaT }}>Esses pedidos só aparecem no painel de Pedidos depois de liberados aqui.</div>
          </div>
          <Btn onClick={onIrDeposito} cor={C.amarelo} small>Ir para o Depósito</Btn>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(180px, 1fr))", gap: isMobile ? 10 : 16, marginBottom: 28 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
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
  const [filtroSecao, setFiltroSecao] = useState("");
  const [filtroDataModo, setFiltroDataModo] = useState("todas"); // "todas" | "hoje" | "periodo"
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");
  const [pedidoIdsDaSecao, setPedidoIdsDaSecao] = useState(null);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [itensPedido, setItensPedido] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [geraPDF, setGeraPDF] = useState(false);
  const [labPDF, setLabPDF] = useState("");
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingItens, setLoadingItens] = useState(false);
  const [confirmExcluirPedido, setConfirmExcluirPedido] = useState(false);
  const [pdfPreviewHtml, setPdfPreviewHtml] = useState(null);

  // Só entram no painel de Pedidos os pedidos já liberados pelo Depósito.
  const pedidosLiberados = pedidos.filter(p => p.liberado_deposito !== false);

  // Busca direto por categoria (sem passar a lista de IDs de pedidos na URL): com muitos
  // pedidos liberados, um "pedido_id=in.(...)" gigante estourava o limite de tamanho da
  // query e falhava silenciosamente (catch vazio), deixando o filtro sempre vazio.
  useEffect(() => {
    if (!filtroSecao) { setPedidoIdsDaSecao(null); return; }
    let cancelado = false;
    (async () => {
      try {
        const itens = await sb(`pedido_itens?categoria=eq.${encodeURIComponent(filtroSecao)}&select=pedido_id`);
        if (cancelado) return;
        setPedidoIdsDaSecao(new Set(itens.map(i => i.pedido_id)));
      } catch {
        if (!cancelado) setPedidoIdsDaSecao(new Set());
      }
    })();
    return () => { cancelado = true; };
  }, [filtroSecao]);

  // Filtro por data: junto com farmácia/laboratório/seção, também precisa valer para o
  // PDF — por isso vira uma função reaproveitada tanto na lista quanto em gerarPDFLab.
  const passaFiltroData = (p) => {
    if (filtroDataModo === "todas") return true;
    const dataPedido = new Date(p.criado_em);
    if (filtroDataModo === "hoje") {
      const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
      const fim = new Date(inicio); fim.setDate(fim.getDate() + 1);
      return dataPedido >= inicio && dataPedido < fim;
    }
    // periodo — "De" sozinho = data específica; "De"+"Até" = intervalo.
    if (!filtroDataDe && !filtroDataAte) return true;
    const de = filtroDataDe ? new Date(`${filtroDataDe}T00:00:00`) : null;
    const ate = filtroDataAte ? new Date(`${filtroDataAte}T23:59:59.999`) : (filtroDataDe ? new Date(`${filtroDataDe}T23:59:59.999`) : null);
    if (de && dataPedido < de) return false;
    if (ate && dataPedido > ate) return false;
    return true;
  };

  const formatarDataBR = (isoDateStr) => {
    const [y, m, d] = isoDateStr.split("-");
    return `${d}/${m}/${y}`;
  };
  const descricaoFiltroData = () => {
    if (filtroDataModo === "hoje") return `Hoje (${new Date().toLocaleDateString("pt-BR")})`;
    if (filtroDataModo === "periodo") {
      if (filtroDataDe && filtroDataAte) return filtroDataDe === filtroDataAte ? formatarDataBR(filtroDataDe) : `${formatarDataBR(filtroDataDe)} até ${formatarDataBR(filtroDataAte)}`;
      if (filtroDataDe) return formatarDataBR(filtroDataDe);
      if (filtroDataAte) return `até ${formatarDataBR(filtroDataAte)}`;
    }
    return null;
  };

  const pedidosFiltrados = pedidosLiberados.filter(p => {
    if (filtroFarmacia && p.farmacia_id !== filtroFarmacia) return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    if (filtroUrgencia && p.urgencia !== filtroUrgencia) return false;
    if (filtroSecao && !(pedidoIdsDaSecao && pedidoIdsDaSecao.has(p.id))) return false;
    if (!passaFiltroData(p)) return false;
    return true;
  });

  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const diaSemana = (inicioHoje.getDay() + 6) % 7; // 0 = segunda
  const inicioSemana = new Date(inicioHoje); inicioSemana.setDate(inicioHoje.getDate() - diaSemana);
  const inicioSemanaPassada = new Date(inicioSemana); inicioSemanaPassada.setDate(inicioSemana.getDate() - 7);

  const gruposPeriodo = [
    { titulo: "Hoje", pedidos: [] },
    { titulo: "Esta semana", pedidos: [] },
    { titulo: "Semana passada", pedidos: [] },
    { titulo: "Anteriores", pedidos: [] },
  ];
  pedidosFiltrados
    .slice()
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    .forEach(p => {
      const data = new Date(p.criado_em);
      if (data >= inicioHoje) gruposPeriodo[0].pedidos.push(p);
      else if (data >= inicioSemana) gruposPeriodo[1].pedidos.push(p);
      else if (data >= inicioSemanaPassada) gruposPeriodo[2].pedidos.push(p);
      else gruposPeriodo[3].pedidos.push(p);
    });

  const abrirPedido = async (pedido) => {
    setPedidoSelecionado(pedido);
    setItensPedido([]);
    setComentarios([]);
    setLoadingItens(true);
    const [itens, comts] = await Promise.all([
      sb(`pedido_itens?pedido_id=eq.${pedido.id}&order=criado_em.asc`),
      sb(`comentarios?pedido_id=eq.${pedido.id}&order=criado_em.asc`),
    ]);
    setItensPedido(itens);
    setComentarios(comts);
    setLoadingItens(false);
  };

  const enviarComentario = async () => {
    if (!novoComentario.trim()) return;
    await sb(`comentarios`, { method: "POST", body: JSON.stringify({ pedido_id: pedidoSelecionado.id, autor: "dono", mensagem: novoComentario }) });
    setNovoComentario("");
    const comts = await sb(`comentarios?pedido_id=eq.${pedidoSelecionado.id}&order=criado_em.asc`);
    setComentarios(comts);
  };

  const atualizarStatus = async (novoStatus) => {
    const body = { status: novoStatus };
    if (novoStatus === "entregue") body.entregue_em = new Date().toISOString();
    await sb(`pedidos?id=eq.${pedidoSelecionado.id}`, { method: "PATCH", body: JSON.stringify(body) });
    await sb(`logs`, { method: "POST", body: JSON.stringify({ pedido_id: pedidoSelecionado.id, farmacia_id: pedidoSelecionado.farmacia_id, acao: `Status atualizado para: ${statusLabel[novoStatus]}` }) });
    onAtualizar();
    setPedidoSelecionado({ ...pedidoSelecionado, ...body });
  };

  const excluirPedido = async () => {
    if (!window.confirm("Deseja excluir este pedido permanentemente? Todos os itens serão removidos e esta ação não pode ser desfeita.")) return;
    const id = pedidoSelecionado.id;
    try {
      await sb(`pedido_itens?pedido_id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
      await sb(`pedidos?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
      setPedidoSelecionado(null);
      onAtualizar();
    } catch (e) { alert("Erro ao excluir pedido: " + e.message); }
  };

  const gerarPDFPedido = () => {
    if (!pedidoSelecionado || !itensPedido.length) return;
    const farm = farmacias.find(f => f.id === pedidoSelecionado.farmacia_id);
    const dataStr = new Date().toLocaleDateString("pt-BR");
    const horaStr = new Date().toLocaleString("pt-BR");

    const grupos = {};
    itensPedido.forEach(item => {
      const key = item.nome_laboratorio || "__sem_lab__";
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(item);
    });

    const secoes = Object.entries(grupos).map(([lab, items]) => {
      const labNome = lab === "__sem_lab__" ? "Sem Laboratório" : lab;
      const linhas = items.map((item, i) => `<tr>
          <td>${i + 1}</td>
          <td><strong>${escHtml(item.nome_produto)}</strong></td>
          <td>${escHtml(categoriaLabel[item.categoria] || item.categoria)}</td>
          <td style="text-align:center;font-weight:700;color:#1A3A8F">${escHtml(qtdPdfLabel(item))}</td>
        </tr>`).join("");
      return `<div class="lab-section">
      <div class="lab-header">${escHtml(labNome)}</div>
      <table><thead><tr><th>#</th><th>Produto</th><th>Categoria</th><th>Qtd</th></tr></thead>
      <tbody>${linhas}</tbody></table></div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Pedido — ${escHtml(farm?.nome || "Farmácia")} — ${dataStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; padding: 40px; color: #0F172A; font-size: 13px; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #1A3A8F; }
    .header img { width: 180px; height: auto; }
    .header-right { text-align: right; }
    .farm-name { font-size: 20px; font-weight: 800; color: #1A3A8F; margin-bottom: 4px; }
    .date { color: #6B7A99; font-size: 12px; }
    .lab-section { margin-bottom: 28px; }
    .lab-section:not(:first-child) { page-break-before: always; break-before: page; }
    .lab-header { background: #1A3A8F; color: #FFFFFF; padding: 10px 14px; font-weight: 700; font-size: 13px; border-radius: 6px 6px 0 0; page-break-after: avoid; break-after: avoid; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #E8ECF4; }
    th { padding: 8px 14px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    td { padding: 10px 14px; border-bottom: 1px solid #E8ECF4; }
    tr:nth-child(even) td { background: #F4F6FA; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .footer { margin-top: 40px; font-size: 10px; color: #6B7A99; text-align: center; border-top: 1px solid #E8ECF4; padding-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://i.postimg.cc/pVwVTC9j/LOGO-VERTICALL-EM-PNG.png" alt="Hiperafarma" onerror="this.style.display='none'">
    <div class="header-right">
      <div class="farm-name">${escHtml(farm?.nome || "Farmácia")}</div>
      <div class="date">Data: ${dataStr}</div>
      <div class="date">Pedido #${pedidoSelecionado.id.slice(0, 8).toUpperCase()}</div>
    </div>
  </div>
  ${secoes}
  <div class="footer">Hiperafarma Drogarias — Gerado em ${horaStr} — Documento de uso interno</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    setPdfPreviewHtml(html);
  };

  const gerarPDFLab = async () => {
    const lab = labPDF ? laboratorios.find(l => l.id === labPDF) : null;
    const farmSel = filtroFarmacia ? farmacias.find(f => f.id === filtroFarmacia) : null;
    setLoadingPDF(true);
    try {
      // O PDF usa os mesmos filtros de Farmácia, Seção e Data já aplicados na lista acima,
      // combinados com o Laboratório escolhido neste modal — nunca ignora um filtro visível.
      const pendingIds = pedidos
        .filter(p => p.liberado_deposito !== false
          && (p.status === "pendente" || p.status === "em_andamento")
          && (!filtroFarmacia || p.farmacia_id === filtroFarmacia)
          && passaFiltroData(p))
        .map(p => p.id);

      if (!pendingIds.length) {
        alert("Nenhum pedido pendente ou em andamento encontrado com os filtros selecionados.");
        setLoadingPDF(false);
        return;
      }

      const filtroLab = labPDF ? `laboratorio_id=eq.${labPDF}&` : "";
      const filtroSecaoPDF = filtroSecao ? `categoria=eq.${filtroSecao}&` : "";
      const itens = await sb(`pedido_itens?${filtroLab}${filtroSecaoPDF}pedido_id=in.(${pendingIds.join(",")})&order=nome_laboratorio.asc,nome_produto.asc`);

      if (!itens.length) {
        alert(lab ? `Nenhum item pendente para o laboratório "${lab.nome}" com os filtros selecionados.` : "Nenhum item pendente ou em andamento encontrado com os filtros selecionados.");
        setLoadingPDF(false);
        return;
      }

      const dataStr = new Date().toLocaleDateString("pt-BR");
      const horaStr = new Date().toLocaleString("pt-BR");

      const secaoNome = filtroSecao ? categoriaLabel[filtroSecao] || filtroSecao : "";
      const dataFiltroDescricao = descricaoFiltroData();
      const tituloPrincipal = [
        lab ? `Pedido ${lab.nome}` : "Pedidos",
        farmSel ? `Farmácia ${farmSel.nome}` : "Todas as Farmácias",
        secaoNome ? `Seção ${secaoNome}` : null,
        dataFiltroDescricao ? `Data ${dataFiltroDescricao}` : null,
      ].filter(Boolean).join(" — ");

      const linhaItem = (item, i) => {
        const pedido = pedidos.find(p => p.id === item.pedido_id);
        const farm = farmacias.find(f => f.id === pedido?.farmacia_id);
        return `<tr>
          <td>${i + 1}</td>
          <td><strong>${escHtml(item.nome_produto)}</strong></td>
          <td>${escHtml(categoriaLabel[item.categoria] || item.categoria)}</td>
          <td>${escHtml(farm?.nome || "—")}</td>
          <td style="text-align:center;font-weight:700;color:#1A3A8F">${escHtml(qtdPdfLabel(item))}</td>
        </tr>`;
      };

      const tabelaLab = (labNome, items) => `<table>
      <thead><tr><th>#</th><th>Produto</th><th>Categoria</th><th>Farmácia</th><th>Qtd</th></tr></thead>
      <tbody>
        ${items.map((item, i) => linhaItem(item, i)).join("")}
        <tr class="total-row"><td colspan="4">Total de itens</td><td style="text-align:center">${items.length}</td></tr>
      </tbody>
    </table>`;

      let corpo;
      if (lab) {
        corpo = `<h2>Lista de Itens — ${escHtml(lab.nome)}</h2>${tabelaLab(lab.nome, itens)}`;
      } else {
        const grupos = {};
        itens.forEach(item => {
          const key = item.nome_laboratorio || "__sem_lab__";
          if (!grupos[key]) grupos[key] = [];
          grupos[key].push(item);
        });
        corpo = Object.entries(grupos).map(([key, items]) => {
          const labNome = key === "__sem_lab__" ? "Sem Laboratório" : key;
          return `<div class="lab-section">
          <div class="lab-header">${escHtml(labNome)}</div>
          ${tabelaLab(labNome, items)}
        </div>`;
        }).join("");
      }

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(tituloPrincipal)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; padding: 40px; color: #0F172A; font-size: 13px; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #1A3A8F; }
    .header img { width: 180px; height: auto; }
    .header-right { text-align: right; }
    .lab-name { font-size: 20px; font-weight: 800; color: #1A3A8F; margin-bottom: 4px; }
    .date { color: #6B7A99; font-size: 12px; }
    h2 { font-size: 15px; font-weight: 700; color: #374151; margin-bottom: 16px; }
    .lab-section { margin-bottom: 28px; }
    .lab-section:not(:first-child) { page-break-before: always; break-before: page; }
    .lab-header { background: #1A3A8F; color: #FFFFFF; padding: 10px 14px; font-weight: 700; font-size: 13px; border-radius: 6px 6px 0 0; margin-bottom: 0; page-break-after: avoid; break-after: avoid; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1A3A8F; color: #FFFFFF; }
    th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    td { padding: 10px 14px; border-bottom: 1px solid #E8ECF4; }
    tr:nth-child(even) td { background: #F4F6FA; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .footer { margin-top: 40px; font-size: 10px; color: #6B7A99; text-align: center; border-top: 1px solid #E8ECF4; padding-top: 16px; }
    .total-row td { font-weight: 700; background: #EFF6FF; border-top: 2px solid #1A3A8F; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://i.postimg.cc/pVwVTC9j/LOGO-VERTICALL-EM-PNG.png" alt="Hiperafarma" onerror="this.style.display='none'">
    <div class="header-right">
      <div class="lab-name">${escHtml(tituloPrincipal)}</div>
      <div class="date">Gerado em: ${dataStr}</div>
      <div class="date">Filtro de data: ${escHtml(dataFiltroDescricao || "Todas")}</div>
      <div class="date">Itens pendentes e em andamento</div>
    </div>
  </div>
  ${corpo}
  <div class="footer">Hiperafarma Drogarias — Gerado em ${horaStr} — Documento de uso interno</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

      setPdfPreviewHtml(html);
      setGeraPDF(false);
    } catch (e) {
      alert("Erro ao gerar PDF: " + e.message);
    }
    setLoadingPDF(false);
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
              {farmacias.filter(f => f.usuario !== "admin" && f.ativa !== false).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>STATUS</label>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 13, fontFamily: "inherit", background: C.branco }}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="entregue">Entregue</option>
              <option value="revisado">Revisado</option>
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
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>SEÇÃO</label>
            <select value={filtroSecao} onChange={e => setFiltroSecao(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 13, fontFamily: "inherit", background: C.branco }}>
              <option value="">Todas</option>
              {categoriaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>DATA</label>
            <Segmented
              small
              options={[{ value: "todas", label: "Todas" }, { value: "hoje", label: "Hoje" }, { value: "periodo", label: "Data específica / Período" }]}
              value={filtroDataModo}
              onChange={setFiltroDataModo}
            />
            {filtroDataModo === "periodo" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input type="date" value={filtroDataDe} onChange={e => setFiltroDataDe(e.target.value)} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 12, fontFamily: "inherit", background: C.branco, minWidth: 0 }} />
                <input type="date" value={filtroDataAte} onChange={e => setFiltroDataAte(e.target.value)} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 12, fontFamily: "inherit", background: C.branco, minWidth: 0 }} />
              </div>
            )}
          </div>
          <Btn onClick={() => { setFiltroFarmacia(""); setFiltroStatus(""); setFiltroUrgencia(""); setFiltroSecao(""); setFiltroDataModo("todas"); setFiltroDataDe(""); setFiltroDataAte(""); }} outline cor={C.cinzaT} small>Limpar</Btn>
        </div>
      </Card>

      {/* Lista agrupada por período */}
      {pedidosFiltrados.length === 0 ? (
        <Card><p style={{ color: C.cinzaT, textAlign: "center", margin: 0 }}>Nenhum pedido encontrado.</p></Card>
      ) : gruposPeriodo.filter(g => g.pedidos.length).map(grupo => (
        <div key={grupo.titulo} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.azul, letterSpacing: 0.3, textTransform: "uppercase" }}>{grupo.titulo}</h3>
            <span style={{ background: C.azul + "15", color: C.azul, borderRadius: 20, padding: "1px 10px", fontSize: 11, fontWeight: 700 }}>{grupo.pedidos.length}</span>
            <div style={{ flex: 1, height: 1, background: C.cinzaE }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {grupo.pedidos.map(p => {
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
                      <BtnIcon icon="olho" cor={C.azulClaro} title="Visualizar pedido" onClick={e => { e.stopPropagation(); abrirPedido(p); }} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Modal Pedido */}
      {pedidoSelecionado && (
        <Modal title={`Pedido — ${farmacias.find(f => f.id === pedidoSelecionado.farmacia_id)?.nome}`} onClose={() => setPedidoSelecionado(null)} width={680}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
            <Badge label={urgenciaLabel[pedidoSelecionado.urgencia]} cor={urgenciaCor[pedidoSelecionado.urgencia]} />
            <Badge label={statusLabel[pedidoSelecionado.status]} cor={statusCor[pedidoSelecionado.status]} />
            <span style={{ fontSize: 12, color: C.cinzaT }}>{new Date(pedidoSelecionado.criado_em).toLocaleString("pt-BR")}</span>
            <div style={{ marginLeft: "auto" }}>
              <Btn onClick={gerarPDFPedido} cor={C.azulClaro} small disabled={loadingItens || !itensPedido.length}>
                <Icon name="pdf" size={14} color={C.branco} /> PDF do Pedido
              </Btn>
            </div>
          </div>

          {pedidoSelecionado.observacao && (
            <div style={{ background: C.cinzaF, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14, color: C.cinzaP }}>
              📝 {pedidoSelecionado.observacao}
            </div>
          )}

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
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <input value={novoComentario} onChange={e => setNovoComentario(e.target.value)} placeholder="Escreva uma mensagem..." onKeyDown={e => e.key === "Enter" && enviarComentario()} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <Btn onClick={enviarComentario} cor={C.azul}><Icon name="msg" size={16} color={C.branco} /></Btn>
          </div>

          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.cinzaT }}>ITENS DO PEDIDO</h4>
          <div style={{ background: C.cinzaF, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            {loadingItens ? (
              <p style={{ padding: 16, color: C.cinzaT, margin: 0, textAlign: "center" }}>Carregando itens...</p>
            ) : itensPedido.length === 0 ? (
              <p style={{ padding: 16, color: C.cinzaT, margin: 0, textAlign: "center" }}>Nenhum item encontrado.</p>
            ) : itensPedido.map((item, i) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < itensPedido.length - 1 ? `1px solid ${C.cinzaE}` : "none" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>{item.nome_produto}</div>
                  <div style={{ fontSize: 12, color: C.cinzaT, marginTop: 2 }}>
                    {item.nome_laboratorio ? `🏭 ${item.nome_laboratorio}` : "Sem laboratório"}
                    {" • "}
                    {categoriaLabel[item.categoria] || item.categoria}
                    {item.motivo ? ` • ${item.motivo}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge label={categoriaLabel[item.categoria] || item.categoria} cor={categoriaCor[item.categoria] || C.cinzaT} />
                  <QtdUnidade quantidade={item.quantidade} unidade={item.unidade_medida} />
                </div>
              </div>
            ))}
          </div>

          <Btn onClick={excluirPedido} cor={C.vermelho} small>
            <Icon name="lixeira" size={15} color={C.branco} /> Excluir Pedido
          </Btn>
        </Modal>
      )}

      {/* Modal PDF */}
      {geraPDF && (
        <Modal title="Gerar PDF de Pedidos" onClose={() => { setGeraPDF(false); setLabPDF(""); }} width={440}>
          <p style={{ color: C.cinzaT, fontSize: 14, marginBottom: 16 }}>
            Escolha os filtros do PDF abaixo — eles também atualizam a lista de Pedidos ao fundo.
          </p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>Farmácia</label>
            <select value={filtroFarmacia} onChange={e => setFiltroFarmacia(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, color: C.preto, background: C.branco, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }}>
              <option value="">Todas as farmácias</option>
              {farmacias.filter(f => f.usuario !== "admin" && f.ativa !== false).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>Seção</label>
            <select value={filtroSecao} onChange={e => setFiltroSecao(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, color: C.preto, background: C.branco, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }}>
              <option value="">Todas as seções</option>
              {categoriaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>Data</label>
            <Segmented
              small
              options={[{ value: "todas", label: "Todas" }, { value: "hoje", label: "Hoje" }, { value: "periodo", label: "Data específica / Período" }]}
              value={filtroDataModo}
              onChange={setFiltroDataModo}
            />
            {filtroDataModo === "periodo" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input type="date" value={filtroDataDe} onChange={e => setFiltroDataDe(e.target.value)} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 12, fontFamily: "inherit", background: C.branco, minWidth: 0 }} />
                <input type="date" value={filtroDataAte} onChange={e => setFiltroDataAte(e.target.value)} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 12, fontFamily: "inherit", background: C.branco, minWidth: 0 }} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>Laboratório (opcional)</label>
            <select value={labPDF} onChange={e => setLabPDF(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, color: C.preto, background: C.branco, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }}>
              <option value="">Todos os laboratórios</option>
              {laboratorios.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn onClick={gerarPDFLab} cor={C.vermelho} disabled={loadingPDF} full>
              <Icon name="pdf" size={16} color={C.branco} /> {loadingPDF ? "Gerando..." : "Gerar e Imprimir PDF"}
            </Btn>
            <Btn onClick={() => { setGeraPDF(false); setLabPDF(""); }} outline cor={C.cinzaT}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {pdfPreviewHtml && (
        <PdfViewerOverlay html={pdfPreviewHtml} onClose={() => setPdfPreviewHtml(null)} />
      )}

    </div>
  );
};

// =============================================
// DEPÓSITO (revisão de estoque — dono)
// =============================================
const Deposito = ({ pedidos, farmacias, onAtualizar }) => {
  const [itensCount, setItensCount] = useState({});
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [itensPedido, setItensPedido] = useState([]);
  const [marcados, setMarcados] = useState({});
  const [loadingItens, setLoadingItens] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [filtroTipoPedido, setFiltroTipoPedido] = useState("");

  const pedidosAguardando = pedidos.filter(p => p.liberado_deposito === false);
  // Sem filtro selecionado, continua mostrando todos os pedidos aguardando o Depósito.
  const pedidosDeposito = pedidosAguardando
    .filter(p => !filtroTipoPedido || (p.tipo_pedido || "deposito") === filtroTipoPedido);

  useEffect(() => {
    const carregarContagens = async () => {
      if (!pedidosAguardando.length) { setItensCount({}); return; }
      try {
        const itens = await sb(`pedido_itens?pedido_id=in.(${pedidosAguardando.map(p => p.id).join(",")})&select=pedido_id`);
        const contagem = {};
        itens.forEach(i => { contagem[i.pedido_id] = (contagem[i.pedido_id] || 0) + 1; });
        setItensCount(contagem);
      } catch {}
    };
    carregarContagens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidos]);

  const abrirPedido = async (pedido) => {
    setPedidoSelecionado(pedido);
    setItensPedido([]);
    setMarcados({});
    setLoadingItens(true);
    const itens = await sb(`pedido_itens?pedido_id=eq.${pedido.id}&order=criado_em.asc`);
    setItensPedido(itens);
    setLoadingItens(false);
  };

  const toggleMarcado = (id) => setMarcados(m => ({ ...m, [id]: !m[id] }));

  const concluirRevisao = async () => {
    setSalvando(true);
    try {
      const idsParaRemover = itensPedido.filter(i => marcados[i.id]).map(i => i.id);
      if (idsParaRemover.length) {
        await sb(`pedido_itens?id=in.(${idsParaRemover.join(",")})`, { method: "DELETE", prefer: "return=minimal" });
      }
      await sb(`pedidos?id=eq.${pedidoSelecionado.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ liberado_deposito: true, liberado_deposito_em: new Date().toISOString() }) });
      await sb(`logs`, { method: "POST", body: JSON.stringify({ pedido_id: pedidoSelecionado.id, farmacia_id: pedidoSelecionado.farmacia_id, acao: "Pedido liberado pelo Depósito" }) });
      setPedidoSelecionado(null);
      onAtualizar();
    } catch (e) { alert("Erro ao concluir revisão: " + e.message); }
    setSalvando(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Depósito</h2>
        <p style={{ margin: 0, color: C.cinzaT, fontSize: 14 }}>{pedidosDeposito.length} pedidos aguardando revisão de estoque</p>
      </div>

      <Card style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>TIPO DE PEDIDO</label>
            <Segmented
              small
              options={[{ value: "", label: "Todos" }, ...tipoPedidoOptions]}
              value={filtroTipoPedido}
              onChange={setFiltroTipoPedido}
            />
          </div>
          {filtroTipoPedido && (
            <Btn onClick={() => setFiltroTipoPedido("")} outline cor={C.cinzaT} small>Limpar</Btn>
          )}
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pedidosDeposito.length === 0 ? (
          <Card><p style={{ color: C.cinzaT, textAlign: "center", margin: 0 }}>Nenhum pedido pendente para revisão.</p></Card>
        ) : pedidosDeposito.map(p => {
          const farm = farmacias.find(f => f.id === p.farmacia_id);
          const tipo = p.tipo_pedido || "deposito";
          return (
            <Card key={p.id} style={{ padding: 16, cursor: "pointer", transition: "box-shadow 0.15s" }} onClick={() => abrirPedido(p)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, background: urgenciaCor[p.urgencia] + "20", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="deposito" size={20} color={urgenciaCor[p.urgencia]} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.preto }}>{farm?.nome || "Farmácia"}</div>
                    <div style={{ fontSize: 12, color: C.cinzaT }}>{new Date(p.criado_em).toLocaleString("pt-BR")}</div>
                    <div style={{ fontSize: 12, color: C.cinzaP, marginTop: 2 }}>{itensCount[p.id] || 0} itens</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge label={tipoPedidoLabel[tipo] || tipo} cor={tipoPedidoCor[tipo] || C.cinzaT} />
                  <Badge label={urgenciaLabel[p.urgencia]} cor={urgenciaCor[p.urgencia]} />
                  <Badge label={statusLabel[p.status]} cor={statusCor[p.status]} />
                  <BtnIcon icon="olho" cor={C.azulClaro} title="Revisar pedido" onClick={e => { e.stopPropagation(); abrirPedido(p); }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {pedidoSelecionado && (
        <Modal title={`Revisão de Estoque — ${farmacias.find(f => f.id === pedidoSelecionado.farmacia_id)?.nome}`} onClose={() => setPedidoSelecionado(null)} width={680}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
            <Badge label={tipoPedidoLabel[pedidoSelecionado.tipo_pedido || "deposito"] || pedidoSelecionado.tipo_pedido} cor={tipoPedidoCor[pedidoSelecionado.tipo_pedido || "deposito"] || C.cinzaT} />
            <Badge label={urgenciaLabel[pedidoSelecionado.urgencia]} cor={urgenciaCor[pedidoSelecionado.urgencia]} />
            <Badge label={statusLabel[pedidoSelecionado.status]} cor={statusCor[pedidoSelecionado.status]} />
            <span style={{ fontSize: 12, color: C.cinzaT }}>{new Date(pedidoSelecionado.criado_em).toLocaleString("pt-BR")}</span>
          </div>

          {pedidoSelecionado.observacao && (
            <div style={{ background: C.cinzaF, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14, color: C.cinzaP }}>
              📝 {pedidoSelecionado.observacao}
            </div>
          )}

          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.cinzaT }}>ITENS DO PEDIDO</h4>
          <div style={{ background: C.cinzaF, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            {loadingItens ? (
              <p style={{ padding: 16, color: C.cinzaT, margin: 0, textAlign: "center" }}>Carregando itens...</p>
            ) : itensPedido.length === 0 ? (
              <p style={{ padding: 16, color: C.cinzaT, margin: 0, textAlign: "center" }}>Nenhum item encontrado.</p>
            ) : itensPedido.map((item, i) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: i < itensPedido.length - 1 ? `1px solid ${C.cinzaE}` : "none" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>{item.nome_produto}</div>
                  <div style={{ fontSize: 12, color: C.cinzaT, marginTop: 2 }}>
                    {item.nome_laboratorio ? `🏭 ${item.nome_laboratorio}` : "Sem laboratório"}
                    {" • "}
                    {categoriaLabel[item.categoria] || item.categoria}
                    {" • ×"}{item.quantidade}
                    {unidadeLabelQtd(item.unidade_medida, item.quantidade) ? ` ${unidadeLabelQtd(item.unidade_medida, item.quantidade)}` : ""}
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                  <input type="checkbox" checked={!!marcados[item.id]} onChange={() => toggleMarcado(item.id)} style={{ width: 18, height: 18, accentColor: C.verde, cursor: "pointer" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.cinzaP }}>Tem no estoque</span>
                </label>
              </div>
            ))}
          </div>

          <Btn onClick={concluirRevisao} cor={C.verde} full disabled={salvando || loadingItens}>
            <Icon name="check" size={16} color={C.branco} /> {salvando ? "Salvando..." : "Concluir Revisão"}
          </Btn>
        </Modal>
      )}
    </div>
  );
};

// =============================================
// FARMÁCIAS (gerenciar)
// =============================================
const GerenciarFarmacias = ({ farmacias, onAtualizar }) => {
  // Modal novo cadastro
  const [modalNovo, setModalNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [erroNovo, setErroNovo] = useState("");

  // Modal visualizar
  const [modalVer, setModalVer] = useState(null);
  const [pedidosFarm, setPedidosFarm] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  // Modal editar
  const [modalEditar, setModalEditar] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editUsuario, setEditUsuario] = useState("");
  const [editSenha, setEditSenha] = useState("");
  const [editEndereco, setEditEndereco] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [loadingEditar, setLoadingEditar] = useState(false);

  // Confirmar exclusão
  const [confirmExcluir, setConfirmExcluir] = useState(null);

  const cadastrar = async () => {
    if (!nome || !usuario || !senha) return;
    setLoading(true);
    setErroNovo("");
    try {
      const existe = await sb(`farmacias?usuario=eq.${encodeURIComponent(usuario)}`);
      if (existe.length > 0) {
        setErroNovo("Este usuário já existe. Escolha outro nome de usuário.");
        setLoading(false);
        return;
      }
      await sb("farmacias", { method: "POST", body: JSON.stringify({ nome, usuario, senha_hash: senha, endereco, telefone }) });
      setModalNovo(false); setErroNovo(""); setNome(""); setUsuario(""); setSenha(""); setEndereco(""); setTelefone("");
      onAtualizar();
    } catch (e) { setErroNovo("Erro ao cadastrar: " + e.message); }
    setLoading(false);
  };

  const abrirVer = async (farm) => {
    setModalVer(farm);
    setLoadingPedidos(true);
    setPedidosFarm([]);
    try {
      const peds = await sb(`pedidos?farmacia_id=eq.${farm.id}&order=criado_em.desc&limit=20`);
      setPedidosFarm(peds);
    } catch {}
    setLoadingPedidos(false);
  };

  const abrirEditar = (farm) => {
    setModalEditar(farm);
    setEditNome(farm.nome || "");
    setEditUsuario(farm.usuario || "");
    setEditSenha("");
    setEditEndereco(farm.endereco || "");
    setEditTelefone(farm.telefone || "");
  };

  const salvarEdicao = async () => {
    if (!editNome || !editUsuario) return;
    setLoadingEditar(true);
    try {
      const body = { nome: editNome, usuario: editUsuario, endereco: editEndereco, telefone: editTelefone };
      if (editSenha) body.senha_hash = editSenha;
      await sb(`farmacias?id=eq.${modalEditar.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(body) });
      setModalEditar(null);
      onAtualizar();
    } catch (e) { alert("Erro ao editar: " + e.message); }
    setLoadingEditar(false);
  };

  const excluir = async (farm) => {
    try {
      await sb(`farmacias?id=eq.${farm.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ ativa: false }) });
      setConfirmExcluir(null);
      onAtualizar();
    } catch (e) { alert("Erro ao excluir: " + e.message); }
  };

  const listaFarmacias = farmacias.filter(f => f.usuario !== "admin" && f.ativa !== false);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Farmácias</h2>
          <p style={{ margin: 0, color: C.cinzaT, fontSize: 14 }}>{listaFarmacias.length} farmácias cadastradas</p>
        </div>
        <Btn onClick={() => setModalNovo(true)} cor={C.azul}><Icon name="mais" size={16} color={C.branco} /> Nova Farmácia</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {listaFarmacias.map(f => (
          <Card key={f.id} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, background: C.azul + "15", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="farmacias" size={22} color={C.azul} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.preto, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.nome}</div>
                <div style={{ fontSize: 12, color: C.cinzaT }}>@{f.usuario}</div>
              </div>
              <Badge label={f.ativa ? "Ativa" : "Inativa"} cor={f.ativa ? C.verde : C.cinzaT} />
            </div>
            {f.endereco && <div style={{ fontSize: 13, color: C.cinzaT, marginBottom: 4 }}>📍 {f.endereco}</div>}
            {f.telefone && <div style={{ fontSize: 13, color: C.cinzaT, marginBottom: 12 }}>📞 {f.telefone}</div>}
            {/* Botões de ação */}
            <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${C.cinzaE}` }}>
              <BtnIcon icon="olho" cor={C.azulClaro} title="Visualizar farmácia" onClick={e => { e.stopPropagation(); abrirVer(f); }} />
              <BtnIcon icon="lapis" cor={C.laranja} title="Editar farmácia" onClick={e => { e.stopPropagation(); abrirEditar(f); }} />
              <BtnIcon icon="lixeira" cor={C.vermelho} title="Desativar farmácia" onClick={e => { e.stopPropagation(); setConfirmExcluir(f); }} />
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Novo */}
      {modalNovo && (
        <Modal title="Cadastrar Nova Farmácia" onClose={() => { if (!loading) { setModalNovo(false); setErroNovo(""); } }}>
          <Input label="Nome da Farmácia" value={nome} onChange={setNome} placeholder="Ex: Hiperafarma Centro" required />
          <Input label="Usuário (login)" value={usuario} onChange={setUsuario} placeholder="Ex: hiperafarma_centro" required />
          <Input label="Senha" value={senha} onChange={setSenha} type="password" placeholder="Senha de acesso" required />
          <Input label="Endereço" value={endereco} onChange={setEndereco} placeholder="Rua, número, bairro" />
          <Input label="Telefone" value={telefone} onChange={setTelefone} placeholder="(99) 99999-9999" />
          {erroNovo && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: C.vermelho, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="alerta" size={16} color={C.vermelho} /> {erroNovo}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn onClick={cadastrar} disabled={loading} cor={C.azul} full>{loading ? "Salvando..." : "Cadastrar Farmácia"}</Btn>
            <Btn onClick={() => { if (!loading) { setModalNovo(false); setErroNovo(""); } }} outline cor={C.cinzaT}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal Visualizar */}
      {modalVer && (
        <Modal title={`Farmácia — ${modalVer.nome}`} onClose={() => setModalVer(null)} width={620}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div style={{ background: C.cinzaF, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.cinzaT, marginBottom: 4 }}>NOME</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>{modalVer.nome}</div>
            </div>
            <div style={{ background: C.cinzaF, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.cinzaT, marginBottom: 4 }}>USUÁRIO</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>@{modalVer.usuario}</div>
            </div>
            {modalVer.endereco && (
              <div style={{ background: C.cinzaF, borderRadius: 12, padding: 16, gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.cinzaT, marginBottom: 4 }}>ENDEREÇO</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>{modalVer.endereco}</div>
              </div>
            )}
            {modalVer.telefone && (
              <div style={{ background: C.cinzaF, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.cinzaT, marginBottom: 4 }}>TELEFONE</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>{modalVer.telefone}</div>
              </div>
            )}
            <div style={{ background: C.cinzaF, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.cinzaT, marginBottom: 4 }}>STATUS</div>
              <Badge label={modalVer.ativa ? "Ativa" : "Inativa"} cor={modalVer.ativa ? C.verde : C.cinzaT} />
            </div>
          </div>

          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.cinzaT }}>PEDIDOS RECENTES</h4>
          {loadingPedidos ? (
            <p style={{ color: C.cinzaT, fontSize: 14 }}>Carregando pedidos...</p>
          ) : pedidosFarm.length === 0 ? (
            <div style={{ background: C.cinzaF, borderRadius: 12, padding: 16, textAlign: "center", color: C.cinzaT, fontSize: 14 }}>
              Nenhum pedido encontrado para esta farmácia.
            </div>
          ) : (
            <div style={{ background: C.cinzaF, borderRadius: 12, overflow: "hidden" }}>
              {pedidosFarm.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < pedidosFarm.length - 1 ? `1px solid ${C.cinzaE}` : "none" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.preto }}>Pedido #{p.id.slice(0, 8).toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: C.cinzaT }}>{new Date(p.criado_em).toLocaleString("pt-BR")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge label={urgenciaLabel[p.urgencia]} cor={urgenciaCor[p.urgencia]} />
                    <Badge label={statusLabel[p.status]} cor={statusCor[p.status]} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Modal Editar */}
      {modalEditar && (
        <Modal title={`Editar — ${modalEditar.nome}`} onClose={() => setModalEditar(null)}>
          <Input label="Nome da Farmácia" value={editNome} onChange={setEditNome} placeholder="Nome da farmácia" required />
          <Input label="Usuário (login)" value={editUsuario} onChange={setEditUsuario} placeholder="Usuário de acesso" required />
          <Input label="Nova Senha (deixe em branco para não alterar)" value={editSenha} onChange={setEditSenha} type="password" placeholder="Nova senha" />
          <Input label="Endereço" value={editEndereco} onChange={setEditEndereco} placeholder="Rua, número, bairro" />
          <Input label="Telefone" value={editTelefone} onChange={setEditTelefone} placeholder="(99) 99999-9999" />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn onClick={salvarEdicao} disabled={loadingEditar} cor={C.azul} full>
              <Icon name="check" size={16} color={C.branco} /> {loadingEditar ? "Salvando..." : "Salvar Alterações"}
            </Btn>
            <Btn onClick={() => setModalEditar(null)} outline cor={C.cinzaT}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* Confirmar Exclusão */}
      {confirmExcluir && (
        <Modal title="Confirmar Desativação" onClose={() => setConfirmExcluir(null)} width={400}>
          <p style={{ color: C.cinzaP, fontSize: 14, marginBottom: 8 }}>
            Deseja desativar a farmácia <strong>{confirmExcluir.nome}</strong>?
          </p>
          <p style={{ color: C.cinzaT, fontSize: 13, marginBottom: 24 }}>
            A farmácia ficará inativa e não poderá mais acessar o sistema. Esta ação pode ser desfeita editando a farmácia.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => excluir(confirmExcluir)} cor={C.vermelho} full>
              <Icon name="lixeira" size={16} color={C.branco} /> Confirmar Desativação
            </Btn>
            <Btn onClick={() => setConfirmExcluir(null)} outline cor={C.cinzaT}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// =============================================
// LABORATÓRIOS (gerenciar)
// =============================================
const GerenciarLaboratorios = ({ laboratorios, onAtualizar }) => {
  const [modal, setModal] = useState(false);
  const [labSelecionado, setLabSelecionado] = useState(null);
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState(null);
  const [busca, setBusca] = useState("");

  const buscaNormalizada = busca.trim().toLowerCase();
  const laboratoriosFiltrados = buscaNormalizada
    ? laboratorios.filter(lab => (lab.nome || "").toLowerCase().includes(buscaNormalizada))
    : laboratorios;

  const abrirNovo = () => {
    setLabSelecionado(null);
    setNome(""); setContato("");
    setModal(true);
  };

  const abrirEditar = (lab) => {
    setLabSelecionado(lab);
    setNome(lab.nome || "");
    setContato(lab.contato || "");
    setModal(true);
  };

  const salvar = async () => {
    if (!nome.trim()) return;
    setLoading(true);
    try {
      if (!labSelecionado) {
        await sb("laboratorios", { method: "POST", body: JSON.stringify({ nome: nome.trim(), contato: contato.trim() }) });
      } else {
        await sb(`laboratorios?id=eq.${labSelecionado.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ nome: nome.trim(), contato: contato.trim() }) });
      }
      setModal(false);
      onAtualizar();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    setLoading(false);
  };

  const excluir = async (lab) => {
    try {
      await sb(`laboratorios?id=eq.${lab.id}`, { method: "DELETE", prefer: "return=minimal" });
      setConfirmExcluir(null);
      onAtualizar();
    } catch (e) {
      setConfirmExcluir(null);
      alert("Não foi possível excluir: o laboratório pode estar associado a produtos ou pedidos.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Laboratórios</h2>
          <p style={{ margin: 0, color: C.cinzaT, fontSize: 14 }}>
            {buscaNormalizada ? `${laboratoriosFiltrados.length} de ${laboratorios.length} laboratórios` : `${laboratorios.length} laboratórios cadastrados`}
          </p>
        </div>
        <Btn onClick={abrirNovo} cor={C.azul}>
          <Icon name="mais" size={16} color={C.branco} /> Novo Laboratório
        </Btn>
      </div>

      <div style={{ position: "relative", maxWidth: 360, marginBottom: 20 }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}>
          <Icon name="lupa" size={16} color={C.cinzaT} />
        </div>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar laboratório..."
          style={{ width: "100%", padding: "10px 14px 10px 38px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, color: C.preto, background: C.branco, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }}
        />
      </div>

      {laboratoriosFiltrados.length === 0 ? (
        <Card>
          <p style={{ color: C.cinzaT, textAlign: "center", margin: 0 }}>
            {buscaNormalizada ? "Nenhum laboratório encontrado para esta busca." : "Nenhum laboratório cadastrado ainda."}
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {laboratoriosFiltrados.map(lab => (
            <Card key={lab.id} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, background: C.azulClaro + "15", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="laboratorio" size={20} color={C.azulClaro} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.preto, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lab.nome}</div>
                  {lab.contato && <div style={{ fontSize: 12, color: C.cinzaT, marginTop: 2 }}>📞 {lab.contato}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${C.cinzaE}` }}>
                <BtnIcon icon="lapis" cor={C.laranja} title="Editar laboratório" onClick={() => abrirEditar(lab)} />
                <BtnIcon icon="lixeira" cor={C.vermelho} title="Excluir laboratório" onClick={() => setConfirmExcluir(lab)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Novo / Editar */}
      {modal && (
        <Modal title={labSelecionado ? `Editar — ${labSelecionado.nome}` : "Novo Laboratório"} onClose={() => setModal(false)}>
          <Input label="Nome do Laboratório" value={nome} onChange={setNome} placeholder="Ex: EMS, Medley, Eurofarma..." required />
          <Input label="Contato (telefone ou e-mail)" value={contato} onChange={setContato} placeholder="(99) 99999-9999 ou email@lab.com" />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn onClick={salvar} disabled={loading || !nome.trim()} cor={C.azul} full>
              <Icon name="check" size={16} color={C.branco} /> {loading ? "Salvando..." : labSelecionado ? "Salvar Alterações" : "Cadastrar Laboratório"}
            </Btn>
            <Btn onClick={() => setModal(false)} outline cor={C.cinzaT}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* Confirmar Exclusão */}
      {confirmExcluir && (
        <Modal title="Confirmar Exclusão" onClose={() => setConfirmExcluir(null)} width={400}>
          <p style={{ color: C.cinzaP, fontSize: 14, marginBottom: 8 }}>
            Deseja excluir o laboratório <strong>{confirmExcluir.nome}</strong>?
          </p>
          <p style={{ color: C.cinzaT, fontSize: 13, marginBottom: 24 }}>
            Esta ação é permanente. Se houver produtos ou pedidos vinculados, a exclusão será bloqueada.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => excluir(confirmExcluir)} cor={C.vermelho} full>
              <Icon name="lixeira" size={16} color={C.branco} /> Confirmar Exclusão
            </Btn>
            <Btn onClick={() => setConfirmExcluir(null)} outline cor={C.cinzaT}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// =============================================
// NOVA SOLICITAÇÃO (farmácia)
// =============================================
const itemVazio = { nome: "", categoria: "eticos", laboratorio_id: "", quantidade: 1, unidade: "unidade", motivo: "esgotou" };
const gerarIdRascunho = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const novoRascunho = (itens) => ({ id: gerarIdRascunho(), urgencia: "normal", tipoPedido: "deposito", observacao: "", itens: itens && itens.length ? itens : [{ ...itemVazio }] });

// =============================================
// ABAS DE SOLICITAÇÃO (farmácia) — várias solicitações independentes em paralelo
// =============================================
const SolicitacoesTabs = ({ farmaciaId, laboratorios, onSalvo, itensIniciais, onConsumirItensIniciais }) => {
  const chaveAbas = `hiperafarma_solicitacoes_${farmaciaId}`;
  const chaveAntiga = `hiperafarma_rascunho_${farmaciaId}`;

  const [estado, setEstado] = useState(() => {
    try {
      const salvo = localStorage.getItem(chaveAbas);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed?.drafts?.length) return parsed;
      }
    } catch {}
    try {
      const antigo = localStorage.getItem(chaveAntiga);
      if (antigo) {
        const d = JSON.parse(antigo);
        const draft = { ...novoRascunho(d.itens), urgencia: d.urgencia || "normal", observacao: d.observacao || "" };
        localStorage.removeItem(chaveAntiga);
        return { abaAtivaId: draft.id, drafts: [draft] };
      }
    } catch {}
    const draft = novoRascunho();
    return { abaAtivaId: draft.id, drafts: [draft] };
  });
  const { drafts, abaAtivaId } = estado;

  useEffect(() => {
    localStorage.setItem(chaveAbas, JSON.stringify(estado));
  }, [estado, chaveAbas]);

  // Garante que sempre exista uma aba ativa válida (ex: após fechar/enviar uma solicitação)
  useEffect(() => {
    if (!drafts.length) {
      const d = novoRascunho();
      setEstado({ abaAtivaId: d.id, drafts: [d] });
    } else if (!drafts.find(d => d.id === abaAtivaId)) {
      setEstado(e => ({ ...e, abaAtivaId: drafts[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, abaAtivaId]);

  useEffect(() => {
    if (itensIniciais && itensIniciais.length) {
      const d = novoRascunho(itensIniciais);
      setEstado(e => ({ abaAtivaId: d.id, drafts: [...e.drafts, d] }));
      onConsumirItensIniciais?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensIniciais]);

  const abrirAba = (id) => setEstado(e => ({ ...e, abaAtivaId: id }));

  const novaAba = () => {
    const d = novoRascunho();
    setEstado(e => ({ abaAtivaId: d.id, drafts: [...e.drafts, d] }));
  };

  const fecharAba = (id, e) => {
    e?.stopPropagation();
    if (drafts.length <= 1) {
      if (!window.confirm("Limpar esta solicitação?")) return;
      setEstado({ abaAtivaId: null, drafts: [] });
      return;
    }
    if (!window.confirm("Fechar esta solicitação? Os itens preenchidos nela serão perdidos.")) return;
    setEstado(prev => ({ ...prev, drafts: prev.drafts.filter(d => d.id !== id) }));
  };

  const atualizarDraft = (id, patch) => {
    setEstado(e => ({ ...e, drafts: e.drafts.map(d => d.id === id ? { ...d, ...patch } : d) }));
  };

  const aoEnviar = (id) => {
    setEstado(e => ({ ...e, drafts: e.drafts.filter(d => d.id !== id) }));
  };

  const abaAtiva = drafts.find(d => d.id === abaAtivaId);

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Nova Solicitação</h2>
      <p style={{ margin: "0 0 20px", color: C.cinzaT, fontSize: 14 }}>Adicione os itens que estão faltando — você pode preencher várias solicitações ao mesmo tempo</p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {drafts.map((d, i) => (
          <div
            key={d.id}
            onClick={() => abrirAba(d.id)}
            style={{
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0,
              padding: "9px 14px", borderRadius: 10,
              background: d.id === abaAtivaId ? C.azul : C.branco,
              color: d.id === abaAtivaId ? C.branco : C.cinzaP,
              border: `1.5px solid ${d.id === abaAtivaId ? C.azul : C.cinzaD}`,
              fontWeight: 700, fontSize: 13, whiteSpace: "nowrap",
            }}
          >
            Solicitação {i + 1}
            {d.itens.some(it => it.nome) && (
              <span style={{ background: d.id === abaAtivaId ? "rgba(255,255,255,0.25)" : C.cinzaE, color: d.id === abaAtivaId ? C.branco : C.cinzaT, borderRadius: 20, padding: "1px 7px", fontSize: 11 }}>
                {d.itens.filter(it => it.nome).length}
              </span>
            )}
            {drafts.length > 1 && (
              <button onClick={e => fecharAba(d.id, e)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, color: "inherit", opacity: 0.75 }}>
                <Icon name="fechar" size={13} color={d.id === abaAtivaId ? C.branco : C.cinzaT} />
              </button>
            )}
          </div>
        ))}
        <button onClick={novaAba} style={{
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer",
          padding: "9px 14px", borderRadius: 10, background: "transparent", color: C.azul,
          border: `1.5px dashed ${C.azulClaro}`, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", fontFamily: "inherit",
        }}>
          <Icon name="mais" size={14} color={C.azul} /> Nova solicitação
        </button>
      </div>

      {abaAtiva && (
        <NovaSolicitacaoForm
          key={abaAtiva.id}
          draft={abaAtiva}
          onChange={patch => atualizarDraft(abaAtiva.id, patch)}
          farmaciaId={farmaciaId}
          laboratorios={laboratorios}
          onEnviado={() => { aoEnviar(abaAtiva.id); onSalvo(); }}
        />
      )}
    </div>
  );
};

const NovaSolicitacaoForm = ({ draft, onChange, farmaciaId, laboratorios, onEnviado }) => {
  const { urgencia, tipoPedido = "deposito", observacao, itens } = draft;
  const setUrgencia = v => onChange({ urgencia: v });
  const setTipoPedido = v => onChange({ tipoPedido: v });
  const setObservacao = v => onChange({ observacao: v });
  const setItens = novos => onChange({ itens: novos });
  const isMobile = useMobile();

  const [sugestoes, setSugestoes] = useState([]);
  const [indexAtivo, setIndexAtivo] = useState(null);
  const [labSearch, setLabSearch] = useState({});
  const [labOpen, setLabOpen] = useState(null);
  const [labDirection, setLabDirection] = useState({});
  const labRefs = useRef({});
  const [loading, setLoading] = useState(false);

  const limparRascunho = () => {
    if (!window.confirm("Limpar os itens preenchidos nesta solicitação?")) return;
    onChange({ urgencia: "normal", tipoPedido: "deposito", observacao: "", itens: [{ ...itemVazio }] });
  };

  const buscarSugestoes = async (texto, index) => {
    setIndexAtivo(index);
    if (texto.length < 2) { setSugestoes([]); return; }
    const res = await sb(`produtos?nome=ilike.${encodeURIComponent("%" + texto + "%")}&limit=6`);
    setSugestoes(res);
  };

  const selecionarSugestao = (produto, index) => {
    const novos = [...itens];
    novos[index] = { ...novos[index], nome: produto.nome, categoria: produto.categoria };
    if (produto.laboratorio_id) novos[index].laboratorio_id = produto.laboratorio_id;
    setItens(novos);
    setSugestoes([]);
    setIndexAtivo(null);
  };

  const addItem = () => setItens([...itens, { nome: "", categoria: "eticos", laboratorio_id: "", quantidade: 1, unidade: "unidade", motivo: "esgotou" }]);
  const remItem = (i) => setItens(itens.filter((_, idx) => idx !== i));
  const editItem = (i, campo, val) => { const n = itens.map((it, idx) => idx === i ? { ...it, [campo]: val } : it); setItens(n); };

  const salvar = async () => {
    if (itens.some(i => !i.nome)) { alert("Preencha o nome de todos os itens."); return; }
    if (itens.some(i => !i.laboratorio_id)) { alert("Selecione o laboratório de todos os itens."); return; }
    setLoading(true);
    try {
      const pedido = await sb("pedidos", { method: "POST", body: JSON.stringify({ farmacia_id: farmaciaId, urgencia, tipo_pedido: tipoPedido, observacao }) });
      const pedidoId = pedido[0].id;

      for (const item of itens) {
        let produtoId = null;
        try {
          const prods = await sb(`produtos?nome=ilike.${encodeURIComponent(item.nome)}&limit=1`);
          if (prods.length > 0) produtoId = prods[0].id;
        } catch {}

        const lab = laboratorios.find(l => l.id === item.laboratorio_id);
        await sb("pedido_itens", { method: "POST", body: JSON.stringify({ pedido_id: pedidoId, produto_id: produtoId, nome_produto: item.nome.toUpperCase(), categoria: item.categoria, laboratorio_id: item.laboratorio_id || null, nome_laboratorio: lab?.nome || null, quantidade: item.quantidade, unidade_medida: item.unidade || "unidade", motivo: item.motivo }) });
      }

      await sb("logs", { method: "POST", body: JSON.stringify({ farmacia_id: farmaciaId, pedido_id: pedidoId, acao: "Pedido criado", detalhes: `${itens.length} itens` }) });
      onEnviado();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    setLoading(false);
  };

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <Select label="Urgência do Pedido" value={urgencia} onChange={setUrgencia} options={[{ value: "normal", label: "Normal" }, { value: "urgente", label: "Urgente" }, { value: "critico", label: "Crítico" }]} />
        <Select label="Tipo do Pedido" value={tipoPedido} onChange={setTipoPedido} options={tipoPedidoOptions} />
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>Observação (opcional)</label>
          <textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Alguma observação geral sobre o pedido..." rows={2} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
        </div>
      </Card>

      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.preto }}>Itens do Pedido</h3>

      {labOpen !== null && <div onClick={() => setLabOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 150 }} />}

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
            <Select label="Categoria" value={item.categoria} onChange={v => editItem(i, "categoria", v)} options={categoriaOptions} />
            <div style={{ position: "relative", marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>Laboratório<span style={{ color: C.vermelho }}> *</span></label>
              <div
                ref={el => { labRefs.current[i] = el; }}
                onClick={() => {
                  const next = labOpen === i ? null : i;
                  if (next !== null) {
                    const el = labRefs.current[i];
                    if (el) {
                      const rect = el.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      const spaceAbove = rect.top;
                      setLabDirection(prev => ({ ...prev, [i]: spaceBelow < 260 && spaceAbove > spaceBelow ? "up" : "down" }));
                    }
                  }
                  setLabOpen(next);
                  setLabSearch(prev => ({ ...prev, [i]: "" }));
                }}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, color: item.laboratorio_id ? C.preto : C.cinzaT, background: C.branco, boxSizing: "border-box", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "inherit" }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {laboratorios.find(l => l.id === item.laboratorio_id)?.nome || "Selecione..."}
                </span>
                <Icon name="filtro" size={13} color={C.cinzaT} />
              </div>
              {labOpen === i && (
                <div style={{ position: "absolute", ...(labDirection[i] === "up" ? { bottom: "calc(100% + 2px)" } : { top: "calc(100% + 2px)" }), left: 0, right: 0, background: C.branco, border: `1.5px solid ${C.cinzaD}`, borderRadius: 10, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column", maxHeight: 240 }}>
                  <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.cinzaE}`, flexShrink: 0 }}>
                    <input
                      autoFocus
                      value={labSearch[i] || ""}
                      onChange={e => setLabSearch(prev => ({ ...prev, [i]: e.target.value }))}
                      onClick={e => e.stopPropagation()}
                      placeholder="Buscar laboratório..."
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ overflowY: "auto", flex: 1 }}>
                    {laboratorios
                      .filter(l => !labSearch[i] || l.nome.toLowerCase().includes((labSearch[i] || "").toLowerCase()))
                      .map(l => (
                        <div
                          key={l.id}
                          onClick={() => { editItem(i, "laboratorio_id", l.id); setLabOpen(null); }}
                          style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: C.preto, background: item.laboratorio_id === l.id ? C.azul + "18" : "transparent", fontWeight: item.laboratorio_id === l.id ? 700 : 400, borderBottom: `1px solid ${C.cinzaE}` }}
                        >
                          {l.nome}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12 }}>
              <Input label="Quantidade" value={item.quantidade} onChange={v => editItem(i, "quantidade", parseInt(v) || 1)} type="number" />
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.cinzaP, marginBottom: 6 }}>Caixa ou Unidade</label>
                <Segmented options={unidadeOptions} value={item.unidade || "unidade"} onChange={v => editItem(i, "unidade", v)} />
              </div>
              <div style={{ gridColumn: isMobile ? "1 / -1" : "auto" }}>
                <Select label="Motivo" value={item.motivo} onChange={v => editItem(i, "motivo", v)} options={[{ value: "esgotou", label: "Esgotou" }, { value: "venceu", label: "Venceu" }, { value: "nunca_tivemos", label: "Nunca tivemos" }, { value: "outro", label: "Outro" }]} />
              </div>
            </div>
          </div>
        </Card>
      ))}

      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        <Btn onClick={addItem} outline cor={C.azul}><Icon name="mais" size={16} color={C.azul} /> Adicionar Item</Btn>
        <Btn onClick={limparRascunho} outline cor={C.vermelho}>Limpar rascunho</Btn>
        <Btn onClick={salvar} disabled={loading} cor={C.azul}>{loading ? "Enviando..." : "Enviar Pedido"}</Btn>
      </div>
    </div>
  );
};

// =============================================
// PEDIDOS DA FARMÁCIA
// =============================================
const MeusPedidos = ({ farmaciaId, onRepetir }) => {
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSel, setPedidoSel] = useState(null);
  const [itens, setItens] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingItens, setLoadingItens] = useState(false);
  const [repetindo, setRepetindo] = useState(null);

  useEffect(() => {
    sb(`pedidos?farmacia_id=eq.${farmaciaId}&order=criado_em.desc`).then(d => { setPedidos(d); setLoading(false); });
  }, [farmaciaId]);

  const abrirPedido = async (p) => {
    setPedidoSel(p);
    setItens([]); setComentarios([]);
    setLoadingItens(true);
    const [it, co] = await Promise.all([
      sb(`pedido_itens?pedido_id=eq.${p.id}&order=criado_em.asc`),
      sb(`comentarios?pedido_id=eq.${p.id}&order=criado_em.asc`),
    ]);
    setItens(it); setComentarios(co);
    setLoadingItens(false);
  };

  const enviarComentario = async () => {
    if (!novoComentario.trim()) return;
    await sb("comentarios", { method: "POST", body: JSON.stringify({ pedido_id: pedidoSel.id, autor: "farmacia", mensagem: novoComentario }) });
    setNovoComentario("");
    const co = await sb(`comentarios?pedido_id=eq.${pedidoSel.id}&order=criado_em.asc`);
    setComentarios(co);
  };

  const confirmarRecebimento = async () => {
    const entregueEm = new Date().toISOString();
    await sb(`pedidos?id=eq.${pedidoSel.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ status: "entregue", entregue_em: entregueEm }) });
    setPedidoSel({ ...pedidoSel, status: "entregue", entregue_em: entregueEm });
    setPedidos(pedidos.map(p => p.id === pedidoSel.id ? { ...p, status: "entregue", entregue_em: entregueEm } : p));
  };

  const QUINZE_DIAS_MS = 15 * 24 * 60 * 60 * 1000;
  // Regra dos 15 dias baseada na data do pedido: na prática a maioria dos pedidos nunca
  // é marcada como "entregue" (status fica em pendente/em_andamento), então basear a
  // regra no status escondia "Repetir Pedido" em quase todos os pedidos recentes.
  const podeRepetir = (p) => (Date.now() - new Date(p.criado_em).getTime()) <= QUINZE_DIAS_MS;

  const repetirPedido = async (p, e) => {
    e.stopPropagation();
    setRepetindo(p.id);
    try {
      const it = await sb(`pedido_itens?pedido_id=eq.${p.id}&order=criado_em.asc`);
      if (!it.length) {
        alert("Este pedido não possui itens para repetir.");
      } else {
        onRepetir(it.map(item => ({
          nome: item.nome_produto,
          categoria: item.categoria,
          laboratorio_id: item.laboratorio_id || "",
          quantidade: item.quantidade,
          // Mantém caixa/unidade do pedido original quando registrado; pedidos antigos sem
          // essa informação caem no padrão "unidade" apenas como valor inicial editável do
          // formulário — o usuário revisa e pode ajustar antes de reenviar.
          unidade: item.unidade_medida || "unidade",
          motivo: item.motivo || "esgotou",
        })));
      }
    } catch (e) { alert("Erro ao carregar itens do pedido: " + e.message); }
    setRepetindo(null);
  };

  if (loading) return <p style={{ color: C.cinzaT }}>Carregando pedidos...</p>;

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Meus Pedidos</h2>
      <p style={{ margin: "0 0 28px", color: C.cinzaT, fontSize: 14 }}>{pedidos.length} pedidos realizados</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pedidos.length === 0 ? <Card><p style={{ color: C.cinzaT, textAlign: "center", margin: 0 }}>Você ainda não fez nenhum pedido.</p></Card> :
          pedidos.map(p => (
            <Card key={p.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => abrirPedido(p)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, background: statusCor[p.status] + "20", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="pedidos" size={20} color={statusCor[p.status]} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.preto }}>Pedido #{p.id.slice(0, 8).toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: C.cinzaT }}>{new Date(p.criado_em).toLocaleString("pt-BR")}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge label={urgenciaLabel[p.urgencia]} cor={urgenciaCor[p.urgencia]} />
                  {p.liberado_deposito === false && <Badge label="Em conferência no Depósito" cor={C.laranja} />}
                  <Badge label={statusLabel[p.status]} cor={statusCor[p.status]} />
                  <BtnIcon icon="olho" cor={C.azulClaro} title="Ver pedido" onClick={e => { e.stopPropagation(); abrirPedido(p); }} />
                </div>
              </div>
              {podeRepetir(p) && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.cinzaE}` }}>
                  <Btn onClick={e => repetirPedido(p, e)} outline cor={C.azul} small disabled={repetindo === p.id}>
                    <Icon name="repetir" size={14} color={C.azul} /> {repetindo === p.id ? "Carregando..." : "Repetir Pedido"}
                  </Btn>
                </div>
              )}
            </Card>
          ))
        }
      </div>

      {pedidoSel && (
        <Modal title={`Pedido #${pedidoSel.id.slice(0, 8).toUpperCase()}`} onClose={() => setPedidoSel(null)} width={600}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <Badge label={urgenciaLabel[pedidoSel.urgencia]} cor={urgenciaCor[pedidoSel.urgencia]} />
            {pedidoSel.liberado_deposito === false && <Badge label="Em conferência no Depósito" cor={C.laranja} />}
            <Badge label={statusLabel[pedidoSel.status]} cor={statusCor[pedidoSel.status]} />
          </div>

          {pedidoSel.status !== "entregue" && (
            <div style={{ marginBottom: 20 }}>
              <Btn onClick={confirmarRecebimento} cor={C.verde} full><Icon name="check" size={16} color={C.branco} /> Confirmar Recebimento</Btn>
            </div>
          )}

          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.cinzaT }}>COMENTÁRIOS</h4>
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
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <input value={novoComentario} onChange={e => setNovoComentario(e.target.value)} placeholder="Responder..." onKeyDown={e => e.key === "Enter" && enviarComentario()} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.cinzaD}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <Btn onClick={enviarComentario} cor={C.azul}><Icon name="msg" size={16} /></Btn>
          </div>

          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.cinzaT }}>ITENS DO PEDIDO</h4>
          <div style={{ background: C.cinzaF, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            {loadingItens ? (
              <p style={{ padding: 16, color: C.cinzaT, margin: 0, textAlign: "center" }}>Carregando itens...</p>
            ) : itens.length === 0 ? (
              <p style={{ padding: 16, color: C.cinzaT, margin: 0, textAlign: "center" }}>Nenhum item encontrado.</p>
            ) : itens.map((item, i) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < itens.length - 1 ? `1px solid ${C.cinzaE}` : "none" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.preto }}>{item.nome_produto}</div>
                  <div style={{ fontSize: 12, color: C.cinzaT, marginTop: 2 }}>
                    {item.nome_laboratorio ? `🏭 ${item.nome_laboratorio}` : "Sem laboratório"}
                    {" • "}
                    {categoriaLabel[item.categoria] || item.categoria}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge label={categoriaLabel[item.categoria] || item.categoria} cor={categoriaCor[item.categoria] || C.cinzaT} />
                  <QtdUnidade quantidade={item.quantidade} unidade={item.unidade_medida} />
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

// =============================================
// MANUTENÇÃO (farmácia)
// =============================================
const ManutencaoFarmacia = ({ farmaciaId }) => {
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
// Mediana simples — usada para reduzir a distorção de pedidos muito fora do padrão.
const mediana = (valores) => {
  const s = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(s.length / 2);
  return s.length % 2 ? s[meio] : (s[meio - 1] + s[meio]) / 2;
};

// Períodos disponíveis para a previsão. Cada um retorna o intervalo de datas exato
// considerado (mostrado na tela e no PDF) e o número de dias usado para escalar o
// consumo diário — nunca um rótulo trocado sobre o mesmo número.
const periodoPrevisaoOptions = [
  { value: "15dias", label: "Próximos 15 dias" },
  { value: "estemes", label: "Este mês" },
  { value: "proximomes", label: "Próximo mês" },
];
const calcularPeriodoPrevisao = (periodo, base = new Date()) => {
  const hoje = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (periodo === "estemes") {
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const dias = Math.max(1, Math.round((fim - hoje) / 86400000) + 1);
    return { inicio: hoje, fim, dias, label: "Este mês" };
  }
  if (periodo === "proximomes") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
    const dias = Math.round((fim - inicio) / 86400000) + 1;
    return { inicio, fim, dias, label: "Próximo mês" };
  }
  const fim = new Date(hoje); fim.setDate(fim.getDate() + 15);
  return { inicio: hoje, fim, dias: 15, label: "Próximos 15 dias" };
};

// Calcula a previsão de pedido a partir do histórico real de pedido_itens de uma farmácia,
// projetada para o horizonte de "diasHorizonte" dias escolhido pelo usuário.
// Não gera nenhum número aleatório: tudo vem de quantidades e datas já registradas no sistema.
const calcularPrevisao = (itens, diasHorizonte) => {
  const grupos = {};
  itens.forEach(item => {
    const chave = item.nome_produto;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(item);
  });

  const resultado = Object.entries(grupos).map(([nome, ocorrencias]) => {
    const ordenadas = [...ocorrencias].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    const maisRecente = ordenadas[0];
    const maisAntiga = ordenadas[ordenadas.length - 1];
    const numOcorrencias = ordenadas.length;

    const intervaloMedioDias = numOcorrencias >= 2
      ? (new Date(maisRecente.criado_em) - new Date(maisAntiga.criado_em)) / (numOcorrencias - 1) / 86400000
      : null;
    const diasDesdeUltimoPedido = (Date.now() - new Date(maisRecente.criado_em).getTime()) / 86400000;
    // > 1 = já passou do intervalo médio esperado entre pedidos (provável repedido)
    const urgenciaRepedido = intervaloMedioDias ? diasDesdeUltimoPedido / intervaloMedioDias : null;

    // Mediana das últimas até 6 quantidades pedidas: robusta a pedidos muito fora do padrão.
    const ultimasQtds = ordenadas.slice(0, 6).map(o => o.quantidade);
    const medianaQtd = mediana(ultimasQtds);

    // Taxa de consumo diário real: quantidade típica pedida dividida pelo intervalo médio
    // real entre pedidos dessa farmácia para esse produto. É isso que permite escalar a
    // previsão para o horizonte escolhido (15 dias / mês) em vez de repetir sempre o mesmo
    // número. Só existe quando há pelo menos 2 pedidos — com 1 único pedido não há
    // intervalo real observado, e a previsão não inventa uma taxa de consumo.
    const consumoDiario = intervaloMedioDias && intervaloMedioDias > 0 ? medianaQtd / intervaloMedioDias : null;
    const temHistoricoSuficiente = consumoDiario != null;
    const previsaoQuantidade = temHistoricoSuficiente
      ? Math.max(0, Math.round(consumoDiario * diasHorizonte))
      : Math.round(medianaQtd);

    return {
      nome,
      categoria: maisRecente.categoria,
      laboratorioId: maisRecente.laboratorio_id,
      laboratorioNome: maisRecente.nome_laboratorio,
      numOcorrencias,
      ultimaQuantidade: maisRecente.quantidade,
      ultimaData: maisRecente.criado_em,
      intervaloMedioDias,
      diasDesdeUltimoPedido,
      urgenciaRepedido,
      consumoDiario,
      temHistoricoSuficiente,
      previsaoQuantidade,
    };
  });

  const comHistoricoRegular = resultado.filter(r => r.urgenciaRepedido != null).sort((a, b) => b.urgenciaRepedido - a.urgenciaRepedido);
  const semHistoricoRegular = resultado.filter(r => r.urgenciaRepedido == null).sort((a, b) => new Date(b.ultimaData) - new Date(a.ultimaData));
  return [...comHistoricoRegular, ...semHistoricoRegular];
};

const Previsao = ({ farmaciaId, isDono, farmacias, laboratorios }) => {
  const [farmaciaSel, setFarmaciaSel] = useState(isDono ? "" : farmaciaId);
  const [laboratorioSel, setLaboratorioSel] = useState("");
  const [secaoSel, setSecaoSel] = useState("");
  const [periodoPrevisao, setPeriodoPrevisao] = useState("15dias");
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfHtml, setPdfHtml] = useState(null);

  const farmaciaAtivaId = isDono ? farmaciaSel : farmaciaId;
  const farmaciaAtiva = farmacias.find(f => f.id === farmaciaAtivaId);
  const laboratorioAtivo = laboratorioSel ? laboratorios.find(l => l.id === laboratorioSel) : null;
  const periodoInfo = calcularPeriodoPrevisao(periodoPrevisao);
  const formatarDataCurta = (d) => d.toLocaleDateString("pt-BR");

  useEffect(() => {
    if (!farmaciaAtivaId) { setDados([]); return; }
    const carregarPrevisao = async () => {
      setLoading(true);
      try {
        let query = `pedido_itens?select=nome_produto,categoria,laboratorio_id,nome_laboratorio,quantidade,criado_em,pedidos!inner(farmacia_id)&pedidos.farmacia_id=eq.${farmaciaAtivaId}&order=criado_em.desc&limit=3000`;
        if (laboratorioSel) query += `&laboratorio_id=eq.${laboratorioSel}`;
        if (secaoSel) query += `&categoria=eq.${secaoSel}`;
        const itens = await sb(query);
        const { dias } = calcularPeriodoPrevisao(periodoPrevisao);
        setDados(calcularPrevisao(itens, dias));
      } catch (e) {
        console.error(e);
        setDados([]);
      }
      setLoading(false);
    };
    carregarPrevisao();
  }, [farmaciaAtivaId, laboratorioSel, secaoSel, periodoPrevisao]);

  const gerarPDFPrevisao = () => {
    if (!farmaciaAtiva || !dados.length) return;
    const dataStr = new Date().toLocaleDateString("pt-BR");
    const horaStr = new Date().toLocaleString("pt-BR");
    const filtrosAplicados = [
      laboratorioAtivo ? `Laboratório: ${laboratorioAtivo.nome}` : null,
      secaoSel ? `Seção: ${categoriaLabel[secaoSel] || secaoSel}` : null,
    ].filter(Boolean).join(" · ");

    const linhas = dados.map((d, i) => `<tr>
        <td>${i + 1}</td>
        <td><strong>${escHtml(d.nome)}</strong></td>
        <td>${escHtml(categoriaLabel[d.categoria] || d.categoria || "—")}</td>
        <td>${escHtml(d.laboratorioNome || "—")}</td>
        <td style="text-align:center">${d.numOcorrencias}</td>
        <td style="text-align:center">${d.intervaloMedioDias ? Math.round(d.intervaloMedioDias) + "d" : "—"}</td>
        <td style="text-align:center;font-weight:700;color:#1A3A8F">${d.previsaoQuantidade}${d.temHistoricoSuficiente ? "" : "*"}</td>
      </tr>`).join("");

    const inicioStr = formatarDataCurta(periodoInfo.inicio);
    const fimStr = formatarDataCurta(periodoInfo.fim);
    const temItemSemHistorico = dados.some(d => !d.temHistoricoSuficiente);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Previsão de Demanda — ${escHtml(farmaciaAtiva.nome)} — ${dataStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; padding: 40px; color: #0F172A; font-size: 13px; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 3px solid #1A3A8F; }
    .header img { width: 180px; height: auto; }
    .header-right { text-align: right; }
    .tag { display: inline-block; background: #F5A800; color: #1A3A8F; font-weight: 800; font-size: 11px; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 20px; margin-bottom: 6px; }
    .farm-name { font-size: 20px; font-weight: 800; color: #1A3A8F; margin-bottom: 4px; }
    .date { color: #6B7A99; font-size: 12px; }
    .periodo { color: #1A3A8F; font-size: 13px; font-weight: 700; margin-top: 4px; }
    .aviso { background: #FFF7E6; border: 1px solid #F5A800; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #7A5300; }
    .filtros { color: #6B7A99; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1A3A8F; color: #FFFFFF; }
    th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    td { padding: 10px 14px; border-bottom: 1px solid #E8ECF4; }
    tr:nth-child(even) td { background: #F4F6FA; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .footer { margin-top: 40px; font-size: 10px; color: #6B7A99; text-align: center; border-top: 1px solid #E8ECF4; padding-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://i.postimg.cc/pVwVTC9j/LOGO-VERTICALL-EM-PNG.png" alt="Hiperafarma" onerror="this.style.display='none'">
    <div class="header-right">
      <div class="tag">PREVISÃO DE DEMANDA</div>
      <div class="farm-name">Farmácia: ${escHtml(farmaciaAtiva.nome)}</div>
      <div class="date">Gerado em: ${dataStr}</div>
      <div class="periodo">Período previsto: ${escHtml(periodoInfo.label)}</div>
      <div class="date">De: ${inicioStr} — Até: ${fimStr}</div>
    </div>
  </div>
  <div class="aviso">⚠️ Este documento é uma <strong>previsão</strong> calculada a partir do histórico de pedidos da farmácia — não é um pedido confirmado.</div>
  ${filtrosAplicados ? `<div class="filtros">Filtros aplicados: ${escHtml(filtrosAplicados)}</div>` : ""}
  <table>
    <thead><tr><th>#</th><th>Produto</th><th>Seção</th><th>Laboratório</th><th>Nº pedidos</th><th>Intervalo médio</th><th>Previsão (${periodoInfo.dias}d)</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  ${temItemSemHistorico ? `<div class="filtros">* Histórico com apenas 1 pedido registrado — sem intervalo real para projetar por período; mostra a última quantidade pedida.</div>` : ""}
  <div class="footer">Hiperafarma Drogarias — Gerado em ${horaStr} — Documento de uso interno, sujeito a revisão manual</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    setPdfHtml(html);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: C.preto }}>Previsão de Pedido</h2>
          <p style={{ margin: 0, color: C.cinzaT, fontSize: 14 }}>Baseada no histórico real de solicitações da farmácia</p>
        </div>
        <Btn onClick={gerarPDFPrevisao} cor={C.vermelho} disabled={!farmaciaAtivaId || !dados.length}>
          <Icon name="pdf" size={16} color={C.branco} /> Gerar PDF da Previsão
        </Btn>
      </div>

      <Card style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          {isDono && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>FARMÁCIA</label>
              <select value={farmaciaSel} onChange={e => setFarmaciaSel(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 13, fontFamily: "inherit", background: C.branco }}>
                <option value="">Selecione uma farmácia...</option>
                {farmacias.filter(f => f.usuario !== "admin" && f.ativa !== false).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>LABORATÓRIO</label>
            <select value={laboratorioSel} onChange={e => setLaboratorioSel(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 13, fontFamily: "inherit", background: C.branco }}>
              <option value="">Todos</option>
              {laboratorios.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>SEÇÃO</label>
            <select value={secaoSel} onChange={e => setSecaoSel(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 13, fontFamily: "inherit", background: C.branco }}>
              <option value="">Todas</option>
              {categoriaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.cinzaT, marginBottom: 6 }}>PERÍODO DA PREVISÃO</label>
            <select value={periodoPrevisao} onChange={e => setPeriodoPrevisao(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.cinzaD}`, fontSize: 13, fontFamily: "inherit", background: C.branco }}>
              {periodoPrevisaoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {(laboratorioSel || secaoSel) && (
            <Btn onClick={() => { setLaboratorioSel(""); setSecaoSel(""); }} outline cor={C.cinzaT} small>Limpar</Btn>
          )}
        </div>
      </Card>

      {farmaciaAtivaId && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.azul + "10", border: `1.5px solid ${C.azul}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, flexWrap: "wrap" }}>
          <Icon name="previsao" size={18} color={C.azul} />
          <div style={{ fontSize: 13, color: C.azul }}>
            <strong>Previsão: {periodoInfo.label}</strong> · {formatarDataCurta(periodoInfo.inicio)} até {formatarDataCurta(periodoInfo.fim)} ({periodoInfo.dias} dias)
          </div>
        </div>
      )}

      {!farmaciaAtivaId ? (
        <Card><p style={{ color: C.cinzaT, textAlign: "center", margin: 0 }}>Selecione uma farmácia para calcular a previsão de pedido.</p></Card>
      ) : loading ? (
        <p style={{ color: C.cinzaT }}>Calculando previsão...</p>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {dados.length === 0 ? (
            <p style={{ color: C.cinzaT, textAlign: "center", padding: 24 }}>Histórico insuficiente para gerar previsão com os filtros atuais.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ background: C.cinzaF }}>
                    <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.cinzaT, textTransform: "uppercase" }}>Produto</th>
                    <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.cinzaT, textTransform: "uppercase" }}>Seção</th>
                    <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.cinzaT, textTransform: "uppercase" }}>Laboratório</th>
                    <th style={{ textAlign: "center", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.cinzaT, textTransform: "uppercase" }}>Nº pedidos</th>
                    <th style={{ textAlign: "center", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.cinzaT, textTransform: "uppercase" }}>Intervalo médio</th>
                    <th style={{ textAlign: "center", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: C.azul, textTransform: "uppercase" }}>Previsão ({periodoInfo.dias}d)</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d, i) => (
                    <tr key={d.nome} style={{ borderBottom: `1px solid ${C.cinzaE}`, background: i % 2 ? C.cinzaF : C.branco }}>
                      <td style={{ padding: "10px 16px", fontWeight: 600, fontSize: 13, color: C.preto }}>{d.nome}</td>
                      <td style={{ padding: "10px 16px" }}><Badge label={categoriaLabel[d.categoria] || d.categoria || "—"} cor={categoriaCor[d.categoria] || C.cinzaT} /></td>
                      <td style={{ padding: "10px 16px", fontSize: 13, color: C.cinzaP }}>{d.laboratorioNome || "—"}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center", fontSize: 13, color: C.cinzaP }}>{d.numOcorrencias}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center", fontSize: 13, color: C.cinzaP }}>{d.intervaloMedioDias ? `${Math.round(d.intervaloMedioDias)}d` : "—"}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: C.azul, background: C.azul + "15", padding: "4px 12px", borderRadius: 8 }}>{d.previsaoQuantidade} un.</span>
                        {!d.temHistoricoSuficiente && (
                          <div style={{ fontSize: 10, color: C.cinzaT, marginTop: 3 }}>histórico único</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {pdfHtml && <PdfViewerOverlay html={pdfHtml} onClose={() => setPdfHtml(null)} />}
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
    await sb(`manutencoes?id=eq.${id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ status }) });
    setManutencoes(manutencoes.map(m => m.id === id ? { ...m, status } : m));
  };

  const excluirManutencao = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este chamado?")) return;
    try {
      await sb(`manutencoes?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
      setManutencoes(manutencoes.filter(m => m.id !== id));
    } catch (e) { alert("Erro ao excluir: " + e.message); }
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
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {m.status === "aberto" && <Btn onClick={() => atualizarStatus(m.id, "em_andamento")} cor={C.azulClaro} small>Em andamento</Btn>}
                        {m.status !== "resolvido" && <Btn onClick={() => atualizarStatus(m.id, "resolvido")} cor={C.verde} small>Resolver</Btn>}
                        <BtnIcon icon="lixeira" cor={C.vermelho} title="Excluir chamado" onClick={() => excluirManutencao(m.id)} />
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
  const [verificando, setVerificando] = useState(true);
  const [pedidos, setPedidos] = useState([]);
  const [farmacias, setFarmacias] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [itensRepetir, setItensRepetir] = useState(null);

  const repetirPedido = (itensForm) => {
    setItensRepetir(itensForm);
    setAtivo("nova-solicitacao");
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const verificarSessao = async () => {
      try {
        const salvo = localStorage.getItem("hiperafarma_usuario");
        if (salvo) {
          const u = JSON.parse(salvo);
          const dados = await sb(`farmacias?id=eq.${u.id}&ativa=eq.true`);
          if (dados.length > 0) {
            setUsuario(u);
            setAtivo(u.isDono ? "dashboard" : "meus-pedidos");
          } else {
            localStorage.removeItem("hiperafarma_usuario");
          }
        }
      } catch {
        localStorage.removeItem("hiperafarma_usuario");
      }
      setVerificando(false);
    };
    verificarSessao();
  }, []);

  const fazerLogin = (u) => {
    localStorage.setItem("hiperafarma_usuario", JSON.stringify(u));
    setUsuario(u);
    setAtivo(u.isDono ? "dashboard" : "meus-pedidos");
  };

  const fazerLogout = () => {
    localStorage.removeItem("hiperafarma_usuario");
    setUsuario(null);
  };

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

  if (verificando) return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.azul} 0%, ${C.azulClaro} 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.branco, fontSize: 16, fontWeight: 600 }}>Carregando...</div>
    </div>
  );
  if (!usuario) return <Login onLogin={fazerLogin} />;

  const stats = {
    pendentes: pedidos.filter(p => p.status === "pendente").length,
    urgentes: pedidos.filter(p => p.urgencia === "urgente" || p.urgencia === "critico").length,
    manutencoes: manutencoes.length,
    farmacias: farmacias.filter(f => f.usuario !== "admin").length,
    hoje: pedidos.filter(p => new Date(p.criado_em).toDateString() === new Date().toDateString()).length,
  };
  const aguardandoDeposito = pedidos.filter(p => p.liberado_deposito === false).length;

  const renderConteudo = () => {
    if (usuario.isDono) {
      switch (ativo) {
        case "dashboard": return <Dashboard stats={stats} pedidos={pedidos} manutencoes={manutencoes} farmacias={farmacias} aguardandoDeposito={aguardandoDeposito} onIrDeposito={() => setAtivo("deposito")} />;
        case "pedidos": return <PedidosDono pedidos={pedidos} farmacias={farmacias} laboratorios={laboratorios} onAtualizar={carregarDados} />;
        case "deposito": return <Deposito pedidos={pedidos} farmacias={farmacias} onAtualizar={carregarDados} />;
        case "manutencoes": return <ManutencoesDono farmacias={farmacias} />;
        case "farmacias": return <GerenciarFarmacias farmacias={farmacias} onAtualizar={carregarDados} />;
        case "laboratorios": return <GerenciarLaboratorios laboratorios={laboratorios} onAtualizar={carregarDados} />;
        case "previsao": return <Previsao isDono={true} farmacias={farmacias} laboratorios={laboratorios} />;
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
        case "meus-pedidos": return <MeusPedidos farmaciaId={usuario.id} onRepetir={repetirPedido} />;
        case "nova-solicitacao": return <SolicitacoesTabs farmaciaId={usuario.id} laboratorios={laboratorios} itensIniciais={itensRepetir} onConsumirItensIniciais={() => setItensRepetir(null)} onSalvo={() => { setAtivo("meus-pedidos"); carregarDados(); }} />;
        case "manutencao-farm": return <ManutencaoFarmacia farmaciaId={usuario.id} />;
        case "previsao-farm": return <Previsao farmaciaId={usuario.id} isDono={false} farmacias={farmacias} laboratorios={laboratorios} />;
        default: return null;
      }
    }
  };

  return (
    <MobileCtx.Provider value={isMobile}>
      <div style={{ display: "flex", minHeight: "100vh", background: C.cinzaF, fontFamily: "'Inter', sans-serif" }}>
        {isMobile && <TopBar onMenuOpen={() => setSidebarOpen(true)} />}
        <Sidebar
          ativo={ativo} setAtivo={setAtivo} isDono={usuario.isDono}
          farmacia={usuario} onSair={fazerLogout}
          isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
          aguardandoDeposito={usuario.isDono ? aguardandoDeposito : 0}
        />
        <main style={{
          flex: 1,
          padding: isMobile ? "16px 12px" : 32,
          overflowY: "auto",
          marginTop: isMobile ? 56 : 0,
          paddingBottom: isMobile ? 76 : 32,
          minWidth: 0,
        }}>
          {carregando && !pedidos.length ? <p style={{ color: C.cinzaT }}>Carregando...</p> : renderConteudo()}
        </main>
        {isMobile && <BottomNav ativo={ativo} setAtivo={setAtivo} isDono={usuario.isDono} />}
      </div>
    </MobileCtx.Provider>
  );
}
