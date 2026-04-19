# HomeOverview tabletpaneel

Open het dashboard via een webserver, niet rechtstreeks via `file://`.

Gemakkelijk op Windows:

```text
start-dashboard.bat
```

Lokaal testen:

```powershell
php -S 127.0.0.1:8123
```

Open daarna `http://127.0.0.1:8123/index.html`.

Overzichtspagina's:

- `http://127.0.0.1:8123/webcams.html`
- `http://127.0.0.1:8123/verwarming.html`
- `http://127.0.0.1:8123/schakelaars.html`
- `http://127.0.0.1:8123/rolluiken.html`
- `http://127.0.0.1:8123/planten.html`
- `http://127.0.0.1:8123/netwerk.html`
- `http://127.0.0.1:8123/beheer.html`

Tablet op hetzelfde netwerk:

```text
http://192.168.129.3:8123/index.html
```

Als de tablet niet opent, voer dan `allow-dashboard-firewall-admin.bat` uit met rechtsklik `Als administrator uitvoeren`.

Home Assistant draait in VirtualBox op:

```text
http://127.0.0.1:8124
```

Het dashboard blijft op poort `8123`; Home Assistant gebruikt hostpoort `8124` en wordt intern doorgestuurd naar `8123` in de VM.

## Ingevuld

- Compacte tabletlayout die op brede schermen binnen ongeveer `1200x800` past.
- Bovenaan staan knoppen naar het dashboard, webcams, verwarming, Qnect-schakelaars en rolluiken.
- Dag, datum en uur bovenaan.
- Huidige buitentemperatuur via Open-Meteo.
- Daikin-bediening als dashboardpaneel.
- Sonoff-schakelaars als dashboardpaneel.
- Webcam-overzicht met configureerbare camera-URL's.
- Online camerascan: Foscam op `192.168.129.0:88`.
- Plantbewatering via `http://192.168.128.238/`, bedoeld voor wifi-netwerk `Schokkaer_EXT`.
- Visueel netwerkoverzicht via `netwerk.html`, met modem, RE190, LAN, camera's en bekende toestellen.
- Kleine Engie/elektriciteitsgrafiek op basis van de dagfile van vandaag.
- Als de dagfile van morgen al beschikbaar is, toont de grafiek vandaag en morgen samen.
- Per datum probeert de grafiek eerst `downloads.php?action=sonoff_json&date=YYYY-MM-DD` te laden.
- Als fallback probeert het dashboard `out/history/engie_YYYY-MM-DD.csv`.
- `energy-proxy.php` haalt de dagfile server-side op, zodat de browser geen CORS-fout krijgt.

## Nog te koppelen

Pas in `app.js` deze waarden aan:

- `weather.latitude` en `weather.longitude` voor de juiste locatie.
- `qnectSwitches` bevat nu Keuken en Badkamer.
- `shutters` bevat Rolluik keuken, Rolluik achteraan en Rolluik zijkant.
- `cameras.url` voor de stream- of snapshot-URL's van je webcams.
- De Foscam staat klaar in `foscamCamera` met IP `192.168.129.0` en poort `88`.
- Tik op de Foscam-tegel in het dashboard om de lokale camera-login in de browser van de tablet te bewaren.
- De Foscam-login wordt niet in de broncode gezet; de tablet bewaart die in `localStorage`.
- In dit netwerk is `192.168.129.0` geldig, omdat het wifi-subnet `192.168.128.0/23` gebruikt.
- Gebruik `beheer.html` om weerlocatie, Engie-bron, plantensysteem, Foscam-host, camera's, Qnect-schakelaars, verwarming en rolluiken lokaal aan te passen.
- Beheerinstellingen worden in `localStorage` van de browser bewaard. Per tablet/browser kunnen de waarden dus verschillen.

Let op: als de browser de Engie-data blokkeert door CORS, gebruik `energy-proxy.php` via PHP of host dit dashboard op `www.digisteps.be`.

Voor echte bediening van Daikin en Sonoff is de beste volgende stap om Home Assistant te koppelen en daarna de juiste entity-id's in dit dashboard te gebruiken.
