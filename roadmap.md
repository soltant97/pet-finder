# Kontakt och privata meddelanden
- [x] Säkra kontaktförfrågningar, meddelanden, notiser och blockering i databasen.
- [x] Offentlig djurprofil med kontakt och återgång efter inloggning.
- [x] Förfrågningar, privata samtal och levande notiser i befintlig design.
- [x] Regeltester och verkliga användarflöden, inklusive nekad åtkomst.

## Avgränsningar
- Ingen rapportering till moderatorer, push eller bildbilagor i samtal.
- Återgång efter inloggning verifierad med en riktig session; e-postbekräftelselänkens leverans och lösenordsinloggning för de nya testkontona verifierades inte.
- Två isolerade testkonton finns kvar; testdjur, bilder, samtal och notiser har städats bort.

# Godkänd bildsökningspilot
- [x] Verifiera ett verkligt bildembedding-anrop med exakt vald modell och mäta debiteringen.
- [ ] Slutför bildrensningstest: WebP med EXIF-orientering fungerar ännu inte i vald metadataavläsare; stora/trasiga format återstår.
- [ ] Bekräfta att full AI-bildkontextloggning är av innan användarfoton behandlas. Blockerare: testbildens innehåll finns i Gateway-loggen.
- [ ] Implementera databas, åtkomst/kvoter och indexering först efter godkänd teknisk/sekretesskontroll.
- [ ] Implementera skyddad bildsökning och återanvänd befintliga resultat/kontakt.
- [ ] Verifiera säkerhet, regressioner och Recall på samtyckt dataset. Blockerare: verkligt samtyckt utvärderingsdataset saknas.