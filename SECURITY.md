# Sécurité — fork durci

Ce fork corrige plusieurs failles du projet d'origine (HGHugo/FreeboxOS-Ultra-Dashboard).

## Ce qui a changé

| Problème d'origine | Gravité | Correctif |
|---|---|---|
| Injection de commande via la cible du ping (`/api/speedtest/ping?target=…`) | Critique | `execFile` sans shell + validation IP/nom d'hôte |
| `POST /api/auth/set-url` acceptait n'importe quelle URL : le jeton de session Freebox partait vers l'hôte choisi (SSRF + vol de session) | Critique | Liste blanche (mafreebox.freebox.fr, IP locale, `FREEBOX_ALLOWED_URLS`) |
| Aucune authentification sur l'API ni le WebSocket | Critique | Mot de passe dashboard, cookie de session HttpOnly/SameSite=Strict, anti-bruteforce |
| `cors({ origin: true, credentials: true })` en production | Élevée | CORS supprimé en production (même origine) |
| CSRF / WebSocket cross-site | Élevée | Contrôle de l'en-tête `Origin` sur les requêtes modifiantes et le WebSocket |
| Planning de reboot non validé (reboot chaque minute, crash au démarrage) | Élevée | Validation stricte jours 0-6 / `HH:MM` |
| Traversée de chemin vers l'API Freebox (`..%2Fvm%2F1`) | Moyenne | Rejet des segments `.`/`..` dans les endpoints |
| Injection CRLF dans l'upload de torrent | Moyenne | Validation du nom de fichier, du dossier et du contenu |
| Mot de passe Wi-Fi envoyé à api.qrserver.com | Moyenne | QR code généré localement (`qrcode`) |
| Script Tailwind et importmap chargés depuis des CDN | Faible | Tailwind compilé au build, importmap supprimé, CSP stricte |
| Jeton de session dans les logs, erreurs internes renvoyées au client | Faible | Log supprimé, message générique pour les 5xx |
| `docker-compose.yml` tirait l'image amont `:latest` | Faible | Build local depuis ce code |

## Configuration

- `DASHBOARD_PASSWORD` : mot de passe du dashboard. S'il est vide, un mot de passe est généré au premier démarrage, affiché dans les logs et stocké à côté du jeton Freebox (`dashboard_password`).
- `DASHBOARD_BIND` (Docker) : interface exposée, `127.0.0.1` pour un accès depuis cette machine seulement.
- `HOST` (hors Docker) : interface d'écoute du serveur Node.
- `FREEBOX_ALLOWED_URLS` : URL Freebox supplémentaires autorisées, séparées par des virgules.
- `TRUST_PROXY` : à définir uniquement derrière un reverse proxy HTTPS.

## Points restants connus

- La vérification TLS vers la Freebox est désactivée pour tout le processus (`NODE_TLS_REJECT_UNAUTHORIZED=0`), car la box utilise une CA propriétaire. Un attaquant en position MITM sur le LAN pourrait intercepter le jeton de session. La correction consiste à épingler la CA Freebox.
- Les corps de requête sont transmis tels quels à l'API Freebox (pas de liste blanche de champs par route). C'est acceptable maintenant que l'accès est authentifié.
- Données vers des tiers : logo.dev (seulement si `VITE_LOGO_DEV_TOKEN` est défini), une icône depuis cdn.jsdelivr.net, et un ping vers 8.8.8.8 toutes les 60 s depuis le widget speedtest.
