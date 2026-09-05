"use client";

import { useMemo, useState } from "react";
import {
  demoCampaignMetrics,
  demoCampaigns,
  demoChannelPaths,
  demoFunnelMetrics,
  demoHotelSales,
  demoPeriods,
} from "../lib/demo-data";
import {
  calculatePercentChange,
  calculateRoas,
  calculateTotalSales,
} from "../lib/marketing-metrics";
import { LogoutButton } from "./logout-button";

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

type AnalysisPeriod = {
  id: string;
  hotel_id: string;
  label: string;
  current_start: string;
  current_end: string;
  comparison_start: string;
  comparison_end: string;
};

type FunnelMetric = {
  period_variant: "current" | "comparison";
  entries: number;
  engaged_sessions: number;
  package_opens: number;
  date_searches: number;
  step1: number;
  step2: number;
  step3: number;
  purchases: number;
};

type HotelSalesMetric = {
  channel: "Direct" | "Booking.com" | "Other OTA" | "Phone" | "Email";
  bookings: number;
  revenue: number;
};

type CampaignMetric = {
  campaign_id: string;
  period_id: string;
  spend: number;
  sessions: number;
  engaged_sessions: number;
  offer_views: number;
  step2: number;
  step3: number;
  engagement_rate: number;
  medium_high_intent_events: number;
  package_bookings: number;
  booking_value: number;
};

type ChannelPath = {
  id: string;
  path_label: string;
  path_count: number;
  outcome: string;
  confidence_level: string;
};

type MetricProps = {
  label: string;
  value: string;
  delta: string;
  note: string;
  bad?: boolean;
  good?: boolean;
};

type ChatProps = {
  messages: Array<{ q: string; a: string }>;
  question: string;
  setQuestion: (value: string) => void;
  ask: (text?: string) => void;
  periodLabel: string;
  onClose: () => void;
};

const fallbackPeriod: AnalysisPeriod = {
  id: "20000000-0000-4000-8000-000000000001",
  hotel_id: "10000000-0000-4000-8000-000000000001",
  label: "18–31 lipca 2026 vs 4–17 lipca 2026",
  current_start: "2026-07-18",
  current_end: "2026-07-31",
  comparison_start: "2026-07-04",
  comparison_end: "2026-07-17",
};

const demoCampaignIds = [
  "30000000-0000-4000-8000-000000000006",
  "30000000-0000-4000-8000-000000000002",
  "30000000-0000-4000-8000-000000000005",
];

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const startDay = new Intl.DateTimeFormat("pl-PL", { day: "numeric", timeZone: "UTC" }).format(startDate);
  const endText = formatter.format(endDate);
  return `${startDay}–${endText}`;
}

