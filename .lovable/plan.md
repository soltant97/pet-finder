# DjurHittaren: begränsad pilot för visuell bildsökning

## Mål och avgränsning
En inloggad upphittare jämför en bild med referensbilder för djur som just nu är **Borttappade**. Befintliga filter, djurprofiler, privat fotolagring och kontaktförfrågningar återanvänds. Den öppna, vanliga sökningen fortsätter fungera oförändrat.

Resultaten är **möjliga liknande djur**, aldrig bekräftad identitet eller en kalibrerad sannolikhet. Ingen ny textanalysmodell, extern vektordatabas eller betald bildtjänst ingår.

**Nu görs endast planering.** Godkännande startar fas 1; efterföljande faser får genomföras endast om dess kontrollpunkter klaras och ingen ny extern tjänst krävs.

## Fas 1 – verifiera tekniken innan appen ändras
1. Kontrollera exakt `google/gemini-embedding-2`, bildindata, embeddings-endpoint och sekretessvillkor. Katalogstöd är verifierat; faktiskt bildanrop är inte testat.
2. Gör efter godkännande ett litet, debiterbart test med en uttryckligen godkänd, icke-känslig testbild. Använd `/v1/embeddings` och dokumenterat multimodalt `input[].content[]` med `image_url`, faktisk MIME-typ och `encoding_format: float`. Verifiera säker bildöverföring med inline-bilddata; om detta inte stöds, prövas endast dokumenterad kortlivad HTTPS-leverans av testbilden. Privata användarfoton används inte i detta test.
3. Kontrollera responsens `data[].index`, ändliga numeriska `data[].embedding`, dimensioner, användning och kostnad. Behåll full standarddimension, förväntat 3072; inget modellbyte.
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
- Återanvänd kamera, förhandsvisning, filter och resultatkort. AI väljer en bild; vanlig flersbildsrapportering ändras inte.
- Visa laddning, avbryt, kvot, fel, ej indexerade referenser och tomma resultat. Behåll återgång till vanlig sökning.
- Upplys om att bilden behandlas tillfälligt och jämförelsen inte bekräftar djurets identitet.
- Återanvänd offentlig profil, ”Kontakta ägaren”, förfrågan och privat samtal. Ingen automatisk kontakt.

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
- Bekräfta rättslig grund, opt-in, biträdesvillkor, retention och region innan riktiga foton skickas. ”Zero retention” omfattar inte automatiskt app-/plattformloggar; full bildkontextloggning ska vara av.
- Oklara punkter: faktisk runtime-kompatibilitet, serverns bildcodec och belastningsgränser, modellens faktiska precision, uppmätta bildtoken/kostnader och regionala villkor. Varje punkt har en kontrollpunkt ovan; ingen är beskriven som redan verifierad.
- Extern tjänst eller annan modell kräver nytt godkännande med kostnads-/integritetsbesked.