# DjurHittaren: begränsad pilot för visuell bildsökning

## Mål och avgränsning
En inloggad upphittare jämför en bild med referensbilder för djur som just nu är **Borttappade**. Befintliga filter, djurprofiler, privat fotolagring och kontaktförfrågningar återanvänds. Den öppna, vanliga sökningen fortsätter fungera oförändrat.

Resultaten är **möjliga liknande djur**, aldrig bekräftad identitet eller en kalibrerad sannolikhet. Ingen ny textanalysmodell, extern vektordatabas eller betald bildtjänst ingår.

**Nu görs endast planering.** Godkännande startar fas 1; efterföljande faser får genomföras endast om dess kontrollpunkter klaras och ingen ny extern tjänst krävs.

## Fas 1 – verifiera tekniken innan appen ändras
1. Kontrollera aktuell tillgänglighet för exakt `google/gemini-embedding-2`, bildindata, embeddings-endpoint och arbetsytans sekretessvillkor. Katalogstödet har tidigare verifierats; ett faktiskt bildanrop har inte testats.
2. Gör efter godkännande ett litet, debiterbart test med en uttryckligen godkänd, icke-känslig testbild. Använd `/v1/embeddings` och dokumenterat multimodalt `input[].content[]` med `image_url`, faktisk MIME-typ och `encoding_format: float`. Verifiera säker bildöverföring med inline-bilddata; om detta inte stöds, prövas endast dokumenterad kortlivad HTTPS-leverans av testbilden. Privata användarfoton används inte i detta test.
3. Inspektera den faktiska responsen: `data[].index`, numeriska ändliga värden i `data[].embedding`, dimensioner, användningsmätning och kostnadslogg. Behåll modellens fulla standarddimension, förväntat 3072; ingen dimensionsminskning eller modellsubstitution.
4. Prova bildavkodning och återkodning i samma servermiljö som den publicerade appen: JPEG, PNG och WebP, orientering, EXIF/GPS, trasiga bilder och stora pixelmått. Välj en serverkompatibel JS/WASM-lösning först efter detta test. Native `sharp`/`canvas` kan inte förutsättas fungera.
5. Dokumentera uppmätt kostnad och svarstid. Om modellen, formatet, sekretessvillkoren eller bildbehandlingen inte fungerar: **stoppa piloten**, behåll vanlig sökning och återkom med hindret. Ingen annan modell eller extern tjänst införs utan nytt godkännande.

**Kontrollpunkt:** fungerande bildembedding och säker bildrensning måste vara verifierade innan databasschema, lagringsregler eller gränssnitt ändras.

## Fas 2 – säker hantering och begränsad referensindexering
- En pilotmarkering begränsar AI-funktionen till inloggade, uttryckligen tillåtna testkonton. Den är ingen ny användarroll och ger inte åtkomst till andra användares privata uppgifter.
- Piloten omfattar befintliga registrerade djur vars ägare godkänt deltagande. Varje referensfoto får en separat embedding, även när djuret inte är borttappat; sådan indexering gör inte fotot sökbart eller offentligt.
- Ägarens foto-ID kontrolleras mot befintlig ägarrelation innan servern hämtar fotot. Klienten får inte skicka godtyckliga lagringssökvägar eller externa URL:er.
- Referensbilder avkodas, orienteras och återkodas utan EXIF/GPS innan de skickas till AI. Piloten ändrar eller raderar inte originalbilderna automatiskt. Inga originalfiler skickas till AI.
- Indexering sker i små, återupptagbara batcher med innehållshash och modell-/behandlingsversion. Redan aktuella embeddings återanvänds. Fotoändring eller borttagning gör tillhörande index ogiltigt/raderat. Ingen återkommande polling för att upptäcka nya foton.
- En sökbild hanteras i serverminnet och skickas efter rensning direkt till embedding-tjänsten om fas 1 verifierar det. **Ingen permanent uppladdning och ingen `found_reports`-rad skapas av AI-sökningen.** Sökbild och sökvektor släpps efter avslutat anrop, fel eller avbrott och skrivs inte till loggar.
- Om privat mellanlagring visar sig nödvändig återkommer vi med ett separat beslut om privat temporär behållare, verifierad åtkomst och gallring. Ingen sådan lagring införs tyst.