function percentChange(current: number, comparison: number) {
  if (comparison === 0) return current === 0 ? "0%" : "+100%";
  const value = Math.round(((current - comparison) / comparison) * 100);
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)}%`;
}

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
  const periods = demoPeriods;
  const [selectedPeriodId, setSelectedPeriodId] = useState(fallbackPeriod.id);
  const [settings, setSettings] = useState(false);
  const [chat, setChat] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ q: string; a: string }[]>([]);
  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId) ?? fallbackPeriod;
  const currentPeriodLabel = formatDateRange(selectedPeriod.current_start, selectedPeriod.current_end);
  const comparisonPeriodLabel = formatDateRange(selectedPeriod.comparison_start, selectedPeriod.comparison_end);

  const periodData = useMemo(() => {
    const period = demoPeriods.find((item) => item.id === selectedPeriodId) ?? demoPeriods[0];
    const comparisonPeriod = periods.find((item) =>
      item.current_start === period.comparison_start
      && item.current_end === period.comparison_end
      && item.hotel_id === period.hotel_id,
    );
    const metrics = demoCampaignMetrics.filter((item) => item.period_id === period.id && item.hotel_id === period.hotel_id);
    const sales = demoHotelSales.filter((item) => item.period_id === period.id && item.hotel_id === period.hotel_id);
    const funnels = demoFunnelMetrics.filter((item) => item.period_id === period.id && item.hotel_id === period.hotel_id);
    const hasRequiredData = metrics.length === demoCampaignIds.length
      && sales.length === 5
      && funnels.some((item) => item.period_variant === "current");
    if (!hasRequiredData) {
      return { campaigns: [] as Campaign[], funnelMetrics: [] as FunnelMetric[], channelPaths: [] as ChannelPath[], hotelSales: [] as HotelSalesMetric[], comparisonHotelSales: [] as HotelSalesMetric[], campaignMetrics: [] as CampaignMetric[], comparisonCampaignMetrics: [] as CampaignMetric[], connection: "no_data" as const };
    }

    const mapped = demoCampaigns
      .filter((row) => row.hotel_id === period.hotel_id && demoCampaignIds.includes(row.id))
      .map((row) => {
        const metric = metrics.find((item) => item.campaign_id === row.id && item.period_id === period.id);
        const fallbackByCampaignId: Record<string, Campaign> = {
          "30000000-0000-4000-8000-000000000006": fallbackCampaigns[0],
          "30000000-0000-4000-8000-000000000002": fallbackCampaigns[1],
          "30000000-0000-4000-8000-000000000005": fallbackCampaigns[4],
        };
        const narrative = fallbackByCampaignId[row.id] ?? fallbackCampaigns[0];
        const tone = row.status === "Działa dobrze" ? "green" : row.status.includes("potencjał") ? "blue" : row.status.includes("Przepalanie") ? "red" : row.status.includes("Za mało") ? "gray" : "amber";

        return {
          ...narrative,
          id: row.id,
          name: row.campaign_name,
          channel: row.channel,
          status: row.status,
          tone,
          spend: `${new Intl.NumberFormat("pl-PL").format(Number(metric?.spend ?? 0))} zł`,
          sessions: new Intl.NumberFormat("pl-PL").format(metric?.sessions ?? 0),
          engagement: `${Number(metric?.engagement_rate ?? 0).toLocaleString("pl-PL")}%`,
          micro: new Intl.NumberFormat("pl-PL").format(metric?.medium_high_intent_events ?? 0),
          bookings: String(metric?.package_bookings ?? 0),
          diagnosis: narrative.diagnosis,
          recommendation: narrative.recommendation,
          confidence: narrative.confidence,
          evidence: narrative.evidence,
        };
      });

    return {
      campaigns: mapped,
      funnelMetrics: funnels as FunnelMetric[],
      channelPaths: demoChannelPaths.filter((item) => item.period_id === period.id && item.hotel_id === period.hotel_id) as ChannelPath[],
      hotelSales: sales as HotelSalesMetric[],
      comparisonHotelSales: comparisonPeriod ? demoHotelSales.filter((item) => item.period_id === comparisonPeriod.id && item.hotel_id === period.hotel_id) as HotelSalesMetric[] : [],
      campaignMetrics: metrics as CampaignMetric[],
      comparisonCampaignMetrics: comparisonPeriod ? demoCampaignMetrics.filter((item) => item.period_id === comparisonPeriod.id && item.hotel_id === period.hotel_id) as CampaignMetric[] : [],
      connection: "connected" as const,
    };
  }, [periods, selectedPeriodId]);
  const { campaigns, funnelMetrics, channelPaths, hotelSales, comparisonHotelSales, campaignMetrics, comparisonCampaignMetrics, connection } = periodData;
  const selected = campaigns.find((item) => item.id === selectedId) ?? campaigns[0] ?? fallbackCampaigns[0];

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
            <label><span>Analizowany okres</span><select aria-label="Okres" value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>{periods.map((period) => <option key={period.id} value={period.id}>{formatDateRange(period.current_start, period.current_end)}</option>)}</select></label>
          </div>
          <div className="compare"><span>Okres porównawczy</span><strong>{comparisonPeriodLabel}</strong><small>Równe okresy · te same dni tygodnia</small></div>
          <button className="primary large" onClick={() => setView("overview")}>Analizuj wyniki <span>→</span></button>
          {connection === "no_data" && <div className="privacy">NO_DATA_FOR_SELECTED_PERIOD · brak kompletnego zestawu danych dla wybranego okresu</div>}
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
          <LogoutButton />
          <div className="profile"><span>AB</span><div><strong>Anna Brendel</strong><small>Specjalistka kampanii</small></div></div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div><strong>Hotel X</strong><span>Gdynia · {currentPeriodLabel}</span></div>
          <div className="top-actions"><span className="demo-pill">{connection === "connected" ? "Dane demo · lokalne" : "NO_DATA_FOR_SELECTED_PERIOD"}</span><button onClick={() => setChat(true)}>✦ Zapytaj dane</button></div>
        </header>

        {connection === "no_data" && <div className="page"><div className="page-heading"><div><span className="eyebrow">BRAK DANYCH</span><h1>Brak danych dla wybranego okresu.</h1><p>NO_DATA_FOR_SELECTED_PERIOD — aplikacja nie podstawi danych z innego okresu.</p></div></div></div>}
        {connection !== "no_data" && view === "overview" && <Overview campaigns={campaigns} campaignMetrics={campaignMetrics} comparisonCampaignMetrics={comparisonCampaignMetrics} hotelSales={hotelSales} comparisonHotelSales={comparisonHotelSales} funnelMetrics={funnelMetrics} onCampaign={(id) => { setSelectedId(id); setView("campaign"); }} onAll={() => setView("campaigns")} />}
        {connection !== "no_data" && view === "campaigns" && <Campaigns campaigns={campaigns} onSelect={(id) => { setSelectedId(id); setView("campaign"); }} />}
        {connection !== "no_data" && view === "campaign" && <CampaignDetail campaign={selected} onBack={() => setView("campaigns")} onFunnel={() => setView("funnel")} />}
        {connection !== "no_data" && view === "funnel" && <Funnel metrics={funnelMetrics} currentPeriodLabel={currentPeriodLabel} comparisonPeriodLabel={comparisonPeriodLabel} />}
        {connection !== "no_data" && view === "channels" && <Channels paths={channelPaths} />}
      </main>

      {settings && <Settings onClose={() => setSettings(false)} />}
      {chat && <Chat messages={messages} question={question} setQuestion={setQuestion} ask={ask} periodLabel={currentPeriodLabel} onClose={() => setChat(false)} />}
    </div>
  );
}

function Overview({
  campaigns,
  campaignMetrics,
  comparisonCampaignMetrics,
  hotelSales,
  comparisonHotelSales,
  funnelMetrics,
  onCampaign,
  onAll,
}: {
  campaigns: Campaign[];
  campaignMetrics: CampaignMetric[];
  comparisonCampaignMetrics: CampaignMetric[];
  hotelSales: HotelSalesMetric[];
  comparisonHotelSales: HotelSalesMetric[];
  funnelMetrics: FunnelMetric[];
  onCampaign: (id: string) => void;
  onAll: () => void;
}) {
  const money = (value: number) => `${new Intl.NumberFormat("pl-PL").format(value)} zł`;
  const delta = (current: number, comparison?: number) => {
    if (comparison === undefined) return "—";
    const value = calculatePercentChange(current, comparison);
    if (value === null) return "—";
    const rounded = Math.round(value);
    return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${Math.abs(rounded)}%`;
  };
  const metricTotal = (metrics: CampaignMetric[], field: "spend" | "package_bookings" | "booking_value") =>
    metrics.reduce((sum, metric) => sum + Number(metric[field]), 0);
  const currentSales = calculateTotalSales(hotelSales);
  const comparisonSales = comparisonHotelSales.length ? calculateTotalSales(comparisonHotelSales) : null;
  const marketingSpend = metricTotal(campaignMetrics, "spend");
  const comparisonSpend = metricTotal(comparisonCampaignMetrics, "spend");
  const confirmedRevenue = metricTotal(campaignMetrics, "booking_value");
  const comparisonRevenue = metricTotal(comparisonCampaignMetrics, "booking_value");
  const confirmedBookings = metricTotal(campaignMetrics, "package_bookings");
  const comparisonBookings = metricTotal(comparisonCampaignMetrics, "package_bookings");
  const confirmedRoas = calculateRoas(confirmedRevenue, marketingSpend);
  const comparisonRoas = calculateRoas(comparisonRevenue, comparisonSpend);
  const metaId = "30000000-0000-4000-8000-000000000006";
  const googleBrandId = "30000000-0000-4000-8000-000000000002";
  const meta = campaignMetrics.find((metric) => metric.campaign_id === metaId);
  const previousMeta = comparisonCampaignMetrics.find((metric) => metric.campaign_id === metaId);
  const googleBrand = campaignMetrics.find((metric) => metric.campaign_id === googleBrandId);
  const previousGoogleBrand = comparisonCampaignMetrics.find((metric) => metric.campaign_id === googleBrandId);
  const currentFunnel = funnelMetrics.find((metric) => metric.period_variant === "current");
  const salesByChannel = new Map(hotelSales.map((item) => [item.channel, item]));
  const previousSalesByChannel = new Map(comparisonHotelSales.map((item) => [item.channel, item]));
  const channels: HotelSalesMetric["channel"][] = ["Direct", "Booking.com", "Phone", "Other OTA", "Email"];
  const direct = salesByChannel.get("Direct");
  const booking = salesByChannel.get("Booking.com");
  const phone = salesByChannel.get("Phone");
  const step3Change = meta && previousMeta ? delta(meta.step3, previousMeta.step3) : "—";
  const positiveSignal = Boolean(
    meta && previousMeta && meta.step3 >= previousMeta.step3
    && currentSales.bookings > (comparisonSales?.bookings ?? currentSales.bookings - 1),
  );
  const interpretation = positiveSignal
    ? "Meta Ads raportuje umiarkowany wynik bezpośredni, jednak ruch z kampanii coraz częściej dociera do wysokointencyjnych etapów lejka. W tym samym okresie rosną Google Brand i sprzedaż hotelu w kilku kanałach. Dane są zgodne z hipotezą, że marketing wspiera generowanie popytu, ale nie pozwalają przypisać wzrostu sprzedaży w innych kanałach bezpośrednio do Meta Ads."
    : "Dostępny okres pokazuje wyniki marketingu i sprzedaży hotelu, ale bez pełnego okresu odniesienia nie można jeszcze ocenić kierunku zmian. Dane nie pozwalają przypisać sprzedaży w innych kanałach bezpośrednio do Meta Ads.";

  return <div className="page overview-v2">
    <section className="overview-hero">
      <div><span className="eyebrow">HOTEL MARKETING ANALYZER</span><h1>Czy marketing naprawdę wpływa na sprzedaż?</h1><p>Zobacz nie tylko to, co przypisały sobie platformy reklamowe, ale również co wydarzyło się w lejku i całej sprzedaży hotelu.</p></div>
      <span className="synthetic-badge">DEMO — dane syntetyczne</span>
    </section>

    <section className="dashboard-section">
      <div className="v2-section-title"><span>01</span><div><small>MARKETING W SKRÓCIE</small><h2>Ile potrafimy potwierdzić?</h2></div></div>
      <div className="v2-kpis">
        <Metric label="Marketing spend" value={money(marketingSpend)} delta={delta(marketingSpend, comparisonCampaignMetrics.length ? comparisonSpend : undefined)} note="vs poprzedni okres" />
        <Metric label="Confirmed revenue" value={money(confirmedRevenue)} delta={delta(confirmedRevenue, comparisonCampaignMetrics.length ? comparisonRevenue : undefined)} note="technicznie przypisany" />
        <Metric label="Confirmed ROAS" value={confirmedRoas?.toLocaleString("pl-PL", { maximumFractionDigits: 2 }) ?? "—"} delta={comparisonRoas === null ? "—" : delta(confirmedRoas ?? 0, comparisonRoas)} note="revenue / spend" />
        <Metric label="Confirmed bookings" value={String(confirmedBookings)} delta={delta(confirmedBookings, comparisonCampaignMetrics.length ? comparisonBookings : undefined)} note="potwierdzone konwersje" />
      </div>
      <p className="definition-note">Potwierdzony wynik obejmuje wyłącznie konwersje, które możemy technicznie powiązać z kampaniami.</p>
    </section>

    <section className="dashboard-section">
      <div className="v2-section-title"><span>02</span><div><small>META ADS</small><h2>Co widzi platforma vs co widzimy w lejku?</h2></div></div>
      <div className="meta-contrast">
        <article className="meta-direct"><div className="card-heading"><div><small>META ADS</small><h3>Wynik bezpośredni</h3></div><span>DIRECT RESULT: MODERATE</span></div>
          <dl><div><dt>Spend</dt><dd>{money(meta?.spend ?? 0)}</dd></div><div><dt>Confirmed purchases</dt><dd>{meta?.package_bookings ?? 0}</dd></div><div><dt>Confirmed revenue</dt><dd>{money(meta?.booking_value ?? 0)}</dd></div><div><dt>Direct ROAS</dt><dd>{calculateRoas(meta?.booking_value ?? 0, meta?.spend ?? 0)?.toLocaleString("pl-PL", { maximumFractionDigits: 2 }) ?? "—"}</dd></div></dl>
        </article>
        <article className="meta-quality"><div className="card-heading"><div><small>META ADS</small><h3>Jakość ruchu</h3></div>{step3Change !== "—" && <span className="step3-highlight">STEP 3 {step3Change}</span>}</div>
          <div className="intent-list">
            {([
              ["Sessions", "sessions"], ["Engaged sessions", "engaged_sessions"], ["Offer / Room Views", "offer_views"], ["Step 2", "step2"], ["Step 3", "step3"], ["Purchase", "package_bookings"],
            ] as const).map(([label, field]) => <div key={field}><span>{label}</span><small>{previousMeta ? new Intl.NumberFormat("pl-PL").format(previousMeta[field]) : "—"} →</small><strong>{new Intl.NumberFormat("pl-PL").format(meta?.[field] ?? 0)}</strong><b>{previousMeta ? delta(meta?.[field] ?? 0, previousMeta[field]) : "—"}</b></div>)}
          </div>
          <p className="context-note">Brak Purchase nie oznacza automatycznie utraty użytkownika. Gość może dokończyć rezerwację innym kanałem lub w późniejszym czasie.</p>
        </article>
      </div>
    </section>

    <section className="dashboard-section">
      <div className="v2-section-title"><span>03</span><div><small>HOTEL SALES</small><h2>Co wydarzyło się w całej sprzedaży?</h2></div></div>
      <div className="sales-totals"><article><span>Wszystkie rezerwacje</span><strong>{currentSales.bookings}</strong><small>vs {comparisonSales?.bookings ?? "—"}</small><b>{delta(currentSales.bookings, comparisonSales?.bookings)}</b></article><article><span>Revenue</span><strong>{money(currentSales.revenue)}</strong><small>vs {comparisonSales ? money(comparisonSales.revenue) : "—"}</small><b>{delta(currentSales.revenue, comparisonSales?.revenue)}</b></article></div>
      <div className="sales-channels">{channels.map((channel) => { const current = salesByChannel.get(channel); const previous = previousSalesByChannel.get(channel); return <article key={channel}><div><span>{channel}</span><b>{delta(current?.bookings ?? 0, previous?.bookings)}</b></div><strong>{current?.bookings ?? 0} <small>bookings</small></strong><p>{money(current?.revenue ?? 0)}</p></article>; })}</div>
    </section>

    <section className="parallel-section">
      <div><span className="eyebrow">CO ZMIENIŁO SIĘ RÓWNOLEGLE?</span><h2>Szerszy obraz sprzedaży jest lepszy niż pojedynczy ROAS.</h2><p>Są to równoległe zmiany w analizowanym okresie. Nie oznaczają automatycznie, że sprzedaż Direct, Booking.com lub telefoniczna została wygenerowana przez Meta Ads.</p></div>
      <div className="signal-grid">
        <span><small>Meta Step 3</small><strong>{step3Change}</strong></span>
        <span><small>Google Brand sessions</small><strong>{googleBrand && previousGoogleBrand ? delta(googleBrand.sessions, previousGoogleBrand.sessions) : "—"}</strong></span>
        <span><small>Direct bookings</small><strong>{delta(direct?.bookings ?? 0, previousSalesByChannel.get("Direct")?.bookings)}</strong></span>
        <span><small>Booking.com bookings</small><strong>{delta(booking?.bookings ?? 0, previousSalesByChannel.get("Booking.com")?.bookings)}</strong></span>
        <span><small>Phone bookings</small><strong>{delta(phone?.bookings ?? 0, previousSalesByChannel.get("Phone")?.bookings)}</strong></span>
        <span><small>Hotel revenue</small><strong>{delta(currentSales.revenue, comparisonSales?.revenue)}</strong></span>
      </div>
    </section>

    <section className="impact-card"><div className="impact-status"><span>MARKETING IMPACT</span><strong>{positiveSignal ? "POSITIVE SIGNAL" : "INSUFFICIENT COMPARISON"}</strong></div><div><h2>Wstępna interpretacja</h2><p>{interpretation}</p><div className="confidence-row"><b>DATA CONFIDENCE: {campaignMetrics.length && currentFunnel && hotelSales.length ? "MEDIUM" : "LOW"}</b><span>Dostępne są dane reklamowe, GA4, funnel i sprzedaż hotelu. Brakuje jednak pełnego połączenia użytkownika pomiędzy reklamą a rezerwacjami w innych kanałach.</span></div></div></section>

    <section className="overview-campaigns"><div className="section-title small"><div><span className="eyebrow">SZCZEGÓŁY</span><h2>Kampanie</h2></div><button className="text-button" onClick={onAll}>Wszystkie →</button></div><div className="campaign-short">{campaigns.map((campaign) => <button key={campaign.id} onClick={() => onCampaign(campaign.id)}><span className={`channel ${campaign.channel.startsWith("Meta") ? "meta" : "google"}`}>{campaign.channel.startsWith("Meta") ? "M" : "G"}</span><div><strong>{campaign.name}</strong><small>{campaign.channel}</small></div><span className={`status ${campaign.tone}`}>{campaign.status}</span><b>→</b></button>)}</div></section>
  </div>;
}

