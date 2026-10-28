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
- Oklara punkter: faktisk runtime-kompatibilitet, serverns bildcodec och belastningsgränser, modellens faktiska precision, uppmätta bildtoken/kostnader och regionala villkor. Varje punkt har en kontrollpunkt ovan; ingen är beskriven som redan verifierad.
- Extern tjänst eller annan modell kräver nytt godkännande med kostnads-/integritetsbesked.