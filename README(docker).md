# UpcycleConnect — Docker

## Architecture

L'application est composée de 4 services conteneurisés :

```
Internet
    |
  Nginx (reverse proxy) :80 / :443
  /             \
React          API Go
(frontend)     (backend :8080)
                   |
               MySQL :3306
```

Les services communiquent via deux réseaux Docker internes :
- **frontend** : Nginx, React, API Go
- **backend** : API Go, MySQL

## Description des services

- **nginx** : reverse proxy, point d'entrée unique, gère le SSL
- **react** : frontend React/Vite servi sur le port 80
- **api** : API REST en Go avec authentification JWT, port 8080
- **db** : base de données MySQL 8.0

## Lancer en développement

```bash
cp .env.example .env
# Remplir les variables dans .env

docker compose -f docker-compose.dev.yml up --build
```

Le code source est monté en volume pour le hot-reload.

## Lancer en production

```bash
docker compose -f docker-compose.yml up -d
```

Les images sont tirées depuis Docker Hub. Aucun volume de code monté. Seuls les ports 80 et 443 sont exposés.
