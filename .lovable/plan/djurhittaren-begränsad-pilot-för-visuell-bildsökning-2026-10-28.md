# DjurHittaren: begränsad pilot för visuell bildsökning

## Mål och avgränsning
Inloggade pilottestare jämför en bild med **Borttappade** djur. Befintliga filter, privat lagring, profiler och kontakt återanvänds. Vanlig gästsökning ändras inte.

Resultat är **möjliga liknande djur**, inte identitetsbevis. Ingen extern vektordatabas eller bildtjänst ingår.

**Endast planering nu.** Godkännande startar fas 1. Fortsättning kräver klarade kontrollpunkter; nya externa tjänster kräver nytt godkännande.

## Fas 1 – verifiera tekniken innan appen ändras
1. Kontrollera exakt `google/gemini-embedding-2`, bildindata, embeddings-endpoint och sekretessvillkor. Katalogstöd är verifierat; faktiskt bildanrop är inte testat.
2. Gör efter godkännande ett litet, debiterbart test med en uttryckligen godkänd, icke-känslig testbild. Använd `/v1/embeddings` och dokumenterat multimodalt `input[].content[]` med `image_url`, faktisk MIME-typ och `encoding_format: float`. Verifiera säker bildöverföring med inline-bilddata; om detta inte stöds, prövas endast dokumenterad kortlivad HTTPS-leverans av testbilden. Privata användarfoton används inte i detta test.
3. Kontrollera responsens `data[].index`, ändliga numeriska `data[].embedding`, dimensioner, användning och kostnad. Behåll full standarddimension, förväntat 3072; inget modellbyte.
4. Prova bildavkodning och återkodning i samma servermiljö som den publicerade appen: JPEG, PNG och WebP, orientering, EXIF/GPS, trasiga bilder och stora pixelmått. Välj en serverkompatibel JS/WASM-lösning först efter detta test. Native `sharp`/`canvas` kan inte förutsättas fungera.
5. Mät kostnad/svarstid. Om modell, format, sekretess eller bildbehandling inte fungerar: **stoppa**, behåll vanlig sökning och redovisa hindret. Inget modellbyte eller extern tjänst utan nytt godkännande.

**Kontrollpunkt:** fungerande bildembedding och säker bildrensning måste vara verifierade innan databasschema, lagringsregler eller gränssnitt ändras.

## Fas 2 – säker hantering och referensindexering
- AI är endast tillgänglig för inloggade, tillåtna pilotkonton. Ägaren godkänner indexering av sina registrerade djur. Indexering gör aldrig ett privat djur sökbart.
- Varje foto får en separat embedding. Servern verifierar foto-ID mot ägarrelationen; godtyckliga sökvägar/URL:er accepteras inte.
- Referenser avkodas, orienteras och återkodas utan EXIF/GPS innan AI. Originalbilderna ändras inte automatiskt och skickas inte till AI.
- Små återupptagbara batcher, innehållshash och modell-/behandlingsversion undviker dubbel debitering. Ändring/borttagning gör index ogiltigt. Ingen återkommande polling för nya foton.
- Sökbild och sökvektor hålls endast i serverminnet under anropet och loggas inte. Ingen permanent uppladdning eller `found_reports`-rad skapas av AI-sökningen. Minnesreferenser släpps efter slut, fel eller avbrott.
- Om privat mellanlagring krävs: stoppa och begär separat godkännande för temporär behållare, åtkomst och tidsstyrd radering. Den införs inte tyst.

### Föreslagna pilotgränser
- Servervalidera autentisering/pilottillgång, faktisk filtyp, avkodning, 5 MB, högst 20 megapixlar och en sökbild. Normalisera till JPEG, längst sida 1024 pixlar; testa att pälsdetaljer bevaras.
- 5 sökningar/konto/timme, 20/dag, ett pågående jobb/konto. Referensindexering begränsas separat men delar arbetsytans budget.
- Backend saknar standardfunktion för rate limiting. Godkännande av planen bekräftar en **egen atomisk databasbaserad begränsning**: beständig och serverkontrollerad, men inte ett komplett överbelastningsskydd eller skydd mot många nyregistrerade konton.
- Kredit-/policyblockering pausar alla AI-ingångar beständigt. Endast 429/5xx får begränsade, fördröjda återförsök. Terminala fel stoppar arbetet utan modellbyte.

## Fas 3 – bildlikhet med befintliga filter
1. Validera djurslag, textplats och datum på servern. Återanvänd nuvarande filtersemantik; saknade uppgifter antas inte vara fakta.
2. Databasen filtrerar till `pets.status = 'borttappad'`, giltig anmälan och aktuella pilotembeddings **innan** bildjämförelsen. Servern kontrollerar status igen före svaret.
3. Använd cosinuslikhet mellan normaliserade vektorer. Djurets högsta likhet bland referensbilderna ger dess rangordning; en rad/djur, högst tio kandidater.
4. Djurslag/plats/datum filtrerar; bildlikhet rangordnar. Befintlig färg-/känneteckenöverlappning får bryta lika resultat, inte skapa en godtycklig ”AI-säkerhet”.
5. Utöka område → ort/kommun → Sverige. Inga kilometer från textplatser. Återförening stoppar nya träffar men påverkar inte samtal.
6. Returnera endast tillåtna djurfält, foto-ID/visningsreferens och rang. Inga embeddings, privata sökvägar, ägaruppgifter, chipnummer eller upphittarbilder. Kandidatbilder visas med kontroll av aktuell status utan utlämnade privata sökvägar.