function Metric({ label, value, delta, note, bad, good }: MetricProps) {
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
  const hasLimitedData = c.name === "Wakacje w Gdyni | Search";
  const hasLimitedSalesData = ["Wakacje w Gdyni | Prospecting", "Wakacje | Remarketing"].includes(c.name);
  const isWeekendCampaign = c.name === "Weekend nad morzem";
  return <div className="page">
    <button className="back" onClick={onBack}>← Wszystkie kampanie</button>
    <div className="page-heading campaign-heading"><div><div className="campaign-kicker"><span className={`channel ${c.channel.startsWith("Meta") ? "meta" : "google"}`}>{c.channel.startsWith("Meta") ? "M" : "G"}</span>{c.channel}</div><h1>{c.name}</h1></div><span className={`status big ${c.tone}`}>{c.status}</span></div>
    <section className="diagnosis-card"><div className="diagnosis-icon">!</div><div><span className="eyebrow">DIAGNOZA KAMPANII</span><h3>{c.diagnosis}</h3><div className="evidence">{c.evidence.map(e => <span key={e}>{e}</span>)}</div><div className="recommend"><span>REKOMENDACJA</span><strong>{c.recommendation}</strong></div></div></section>
    <div className="data-readiness">
      <h3>Gotowość danych do oceny</h3>
      {["Reklama", "Jakość ruchu", "Zachowanie w lejku", "Wynik sprzedażowy"].map((x, i) => <div key={x}><span>{x}</span><b className={(hasLimitedData || (i === 3 && hasLimitedSalesData)) ? "partial" : "ready"}>{(hasLimitedData || (i === 3 && hasLimitedSalesData)) ? "Za mało danych" : "Można ocenić"}</b></div>)}
    </div>
    <div className="metrics"><Metric label="Wydatki" value={c.spend} delta={c.spendDelta} note="vs poprzedni okres"/><Metric label="Sesje" value={c.sessions} delta={isWeekendCampaign ? "+4%" : "+18%"} note="vs poprzedni okres"/><Metric label="Zaangażowanie" value={c.engagement} delta={isWeekendCampaign ? "−17%" : "+6%"} bad={isWeekendCampaign} good={!isWeekendCampaign} note="zmiana"/><Metric label="Rezerwacje" value={c.bookings} delta={c.bookings === "0" ? "brak" : "pakiet"} bad={c.bookings === "0"} note="w tym okresie"/></div>
    <section className="layer-card"><div className="section-title small"><div><span className="eyebrow">PEŁNA ŚCIEŻKA</span><h2>Od reklamy do wyniku</h2></div><button className="text-button" onClick={onFunnel}>Zobacz lejek →</button></div>
      <div className="layers"><div><span>01</span><strong>Reklama</strong><small>CTR 1,82% · CPC 2,43 zł</small></div><b>→</b><div><span>02</span><strong>Ruch</strong><small>{c.engagement} zaangażowania</small></div><b>→</b><div><span>03</span><strong>Intencja</strong><small>{c.micro} mikro-konwersji</small></div><b>→</b><div><span>04</span><strong>Wynik</strong><small>{c.bookings} rezerwacji</small></div></div>
    </section>
  </div>
}

