-- Dostęp aplikacji wyłącznie do odczytu danych syntetycznych.
-- Skrypt nie przyznaje uprawnień INSERT, UPDATE ani DELETE.

create policy "Publiczny odczyt syntetycznych hoteli"
on public.hotels
for select
to anon, authenticated
using (is_synthetic = true);

create policy "Publiczny odczyt syntetycznych okresów"
on public.analysis_periods
for select
to anon, authenticated
using (is_synthetic = true);

create policy "Publiczny odczyt syntetycznych kampanii"
on public.campaigns
for select
to anon, authenticated
using (is_synthetic = true);

create policy "Publiczny odczyt syntetycznych wyników kampanii"
on public.campaign_metrics
for select
to anon, authenticated
using (is_synthetic = true);

create policy "Publiczny odczyt syntetycznego lejka"
on public.funnel_metrics
for select
to anon, authenticated
using (is_synthetic = true);

create policy "Publiczny odczyt syntetycznych kontaktów"
on public.contact_metrics
for select
to anon, authenticated
using (is_synthetic = true);

create policy "Publiczny odczyt syntetycznych ścieżek kanałów"
on public.channel_paths
for select
to anon, authenticated
using (is_synthetic = true);

create policy "Publiczny odczyt syntetycznych diagnoz"
on public.diagnoses
for select
to anon, authenticated
using (is_synthetic = true);

create policy "Publiczny odczyt syntetycznych progów"
on public.evaluation_thresholds
for select
to anon, authenticated
using (is_synthetic = true);