## Fas 4 – befintligt svenskt gränssnitt
- ”Upphittat djur” får val mellan vanlig sökning och ”Bildsökning – pilot”, endast aktiv för tillåtna konton. Ingen redesign.
- Återanvänd kamera, förhandsvisning, filter och resultatkort. AI använder en bild; vanlig flersbildsrapportering ändras inte.
- Visa laddning, avbryt, kvot, fel, saknat index och tomma resultat; erbjud vanlig sökning som reservväg.
- Informera om tillfällig bildbehandling och att likhet inte bekräftar identitet.
- Återanvänd offentlig profil och kontaktförfrågan/privat samtal. Ingen automatisk kontakt.

## Tekniska förändringar
### Databas – endast tillägg
- `pet_photo_embeddings`: FK till `pet_photos`, modell-ID, full vektor, innehållshash, behandlingsversion, status och tidsstämplar. Foto-borttagning raderar referensen. Råvektorer är server-only.
- `ai_pilot_access`: tillåtna konton och ägarens opt-in per djur. Ingen självskrivbar utökning av åtkomst.
- `ai_usage_windows`: atomiska konto-/arbetsytekvoter och tidsbegränsade jobbreservationer; inga bilder eller GPS.
- `ai_pilot_settings`: av/på, budget och beständigt pausstatus; privilegierade serveråtgärder äger ändringar.
- Aktivera tillgängligt `pgvector`; lagra full standarddimension och börja med exakt jämförelse på pilotmängden. Ett framtida index måste stödja 3072 dimensioner.
- Explicita GRANTs och RLS på alla nya tabeller. Inga klient-/anonrättigheter till råvektorer eller kvotändringar. Server-only SQL-funktioner reserverar kvot och söker med borttappad-status och befintliga relationer. Direkta klientanrop får inte kringgå betal-/åtkomstkontroller.
- `get_lost_pets()` och `search_lost_pets()` samt befintlig CRUD behålls.

### Backend och lagring
- `src/lib/visual-search.functions.ts`: autentiserade serverfunktioner för pilotstatus, ägarens indexering och bildsökning. `*.server.ts`: bildrensning, embedding-protokoll, kvoter och säker bildleverans. Återanvänd befintlig bearer-/CSRF-hantering.
- Behåll privata `pet-photos`; inga bredare publik- eller gästuppladdningsregler. Endast verifierade referenser får läsas. Kandidatbilder visas genom statuskontrollerad bildleverans utan utlämnade privata sökvägar.
- Indexering startas vid godkänd pilotanslutning eller nya/ändrade bilder. Fel stoppar inte djurregistrering; index markeras för kontrollerat nytt försök. Borttagna bilder raderar embeddings.
- Pilotens rensning skyddar AI-inmatningen, **inte EXIF i befintliga originalbilder**. Full lansering kräver separat godkänd sanering av ordinarie uppladdning/befintliga bilder och radering av övergivna vanliga uppladdningar.

## Fas 5 – verkliga tester och beslut om pilotöppning
### Träffsäkerhet
- Samtyckt dataset: minst 20 katter och 20 hundar, 2–3 referensbilder och två separata sökbilder/djur. Olika vinklar/ljus och djur med liknande färg/ras. Inga kopior av referensbilder som sökbilder.
- Separera utvecklingsdel från orörd utvärderingsdel. Testa även djur som saknas i registret och ofullständiga platsuppgifter.
- **Recall@1/@5/@10** = andel sökbilder där rätt djur finns bland första 1/5/10 kandidater. Redovisa nämnare, resultat per djurslag, felträffar på liknande djur, svarstid och verklig kostnad.
- Redovisa filterbortfall separat och jämför med vanlig sökning på samma dataset. Jämför bästa-foto-aggregation mot medelvärdet av två bästa innan regeln ändras.
- Föreslagen öppningsgräns: Recall@5 minst 80 % på orörd del med korrekt kandidatfilter, inga säkerhetsfel och redovisade felträffar. Detta är ett testmål, inte ett löfte eller stöd för automatisk identitetsbekräftelse.

### Säkerhet och regression
- Två deltagare plus tredje användare: neka AI utan login/pilottillgång, annans privata foton/vektorer och direkt RPC-kringgång.
- Registrera → borttappad → matcha annan bild → öppna profil → kontakta ägare. Återfunnet djur ska försvinna från nya träffar utan att samtalet försvinner.
- Testa EXIF/GPS i faktisk utdata, falsk MIME, trasiga/stora bilder, samtidiga kvotreservationer, avbrott, terminala AI-fel och frånvaro av kvarvarande sökbild i lagring/loggar.
- Testa mobil/desktop, tomma resultat, saknat index och fortsatt fungerande vanlig gästsökning/ägar-CRUD.

## Kostnader, sekretess och kvarstående osäkerheter
- Embedding-anrop, referensindexering, serverarbete, databas och bildtrafik använder Cloud/AI-credits. Inga köp eller planuppgraderingar sker automatiskt. Referenser beräknas en gång per ändrad bild, inte per sökning.
- Tidigare kostnadsexempel byggde på antaget tokenantal. **Faktisk bildkostnad och debiteringsenhet måste bekräftas i fas 1** innan ett belopp utlovas. Föreslagen pilotbudget är högst 10 AI-credits; om kostnaden inte kan mätas och begränsas säkert stoppas arbetet för nytt beslut.
- Bekräfta rättslig grund, opt-in, biträdesvillkor, retention och region innan riktiga foton skickas. ”Zero retention” omfattar inte automatiskt app-/plattformloggar; full bildkontextloggning ska vara av.
- Osäkerheter: runtime, bildcodec, belastningsgränser, precision, bildtoken/kostnader och regionala villkor. Kontrollpunkterna ovan måste verifiera dessa.
- Extern tjänst eller annan modell kräver nytt godkännande med kostnads-/integritetsbesked.