### Validering och föreslagna pilotgränser
- Servern kontrollerar autentisering, pilottillgång, deklarerad och verklig filtyp, avkodning, 5 MB per bild, högst 20 megapixlar och en sökbild per anrop.
- Normalisera till JPEG med längst sida högst 1024 pixlar; kontrollera att pälsdetaljer inte försämrar träffarna. Metadata tas bort genom återkodning, inte enbart ändrad filändelse.
- Föreslagna gränser: 5 AI-sökningar per konto och timme, 20 per dag och ett pågående AI-jobb per konto. Referensindexering har separat begränsning och får inte kringgå arbetsytans budget.
- Backend har **ingen standardfunktion för rate limiting**. Planen föreslår därför en egen atomisk databasbaserad begränsning. Godkännande av planen bekräftar denna avvägning: den stoppar AI-anrop och kostnadsmissbruk efter autentisering, men ersätter inte ett heltäckande skydd mot överbelastning eller många nyregistrerade konton.
- Beständig pausmarkering stoppar alla AI-ingångar vid kredit-/policyblockering. Endast 429/5xx får begränsade, fördröjda återförsök. Nekad åtkomst, saknad modell och andra terminala fel stoppar arbetet utan modellbyte.

## Fas 3 – visuell sökning med befintliga filter
1. Servern validerar djurslag, ungefärligt område/ort, datum och övriga angivna djuruppgifter.
2. Databasfrågan begränsar först till `pets.status = 'borttappad'`, giltig borttappad-anmälan, pilotens referensbilder och aktuella färdiga embeddings. Samma djurslag/plats/datum-semantik som nuvarande sökning används; saknade uppgifter antas inte vara säkra fakta.
3. Jämför normaliserade bildvektorer med cosinuslikhet. För ett djur med flera bilder används **högsta likheten bland djurets referensbilder** som första pilotregel. En rad per djur returneras, högst tio kandidater. Utvärdera även medelvärdet av de två bästa bilderna i testet; ändra inte regeln utan redovisad jämförelse.
4. Plats, djurslag och datum är filter; bildlikhet är huvudsaklig rangordning. Befintlig överlappning i färg/kännetecken får användas som utslagsregel, inte som en godtyckligt viktad ”AI-säkerhet”.
5. Sökningen kan utökas område → ort/kommun → hela Sverige. Inga kilometer visas från textplatser.
6. Kontrollera borttappad-status även på servern precis före svaret. Återfunna djur försvinner från nya resultat även om embeddings finns kvar. Befintliga privata samtal påverkas inte.
7. Returnera endast tillåtna djurfält, foto-ID/visningsreferens och rangordning. Ingen embedding, privat sökväg, ägaridentitet, chipnummer eller upphittarbild lämnar servern. Kandidatbilder levereras genom kontrollerad bildvisning med kontroll av aktuell status; inte genom utlämnade privata sökvägar.

## Fas 4 – gränssnitt i befintlig svensk design
- Lägg till ett tydligt val i ”Upphittat djur”: vanlig sökning respektive ”Bildsökning – pilot”. AI-valet är endast aktivt för tillåtna inloggade konton. Vanlig sökning förblir tillgänglig för alla.
- Återanvänd kameraval, bildförhandsvisning, plats-/datumfält och resultatkort. AI-piloten väljer en sökbild utan att ändra den vanliga flersbildsrapporteringen.
- Visa laddning, avbryt, kvot nådd, tillfälligt AI-fel, ej indexerade referenser och inga kandidater. Tillåt återgång till vanlig sökning utan fabricerade AI-resultat.
- Upplys om att bilden behandlas tillfälligt och jämförelsen inte bekräftar djurets identitet.
- Resultat öppnar befintlig offentlig djurprofil och återanvänder ”Kontakta ägaren”, kontaktförfrågan och accepterat privat samtal. Ingen automatisk kontakt skapas.

## Tekniska förändringar
### Databas – endast tillägg
| Del | Innehåll och åtkomst |
|---|---|
| `pet_photo_embeddings` | Referens till befintlig `pet_photos`, modell-ID, full vektor, innehållshash, version, status och tidsstämplar. Råvektorer är server-only; foto-borttagning raderar referensen. |
| `ai_pilot_access` | Tillåtna konton och ägarens opt-in för pilotindexering. Inga självskrivbara åtkomstökningar. |
| `ai_usage_windows` | Atomiska konto-/arbetsytekvoter och tidsbegränsade jobbreservationer; inga bilder, GPS eller meddelanden. |
| `ai_pilot_settings` | Pilot av/på, budgetbegränsning och beständigt paus-/felstatus. Endast privilegierade serveråtgärder får ändra. |

- Aktivera tillgängligt `pgvector`. Lagra full standarddimension; börja med exakt jämförelse på den lilla pilotmängden. Ett eventuellt index måste stödja 3072 dimensioner, inte ett felaktigt vanligt HNSW-index med lägre dimensionsgräns.
- Samtliga nya tabeller får explicita GRANTs och RLS; ingen anonym åtkomst till vektorer, kvoter eller pilotinställningar.
- Server-only SQL-funktioner hanterar kvotreservation och matchning. Direkt anrop från klienten får inte kringgå bildvalidering, betalgränser eller indexering. Sökfrågan återanvänder befintliga relationer och safe-field-projektioner; `get_lost_pets()` och `search_lost_pets()` lämnas fungerande.