function Funnel({ metrics, currentPeriodLabel, comparisonPeriodLabel }: { metrics: FunnelMetric[]; currentPeriodLabel: string; comparisonPeriodLabel: string }) {
  const current = metrics.find((metric) => metric.period_variant === "current");
  const comparison = metrics.find((metric) => metric.period_variant === "comparison");
  if (!current || !comparison) {
    return <div className="page"><div className="page-heading"><div><span className="eyebrow">LEJEK ZACHOWAŃ</span><h1>Brak danych lejka dla wybranego okresu.</h1><p>{currentPeriodLabel} · okres porównawczy {comparisonPeriodLabel}</p></div></div></div>;
  }
  const fields: Array<[string, keyof Omit<FunnelMetric, "period_variant">]> = [["Wejścia na stronę", "entries"], ["Sesje zaangażowane", "engaged_sessions"], ["Otwarcie pakietu", "package_opens"], ["Wybór terminu", "date_searches"], ["step1", "step1"], ["step2", "step2"], ["step3", "step3"], ["Rezerwacja", "purchases"]];
  const steps = fields.map(([label, field]) => {
    const value = current[field];
    const share = current.entries ? `${((value / current.entries) * 100).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%` : "0%";
    return [label, new Intl.NumberFormat("pl-PL").format(value), share, percentChange(value, comparison[field])];
  });
  return <div className="page"><div className="page-heading"><div><span className="eyebrow">LEJEK ZACHOWAŃ</span><h1>Problem zaczyna się po wyborze terminu.</h1><p>Porównanie {currentPeriodLabel} z okresem {comparisonPeriodLabel}.</p></div><span className="confidence amber">● Największy spadek: step1 → step2</span></div>
    <div className="funnel-card">{steps.map((s,i) => <div className={`funnel-step ${i===5 ? "critical":""}`} key={s[0]} style={{width:`${100-i*5}%`}}><span className="step-index">{String(i+1).padStart(2,"0")}</span><strong>{s[0]}</strong><b>{s[1]}</b><small>{s[2]} wejść</small><i className={s[3].includes("−") ? "bad-text":"good-text"}>{s[3]}</i>{i<steps.length-1 && <em>↓ {i===4 ? "spadek o 45% vs poprzedni okres" : ""}</em>}</div>)}</div>
    <section className="diagnosis-card compact-card"><div className="diagnosis-icon">!</div><div><h3>Użytkownicy chcą sprawdzić termin, ale nie przechodzą dalej</h3><p>Do sprawdzenia: brak dostępności, minimalna długość pobytu, zmiana ceny, dodatkowe koszty lub błąd techniczny w step2.</p></div></section>
  </div>
}

