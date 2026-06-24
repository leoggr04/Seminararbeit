# deleteUserData

Standalone-Webseite zum Löschen eines Benutzerkontos.

## Inhalt

- `index.html` Einstiegspunkt der Seite
- `styles.css` responsives Styling
- `api.js` eigene API-Helfer für Login, User-Lookup und Löschen
- `app.js` Formularlogik und Fehlerbehandlung

## Verhalten

1. E-Mail und Passwort eingeben
2. Konto mit `POST /api/auth/login` verifizieren
3. User-ID über Login-Antwort oder `GET /api/users/by-email` ermitteln
4. Zweite Bestätigung mit `bist du sicher`
5. `DELETE /api/users/{id}` ausführen

## Hinweis

Die API-Basis-URL ist in `api.js` fest verdrahtet. Falls sich der Backend-Host ändert, muss dort nur der Wert von `API_BASE_URL` angepasst werden.