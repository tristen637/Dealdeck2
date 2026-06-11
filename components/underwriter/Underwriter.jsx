import { useState, useEffect, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const MODEL = "claude-sonnet-4-20250514";
const SCORE_STYLES = {
  "Strong Buy": { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46", icon: "🔥" },
  "Good Deal":  { bg: "#EFF6FF", border: "#93C5FD", text: "#1E40AF", icon: "✅" },
  "Marginal":   { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", icon: "⚠️" },
  "Pass":       { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B", icon: "❌" },
};
const ACCEPTED = ["application/pdf","image/jpeg","image/jpg","image/png","image/webp"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const num = (v) => parseFloat(v) || 0;
const f$ = (v) => (v || v === 0) ? "$" + Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—";
const fPct = (v) => (v || v === 0) ? (Number(v) * 100).toFixed(2) + "%" : "—";
const fX = (v) => (v || v === 0) ? Number(v).toFixed(2) + "x" : "—";

async function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function callAI(prompt, files = []) {
  const content = [{ type: "text", text: prompt }];
  for (const file of files) {
    const data = await toBase64(file);
    if (file.type === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    } else {
      content.push({ type: "image", source: { type: "base64", media_type: file.type, data } });
    }
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error("API error " + res.status);
  const json = await res.json();
  const text = (json.content || []).map((b) => b.text || "").join("");
  const clean = text.replace(/```json|```/g, "").trim();
  // Find JSON object in response
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  return JSON.parse(clean.slice(start, end + 1));
}

// ─── UI Primitives ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
  );
}

function MetricBox({ label, value, sub, color, bg }) {
  return (
    <div style={{ background: bg || "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color || "#111827" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Verdict({ score, text }) {
  const cfg = SCORE_STYLES[score] || { bg: "#F9FAFB", border: "#E5E7EB", text: "#374151", icon: "🤔" };
  return (
    <div style={{ background: cfg.bg, border: "1px solid " + cfg.border, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 16, color: cfg.text, marginBottom: 6 }}>{cfg.icon} {score}</div>
      <div style={{ fontSize: 13, color: cfg.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{text}</div>
    </div>
  );
}

function FileChip({ name, onRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F3F4F6", border: "1px solid #D1D5DB", borderRadius: 8, padding: "4px 8px", fontSize: 12, maxWidth: 180 }}>
      <span>{name.endsWith(".pdf") ? "📄" : "🖼️"}</span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#374151" }}>{name}</span>
      <button onClick={onRemove} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1/-1" : undefined }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #D1D5DB", borderRadius: 8, padding: "9px 11px", fontSize: 14, color: "#111827", background: "#FAFAFA", fontFamily: "inherit" };

function NumInput({ value, onChange, prefix, suffix, placeholder }) {
  return (
    <div style={{ position: "relative" }}>
      {prefix && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 13 }}>{prefix}</span>}
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, paddingLeft: prefix ? 22 : 11, paddingRight: suffix ? 28 : 11 }} />
      {suffix && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 13 }}>{suffix}</span>}
    </div>
  );
}

function AnalyzeBtn({ onClick, loading, label }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: loading ? "#6B7280" : "#111827", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
      {loading ? <><Spinner /> Underwriting…</> : label || "Underwrite This Deal"}
    </button>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────
function Results({ result, onBack, onSave }) {
  const isMF = result.type === "mf";
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer", marginBottom: 10, padding: 0 }}>← Back</button>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{result.address || (isMF ? "Multifamily Deal" : "SFH Deal")}</div>
      <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>{isMF ? result.units + "-unit property" : result.strategy === "flip" ? "Fix & Flip" : "Buy & Hold"}</div>
      <Verdict score={result.dealScore} text={result.verdict} />
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #F3F4F6" }}>Key Metrics</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {isMF ? (
            <>
              <MetricBox label="NOI / Year" value={f$(result.noi)} color={result.noi > 0 ? "#065F46" : "#991B1B"} bg="#ECFDF5" />
              <MetricBox label="Cash Flow / Mo" value={f$(result.cashFlow / 12)} color={result.cashFlow > 0 ? "#065F46" : "#991B1B"} bg={result.cashFlow > 0 ? "#ECFDF5" : "#FEF2F2"} />
              <MetricBox label="Cap Rate" value={fPct(result.capRate)} bg="#EFF6FF" color="#1D4ED8" />
              <MetricBox label="Cash-on-Cash" value={fPct(result.cashOnCash)} bg="#FFFBEB" color="#92400E" />
              <MetricBox label="DSCR" value={fX(result.dscr)} sub={result.dscr >= 1.25 ? "Strong ✓" : result.dscr >= 1.0 ? "Passing" : "Below 1 ⚠️"} />
              <MetricBox label="GRM" value={fX(result.grm)} />
            </>
          ) : (
            <>
              <MetricBox label="Profit" value={f$(result.profit)} color={result.profit > 0 ? "#065F46" : "#991B1B"} bg="#ECFDF5" />
              <MetricBox label="ROI" value={fPct(result.roi)} color={result.roi >= 0.15 ? "#1D4ED8" : "#92400E"} bg="#EFF6FF" />
              <MetricBox label="Max Offer (70%)" value={f$(result.maxOffer70)} bg="#F5F3FF" color="#6D28D9" />
              <MetricBox label="LTV" value={fPct(result.ltv)} bg="#FFFBEB" color="#92400E" />
              <MetricBox label="Equity Spread" value={f$(result.equitySpread)} bg="#ECFDF5" color="#065F46" />
              <MetricBox label="All-In Cost" value={f$(result.totalCost)} bg="#FEF2F2" color="#991B1B" />
            </>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#991B1B", marginBottom: 6 }}>⚠️ Risks</div>
          <div style={{ fontSize: 12, color: "#7F1D1D", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{result.risks}</div>
        </div>
        <div style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#065F46", marginBottom: 6 }}>📈 Upside</div>
          <div style={{ fontSize: 12, color: "#14532D", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{result.upside}</div>
        </div>
      </div>
      {result.suggestion && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#92400E", marginBottom: 4 }}>💡 Negotiation Tip</div>
          <div style={{ fontSize: 13, color: "#78350F", lineHeight: 1.65 }}>{result.suggestion}</div>
        </div>
      )}
      <button onClick={onSave} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: "#10B981", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        ✓ Save to My Deals
      </button>
    </div>
  );
}

// ─── Paste Mode ───────────────────────────────────────────────────────────────
function PasteMode({ onResult, onBack }) {
  const [paste, setPaste] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  function addFiles(incoming) {
    const valid = Array.from(incoming).filter((f) => ACCEPTED.includes(f.type));
    setFiles((prev) => [...prev, ...valid].slice(0, 5));
  }

  async function analyze() {
    if (!paste.trim() && files.length === 0) { setError("Paste some deal info or attach a file first."); return; }
    setError(""); setLoading(true);
    try {
      const prompt = `You are an expert real estate investment underwriter. The user pasted raw deal info below. Determine if it is SFH or Multifamily, extract all numbers, and fully underwrite it.

RAW INFO:
${paste || "(see attached files)"}

Reply with ONLY a JSON object. No explanation, no markdown fences.

For SFH deals use exactly:
{"type":"sfh","strategy":"flip or rental","address":"","purchasePrice":0,"arv":0,"rehabCost":0,"closingCostsBuy":3000,"holdingMonths":6,"holdingCostPerMonth":500,"agentFee":6,"totalCost":0,"profit":0,"roi":0.0,"maxOffer70":0,"ltv":0.0,"equitySpread":0,"holdingTotal":0,"agentCost":0,"closingSell":0,"dealScore":"Good Deal","verdict":"direct 3-5 sentence answer","risks":"- risk 1\n- risk 2\n- risk 3","upside":"- upside 1\n- upside 2\n- upside 3","suggestion":"one negotiation tip"}

For Multifamily deals use exactly:
{"type":"mf","address":"","units":4,"purchasePrice":0,"grossRentMo":0,"grossRentYr":0,"vacancyRate":0.08,"effectiveRent":0,"totalExpenses":0,"noi":0,"capRate":0.0,"grm":0.0,"annualDebt":0,"cashFlow":0,"cashOnCash":0.0,"dscr":0.0,"expenseRatio":0.0,"pricePerUnit":0,"rentPerUnit":0,"downAmt":0,"dealScore":"Good Deal","verdict":"direct 3-5 sentence answer mentioning cap rate and DSCR","risks":"- risk 1\n- risk 2\n- risk 3","upside":"- upside 1\n- upside 2\n- upside 3","suggestion":"one negotiation tip"}

dealScore must be one of: Strong Buy, Good Deal, Marginal, Pass`;

      const result = await callAI(prompt, files);
      onResult(result);
    } catch (e) {
      setError("Analysis failed: " + e.message + ". Please try again.");
    }
    setLoading(false);
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer", marginBottom: 10, padding: 0 }}>← Back</button>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 4 }}>📋 Paste Deal Info</div>
      <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>Paste anything — texts, emails, rent rolls, P&Ls. Works for SFH and multifamily.</div>
      <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={8}
        placeholder={"Examples:\n\n• \"4-unit in Houston, asking $380k, rents $800/unit, taxes $450/mo, insurance $180/mo\"\n\n• \"SFH Dallas — buy $95k, ARV $160k, needs $20k rehab, 3/2\"\n\nOr attach a P&L or rent roll below"}
        style={{ width: "100%", boxSizing: "border-box", border: "1px solid #D1D5DB", borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit", color: "#111827", background: "#FAFAFA", marginBottom: 8 }} />
      <div onClick={() => fileRef.current && fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = "#F0FDF4"; }}
        onDragLeave={(e) => { e.currentTarget.style.background = "#FAFAFA"; }}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); e.currentTarget.style.background = "#FAFAFA"; }}
        style={{ border: "1.5px dashed #D1D5DB", borderRadius: 10, background: "#FAFAFA", padding: 12, textAlign: "center", cursor: "pointer", marginBottom: 8 }}>
        <div style={{ fontSize: 20, marginBottom: 3 }}>📎</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Attach financials, rent roll, or photos</div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>PDF, JPG, PNG · up to 5 files</div>
        <input ref={fileRef} type="file" multiple accept=".pdf,image/*" onChange={(e) => addFiles(e.target.files)} style={{ display: "none" }} />
      </div>
      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {files.map((f, i) => <FileChip key={i} name={f.name} onRemove={() => setFiles((p) => p.filter((_, j) => j !== i))} />)}
        </div>
      )}
      {error && <div style={{ background: "#FEF2F2", color: "#991B1B", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      <AnalyzeBtn onClick={analyze} loading={loading} label={"Underwrite This Deal" + (files.length ? " + " + files.length + " file" + (files.length > 1 ? "s" : "") : "")} />
    </div>
  );
}

// ─── SFH Form ─────────────────────────────────────────────────────────────────
const SFH_DEF = { address: "", purchasePrice: "", arv: "", rehabCost: "", closingCostsBuy: "3000", holdingMonths: "6", holdingCostPerMonth: "500", agentFee: "6", strategy: "flip" };

function SFHForm({ onResult }) {
  const [f, setF] = useState(SFH_DEF);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const purchase = num(f.purchasePrice), arv = num(f.arv), rehab = num(f.rehabCost);
  const closingBuy = num(f.closingCostsBuy), holdMo = num(f.holdingMonths), holdPerMo = num(f.holdingCostPerMonth);
  const agentPct = num(f.agentFee) / 100;
  const agentCost = arv * agentPct, closingSell = arv * 0.01;
  const holdingTotal = holdMo * holdPerMo;
  const totalCost = purchase + rehab + closingBuy + holdingTotal + agentCost + closingSell;
  const profit = arv - totalCost;
  const roi = purchase > 0 ? profit / (purchase + rehab + closingBuy) : 0;
  const maxOffer70 = arv * 0.7 - rehab;
  const ltv = arv > 0 ? purchase / arv : 0;
  const equitySpread = arv - purchase;

  async function analyze() {
    if (!f.purchasePrice || !f.arv) { setError("Enter at least purchase price and ARV."); return; }
    setError(""); setLoading(true);
    try {
      const prompt = `You are a real estate investment underwriter. Analyze this fix-and-flip SFH deal.

DEAL:
- Strategy: ${f.strategy === "flip" ? "Fix & Flip" : "Buy & Hold"}
- Address: ${f.address || "N/A"}
- Purchase: $${purchase.toLocaleString()}
- ARV: $${arv.toLocaleString()}
- Rehab: $${rehab.toLocaleString()}
- Total Cost: $${totalCost.toLocaleString()}
- Profit: $${profit.toLocaleString()}
- ROI: ${(roi * 100).toFixed(1)}%
- Max Offer 70%: $${maxOffer70.toLocaleString()}
- LTV: ${(ltv * 100).toFixed(1)}%
- Equity: $${equitySpread.toLocaleString()}
- Hold: ${holdMo} months

Reply with ONLY this JSON, no markdown:
{"dealScore":"Good Deal","verdict":"direct 3-5 sentence answer","risks":"- risk1\n- risk2\n- risk3","upside":"- up1\n- up2\n- up3","suggestion":"one tip"}

dealScore must be: Strong Buy, Good Deal, Marginal, or Pass`;

      const parsed = await callAI(prompt);
      onResult({ type: "sfh", strategy: f.strategy, address: f.address, purchase, arv, rehab, totalCost, profit, roi, maxOffer70, ltv, equitySpread, holdingTotal, agentCost, closingSell, ...parsed });
    } catch (e) {
      setError("Analysis failed: " + e.message);
    }
    setLoading(false);
  }

  const card = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 16, marginBottom: 12 };
  const section = { fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #F3F4F6" };
  const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 };

  return (
    <div>
      <div style={card}>
        <div style={section}>Strategy</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["flip","🔨 Fix & Flip"],["rental","🏠 Buy & Hold"]].map(([k,l]) => (
            <button key={k} onClick={() => set("strategy")(k)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "2px solid " + (f.strategy === k ? "#10B981" : "#E5E7EB"), background: f.strategy === k ? "#ECFDF5" : "#fff", color: f.strategy === k ? "#065F46" : "#6B7280", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={section}>Property Info</div>
        <div style={grid}>
          <Field label="Address" full><input value={f.address} onChange={(e) => set("address")(e.target.value)} placeholder="123 Main St, Dallas TX" style={{ ...inputStyle, gridColumn: "1/-1" }} /></Field>
          <Field label="Purchase Price"><NumInput value={f.purchasePrice} onChange={set("purchasePrice")} prefix="$" placeholder="85000" /></Field>
          <Field label="ARV"><NumInput value={f.arv} onChange={set("arv")} prefix="$" placeholder="150000" /></Field>
          <Field label="Rehab Cost"><NumInput value={f.rehabCost} onChange={set("rehabCost")} prefix="$" placeholder="25000" /></Field>
          <Field label="Closing Costs (Buy)"><NumInput value={f.closingCostsBuy} onChange={set("closingCostsBuy")} prefix="$" /></Field>
          <Field label="Holding Period"><NumInput value={f.holdingMonths} onChange={set("holdingMonths")} suffix="mo" /></Field>
          <Field label="Holding Cost/Mo"><NumInput value={f.holdingCostPerMonth} onChange={set("holdingCostPerMonth")} prefix="$" /></Field>
          <Field label="Agent Fee"><NumInput value={f.agentFee} onChange={set("agentFee")} suffix="%" /></Field>
        </div>
      </div>
      {purchase > 0 && arv > 0 && (
        <div style={card}>
          <div style={section}>Live Numbers</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <MetricBox label="Profit" value={f$(profit)} color={profit > 0 ? "#065F46" : "#991B1B"} bg={profit > 0 ? "#ECFDF5" : "#FEF2F2"} />
            <MetricBox label="ROI" value={fPct(roi)} color={roi >= 0.15 ? "#1D4ED8" : "#92400E"} bg="#EFF6FF" />
            <MetricBox label="Max Offer (70%)" value={f$(maxOffer70)} bg="#F5F3FF" color="#6D28D9" />
            <MetricBox label="All-In Cost" value={f$(totalCost)} bg="#FEF2F2" color="#991B1B" />
            <MetricBox label="Equity Spread" value={f$(equitySpread)} color="#065F46" bg="#ECFDF5" />
            <MetricBox label="LTV" value={fPct(ltv)} color={ltv <= 0.7 ? "#065F46" : "#92400E"} />
          </div>
        </div>
      )}
      {error && <div style={{ background: "#FEF2F2", color: "#991B1B", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      <AnalyzeBtn onClick={analyze} loading={loading} />
    </div>
  );
}

// ─── Multifamily Form ─────────────────────────────────────────────────────────
const MF_DEF = { address: "", units: "4", purchasePrice: "", grossRent: "", vacancyRate: "8", managementFee: "10", insurance: "200", taxes: "400", repairs: "100", utilities: "0", otherExpenses: "0", downPayment: "25", interestRate: "7.5", loanTerm: "30", closingCosts: "5000" };

function MFForm({ onResult }) {
  const [f, setF] = useState(MF_DEF);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const units = num(f.units), purchase = num(f.purchasePrice), grossRentMo = num(f.grossRent);
  const grossRentYr = grossRentMo * 12, vacRate = num(f.vacancyRate) / 100;
  const effectiveRent = grossRentYr * (1 - vacRate);
  const mgmt = effectiveRent * (num(f.managementFee) / 100);
  const insurance = num(f.insurance) * 12, taxes = num(f.taxes) * 12;
  const repairs = num(f.repairs) * units * 12, utilities = num(f.utilities) * 12, other = num(f.otherExpenses) * 12;
  const totalExpenses = mgmt + insurance + taxes + repairs + utilities + other;
  const noi = effectiveRent - totalExpenses;
  const capRate = purchase > 0 ? noi / purchase : 0;
  const grm = grossRentYr > 0 ? purchase / grossRentYr : 0;
  const dpPct = num(f.downPayment) / 100, downAmt = purchase * dpPct, loanAmt = purchase - downAmt;
  const rate = num(f.interestRate) / 100 / 12, periods = num(f.loanTerm) * 12;
  const mortgage = rate > 0 && periods > 0 && loanAmt > 0 ? loanAmt * (rate * Math.pow(1 + rate, periods)) / (Math.pow(1 + rate, periods) - 1) : 0;
  const annualDebt = mortgage * 12, cashFlow = noi - annualDebt;
  const cashOnCash = downAmt > 0 ? cashFlow / (downAmt + num(f.closingCosts)) : 0;
  const dscr = annualDebt > 0 ? noi / annualDebt : 0;
  const expenseRatio = effectiveRent > 0 ? totalExpenses / effectiveRent : 0;
  const pricePerUnit = units > 0 ? purchase / units : 0, rentPerUnit = units > 0 ? grossRentMo / units : 0;

  async function analyze() {
    if (!f.purchasePrice || !f.grossRent) { setError("Enter at least purchase price and gross rent."); return; }
    setError(""); setLoading(true);
    try {
      const prompt = `You are a commercial real estate underwriter. Analyze this multifamily deal.

DEAL:
- Units: ${units}
- Purchase: $${purchase.toLocaleString()} ($${Math.round(pricePerUnit).toLocaleString()}/unit)
- Gross Rent/Mo: $${grossRentMo.toLocaleString()} ($${Math.round(rentPerUnit)}/unit)
- Vacancy: ${(vacRate * 100).toFixed(0)}%
- Effective Income/Yr: $${Math.round(effectiveRent).toLocaleString()}
- Expenses/Yr: $${Math.round(totalExpenses).toLocaleString()}
- NOI: $${Math.round(noi).toLocaleString()}
- Cap Rate: ${(capRate * 100).toFixed(2)}%
- GRM: ${grm.toFixed(2)}x
- Debt/Yr: $${Math.round(annualDebt).toLocaleString()}
- Cash Flow/Yr: $${Math.round(cashFlow).toLocaleString()} ($${Math.round(cashFlow/12)}/mo)
- Cash-on-Cash: ${(cashOnCash * 100).toFixed(2)}%
- DSCR: ${dscr.toFixed(2)}x
- Expense Ratio: ${(expenseRatio * 100).toFixed(0)}%

Reply with ONLY this JSON, no markdown:
{"dealScore":"Good Deal","verdict":"direct 3-5 sentences mentioning cap rate and DSCR","risks":"- risk1\n- risk2\n- risk3","upside":"- up1\n- up2\n- up3","suggestion":"one tip"}

dealScore must be: Strong Buy, Good Deal, Marginal, or Pass`;

      const parsed = await callAI(prompt);
      onResult({ type: "mf", address: f.address, units, purchase, grossRentMo, grossRentYr, effectiveRent, totalExpenses, noi, capRate, grm, annualDebt, cashFlow, cashOnCash, dscr, expenseRatio, pricePerUnit, rentPerUnit, downAmt, ...parsed });
    } catch (e) {
      setError("Analysis failed: " + e.message);
    }
    setLoading(false);
  }

  const card = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 16, marginBottom: 12 };
  const section = { fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #F3F4F6" };
  const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 };

  return (
    <div>
      <div style={card}>
        <div style={section}>Property Info</div>
        <div style={grid}>
          <Field label="Address" full><input value={f.address} onChange={(e) => set("address")(e.target.value)} placeholder="456 Oak Ave, Houston TX" style={inputStyle} /></Field>
          <Field label="# of Units"><NumInput value={f.units} onChange={set("units")} placeholder="4" /></Field>
          <Field label="Purchase Price"><NumInput value={f.purchasePrice} onChange={set("purchasePrice")} prefix="$" placeholder="400000" /></Field>
          <Field label="Gross Monthly Rent (all units)"><NumInput value={f.grossRent} onChange={set("grossRent")} prefix="$" placeholder="3200" /></Field>
          <Field label="Closing Costs"><NumInput value={f.closingCosts} onChange={set("closingCosts")} prefix="$" /></Field>
        </div>
      </div>
      <div style={card}>
        <div style={section}>Expenses (Monthly)</div>
        <div style={grid}>
          <Field label="Vacancy Rate"><NumInput value={f.vacancyRate} onChange={set("vacancyRate")} suffix="%" /></Field>
          <Field label="Mgmt Fee"><NumInput value={f.managementFee} onChange={set("managementFee")} suffix="%" /></Field>
          <Field label="Insurance/Mo"><NumInput value={f.insurance} onChange={set("insurance")} prefix="$" /></Field>
          <Field label="Property Tax/Mo"><NumInput value={f.taxes} onChange={set("taxes")} prefix="$" /></Field>
          <Field label="Repairs/Unit/Mo"><NumInput value={f.repairs} onChange={set("repairs")} prefix="$" /></Field>
          <Field label="Utilities/Mo"><NumInput value={f.utilities} onChange={set("utilities")} prefix="$" /></Field>
          <Field label="Other/Mo"><NumInput value={f.otherExpenses} onChange={set("otherExpenses")} prefix="$" /></Field>
        </div>
      </div>
      <div style={card}>
        <div style={section}>Financing</div>
        <div style={grid}>
          <Field label="Down Payment"><NumInput value={f.downPayment} onChange={set("downPayment")} suffix="%" /></Field>
          <Field label="Interest Rate"><NumInput value={f.interestRate} onChange={set("interestRate")} suffix="%" /></Field>
          <Field label="Loan Term"><NumInput value={f.loanTerm} onChange={set("loanTerm")} suffix="yrs" /></Field>
          <Field label="Monthly Mortgage"><div style={{ ...inputStyle, background: "#F3F4F6", color: "#374151", display: "flex", alignItems: "center" }}>{f$(mortgage)}</div></Field>
        </div>
      </div>
      {purchase > 0 && grossRentMo > 0 && (
        <div style={card}>
          <div style={section}>Live Underwriting</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <MetricBox label="NOI / Year" value={f$(noi)} color={noi > 0 ? "#065F46" : "#991B1B"} bg={noi > 0 ? "#ECFDF5" : "#FEF2F2"} />
            <MetricBox label="Cash Flow / Mo" value={f$(cashFlow / 12)} color={cashFlow > 0 ? "#065F46" : "#991B1B"} bg={cashFlow > 0 ? "#ECFDF5" : "#FEF2F2"} />
            <MetricBox label="Cap Rate" value={fPct(capRate)} color={capRate >= 0.08 ? "#065F46" : capRate >= 0.06 ? "#92400E" : "#991B1B"} bg="#EFF6FF" />
            <MetricBox label="Cash-on-Cash" value={fPct(cashOnCash)} color={cashOnCash >= 0.08 ? "#065F46" : "#92400E"} bg="#FFFBEB" />
            <MetricBox label="DSCR" value={fX(dscr)} sub={dscr >= 1.25 ? "Strong ✓" : dscr >= 1.0 ? "Passing" : "Below 1 ⚠️"} color={dscr >= 1.25 ? "#065F46" : dscr >= 1.0 ? "#92400E" : "#991B1B"} />
            <MetricBox label="GRM" value={fX(grm)} sub="Lower = better" />
            <MetricBox label="Price / Unit" value={f$(pricePerUnit)} />
            <MetricBox label="Rent / Unit / Mo" value={f$(rentPerUnit)} />
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", background: "#F9FAFB", borderRadius: 8, padding: "8px 10px", lineHeight: 1.7 }}>
            <b>Income:</b> {f$(effectiveRent)}/yr &nbsp;·&nbsp; <b>Expenses:</b> {f$(totalExpenses)}/yr ({(expenseRatio*100).toFixed(0)}%) &nbsp;·&nbsp; <b>Debt:</b> {f$(annualDebt)}/yr
          </div>
        </div>
      )}
      {error && <div style={{ background: "#FEF2F2", color: "#991B1B", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      <AnalyzeBtn onClick={analyze} loading={loading} />
    </div>
  );
}

// ─── Mobile Home Park Underwriter ────────────────────────────────────────────
function MHPForm({ onPasteResult }) {
  const [f, setF] = useState({
    address: "", acres: "", currentUnits: "10", approvedUnits: "",
    grossRentMo: "", vacancyRate: "5", pohCount: "", tohCount: "",
    expenseRatio: "40", utilities: "direct", water: "city",
    hasLagoon: false, askingPrice: "", downPayment: "25",
    interestRate: "7.5", loanTerm: "25", closingCosts: "10000",
    lotRent: "", pohRent: "", infillCostPerUnit: "45000",
  });
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const tog = (k) => () => setF((p) => ({ ...p, [k]: !p[k] }));

  // Core calcs
  const grossMo    = num(f.grossRentMo);
  const grossYr    = grossMo * 12;
  const vacRate    = num(f.vacancyRate) / 100;
  const egi        = grossYr * (1 - vacRate);
  const expRatio   = num(f.expenseRatio) / 100;
  const expenses   = egi * expRatio;
  const noi        = egi - expenses;
  const asking     = num(f.askingPrice);
  const capRate    = asking > 0 ? noi / asking : 0;
  const curUnits   = num(f.currentUnits);
  const appUnits   = num(f.approvedUnits);
  const ppu        = curUnits > 0 && asking > 0 ? asking / curUnits : 0;
  const ppuPotential = appUnits > 0 && asking > 0 ? asking / appUnits : 0;
  const rentPerUnit = curUnits > 0 ? grossMo / curUnits : 0;

  // Financing
  const dpPct   = num(f.downPayment) / 100;
  const downAmt = asking * dpPct;
  const loanAmt = asking - downAmt;
  const rate    = num(f.interestRate) / 100 / 12;
  const periods = num(f.loanTerm) * 12;
  const mortgage = rate > 0 && periods > 0 && loanAmt > 0
    ? loanAmt * (rate * Math.pow(1+rate,periods)) / (Math.pow(1+rate,periods)-1) : 0;
  const annualDebt = mortgage * 12;
  const cashFlow   = noi - annualDebt;
  const totalIn    = downAmt + num(f.closingCosts);
  const coc        = totalIn > 0 ? cashFlow / totalIn : 0;
  const dscr       = annualDebt > 0 ? noi / annualDebt : 0;

  // Infill upside
  const infillUnits = appUnits > curUnits ? appUnits - curUnits : 0;
  const infillRentMo = infillUnits * rentPerUnit;
  const infillNoiAdd = infillRentMo * 12 * (1 - expRatio);
  const infillCost   = infillUnits * num(f.infillCostPerUnit);
  const proFormaNOI  = noi + infillNoiAdd;
  const proFormaCapRate = asking > 0 ? proFormaNOI / asking : 0;
  const proFormaCashFlow = proFormaNOI - annualDebt;

  // POH risk flag
  const pohCount = num(f.pohCount);
  const pohPct   = curUnits > 0 && pohCount > 0 ? pohCount / curUnits : 0;

  async function analyze() {
    const hasData = pasteMode ? paste.trim() : (asking > 0 && grossMo > 0);
    if (!hasData) { setError("Enter asking price and gross rent, or paste deal info."); return; }
    setError(""); setLoading(true);
    try {
      const dealSummary = pasteMode ? paste : `
- Address: ${f.address || "N/A"}
- Acres: ${f.acres}
- Current Units: ${curUnits} | Approved Units: ${appUnits || "N/A"}
- Asking Price: $${asking.toLocaleString()}
- Gross Rent/Mo: $${grossMo.toLocaleString()} ($${Math.round(rentPerUnit)}/unit)
- Vacancy: ${f.vacancyRate}% | Expense Ratio: ${f.expenseRatio}%
- NOI: $${Math.round(noi).toLocaleString()} | Cap Rate: ${(capRate*100).toFixed(2)}%
- DSCR: ${dscr.toFixed(2)}x | Cash-on-Cash: ${(coc*100).toFixed(2)}%
- Cash Flow/Mo: $${Math.round(cashFlow/12).toLocaleString()}
- POH Count: ${pohCount || "unknown"} | Utilities: ${f.utilities} | Water: ${f.water}
- Lagoon System: ${f.hasLagoon ? "YES ⚠️" : "No"}
- Infill Upside: ${infillUnits} additional units possible
- Pro Forma NOI (fully built): $${Math.round(proFormaNOI).toLocaleString()}`;

      const prompt = `You are an expert mobile home park (MHP) investment analyst. Analyze this deal thoroughly.

DEAL INFO:
${dealSummary}

Key MHP benchmarks: Good cap rate = 8-10%+, DSCR > 1.25, COC > 8%, price/unit under $50k is solid, expense ratio 30-45% for TOH, 45-60% for POH.

Reply with ONLY this JSON, no markdown:
{"dealScore":"Strong Buy or Good Deal or Marginal or Pass","verdict":"3-5 direct sentences covering NOI quality, infrastructure risks, and expansion upside","infrastructureRisks":"specific risks for this park's water/utility/POH situation with dashes","upside":"- upside1\\n- upside2\\n- upside3","dueDiligenceItems":"5 critical things to verify before closing, with dashes","suggestedOffer":0,"negotiationTip":"one specific tip for this deal"}`;

      const result = await callAI(prompt);
      if (pasteMode && result) {
        // Try to extract numbers from AI if in paste mode
        onPasteResult && onPasteResult(result);
      }
      setAiResult(result);
    } catch(e) { setError("Analysis failed: " + e.message); }
    setLoading(false);
  }

  const card = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 16, marginBottom: 12 };
  const sec  = { fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #F3F4F6" };
  const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 };

  return (
    <div>
      {/* Paste / Manual toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["manual","✏️ Enter Manually"],["paste","📋 Paste Deal Info"]].map(([k,l]) => (
          <button key={k} onClick={() => setPasteMode(k==="paste")} style={{ flex:1, padding:"9px 0", borderRadius:10, border:"2px solid " + (pasteMode===(k==="paste") ? "#10B981":"#E5E7EB"), background:(pasteMode===(k==="paste")) ? "#ECFDF5":"#fff", color:(pasteMode===(k==="paste")) ? "#065F46":"#6B7280", fontWeight:700, fontSize:13, cursor:"pointer" }}>{l}</button>
        ))}
      </div>

      {pasteMode ? (
        <div style={card}>
          <div style={sec}>Paste Deal Info</div>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={8}
            placeholder={"Paste anything about the park:\n\n• Listing description\n• Financials / rent roll\n• Text from a broker or seller\n\nExample:\n\"10-unit MHP in Belden MS, asking $475k, gross rent $6,890/mo, lagoon system, approved for 20 units, POH vintage 1997\""}
            style={{ width:"100%", boxSizing:"border-box", border:"1px solid #D1D5DB", borderRadius:10, padding:12, fontSize:13, lineHeight:1.6, resize:"vertical", fontFamily:"inherit", color:"#111827", background:"#FAFAFA" }} />
        </div>
      ) : (
        <>
          <div style={card}>
            <div style={sec}>Park Info</div>
            <div style={grid}>
              <Field label="Address" full><input value={f.address} onChange={(e) => set("address")(e.target.value)} placeholder="Belden, MS" style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} /></Field>
              <Field label="Acres"><NumInput value={f.acres} onChange={set("acres")} placeholder="10.92" /></Field>
              <Field label="Current Units"><NumInput value={f.currentUnits} onChange={set("currentUnits")} placeholder="10" /></Field>
              <Field label="Approved / Max Units"><NumInput value={f.approvedUnits} onChange={set("approvedUnits")} placeholder="20" /></Field>
              <Field label="POH Count"><NumInput value={f.pohCount} onChange={set("pohCount")} placeholder="10" /></Field>
              <Field label="TOH Count"><NumInput value={f.tohCount} onChange={set("tohCount")} placeholder="0" /></Field>
            </div>

            {/* Toggles */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:4 }}>
              {[
                ["utilities","direct","Direct-Billed","city","City Utilities"],
                ["water","well","Well Water","city","City Water"],
              ].map(([field,valA,labelA,valB,labelB]) => (
                <div key={field} style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ fontSize:11, color:"#6B7280", fontWeight:600 }}>{field === "utilities" ? "Utilities:" : "Water:"}</span>
                  {[[valA,labelA],[valB,labelB]].map(([v,l]) => (
                    <button key={v} onClick={() => set(field)(v)} style={{ padding:"4px 10px", borderRadius:20, border:"1px solid " + (f[field]===v ? "#10B981":"#E5E7EB"), background:f[field]===v ? "#ECFDF5":"#fff", color:f[field]===v ? "#065F46":"#6B7280", fontSize:11, fontWeight:600, cursor:"pointer" }}>{l}</button>
                  ))}
                </div>
              ))}
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <span style={{ fontSize:11, color:"#6B7280", fontWeight:600 }}>Lagoon:</span>
                <button onClick={tog("hasLagoon")} style={{ padding:"4px 10px", borderRadius:20, border:"1px solid " + (f.hasLagoon ? "#EF4444":"#E5E7EB"), background:f.hasLagoon ? "#FEF2F2":"#fff", color:f.hasLagoon ? "#991B1B":"#6B7280", fontSize:11, fontWeight:600, cursor:"pointer" }}>{f.hasLagoon ? "⚠️ Yes":"No"}</button>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={sec}>Financials</div>
            <div style={grid}>
              <Field label="Asking Price"><NumInput value={f.askingPrice} onChange={set("askingPrice")} prefix="$" placeholder="475000" /></Field>
              <Field label="Gross Rent / Month"><NumInput value={f.grossRentMo} onChange={set("grossRentMo")} prefix="$" placeholder="6890" /></Field>
              <Field label="Vacancy Rate"><NumInput value={f.vacancyRate} onChange={set("vacancyRate")} suffix="%" /></Field>
              <Field label="Expense Ratio"><NumInput value={f.expenseRatio} onChange={set("expenseRatio")} suffix="%" /></Field>
              <Field label="Closing Costs"><NumInput value={f.closingCosts} onChange={set("closingCosts")} prefix="$" /></Field>
            </div>
            <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:8, padding:"8px 10px", fontSize:11, color:"#92400E" }}>
              💡 Use 30–40% for TOH parks, 40–55% for POH parks. Lagoon/well parks add 5–10%.
            </div>
          </div>

          <div style={card}>
            <div style={sec}>Financing</div>
            <div style={grid}>
              <Field label="Down Payment"><NumInput value={f.downPayment} onChange={set("downPayment")} suffix="%" /></Field>
              <Field label="Interest Rate"><NumInput value={f.interestRate} onChange={set("interestRate")} suffix="%" /></Field>
              <Field label="Loan Term"><NumInput value={f.loanTerm} onChange={set("loanTerm")} suffix="yrs" /></Field>
              <Field label="Monthly Mortgage"><div style={{ ...inputStyle, background:"#F3F4F6", color:"#374151", display:"flex", alignItems:"center" }}>{f$(mortgage)}</div></Field>
            </div>
          </div>

          {infillUnits > 0 && (
            <div style={card}>
              <div style={sec}>Infill Upside</div>
              <div style={grid}>
                <Field label="Cost to Add Each Unit"><NumInput value={f.infillCostPerUnit} onChange={set("infillCostPerUnit")} prefix="$" placeholder="45000" /></Field>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <MetricBox label="Infill Units Available" value={infillUnits + " units"} color="#6D28D9" bg="#F5F3FF" />
                <MetricBox label="Infill Build Cost" value={f$(infillCost)} color="#991B1B" bg="#FEF2F2" />
                <MetricBox label="Added NOI/Yr" value={f$(infillNoiAdd)} color="#065F46" bg="#ECFDF5" />
                <MetricBox label="Pro Forma NOI" value={f$(proFormaNOI)} color="#065F46" bg="#ECFDF5" />
                <MetricBox label="Pro Forma Cap Rate" value={fPct(proFormaCapRate)} color="#1D4ED8" bg="#EFF6FF" />
                <MetricBox label="Pro Forma Cash Flow/Mo" value={f$(proFormaCashFlow/12)} color={proFormaCashFlow>0?"#065F46":"#991B1B"} bg={proFormaCashFlow>0?"#ECFDF5":"#FEF2F2"} />
              </div>
            </div>
          )}

          {/* Live metrics */}
          {asking > 0 && grossMo > 0 && (
            <div style={card}>
              <div style={sec}>Current Underwriting</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                <MetricBox label="NOI / Year" value={f$(noi)} color={noi>0?"#065F46":"#991B1B"} bg={noi>0?"#ECFDF5":"#FEF2F2"} />
                <MetricBox label="Cash Flow / Mo" value={f$(cashFlow/12)} color={cashFlow>0?"#065F46":"#991B1B"} bg={cashFlow>0?"#ECFDF5":"#FEF2F2"} />
                <MetricBox label="Cap Rate" value={fPct(capRate)} color={capRate>=0.10?"#065F46":capRate>=0.07?"#92400E":"#991B1B"} bg="#EFF6FF" sub={capRate>=0.10?"Strong ✓":capRate>=0.07?"Acceptable":"Below target"} />
                <MetricBox label="Cash-on-Cash" value={fPct(coc)} color={coc>=0.10?"#065F46":"#92400E"} bg="#FFFBEB" />
                <MetricBox label="DSCR" value={fX(dscr)} sub={dscr>=1.25?"Strong ✓":dscr>=1.0?"Passing":"Below 1 ⚠️"} color={dscr>=1.25?"#065F46":dscr>=1.0?"#92400E":"#991B1B"} />
                <MetricBox label="Price / Unit" value={f$(ppu)} sub={ppu<50000?"Good basis ✓":"High for MHP"} color={ppu<50000?"#065F46":"#92400E"} />
                {appUnits > 0 && <MetricBox label="Price / Potential Unit" value={f$(ppuPotential)} color="#6D28D9" bg="#F5F3FF" />}
                <MetricBox label="Rent / Unit / Mo" value={f$(rentPerUnit)} />
              </div>
              {pohPct > 0.5 && (
                <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:8, padding:"8px 10px", fontSize:12, color:"#991B1B", marginBottom:8 }}>
                  ⚠️ {Math.round(pohPct*100)}% park-owned homes — higher expenses, harder to finance, more liability. Factor in a POH→TOH conversion plan.
                </div>
              )}
              {f.hasLagoon && (
                <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:8, padding:"8px 10px", fontSize:12, color:"#991B1B" }}>
                  ⚠️ Lagoon system — get an environmental inspection before closing. Replacement can cost $100k–$500k.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {error && <div style={{ background:"#FEF2F2", color:"#991B1B", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:8 }}>{error}</div>}

      <button onClick={analyze} disabled={loading} style={{ width:"100%", padding:14, borderRadius:12, border:"none", background:loading?"#6B7280":"#111827", color:"#fff", fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:12 }}>
        {loading ? <><Spinner /> Analyzing…</> : "⚡ AI Park Analysis"}
      </button>

      {aiResult && (
        <div>
          <Verdict score={aiResult.dealScore} text={aiResult.verdict} />
          {aiResult.suggestedOffer > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              <MetricBox label="Suggested Offer" value={f$(aiResult.suggestedOffer)} color="#6D28D9" bg="#F5F3FF" />
              {asking > 0 && <MetricBox label="Discount from Ask" value={f$(asking - aiResult.suggestedOffer)} color="#065F46" bg="#ECFDF5" />}
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            {aiResult.infrastructureRisks && (
              <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:12, padding:12 }}>
                <div style={{ fontWeight:700, fontSize:12, color:"#991B1B", marginBottom:6 }}>🏗️ Infrastructure Risks</div>
                <div style={{ fontSize:12, color:"#7F1D1D", lineHeight:1.65, whiteSpace:"pre-wrap" }}>{aiResult.infrastructureRisks}</div>
              </div>
            )}
            {aiResult.upside && (
              <div style={{ background:"#ECFDF5", border:"1px solid #6EE7B7", borderRadius:12, padding:12 }}>
                <div style={{ fontWeight:700, fontSize:12, color:"#065F46", marginBottom:6 }}>📈 Upside</div>
                <div style={{ fontSize:12, color:"#14532D", lineHeight:1.65, whiteSpace:"pre-wrap" }}>{aiResult.upside}</div>
              </div>
            )}
          </div>
          {aiResult.dueDiligenceItems && (
            <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:12, padding:12, marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#1E40AF", marginBottom:6 }}>📋 Due Diligence Checklist</div>
              <div style={{ fontSize:12, color:"#1E3A8A", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{aiResult.dueDiligenceItems}</div>
            </div>
          )}
          {aiResult.negotiationTip && (
            <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:12, padding:12 }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#92400E", marginBottom:4 }}>💡 Negotiation Tip</div>
              <div style={{ fontSize:13, color:"#78350F" }}>{aiResult.negotiationTip}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Wholesale Calculator ─────────────────────────────────────────────────────
function WholesaleCalc() {
  const [f, setF] = useState({
    address: "", arv: "", rehabCost: "", desiredProfit: "15000",
    closingCosts: "3000", buyerProfit: "30", assignmentFee: "",
    strategyMode: "arv", // "arv" = work from ARV, "direct" = enter MAO directly
    askingPrice: "", currentRent: "", rentMode: false,
  });
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const arv = num(f.arv), rehab = num(f.rehabCost), closing = num(f.closingCosts);
  const desiredProfit = num(f.desiredProfit), buyerProfitPct = num(f.buyerProfit) / 100;
  const assignmentFee = num(f.assignmentFee) || 10000;
  const asking = num(f.askingPrice);

  // 70% Rule MAO
  const mao70 = arv * 0.7 - rehab;
  // MAO leaving room for buyer profit + your assignment fee
  const buyerMaxPay = arv * (1 - buyerProfitPct) - rehab - closing;
  const maoWithFee = buyerMaxPay - assignmentFee;
  // Spread if bought at asking
  const spreadAtAsking = asking > 0 ? mao70 - asking : null;
  const profitAtAsking = asking > 0 ? buyerMaxPay - asking - assignmentFee : null;

  // Rental quick check
  const monthlyRent = num(f.currentRent);
  const rentRuleOk = arv > 0 && monthlyRent > 0 ? monthlyRent / arv : null;
  const grossYield = arv > 0 && monthlyRent > 0 ? (monthlyRent * 12) / asking : null;

  const scoreColor = maoWithFee > 0 ? (spreadAtAsking > 0 ? "#065F46" : "#92400E") : "#991B1B";

  async function analyzeWithAI() {
    const text = pasteMode ? paste : `Address: ${f.address || "N/A"}, ARV: $${arv.toLocaleString()}, Rehab: $${rehab.toLocaleString()}, Asking: $${asking.toLocaleString()}, Rent: $${monthlyRent}/mo`;
    if (!text.trim() && !arv) { setError("Enter deal info first."); return; }
    setError(""); setLoading(true);
    try {
      const prompt = `You are a real estate wholesale analyst. Analyze this wholesale deal opportunity.

DEAL INFO:
${pasteMode ? paste : `- Address: ${f.address || "N/A"}
- ARV: $${arv.toLocaleString()}
- Estimated Rehab: $${rehab.toLocaleString()}
- Asking Price: $${asking > 0 ? asking.toLocaleString() : "unknown"}
- Current Rent: $${monthlyRent > 0 ? monthlyRent + "/mo" : "unknown"}
- MAO (70% Rule): $${mao70.toLocaleString()}
- MAO with $${assignmentFee.toLocaleString()} assignment fee: $${maoWithFee.toLocaleString()}
- Spread at asking: $${spreadAtAsking !== null ? spreadAtAsking.toLocaleString() : "unknown"}`}

Reply with ONLY this JSON, no markdown:
{"verdict":"2-3 direct sentences: is this a good wholesale deal? What should they offer?","maxOffer":0,"suggestedAssignmentFee":0,"dealScore":"Strong Buy or Good Deal or Marginal or Pass","exitStrategy":"best exit: wholesale assign, double close, or sub-to","risks":"- risk1\\n- risk2\\n- risk3","negotiationTips":"- tip1\\n- tip2\\n- tip3"}

dealScore must be exactly one of: Strong Buy, Good Deal, Marginal, Pass`;

      const result = await callAI(prompt);
      setAiResult(result);
    } catch(e) { setError("Analysis failed: " + e.message); }
    setLoading(false);
  }

  const card = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 16, marginBottom: 12 };
  const section = { fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #F3F4F6" };

  return (
    <div>
      {/* Paste toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["manual","✏️ Enter Manually"],["paste","📋 Paste Deal Info"]].map(([k,l]) => (
          <button key={k} onClick={() => setPasteMode(k === "paste")} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "2px solid " + (!pasteMode && k==="manual" || pasteMode && k==="paste" ? "#10B981" : "#E5E7EB"), background: (!pasteMode && k==="manual" || pasteMode && k==="paste") ? "#ECFDF5" : "#fff", color: (!pasteMode && k==="manual" || pasteMode && k==="paste") ? "#065F46" : "#6B7280", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      {pasteMode ? (
        <div style={card}>
          <div style={section}>Paste Deal Info</div>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6}
            placeholder={"Paste anything:\n\n• \"Ohio property, asking $155k, rents $2,875/mo, seller relocating\"\n• Copy/paste a text or email from a wholesaler"}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #D1D5DB", borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit", color: "#111827", background: "#FAFAFA" }} />
        </div>
      ) : (
        <>
          <div style={card}>
            <div style={section}>Property Info</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Address" full><input value={f.address} onChange={(e) => set("address")(e.target.value)} placeholder="123 Main St, Ohio" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} /></Field>
              <Field label="ARV (After Repair Value)"><NumInput value={f.arv} onChange={set("arv")} prefix="$" placeholder="200000" /></Field>
              <Field label="Estimated Rehab"><NumInput value={f.rehabCost} onChange={set("rehabCost")} prefix="$" placeholder="25000" /></Field>
              <Field label="Seller Asking Price"><NumInput value={f.askingPrice} onChange={set("askingPrice")} prefix="$" placeholder="155000" /></Field>
              <Field label="Current Monthly Rent"><NumInput value={f.currentRent} onChange={set("currentRent")} prefix="$" placeholder="2875" /></Field>
              <Field label="Closing Costs"><NumInput value={f.closingCosts} onChange={set("closingCosts")} prefix="$" /></Field>
            </div>
          </div>

          <div style={card}>
            <div style={section}>Your Numbers</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Your Assignment Fee"><NumInput value={f.assignmentFee} onChange={set("assignmentFee")} prefix="$" placeholder="10000" /></Field>
              <Field label="Buyer Profit Margin"><NumInput value={f.buyerProfit} onChange={set("buyerProfit")} suffix="%" placeholder="30" /></Field>
            </div>
          </div>
        </>
      )}

      {/* Live Results — show when ARV is entered */}
      {!pasteMode && arv > 0 && (
        <div style={card}>
          <div style={section}>Wholesale Numbers</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <MetricBox label="MAO (70% Rule)" value={f$(mao70)} color="#6D28D9" bg="#F5F3FF" />
            <MetricBox label="MAO w/ Your Fee" value={f$(maoWithFee)} color={maoWithFee > 0 ? "#065F46" : "#991B1B"} bg={maoWithFee > 0 ? "#ECFDF5" : "#FEF2F2"} />
            {asking > 0 && <MetricBox label="Spread at Asking" value={f$(spreadAtAsking)} color={spreadAtAsking > 0 ? "#065F46" : "#991B1B"} bg={spreadAtAsking > 0 ? "#ECFDF5" : "#FEF2F2"} sub={spreadAtAsking > 0 ? "Room to deal ✓" : "Asking too high"} />}
            {asking > 0 && <MetricBox label="Your Profit at Asking" value={f$(profitAtAsking)} color={profitAtAsking > 0 ? "#065F46" : "#991B1B"} bg={profitAtAsking > 0 ? "#ECFDF5" : "#FEF2F2"} />}
            {monthlyRent > 0 && arv > 0 && <MetricBox label="1% Rule" value={fPct(rentRuleOk)} sub={rentRuleOk >= 0.01 ? "Passes ✓" : "Below 1%"} color={rentRuleOk >= 0.01 ? "#065F46" : "#92400E"} />}
            {monthlyRent > 0 && asking > 0 && <MetricBox label="Gross Yield" value={fPct(grossYield)} color={grossYield >= 0.08 ? "#065F46" : "#92400E"} />}
          </div>

          {/* Offer range */}
          <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Offer Range</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["Max (leaves 30% buyer profit)", f$(arv * 0.7 - rehab - closing), "#065F46"],
                ["Target (keeps $" + (assignmentFee || 10000).toLocaleString() + " fee)", f$(maoWithFee), "#1D4ED8"],
                ["Low (negotiate up)", f$(maoWithFee * 0.9), "#92400E"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{label}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ background: "#FEF2F2", color: "#991B1B", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 8 }}>{error}</div>}

      <button onClick={analyzeWithAI} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: loading ? "#6B7280" : "#111827", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
        {loading ? <><Spinner /> Analyzing…</> : "⚡ AI Wholesale Analysis"}
      </button>

      {/* AI Result */}
      {aiResult && (
        <div>
          <Verdict score={aiResult.dealScore} text={aiResult.verdict} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {aiResult.maxOffer > 0 && <MetricBox label="AI Max Offer" value={f$(aiResult.maxOffer)} color="#6D28D9" bg="#F5F3FF" />}
            {aiResult.suggestedAssignmentFee > 0 && <MetricBox label="Suggested Fee" value={f$(aiResult.suggestedAssignmentFee)} color="#065F46" bg="#ECFDF5" />}
          </div>
          {aiResult.exitStrategy && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#1E40AF", marginBottom: 4 }}>🚪 Best Exit Strategy</div>
              <div style={{ fontSize: 13, color: "#1E40AF" }}>{aiResult.exitStrategy}</div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {aiResult.risks && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#991B1B", marginBottom: 6 }}>⚠️ Risks</div>
                <div style={{ fontSize: 12, color: "#7F1D1D", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{aiResult.risks}</div>
              </div>
            )}
            {aiResult.negotiationTips && (
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#92400E", marginBottom: 6 }}>💡 Negotiation</div>
                <div style={{ fontSize: 12, color: "#78350F", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{aiResult.negotiationTips}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function SavedDeals({ deals, onDelete }) {
  const [open, setOpen] = useState(null);
  if (deals.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#9CA3AF" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No saved deals yet</div>
      <div style={{ fontSize: 13 }}>Underwrite a deal and save it here</div>
    </div>
  );
  return (
    <div>
      {deals.map((d) => {
        const cfg = SCORE_STYLES[d.dealScore] || SCORE_STYLES["Marginal"];
        return (
          <div key={d.id} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
            <div onClick={() => setOpen(open === d.id ? null : d.id)} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.address || (d.type === "mf" ? d.units + "-Unit Property" : "SFH Deal")}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{d.type === "mf" ? "Multifamily · " + d.units + " units" : d.strategy === "flip" ? "Fix & Flip" : "Buy & Hold"} · {d.dateAdded}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text }}>{cfg.icon} {d.dealScore}</span>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#065F46" }}>{d.type === "mf" ? f$(d.cashFlow / 12) + "/mo" : f$(d.profit)}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{d.type === "mf" ? "cash flow" : "profit"}</div>
              </div>
            </div>
            {open === d.id && (
              <div style={{ borderTop: "1px solid #F3F4F6", padding: 14 }}>
                <Verdict score={d.dealScore} text={d.verdict} />
                {d.suggestion && <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 10, marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", marginBottom: 3 }}>💡 Tip</div><div style={{ fontSize: 12, color: "#78350F" }}>{d.suggestion}</div></div>}
                <button onClick={() => onDelete(d.id)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Remove</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("home");
  const [tab, setTab] = useState("underwrite");
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState([]);
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("uw_v2");
        if (res && res.value) setSaved(JSON.parse(res.value));
      } catch (e) {}
      setStorageLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    (async () => {
      try { await window.storage.set("uw_v2", JSON.stringify(saved)); } catch (e) {}
    })();
  }, [saved, storageLoaded]);

  function handleResult(r) { setResult(r); setMode("result"); }
  function handleSave() {
    setSaved((s) => [{ ...result, id: Date.now(), dateAdded: new Date().toLocaleDateString() }, ...s]);
    setMode("home"); setTab("saved");
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 520, margin: "0 auto", paddingBottom: 60, background: "#F9FAFB", minHeight: "100vh" }}>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>

      {/* Header */}
      <div style={{ background: "#111827", padding: "18px 16px 0" }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: "#F9FAFB", letterSpacing: "-0.3px" }}>
          Deal<span style={{ color: "#10B981" }}>Desk</span> <span style={{ fontSize: 13, fontWeight: 400, color: "#6B7280" }}>Underwriter</span>
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>SFH & Multifamily · Know before you buy</div>
        <div style={{ display: "flex", borderTop: "1px solid #1F2937" }}>
          {[["underwrite","Underwrite"],["wholesale","Wholesale"],["mhp","MHP"],["saved","Saved (" + saved.length + ")"]].map(([k,l]) => (
            <button key={k} onClick={() => { setTab(k); if (k === "underwrite") setMode("home"); }} style={{ flex: 1, background: "none", border: "none", padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", color: tab === k ? "#10B981" : "#6B7280", borderBottom: tab === k ? "2px solid #10B981" : "2px solid transparent" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {tab === "underwrite" && mode === "home" && (
          <div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>How do you want to underwrite?</div>
            <div onClick={() => setMode("paste")} style={{ background: "#111827", border: "2px solid #10B981", borderRadius: 14, padding: "16px 18px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 28 }}>📋</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#F9FAFB" }}>Paste Deal Info</div>
                <div style={{ fontSize: 12, color: "#6EE7B7", marginTop: 2 }}>Paste texts, emails, P&Ls, rent rolls — AI fills everything out</div>
              </div>
              <span style={{ marginLeft: "auto", color: "#10B981", fontSize: 20 }}>›</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Or enter manually</div>
            {[{key:"sfh",icon:"🏠",title:"Single Family Home",sub:"Fix & flip or buy & hold rental"},{key:"mf",icon:"🏢",title:"Multifamily Property",sub:"Duplex, triplex, fourplex & larger"}].map((opt) => (
              <div key={opt.key} onClick={() => setMode(opt.key)} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "16px 18px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>{opt.icon}</span>
                <div><div style={{ fontWeight: 700, fontSize: 15 }}>{opt.title}</div><div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{opt.sub}</div></div>
                <span style={{ marginLeft: "auto", color: "#D1D5DB", fontSize: 20 }}>›</span>
              </div>
            ))}
          </div>
        )}
        {tab === "underwrite" && mode === "paste" && <PasteMode onResult={handleResult} onBack={() => setMode("home")} />}
        {tab === "underwrite" && mode === "sfh" && (
          <div>
            <button onClick={() => setMode("home")} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer", marginBottom: 10, padding: 0 }}>← Back</button>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>🏠 SFH Underwriter</div>
            <SFHForm onResult={handleResult} />
          </div>
        )}
        {tab === "underwrite" && mode === "mf" && (
          <div>
            <button onClick={() => setMode("home")} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer", marginBottom: 10, padding: 0 }}>← Back</button>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>🏢 Multifamily Underwriter</div>
            <MFForm onResult={handleResult} />
          </div>
        )}
        {tab === "underwrite" && mode === "result" && result && (
          <Results result={result} onBack={() => setMode(result.type === "mf" ? "mf" : "paste")} onSave={handleSave} />
        )}
        {tab === "mhp" && (
          <div>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:2 }}>🏘️ Mobile Home Park Underwriter</div>
            <div style={{ fontSize:12, color:"#9CA3AF", marginBottom:14 }}>Built for MHP deals — POH/TOH, lagoon/well flags, infill upside, and park-specific metrics.</div>
            <MHPForm onPasteResult={() => {}} />
          </div>
        )}
        {tab === "wholesale" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>🏷️ Wholesale Calculator</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>Figure out your max offer, assignment fee, and whether the deal is worth pursuing.</div>
            <WholesaleCalc />
          </div>
        )}
        {tab === "saved" && <SavedDeals deals={saved} onDelete={(id) => setSaved((s) => s.filter((d) => d.id !== id))} />}
      </div>
    </div>
  );
}
