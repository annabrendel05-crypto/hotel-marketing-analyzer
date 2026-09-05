import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dashboard analytics come only from local demo data", async () => {
  const [page, demoData] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/demo-data.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /const \[selectedPeriodId, setSelectedPeriodId\] = useState/);
  assert.match(page, /const period = demoPeriods\.find\(\(item\) => item\.id === selectedPeriodId\)/);
  assert.match(page, /demoCampaignMetrics\.filter/);
  assert.match(page, /demoHotelSales\.filter/);
  assert.doesNotMatch(page, /supabase/i);
  assert.doesNotMatch(page, /\.from\(/);
  assert.match(demoData, /Syntetyczne dane prezentacyjne/);
  assert.match(demoData, /export const demoPeriods/);
  assert.match(demoData, /export const demoHotelSales/);
  assert.match(page, /connection: "no_data" as const/);
  assert.match(page, /NO_DATA_FOR_SELECTED_PERIOD/);
});

test("Supabase is used only for cookie-based authentication", async () => {
  const [proxy, loginPage, loginForm, logout, client, server, envExample] = await Promise.all([
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/login-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/logout-button.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase/client.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.match(proxy, /supabase\.auth\.getUser\(\)/);
  assert.match(proxy, /if \(!user && !isLogin\)/);
  assert.match(proxy, /new URL\("\/login", request\.url\)/);
  assert.match(proxy, /matcher: \["\/", "\/login"\]/);
  assert.match(loginPage, /if \(user\) redirect\("\/"\)/);
  assert.match(loginForm, /Hotel Marketing Analyzer/);
  assert.match(loginForm, /Zaloguj się, aby przejść do analizy/);
  assert.match(loginForm, /signInWithPassword/);
  assert.match(loginForm, /Nieprawidłowy e-mail lub hasło/);
  assert.doesNotMatch(loginForm, /signUp|signInWithOAuth|signInWithOtp/);
  assert.match(logout, /supabase\.auth\.signOut\(\)/);
  assert.match(logout, /router\.replace\("\/login"\)/);
  assert.match(client, /createBrowserClient/);
  assert.match(server, /createServerClient/);
  assert.match(server, /await cookies\(\)/);
  assert.match(envExample, /^NEXT_PUBLIC_SUPABASE_URL=/m);
  assert.match(envExample, /^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/m);
  assert.doesNotMatch(envExample, /SERVICE_ROLE|SECRET_KEY|password|eyJ/i);
});

test("overview v2 is business-first and preserves attribution boundaries", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Czy marketing naprawdę wpływa na sprzedaż\?/);
  assert.match(page, /DEMO — dane syntetyczne/);
  assert.match(page, /Confirmed revenue/);
  assert.match(page, /calculateRoas\(confirmedRevenue, marketingSpend\)/);
  assert.match(page, /calculateTotalSales\(hotelSales\)/);
  assert.match(page, /demoHotelSales/);
  assert.match(page, /Meta Ads.*wysokointencyjnych etapów lejka/s);
  assert.match(page, /Nie oznaczają automatycznie, że sprzedaż Direct, Booking\.com lub telefoniczna została wygenerowana przez Meta Ads/);
  assert.doesNotMatch(page, /Meta (?:wygenerowała|wygenerował).*Booking\.com/i);
  assert.match(page, /DATA CONFIDENCE:/);
  assert.match(page, /onCampaign\(campaign\.id\)/);
  assert.match(css, /@media\(max-width:1000px\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /\.sales-channels\{display:grid/);
});