function Channels({ paths }: { paths: ChannelPath[] }) {
  const rows = [["Meta Ads",56,29,8],["Google Ads",24,44,51],["Direct",12,19,33],["Organic",8,8,8]];
  return <div className="page"><div className="page-heading"><div><span className="eyebrow">UDZIAŁ KANAŁÓW</span><h1>Meta rozpoczyna. Google i Direct domykają.</h1><p>Model oparty na zagregowanych sygnałach i prawdopodobieństwie, nie pełnej atrybucji użytkownika.</p></div><span className="confidence blue">● Wysokie prawdopodobieństwo</span></div>
    <div className="channel-grid"><section><h2>Rola kanałów w ścieżce</h2><div className="legend"><span>Rozpoczęcie</span><span>Wsparcie</span><span>Domknięcie</span></div>{rows.map(r => <div className="channel-row" key={r[0]}><strong>{r[0]}</strong><div><i style={{width:`${r[1]}%`}}>{r[1]}%</i></div><div><i style={{width:`${r[2]}%`}}>{r[2]}%</i></div><div><i style={{width:`${r[3]}%`}}>{r[3]}%</i></div></div>)}</section>
      <section className="paths"><h2>Najczęstsze ścieżki</h2>{paths.map((path, i) => { const parts = path.path_label.split(" → "); return <div key={path.id}><span>{i+1}</span><p>{parts.map((part,j)=><span key={`${path.id}-${part}`}><b>{part}</b>{j<parts.length-1 && " → "}</span>)}</p><small>{path.path_count} ścieżki</small></div>; })}</section></div>
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

function Chat({ messages, question, setQuestion, ask, periodLabel, onClose }: ChatProps) {
  const prompts = ["Dlaczego rezerwacje spadły?","Jaki wpływ ma Meta na Google?","Czy coś można skalować?"];
  return <div className="overlay chat-overlay" onClick={onClose}><aside className="chat-panel" onClick={e=>e.stopPropagation()}><div className="panel-head"><div><span className="eyebrow">ROZMOWA Z DANYMI</span><h2>Zapytaj Hotel X</h2><p>{periodLabel}</p></div><button onClick={onClose}>×</button></div>
    <div className="chat-body">{messages.length===0 && <div className="chat-welcome"><span>✦</span><h3>Co chcesz sprawdzić?</h3><p>Odpowiedzi odnoszą się do wybranego hotelu, okresu i danych demonstracyjnych.</p><div>{prompts.map(p=><button key={p} onClick={()=>ask(p)}>{p}</button>)}</div></div>}
      {messages.map((m,i)=><div className="conversation" key={i}><div className="user-msg">{m.q}</div><div className="ai-msg"><span className="spark">✦</span><div><p>{m.a}</p><span className="confidence amber">● Wysokie prawdopodobieństwo</span><div className="chat-proof"><strong>Dowód</strong><span>step1 → step2: 9,8% → 5,4%</span><span>wybory terminu: +21%</span></div></div></div></div>)}
    </div>
    <div className="chat-input"><div><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder="Zadaj pytanie o wyniki…"/><button onClick={()=>ask()}>↑</button></div><small>Odpowiedzi są generowane z fikcyjnych danych demonstracyjnych.</small></div>
  </aside></div>
}