### Backend och lagring
- `src/lib/visual-search.functions.ts`: autentiserade serverfunktioner för pilotstatus, ägarens indexering och bildsökning.
- `*.server.ts`-hjälpare: validering/återkodning, exakt embedding-protokoll, kvoter och säker bildleverans. Befintlig bearer-/CSRF-hantering återanvänds.
- Befintlig privata `pet-photos` behålls. Inga bredare publik- eller gästuppladdningsregler. AI-arbetet får endast läsa verifierade foton och får inte utfärda länkar till registrerade/återfunna privata djur.
- Uppdatera referensindexets livscykel vid nya/ändrade/borttagna foton. Befintlig CRUD fortsätter även om AI misslyckas; felet markeras för kontrollerat nytt försök.
- Pilotens rensning skyddar AI-inmatningen men löser **inte automatiskt EXIF i redan publicerbara originalbilder**. Full lansering kräver en separat, godkänd sanering av den ordinarie foto-uppladdningen och befintliga bilder samt verifierad radering av övergivna vanliga uppladdningar.

## Fas 5 – verkliga tester och beslut om pilotöppning
### Träffsäkerhet
- Samtyckt dataset: minst 20 katter och 20 hundar, 2–3 referensbilder och två separata sökbilder per djur. Inkludera olika vinklar/ljus och flera olika djur med mycket lik färg/ras. Sökbilder får inte vara kopior av referensbilderna.
- Använd en utvecklingsdel för aggregation/tröskelval och en orörd utvärderingsdel. Testa också bilder på djur som inte finns i registret och ofullständiga platsuppgifter.
- Mät **Recall@1, @5 och @10**: andel sökbilder där rätt djur finns bland respektive första kandidater. Redovisa nämnare, resultat per djurslag, fel på liknande djur, svarstid och faktisk kostnad.
- Mät filterträffar separat: om plats-/datumfilter tar bort rätt djur ska detta inte döljas som ett bildmodellfel. Jämför hybrid mot befintlig sökning på samma dataset.
- Föreslagen kontrollpunkt för fortsatt begränsad pilot: Recall@5 minst 80 % på den orörda delen med korrekt kandidatfilter, inga säkerhetsfel och redovisning av samtliga felträffar. Detta är ett testmål, inte ett löfte. Ingen automatisk identitetsbekräftelse även om målet nås.

### Säkerhet och regression
- Två deltagare och en tredje användare: nekad AI-åtkomst utan login/pilottillgång, nekad åtkomst till annans privata bild/vektor och direkt SQL/RPC-kringgång.
- Djuret registreras med foton, markeras borttappat, hittas med en annan bild, öppnas och kontaktas genom befintligt flöde. Återförening tar bort nya sökträffar och bevarar samtal.
- Testa EXIF/GPS i faktisk utdata, felaktig MIME, trasig fil, stor bild, samtidig kvotreservation, avbrutet jobb, terminala AI-fel och att inga bilddata finns kvar i appens lagring/loggar.
- Kontrollera mobil/desktop, tomma resultat, utebliven indexering och att vanlig gäst-sökning och ägarens CRUD inte försämrats.

## Kostnader, sekretess och kvarstående osäkerheter
- Embedding-anrop, referensindexering, serverarbete, databas och bildtrafik använder Cloud/AI-credits. Inga köp eller planuppgraderingar sker automatiskt. Referenser beräknas en gång per ändrad bild, inte per sökning.
- Tidigare kostnadsexempel byggde på antaget tokenantal. **Faktisk bildkostnad och debiteringsenhet måste bekräftas i fas 1** innan ett belopp utlovas. Föreslagen pilotbudget är högst 10 AI-credits; om kostnaden inte kan mätas och begränsas säkert stoppas arbetet för nytt beslut.
- Bekräfta laglig grund, opt-in-information, biträdesvillkor, AI-loggning, retention och regional behandling innan riktiga foton skickas. Leverantörens ”zero retention” betyder inte att alla app-/plattformloggar saknar lagring. Stäng av full bildkontextloggning om inställningen och villkoren tillåter det.
- Oklara punkter: faktisk runtime-kompatibilitet, serverns bildcodec och belastningsgränser, modellens faktiska precision, uppmätta bildtoken/kostnader och regionala villkor. Varje punkt har en kontrollpunkt ovan; ingen är beskriven som redan verifierad.
- Om en extern bildtjänst, ny betald integration eller annan modell blir nödvändig återkommer vi med tjänst, kostnad och integritetskonsekvens **innan** något införs.