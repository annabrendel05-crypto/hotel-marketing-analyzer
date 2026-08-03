"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type View = "start" | "overview" | "campaigns" | "campaign" | "funnel" | "channels";
type Campaign = {
  id: string;
  name: string;
  channel: string;
  status: string;
  tone: string;
  spend: string;
  spendDelta: string;
  sessions: string;
  engagement: string;
  micro: string;
  bookings: string;
  diagnosis: string;
  recommendation: string;
  confidence: string;
  evidence: string[];
};

const fallbackCampaigns: Campaign[] = [
  {
    id: "prospecting",
    name: "Wakacje w Gdyni | Prospecting",
    channel: "Meta Ads",
    status: "Problem dalej w lejku",
    tone: "amber",
    spend: "3 200 zł",
    spendDelta: "+12%",
    sessions: "842",
    engagement: "68%",
    micro: "146",
    bookings: "0",
    confidence: "Wysokie prawdopodobieństwo",
    diagnosis: "Kampania sprowadza właściwy ruch, ale użytkownicy odpadają po rozpoczęciu rezerwacji.",
    recommendation: "Utrzymaj budżet. Sprawdź dostępność, cenę oraz drugi krok silnika rezerwacyjnego.",
    evidence: ["sesje +18%", "otwarcia pakietu +24%", "step1 +19%", "step1 → step2: 5,1%"],
  },
  {
    id: "brand",
    name: "Brand | Hotel X",
    channel: "Google Ads",
    status: "Działa dobrze",
    tone: "green",
    spend: "1 650 zł",
    spendDelta: "+6%",
    sessions: "391",
    engagement: "76%",
    micro: "98",
    bookings: "1",
    confidence: "Potwierdzone przez dane",
    diagnosis: "Google Brand skutecznie przejmuje powracających użytkowników i domyka część ścieżek rozpoczętych przez Meta.",
    recommendation: "Pozostaw kampanię bez zmian i zabezpiecz jej udział w wynikach wyszukiwania.",
    evidence: ["76% zaangażowania", "9 potwierdzonych połączeń", "1 rezerwacja pakietu", "42% ścieżek rozpoczętych w Meta"],
  },
  {
    id: "remarketing",
    name: "Wakacje | Remarketing",
    channel: "Meta Ads",
    status: "Wstępny potencjał",
    tone: "blue",
    spend: "1 400 zł",
    spendDelta: "+8%",
    sessions: "318",
    engagement: "73%",
    micro: "87",
    bookings: "1",
    confidence: "Wysokie prawdopodobieństwo",
    diagnosis: "Remarketing skutecznie przywraca użytkowników, ale próba sprzedażowa jest jeszcze zbyt mała do potwierdzenia skalowania.",
    recommendation: "Zwiększ budżet maksymalnie o 10% i obserwuj koszt kontaktu oraz przejście step1 → step2.",
    evidence: ["CTR +11%", "87 mikro-konwersji", "6 potwierdzonych połączeń", "częstotliwość 3,8 / próg 5,0"],
  },
  {
    id: "weekend",
    name: "Weekend nad morzem",
    channel: "Meta Ads",
    status: "Przepalanie budżetu",
    tone: "red",
    spend: "1 800 zł",
    spendDelta: "+27%",
    sessions: "331",
    engagement: "41%",
    micro: "9",
    bookings: "0",
    confidence: "Potwierdzone przez dane",
    diagnosis: "Rosnące wydatki nie przekładają się na jakościowy ruch ani działania o średniej i wysokiej intencji.",
    recommendation: "Wstrzymaj zwiększanie budżetu i przygotuj nową kreację lub grupę odbiorców.",
    evidence: ["częstotliwość 2,7 / próg 2,0", "CTR −24%", "CPC +31%", "mikro-konwersje −38%"],
  },
  {
    id: "search",
    name: "Wakacje w Gdyni | Search",
    channel: "Google Ads",
    status: "Za mało danych",
    tone: "gray",
    spend: "400 zł",
    spendDelta: "nowa",
    sessions: "38",
    engagement: "66%",
    micro: "7",
    bookings: "0",
    confidence: "Za mało danych",
    diagnosis: "Kampania działa od dwóch dni i nie osiągnęła minimalnego progu 50 sesji.",
    recommendation: "Nie podejmuj jeszcze decyzji. Poczekaj na minimum 50 sesji i 3 pełne dni emisji.",
    evidence: ["2 dni emisji", "38 sesji", "7 mikro-konwersji", "400 zł wydatków"],
  },
];

