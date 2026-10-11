// ─── FUSO HORÁRIO (Brasil, sem horário de verão desde 2019) ───────────────
function agoraBr() {
  // Pega o instante atual em UTC e aplica o offset fixo de -03:00.
  const agoraUtc = new Date(new Date().toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(agoraUtc.getTime() - 3 * 60 * 60 * 1000);
}
function hojeBr() {
  const d = agoraBr();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dataISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function parseISO(s) {
  // "YYYY-MM-DD" -> Date local (evita bug de fuso do new Date("YYYY-MM-DD"))
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function fmtDataBR(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── HASH DE SENHA (SHA-256, equivalente ao hashlib.sha256 do Python) ─────
async function hashPw(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── FORMATAÇÃO DE MOEDA ────────────────────────────────────────────────
function fmtBRL(v) {
  const n = Math.abs(v || 0);
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtBRLInt(v) {
  const n = Math.abs(v || 0);
  return 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

// ─── BADGES ────────────────────────────────────────────────────────────
function badgeClasse(cls) {
  const mapa = {
    "Alimentação":"aliment","Transporte":"transport","Moradia":"moradia",
    "Saúde":"saude","Lazer":"lazer","Educação":"educacao",
    "Serviços":"servicos","Receita":"receita","Vestuário":"outros","Outros":"outros"
  };
  const key = mapa[cls] || "outros";
  return `<span class="badge badge-${key}">${escapeHtml(cls)}</span>`;
}
function badgeTipo(tipo) {
  if (tipo === "Receita")  return '<span class="badge badge-receita">Receita</span>';
  if (tipo === "Fixo")     return '<span class="badge badge-fixo">Fixo</span>';
  if (tipo === "Variável") return '<span class="badge badge-variavel">Variável</span>';
  return '<span class="badge badge-fixo">Despesa</span>';
}
const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão"];
function badgePagamento(forma) {
  const cls = { "Pix": "pix", "Dinheiro": "dinheiro", "Cartão": "cartao" }[forma] || "cartao";
  return `<span class="badge badge-${cls}">${escapeHtml(forma)}</span>`;
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ─── CATEGORIAS / DESCRIÇÕES PADRÃO ─────────────────────────────────────
const DESPESAS_PADRAO_BRUTO = [
  ["Casa", ["Aluguel","Financiamento","Condomínio","IPTU","Energia elétrica","Água","Gás","Internet","Telefone","Manutenção","Móveis","Eletrodomésticos","Material de limpeza","Seguro residencial","Decoração"]],
  ["Mercado", ["Alimentação","Bebidas","Higiene pessoal","Produtos de limpeza","Ração para pets","Descartáveis"]],
  ["Carro", ["Combustível","Seguro","IPVA","Licenciamento","Manutenção","Troca de óleo","Pneus","Lavagem","Estacionamento","Pedágio","Multas","Financiamento","Acessórios"]],
  ["Moto", ["Combustível","Seguro","IPVA","Licenciamento","Manutenção","Troca de óleo","Pneus","Lavagem","Estacionamento","Multas","Financiamento","Capacete e equipamentos"]],
  ["Saúde", ["Plano de saúde","Consultas","Exames","Medicamentos","Odontologia","Óculos/Lentes","Terapias","Vacinas"]],
  ["Educação", ["Mensalidade","Cursos","Livros","Material escolar","Transporte","Certificações"]],
  ["Lazer", ["Cinema","Streaming","Viagens","Hotéis","Passeios","Bares","Restaurantes","Eventos","Jogos","Hobbies"]],
  ["Presentes", ["Aniversário","Casamento","Natal","Dia das Mães","Dia dos Pais","Outros presentes"]],
  ["Investimentos", ["Reserva de emergência","Tesouro","CDB","LCI/LCA","Ações","FIIs","ETFs","Criptomoedas","Previdência privada"]],
  ["Pets", ["Veterinário","Ração","Banho e tosa","Medicamentos","Brinquedos","Vacinas"]],
  ["Roupas", ["Roupas","Calçados","Acessórios","Lavanderia"]],
  ["Impostos", ["IR","Taxas","Contabilidade"]],
  ["Trabalho", ["Ferramentas","Equipamentos","Software","Cursos","Deslocamento"]],
  ["Tecnologia", ["Celular","Computador","Periféricos","Aplicativos","Armazenamento em nuvem"]],
  ["Assinaturas", ["Música","Vídeo","Academia","Jornais","Softwares"]],
  ["Filhos", ["Escola","Fraldas","Roupas","Brinquedos","Material escolar","Saúde"]],
  ["Doações", ["Instituições","Igreja","Campanhas"]],
  ["Financeiro", ["Tarifas bancárias","Juros","IOF","Anuidade de cartão"]],
];
function despesasPadrao() {
  const out = [];
  for (const [cat, descs] of DESPESAS_PADRAO_BRUTO) for (const d of descs) out.push({ categoria: cat, descricao: d });
  return out;
}
const RECEITAS_PADRAO_BRUTO = [
  ["Trabalho", ["Salário","13º Salário","Férias","Comissão","Bônus","PLR (Participação nos Lucros)","Hora Extra","Adicional Noturno","Vale Alimentação/Refeição"]],
  ["Investimentos", ["Dividendos","Juros sobre Capital Próprio","Rendimento de Poupança","Rendimento de CDB/Tesouro","Aluguel Recebido","Venda de Ações","Venda de Imóvel","Venda de Veículo"]],
  ["Freelance", ["Freelance","Consultoria","Serviços Prestados","Comissão de Vendas"]],
  ["Extras", ["Restituição de Imposto de Renda","Reembolso","Prêmio/Sorteio","Cashback","Venda de Itens Usados"]],
  ["Outros", ["Presente Recebido","Herança","Empréstimo Recebido","Pensão/Auxílio","Renda Extra"]],
];
function receitasPadrao() {
  const out = [];
  for (const [cat, descs] of RECEITAS_PADRAO_BRUTO) for (const d of descs) out.push({ categoria: cat, descricao: d });
  return out;
}

// ─── CLASSIFICAÇÃO AUTOMÁTICA (usada na importação de Excel) ──────────────
const REGRAS = [
  { palavras:["salário","salario","pagamento","freelance","renda","receita","honorário","honorario","pró-labore","prolabore","dividendo"], tipo:"Receita", classe:"Receita" },
  { palavras:["aluguel","condomínio","condominio","iptu","financiamento","prestação casa"], tipo:"Fixo", classe:"Moradia" },
  { palavras:["luz","energia","enel","cpfl","elektro","água","agua","saneamento","sabesp"], tipo:"Fixo", classe:"Moradia" },
  { palavras:["internet","wi-fi","wifi","claro","vivo","tim","oi","net","telefone","celular","mensalidade"], tipo:"Fixo", classe:"Serviços" },
  { palavras:["netflix","amazon prime","disney","hbo","spotify","youtube premium"], tipo:"Fixo", classe:"Lazer" },
  { palavras:["seguro","plano de saúde","plano saude","unimed","amil"], tipo:"Fixo", classe:"Saúde" },
  { palavras:["supermercado","mercado","padaria","açougue","feira","ifood","rappi","delivery","restaurante","lanche","pizza","hamburguer","refeição","refeicao","almoço","almoco","jantar","café","cafe","comida"], tipo:"Variável", classe:"Alimentação" },
  { palavras:["uber","99","taxi","combustível","combustivel","gasolina","etanol","pedágio","pedagio","estacionamento","ônibus","onibus","metrô","metro"], tipo:"Variável", classe:"Transporte" },
  { palavras:["farmácia","farmacia","remédio","remedio","médico","medico","consulta","exame","dentista","hospital","clínica","clinica"], tipo:"Variável", classe:"Saúde" },
  { palavras:["faculdade","escola","curso","mensalidade escola","livro","udemy","alura","coursera"], tipo:"Fixo", classe:"Educação" },
  { palavras:["cinema","teatro","show","ingresso","viagem","hotel","passeio","academia","jogo","game"], tipo:"Variável", classe:"Lazer" },
  { palavras:["roupa","calçado","calcado","sapato","tênis","tenis","camisa","vestido","shopping"], tipo:"Variável", classe:"Vestuário" },
];
function removeAcentos(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function classificar(desc) {
  const d = removeAcentos(desc).toLowerCase();
  for (const r of REGRAS) {
    for (const p of r.palavras) {
      if (d.includes(removeAcentos(p).toLowerCase())) return [r.tipo, r.classe];
    }
  }
  return ["Variável", "Outros"];
}

// ─── UTIL ──────────────────────────────────────────────────────────────
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function qs(sel, root) { return (root || document).querySelector(sel); }
function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
function novoIdLancamento() { return Date.now() + Math.floor(Math.random() * 1000); }