const nav: { id: View; label: string }[] = [
  { id: "overview", label: "Diagnoza hotelu" },
  { id: "campaigns", label: "Kampanie" },
  { id: "funnel", label: "Lejek zachowań" },
  { id: "channels", label: "Udział kanałów" },
];

export default function Home() {
  const [view, setView] = useState<View>("start");
  const [selectedId, setSelectedId] = useState("prospecting");
  const [campaigns, setCampaigns] = useState<Campaign[]>(fallbackCampaigns);
  const [connection, setConnection] = useState<"loading" | "connected" | "fallback">("loading");
  const [settings, setSettings] = useState(false);
  const [chat, setChat] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ q: string; a: string }[]>([]);
  const [apiResult, setApiResult] = useState<{
    diagnosis: string;
    recommendation: string;
    confidence: string;
  } | null>(null);
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "error">("idle");
  const selected = campaigns.find((item) => item.id === selectedId) ?? campaigns[0];

  useEffect(() => {
    let active = true;

    async function loadCampaigns() {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          id,
          campaign_name,
          channel,
          status,
          campaign_metrics (
            spend,
            sessions,
            engagement_rate,
            medium_high_intent_events,
            package_bookings
          )
        `)
        .order("campaign_name");

      if (!active) return;
      if (error || !data?.length) {
        console.error("Nie udało się pobrać danych demonstracyjnych:", error);
        setConnection("fallback");
        return;
      }

      const mapped = data.map((row) => {
        const narrative =
          fallbackCampaigns.find((item) => item.name === row.campaign_name) ??
          fallbackCampaigns[0];
        const metric = Array.isArray(row.campaign_metrics)
          ? row.campaign_metrics[0]
          : row.campaign_metrics;
        const tone =
          row.status === "Działa dobrze"
            ? "green"
            : row.status.includes("potencjał")
              ? "blue"
              : row.status.includes("Przepalanie")
                ? "red"
                : row.status.includes("Za mało")
                  ? "gray"
                  : "amber";

        return {
          ...narrative,
          id: narrative.id,
          name: row.campaign_name,
          channel: row.channel,
          status: row.status,
          tone,
          spend: `${new Intl.NumberFormat("pl-PL").format(Number(metric?.spend ?? 0))} zł`,
          sessions: new Intl.NumberFormat("pl-PL").format(metric?.sessions ?? 0),
          engagement: `${Number(metric?.engagement_rate ?? 0).toLocaleString("pl-PL")}%`,
          micro: new Intl.NumberFormat("pl-PL").format(metric?.medium_high_intent_events ?? 0),
          bookings: String(metric?.package_bookings ?? 0),
        };
      });

      setCampaigns(mapped);
      setConnection("connected");
    }

    loadCampaigns();
    return () => {
      active = false;
    };
  }, []);

  const chatAnswer = useMemo(() => {
    const q = question.toLowerCase();
    if (q.includes("meta") && q.includes("google")) return "Meta rozpoczęła 42% ścieżek domkniętych później przez Google Brand. To wskazuje, że Meta buduje popyt, a Google przejmuje użytkowników powracających z wyższą intencją.";
    if (q.includes("rezerw")) return "Rezerwacje pakietu spadły z 7 do 2. Ruch i wybory terminu rosną, natomiast przejście step1 → step2 spadło z 9,8% do 5,4%. Problem najprawdopodobniej znajduje się w silniku rezerwacyjnym.";
    if (q.includes("skal")) return "Wstępny potencjał ma kampania „Wakacje | Remarketing”. Jakość ruchu jest dobra, ale do potwierdzonej oceny sprzedażowej brakuje minimum 3 rezerwacji.";
    return "Najważniejszym działaniem jest sprawdzenie drugiego kroku silnika rezerwacyjnego, dostępności oraz warunków pobytu na jedną noc. Kampanie nadal generują zainteresowanie, więc ich wyłączenie byłoby przedwczesne.";
  }, [question]);

  function ask(text?: string) {
    const q = (text ?? question).trim();
    if (!q) return;
    setQuestion(q);
    const lower = q.toLowerCase();
    let a = "Najważniejszym działaniem jest sprawdzenie drugiego kroku silnika rezerwacyjnego, dostępności oraz warunków pobytu na jedną noc. Kampanie nadal generują zainteresowanie, więc ich wyłączenie byłoby przedwczesne.";
    if (lower.includes("meta") && lower.includes("google")) a = "Meta rozpoczęła 42% ścieżek domkniętych później przez Google Brand. Meta buduje popyt, a Google przejmuje użytkowników powracających z wyższą intencją.";
    else if (lower.includes("rezerw")) a = "Rezerwacje pakietu spadły z 7 do 2. Ruch i wybory terminu rosną, natomiast przejście step1 → step2 spadło z 9,8% do 5,4%. Problem najprawdopodobniej znajduje się w silniku rezerwacyjnym.";
    else if (lower.includes("skal")) a = "Wstępny potencjał ma kampania „Wakacje | Remarketing”. Jakość ruchu jest dobra, ale do potwierdzonej oceny sprzedażowej brakuje minimum 3 rezerwacji.";
    setMessages((prev) => [...prev, { q, a }]);
    setQuestion("");
  }

  async function requestDemoDiagnosis() {
    setApiStatus("loading");
    const { data, error } = await supabase.rpc("get_demo_diagnosis", {
      target_period_id: "20000000-0000-4000-8000-000000000001",
    });

    if (error || !data) {
      console.error("Błąd demonstracyjnego wywołania API:", error);
      setApiStatus("error");
      return;
    }

    setApiResult({
      diagnosis: data.diagnosis,
      recommendation: data.recommendation,
      confidence: data.confidence,
    });
    setApiStatus("idle");
  }

  if (view === "start") {
    return (
      <main className="start-shell">
        <div className="brand"><span className="brand-mark">H</span><span>Hotel Campaign Intelligence</span></div>
        <section className="start-card">
          <div className="eyebrow">NOWA ANALIZA</div>
          <h1>Sprawdź, co naprawdę wpływa na rezerwacje.</h1>
          <p>Połącz wyniki kampanii, zachowanie użytkowników i sprzedaż w jedną diagnozę.</p>
          <div className="form-grid">
            <label><span>Hotel</span><select aria-label="Hotel"><option>Hotel X · Gdynia</option></select></label>
            <label><span>Analizowany okres</span><select aria-label="Okres"><option>17–23 lipca 2026</option></select></label>
          </div>
          <div className="compare"><span>Okres porównawczy</span><strong>10–16 lipca 2026</strong><small>Równe okresy · te same dni tygodnia</small></div>
          <button className="primary large" onClick={() => setView("overview")}>Analizuj wyniki <span>→</span></button>
          <div className="privacy">Syntetyczne dane demonstracyjne · bez prawdziwych danych osobowych</div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand compact"><span className="brand-mark">H</span><span>Hotel<br/>Intelligence</span></div>
        <nav>
          {nav.map((item) => <button key={item.id} className={(view === item.id || (view === "campaign" && item.id === "campaigns")) ? "active" : ""} onClick={() => setView(item.id)}><span className="nav-dot"/>{item.label}</button>)}
        </nav>
        <div className="side-bottom">
          <button onClick={() => setSettings(true)}>⚙ <span>Progi oceny</span></button>
          <button onClick={() => setView("start")}>↩ <span>Zmień analizę</span></button>
          <div className="profile"><span>AB</span><div><strong>Anna Brendel</strong><small>Specjalistka kampanii</small></div></div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div><strong>Hotel X</strong><span>Gdynia · 17–23 lipca 2026</span></div>
          <div className="top-actions"><span className="demo-pill">{connection === "connected" ? "Supabase · połączono" : connection === "loading" ? "Łączenie z bazą…" : "Tryb lokalny · fallback"}</span><button onClick={() => setChat(true)}>✦ Zapytaj dane</button></div>
        </header>

        {view === "overview" && <Overview campaigns={campaigns} apiResult={apiResult} apiStatus={apiStatus} onApiRequest={requestDemoDiagnosis} onCampaign={(id) => { setSelectedId(id); setView("campaign"); }} onAll={() => setView("campaigns")} onChat={() => setChat(true)} />}
        {view === "campaigns" && <Campaigns campaigns={campaigns} onSelect={(id) => { setSelectedId(id); setView("campaign"); }} />}
        {view === "campaign" && <CampaignDetail campaign={selected} onBack={() => setView("campaigns")} onFunnel={() => setView("funnel")} />}
        {view === "funnel" && <Funnel />}
        {view === "channels" && <Channels />}
      </main>

      {settings && <Settings onClose={() => setSettings(false)} />}
      {chat && <Chat messages={messages} question={question} setQuestion={setQuestion} ask={ask} answer={chatAnswer} onClose={() => setChat(false)} />}
    </div>
  );
}

function Overview({
  campaigns,
  apiResult,
  apiStatus,
  onApiRequest,
  onCampaign,
  onAll,
  onChat,
}: {
  campaigns: Campaign[];
  apiResult: { diagnosis: string; recommendation: string; confidence: string } | null;
  apiStatus: "idle" | "loading" | "error";
  onApiRequest: () => void;
  onCampaign: (id: string) => void;
  onAll: () => void;
  onChat: () => void;
}) {
  return <div className="page">
    <div className="page-heading"><div><span className="eyebrow">DIAGNOZA HOTELU</span><h1>Pakiet budzi zainteresowanie.<br/>Rezerwacja zatrzymuje się w silniku.</h1></div><span className="confidence amber">● Wysokie prawdopodobieństwo</span></div>
    <section className="diagnosis-card">
      <div className="diagnosis-icon">!</div>
      <div><h3>Rezerwacje pakietu „Wakacje w Gdyni” spadły z 7 do 2</h3><p>Ruch z kampanii wzrósł o 12%, a wybory terminu o 21%. Największy spadek występuje między pierwszym i drugim krokiem rezerwacji.</p>
      <div className="recommend"><span>REKOMENDACJA</span><strong>Nie zwiększaj całego budżetu. Sprawdź step2, dostępność i warunki pobytu na jedną noc.</strong></div></div>
    </section>
    <section className="api-test-card">
      <div>
        <span className="eyebrow">DEMONSTRACJA API</span>
        <h3>Przechwyć rzeczywiste zapytanie JSON</h3>
        <p>Przycisk wywołuje odczytową funkcję Supabase metodą POST. Nie zmienia żadnych danych.</p>
      </div>
      <button className="primary" onClick={onApiRequest} disabled={apiStatus === "loading"}>
        {apiStatus === "loading" ? "Pobieranie…" : "Pobierz diagnozę z API"}
      </button>
      {apiResult && <div className="api-result"><strong>Odpowiedź API</strong><span>{apiResult.diagnosis}</span><small>{apiResult.confidence} · dane syntetyczne</small></div>}
      {apiStatus === "error" && <div className="api-error">Nie udało się wywołać funkcji. Sprawdź, czy skrypt 06 został uruchomiony w Supabase.</div>}
    </section>
    <div className="metrics">
      <Metric label="Rezerwacje pakietu" value="2" delta="−71%" bad note="było 7" />
      <Metric label="Wartość rezerwacji" value="5 480 zł" delta="−71%" bad note="było 18 620 zł" />
      <Metric label="Wydatki reklamowe" value="8 450 zł" delta="+18%" note="było 7 160 zł" />
      <Metric label="Wartościowe kontakty" value="18" delta="+29%" good note="było 14" />
    </div>
    <div className="section-title"><div><span className="eyebrow">NAJWAŻNIEJSZE ZMIANY</span><h2>Co wpłynęło na wynik?</h2></div><button className="text-button" onClick={() => {}}>Zobacz pełny lejek →</button></div>
    <div className="insights">
      <article><span className="number">01</span><div><h3>Ruch nadal jest wartościowy</h3><p>Sesje zaangażowane wzrosły o 15%, a otwarcia pakietu o 18%.</p></div><span className="trend good">+15%</span></article>
      <article><span className="number">02</span><div><h3>Problem pojawia się po wyborze terminu</h3><p>Przejście step1 → step2 spadło z 9,8% do 5,4%.</p></div><span className="trend bad">−45%</span></article>
    </div>
    <div className="two-col">
      <section><div className="section-title small"><div><span className="eyebrow">WYMAGAJĄ DECYZJI</span><h2>Kampanie</h2></div><button className="text-button" onClick={onAll}>Wszystkie →</button></div>
        <div className="campaign-short">
          {campaigns.slice(0,4).map((c) => <button key={c.id} onClick={() => onCampaign(c.id)}><span className={`channel ${c.channel.startsWith("Meta") ? "meta" : "google"}`}>{c.channel.startsWith("Meta") ? "M" : "G"}</span><div><strong>{c.name}</strong><small>{c.channel}</small></div><span className={`status ${c.tone}`}>{c.status}</span><b>→</b></button>)}
        </div>
      </section>
      <section className="actions-card"><span className="eyebrow">PRIORYTETY</span><h2>Co zrobić najpierw?</h2>
        <ol><li><span>1</span><div><strong>Sprawdź drugi krok rezerwacji</strong><small>Cena, dostępność i błędy techniczne</small></div></li><li><span>2</span><div><strong>Zweryfikuj pobyty jednodniowe</strong><small>13 potwierdzonych zapytań telefonicznych</small></div></li><li><span>3</span><div><strong>Odśwież kampanię weekendową</strong><small>CTR −24%, CPC +31%</small></div></li></ol>
      </section>
    </div>
    <button className="ask-banner" onClick={onChat}><span>✦</span><div><strong>Zapytaj o wyniki własnymi słowami</strong><small>Dlaczego rezerwacje spadły? Jaki wpływ ma Meta na Google?</small></div><b>Otwórz chat →</b></button>
  </div>
}

function Metric({ label, value, delta, note, bad, good }: any) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong><div><b className={bad ? "bad" : good ? "good" : ""}>{delta}</b><small>{note}</small></div></article>;
}

function Campaigns({ campaigns, onSelect }: { campaigns: Campaign[]; onSelect: (id: string) => void }) {
  return <div className="page">
    <div className="page-heading"><div><span className="eyebrow">KAMPANIE</span><h1>Gdzie potrzebna jest decyzja?</h1><p>Ocena łączy reklamę, jakość ruchu, zachowanie i wynik sprzedażowy.</p></div></div>
    <div className="filter-row"><button className="selected">Wszystkie <b>{campaigns.length}</b></button><button>Dobre wyniki <b>1</b></button><button>Wymagają uwagi <b>2</b></button><button>Za mało danych <b>1</b></button></div>
    <div className="campaign-table">
      <div className="table-head"><span>Kampania</span><span>Status</span><span>Wydatki</span><span>Jakość ruchu</span><span>Mikro-konw.</span><span>Rezerwacje</span><span/></div>
      {campaigns.map((c) => <button className="table-row" key={c.id} onClick={() => onSelect(c.id)}><span className="campaign-name"><i className={`channel ${c.channel.startsWith("Meta") ? "meta" : "google"}`}>{c.channel.startsWith("Meta") ? "M" : "G"}</i><span><strong>{c.name}</strong><small>{c.channel}</small></span></span><span><i className={`status ${c.tone}`}>{c.status}</i></span><span><strong>{c.spend}</strong><small className={c.spendDelta.includes("+") ? "bad-text" : ""}>{c.spendDelta}</small></span><span><strong>{c.engagement}</strong><small>zaangażowanie</small></span><span><strong>{c.micro}</strong><small>intencja śr./wys.</small></span><span><strong>{c.bookings}</strong><small>pakiet</small></span><span className="arrow">→</span></button>)}
    </div>
    <div className="info-strip">ⓘ Status kampanii może różnić się dla reklamy, ruchu i sprzedaży. Otwórz kampanię, aby zobaczyć poziom kompletności danych.</div>
  </div>
}

function CampaignDetail({ campaign: c, onBack, onFunnel }: { campaign: Campaign; onBack: () => void; onFunnel: () => void }) {
  return <div className="page">
    <button className="back" onClick={onBack}>← Wszystkie kampanie</button>
    <div className="page-heading campaign-heading"><div><div className="campaign-kicker"><span className={`channel ${c.channel.startsWith("Meta") ? "meta" : "google"}`}>{c.channel.startsWith("Meta") ? "M" : "G"}</span>{c.channel}</div><h1>{c.name}</h1></div><span className={`status big ${c.tone}`}>{c.status}</span></div>
    <section className="diagnosis-card"><div className="diagnosis-icon">!</div><div><span className="eyebrow">DIAGNOZA KAMPANII</span><h3>{c.diagnosis}</h3><div className="evidence">{c.evidence.map(e => <span key={e}>{e}</span>)}</div><div className="recommend"><span>REKOMENDACJA</span><strong>{c.recommendation}</strong></div></div></section>
    <div className="data-readiness">
      <h3>Gotowość danych do oceny</h3>
      {["Reklama", "Jakość ruchu", "Zachowanie w lejku", "Wynik sprzedażowy"].map((x, i) => <div key={x}><span>{x}</span><b className={(c.id === "search" || (i === 3 && ["prospecting","remarketing"].includes(c.id))) ? "partial" : "ready"}>{(c.id === "search" || (i === 3 && ["prospecting","remarketing"].includes(c.id))) ? "Za mało danych" : "Można ocenić"}</b></div>)}
    </div>
    <div className="metrics"><Metric label="Wydatki" value={c.spend} delta={c.spendDelta} note="vs poprzedni okres"/><Metric label="Sesje" value={c.sessions} delta={c.id === "weekend" ? "+4%" : "+18%"} note="vs poprzedni okres"/><Metric label="Zaangażowanie" value={c.engagement} delta={c.id === "weekend" ? "−17%" : "+6%"} bad={c.id === "weekend"} good={c.id !== "weekend"} note="zmiana"/><Metric label="Rezerwacje" value={c.bookings} delta={c.bookings === "0" ? "brak" : "pakiet"} bad={c.bookings === "0"} note="w tym okresie"/></div>
    <section className="layer-card"><div className="section-title small"><div><span className="eyebrow">PEŁNA ŚCIEŻKA</span><h2>Od reklamy do wyniku</h2></div><button className="text-button" onClick={onFunnel}>Zobacz lejek →</button></div>
      <div className="layers"><div><span>01</span><strong>Reklama</strong><small>CTR 1,82% · CPC 2,43 zł</small></div><b>→</b><div><span>02</span><strong>Ruch</strong><small>{c.engagement} zaangażowania</small></div><b>→</b><div><span>03</span><strong>Intencja</strong><small>{c.micro} mikro-konwersji</small></div><b>→</b><div><span>04</span><strong>Wynik</strong><small>{c.bookings} rezerwacji</small></div></div>
    </section>
  </div>
}

function Funnel() {
  const steps = [["Wejścia na stronę","1 920","100%","+12%"],["Sesje zaangażowane","1 242","64,7%","+15%"],["Otwarcie pakietu","612","31,9%","+18%"],["Wybór terminu","291","15,2%","+21%"],["step1","184","9,6%","+13%"],["step2","10","0,5%","−38%"],["step3","6","0,3%","−40%"],["Rezerwacja","2","0,1%","−71%"]];
  return <div className="page"><div className="page-heading"><div><span className="eyebrow">LEJEK ZACHOWAŃ</span><h1>Problem zaczyna się po wyborze terminu.</h1><p>Porównanie 17–23 lipca z analogicznym okresem poprzedniego tygodnia.</p></div><span className="confidence amber">● Największy spadek: step1 → step2</span></div>
    <div className="funnel-card">{steps.map((s,i) => <div className={`funnel-step ${i===5 ? "critical":""}`} key={s[0]} style={{width:`${100-i*5}%`}}><span className="step-index">{String(i+1).padStart(2,"0")}</span><strong>{s[0]}</strong><b>{s[1]}</b><small>{s[2]} wejść</small><i className={s[3].includes("−") ? "bad-text":"good-text"}>{s[3]}</i>{i<steps.length-1 && <em>↓ {i===4 ? "spadek o 45% vs poprzedni okres" : ""}</em>}</div>)}</div>
    <section className="diagnosis-card compact-card"><div className="diagnosis-icon">!</div><div><h3>Użytkownicy chcą sprawdzić termin, ale nie przechodzą dalej</h3><p>Do sprawdzenia: brak dostępności, minimalna długość pobytu, zmiana ceny, dodatkowe koszty lub błąd techniczny w step2.</p></div></section>
  </div>
}

function Channels() {
  const rows = [["Meta Ads",56,29,8],["Google Ads",24,44,51],["Direct",12,19,33],["Organic",8,8,8]];
  return <div className="page"><div className="page-heading"><div><span className="eyebrow">UDZIAŁ KANAŁÓW</span><h1>Meta rozpoczyna. Google i Direct domykają.</h1><p>Model oparty na zagregowanych sygnałach i prawdopodobieństwie, nie pełnej atrybucji użytkownika.</p></div><span className="confidence blue">● Wysokie prawdopodobieństwo</span></div>
    <div className="channel-grid"><section><h2>Rola kanałów w ścieżce</h2><div className="legend"><span>Rozpoczęcie</span><span>Wsparcie</span><span>Domknięcie</span></div>{rows.map(r => <div className="channel-row" key={r[0]}><strong>{r[0]}</strong><div><i style={{width:`${r[1]}%`}}>{r[1]}%</i></div><div><i style={{width:`${r[2]}%`}}>{r[2]}%</i></div><div><i style={{width:`${r[3]}%`}}>{r[3]}%</i></div></div>)}</section>
      <section className="paths"><h2>Najczęstsze ścieżki</h2>{[["Meta","Google Brand","Direct","Telefon"],["Meta","Google Brand","Rezerwacja"],["Meta Remarketing","Direct","Rezerwacja"],["Google Search","Direct","Wybór terminu"]].map((p,i)=><div key={i}><span>{i+1}</span><p>{p.map((x,j)=><span key={x}><b>{x}</b>{j<p.length-1 && " → "}</span>)}</p><small>{[7,4,3,2][i]} ścieżki</small></div>)}</section></div>
    <section className="diagnosis-card compact-card"><div className="diagnosis-icon">↗</div><div><h3>Nie oceniaj Meta wyłącznie na podstawie ostatniego kliknięcia</h3><p>42% ścieżek domkniętych przez Google Brand rozpoczęło się wcześniej od kontaktu z kampanią Meta.</p></div></section>
  </div>
}

function Settings({ onClose }: { onClose: () => void }) {
  return <div className="overlay" onClick={onClose}><aside className="settings-panel" onClick={e=>e.stopPropagation()}><div className="panel-head"><div><span className="eyebrow">HOTEL X</span><h2>Progi oceny</h2><p>Wartości demonstracyjne dla tego hotelu.</p></div><button onClick={onClose}>×</button></div>
    <div className="setting-section"><h3>Minimalna ilość danych</h3><Setting label="Minimalny czas emisji" value="3 dni"/><Setting label="Minimalne wydatki" value="150 zł"/><Setting label="Sesje — ocena reklamy" value="50"/><Setting label="Sesje — jakość ruchu" value="150"/><Setting label="Mikro-konwersje" value="20"/></div>
    <div className="setting-section"><h3>Progi częstotliwości</h3><Setting label="Zimny ruch" value="2,0"/><Setting label="Remarketing" value="5,0"/><Setting label="Kampanie krótkoterminowe" value="3,0"/></div>
    <div className="setting-section"><h3>Ocena sprzedażowa</h3><Setting label="Minimalna liczba rezerwacji" value="3"/><Setting label="Minimalny ROAS" value="4,0"/><Setting label="Maks. koszt rezerwacji" value="450 zł"/></div>
    <button className="primary full" onClick={onClose}>Zapisz ustawienia</button><small className="setting-note">Zmiany mają charakter demonstracyjny i nie są zapisywane w zewnętrznym systemie.</small>
  </aside></div>
}
function Setting({label,value}:{label:string,value:string}) { return <label className="setting"><span>{label}</span><input defaultValue={value}/></label> }

function Chat({ messages, question, setQuestion, ask, onClose }: any) {
  const prompts = ["Dlaczego rezerwacje spadły?","Jaki wpływ ma Meta na Google?","Czy coś można skalować?"];
  return <div className="overlay chat-overlay" onClick={onClose}><aside className="chat-panel" onClick={e=>e.stopPropagation()}><div className="panel-head"><div><span className="eyebrow">ROZMOWA Z DANYMI</span><h2>Zapytaj Hotel X</h2><p>17–23 lipca 2026</p></div><button onClick={onClose}>×</button></div>
    <div className="chat-body">{messages.length===0 && <div className="chat-welcome"><span>✦</span><h3>Co chcesz sprawdzić?</h3><p>Odpowiedzi odnoszą się do wybranego hotelu, okresu i danych demonstracyjnych.</p><div>{prompts.map(p=><button key={p} onClick={()=>ask(p)}>{p}</button>)}</div></div>}
      {messages.map((m:any,i:number)=><div className="conversation" key={i}><div className="user-msg">{m.q}</div><div className="ai-msg"><span className="spark">✦</span><div><p>{m.a}</p><span className="confidence amber">● Wysokie prawdopodobieństwo</span><div className="chat-proof"><strong>Dowód</strong><span>step1 → step2: 9,8% → 5,4%</span><span>wybory terminu: +21%</span></div></div></div></div>)}
    </div>
    <div className="chat-input"><div><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder="Zadaj pytanie o wyniki…"/><button onClick={()=>ask()}>↑</button></div><small>Odpowiedzi są generowane z fikcyjnych danych demonstracyjnych.</small></div>
  </aside></div>
}
