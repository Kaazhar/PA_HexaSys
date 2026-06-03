# Fiche de révision — Vérification téléphone + 2FA SMS

> Objectif : comprendre chaque ligne de ce que tu as codé sur UpcycleConnect (partie 2FA SMS), avec un rappel des bases React/TypeScript pour quelqu'un qui connaît Go.

---

## Sommaire

1. [Vue d'ensemble du flux](#1-vue-densemble-du-flux)
2. [Rappel bases Go / Gin / GORM](#2-rappel-bases-go--gin--gorm)
3. [Bases React / TypeScript (pour un dev Go)](#3-bases-react--typescript-pour-un-dev-go)
4. [Librairies utilisées](#4-librairies-utilisées)
5. [Backend — explication ligne par ligne](#5-backend--explication-ligne-par-ligne)
6. [Frontend — explication ligne par ligne](#6-frontend--explication-ligne-par-ligne)
7. [Questions types (oral / soutenance)](#7-questions-types-oral--soutenance)

---

## 1. Vue d'ensemble du flux

### A. Vérifier son téléphone (depuis la page Profil)

```
1. User saisit son numéro          → POST /api/phone/send-code { phone }
   → backend : normalise E.164, rate limit, génère code 6 chiffres,
     hash bcrypt, stocke en DB, envoie SMS via Twilio
2. User reçoit SMS + saisit code   → POST /api/phone/verify { phone, code }
   → backend : compare bcrypt, marque "used", phone_verified = true
3. UI affiche badge "Vérifié"
```

### B. Activer la 2FA

```
Switch UI (seulement si phone_verified)
→ POST /api/phone/toggle-2fa { enabled: true }
→ backend : vérifie phone_verified, passe two_fa_enabled = true
```

### C. Login avec 2FA activée

```
1. POST /api/auth/login { email, password }
   → backend voit two_fa_enabled, envoie SMS
   ← 200 { requires_2fa: true, user_id: 42 }   (PAS de token à ce stade)
2. Front affiche l'écran 6 cases
3. POST /api/auth/verify-2fa { user_id, code }
   ← 200 { token, user }
4. setSession(token, user) → redirection dashboard
```

**Point clé :** tant que la 2FA n'est pas validée, **aucun JWT n'est émis**. L'utilisateur n'est donc pas "loggé" côté front.

---

## 2. Rappel bases Go / Gin / GORM

### 2.1 Gin (le router HTTP)

Gin = équivalent d'Express.js pour Go. Il reçoit des requêtes HTTP et appelle des **handlers** (fonctions `func(c *gin.Context)`).

```go
func Login(c *gin.Context) {
    var req LoginRequest
    c.ShouldBindJSON(&req)           // lit le JSON du body dans la struct
    c.JSON(200, gin.H{"ok": true})   // répond en JSON
}
```

- `c *gin.Context` = le contexte de la requête (équivalent `http.Request` + `http.ResponseWriter` combinés)
- `c.Get("userID")` = récupère une valeur mise dans le contexte par un middleware (ex: JWT)
- `gin.H{}` = un raccourci pour `map[string]interface{}` — pratique pour répondre en JSON
- Les **groupes de routes** (`r.Group("/api")`) partagent un préfixe et parfois un middleware

### 2.2 GORM (l'ORM)

GORM traduit des structs Go en tables MySQL et inversement. Les **tags** sur les champs configurent la colonne :

```go
type User struct {
    Email string `gorm:"uniqueIndex;not null;size:255" json:"email"`
    //      ^^^^^ type Go               ^^^^^^^^^^^^^ tag GORM       ^^^^^^^^^ tag JSON
}
```

- `gorm:"..."` = options de la colonne (index unique, taille, valeur par défaut...)
- `json:"email"` = nom du champ dans le JSON (par défaut Go sérialise avec la majuscule)
- `json:"-"` = **ne jamais** inclure ce champ dans la réponse JSON (utilisé pour `PasswordHash`, `CodeHash`)

Méthodes GORM courantes :

```go
config.DB.Create(&user)                            // INSERT
config.DB.First(&user, id)                         // SELECT ... WHERE id = ? LIMIT 1
config.DB.Where("email = ?", email).First(&user)   // SELECT ... WHERE email = ?
config.DB.Model(&user).Update("name", "bob")       // UPDATE ... SET name = 'bob'
config.DB.Model(&x).Updates(map[string]any{...})   // UPDATE plusieurs colonnes
config.DB.Model(&x).Count(&total)                  // SELECT COUNT(*)
config.DB.Unscoped().Delete(...)                   // ignore le soft-delete (hard delete)
```

### 2.3 bcrypt

Librairie de hashing pour stocker les mots de passe (ET les codes 2FA) de manière irréversible.

```go
hash, _ := bcrypt.GenerateFromPassword([]byte("mdp"), bcrypt.DefaultCost)
// → $2a$10$xxxx... (tu peux stocker ça en DB)

err := bcrypt.CompareHashAndPassword([]byte(hashEnDB), []byte("mdp saisi"))
// err == nil si le mot de passe correspond
```

On hash même le code SMS 6 chiffres — comme ça si un attaquant dump la DB il ne peut pas lire les codes en clair.

### 2.4 JWT (JSON Web Token)

Un JWT est une chaîne de 3 parties séparées par des `.` :
- **header** : algo de signature
- **payload** : les "claims" (userID, email, rôle, date d'expiration...)
- **signature** : signée avec une clé secrète côté serveur

Le front stocke le token en `localStorage` et l'envoie dans le header `Authorization: Bearer <token>` à chaque requête. Le middleware `AuthRequired()` vérifie la signature et met `userID` dans le contexte Gin.

---

## 3. Bases React / TypeScript (pour un dev Go)

### 3.1 Qu'est-ce que React ?

React est une bibliothèque JavaScript qui permet de **décrire l'UI comme une fonction de l'état**.

```
UI = f(state)
```

Quand l'état change, React recalcule le rendu et met à jour le DOM (le HTML dans le navigateur) **seulement aux endroits qui ont changé**. C'est ça le "virtual DOM".

### 3.2 Un composant = une fonction

```tsx
function MonBouton() {
  return <button>Salut</button>;
}
```

**Analogie Go :** c'est comme une fonction qui retourne une structure HTML. La différence : React va la rappeler automatiquement quand les données changent.

### 3.3 JSX — du HTML dans du JS

`<button>Salut</button>` ce n'est PAS du HTML, c'est du JSX. À la compilation ça devient `React.createElement("button", null, "Salut")`.

Différences avec HTML :
- `class` → `className` (parce que `class` est un mot-clé JS)
- `for` → `htmlFor`
- Les attributs camelCase : `onclick` → `onClick`, `tabindex` → `tabIndex`
- Tu peux mettre du JavaScript dans `{}` : `<p>{nom}</p>`, `<div className={isOk ? "ok" : "ko"}>`

### 3.4 Les props — les paramètres du composant

```tsx
interface Props {
  nom: string;
  age?: number;  // le ? = optionnel
}

function Carte({ nom, age }: Props) {
  return <div>{nom}, {age ?? '??'} ans</div>;
}

// Utilisation :
<Carte nom="Esteban" age={22} />
```

**Analogie Go :** `Props` c'est ta struct d'arguments. Le destructuring `{ nom, age }` c'est comme déstructurer une struct Go.

### 3.5 Le state — avec `useState`

L'état est une **variable qui, quand on la change, déclenche un nouveau rendu** du composant.

```tsx
const [compteur, setCompteur] = useState(0);
// compteur = la valeur actuelle
// setCompteur = la fonction pour changer la valeur

<button onClick={() => setCompteur(compteur + 1)}>
  {compteur}
</button>
```

**Piège fréquent :** tu ne modifies JAMAIS directement la variable.
```tsx
compteur = 5;           // ❌ ne fera rien
setCompteur(5);         // ✅ déclenche un re-render
```

Pour un tableau ou objet, on crée une **nouvelle** copie :
```tsx
const nouveau = [...chiffres];  // copie du tableau
nouveau[0] = '1';
setChiffres(nouveau);
```

### 3.6 Les hooks en général

Un **hook** = une fonction qui commence par `use` et qui donne accès à une feature React.

Les plus courants :
- `useState` — état local
- `useEffect` — exécuter du code quand le composant monte / l'état change
- `useRef` — garder une référence à un élément DOM (ou une valeur qui ne re-render pas)

**Règle absolue :** un hook s'appelle **toujours au top-level** du composant. Jamais dans un `if`, jamais dans une boucle.

### 3.7 Événements

```tsx
<input onChange={e => setNom(e.target.value)} />
<button onClick={() => faireTruc()}>Go</button>
```

`e` est l'objet événement. `e.target` = l'élément qui a déclenché l'événement. `e.target.value` = la valeur actuelle d'un input.

### 3.8 Rendu conditionnel

```tsx
{isLoading && <Spinner />}                   // affiche si isLoading est vrai
{user ? <Profil /> : <Login />}              // ternaire
{etape === 'saisie' && <FormulaireSaisie />} // affiche si égal
```

### 3.9 Liste (boucle)

```tsx
{chiffres.map((chiffre, index) => (
  <input key={index} value={chiffre} />
))}
```

**La prop `key`** est obligatoire sur les listes — React s'en sert pour optimiser le diff. Idéalement un ID unique (pas l'index si la liste peut être réordonnée).

### 3.10 TypeScript — rapide

TypeScript = JavaScript + système de types. Très proche du système de types de Go.

```ts
type UserRole = 'particulier' | 'professionnel' | 'admin';  // union de string literals
interface User { id: number; email: string; }              // struct
function greet(u: User): string { return `Salut ${u.email}`; }

// Générique (équivalent Go generics)
function identity<T>(x: T): T { return x; }
```

Le `?` dans une interface = champ optionnel :
```ts
interface User { phone?: string }   // phone peut être undefined
```

---

## 4. Librairies utilisées

### 4.1 Frontend (depuis `package.json`)

| Librairie | Rôle |
|---|---|
| `react` + `react-dom` | Moteur React + binding DOM |
| `react-router-dom` | Navigation côté client (routes `/login`, `/profil`...) |
| `axios` | Client HTTP (équivalent `net/http` côté client) |
| `react-hook-form` | Gestion des formulaires (validation, erreurs) |
| `react-hot-toast` | Notifications "toast" en haut à droite |
| `lucide-react` | Icônes SVG (Phone, ShieldCheck, Loader2...) |
| `tailwindcss` | Framework CSS utility-first (`className="flex gap-2"`) |
| `@tanstack/react-query` | Cache de requêtes API (pas utilisé dans le flux 2FA mais présent) |

### 4.2 Backend

| Librairie | Rôle |
|---|---|
| `github.com/gin-gonic/gin` | Router HTTP |
| `gorm.io/gorm` | ORM |
| `github.com/golang-jwt/jwt/v5` | Génération/validation JWT |
| `golang.org/x/crypto/bcrypt` | Hash mot de passe + codes SMS |
| `github.com/twilio/twilio-go` | Envoi SMS via Twilio |
| `github.com/nyaruka/phonenumbers` | Normalisation E.164 des numéros |

---

## 5. Backend — explication ligne par ligne

### 5.1 `models/models.go` (extraits 2FA)

```go
PhoneVerified bool `gorm:"default:false" json:"phone_verified"`
TwoFAEnabled  bool `gorm:"default:false" json:"two_fa_enabled"`
```
Deux booléens ajoutés à `User`. `default:false` : si on ne précise rien à la création, la colonne vaut `false` en DB. `json:"phone_verified"` : le nom exposé côté front (snake_case, car c'est la convention JSON du projet).

```go
type PhoneVerification struct {
    Base                                                              // embarque ID, CreatedAt, UpdatedAt, DeletedAt
    UserID    uint      `gorm:"not null;index" json:"user_id"`        // à qui appartient ce code
    Phone     string    `gorm:"not null;size:20" json:"phone"`        // numéro en E.164
    CodeHash  string    `gorm:"not null" json:"-"`                    // hash bcrypt — JAMAIS exposé
    Purpose   string    `gorm:"type:varchar(20);not null" json:"purpose"` // "phone_verify" ou "two_fa"
    Attempts  int       `gorm:"default:0" json:"attempts"`            // nb de tentatives ratées
    Used      bool      `gorm:"default:false" json:"used"`            // vrai = code brûlé (validé OU annulé)
    ExpiresAt time.Time `json:"expires_at"`                           // now() + 10 min
} 
```

**Pourquoi `Purpose` ?** Parce qu'un même user peut recevoir un code "vérif téléphone" ET un code "login 2FA". Il faut les distinguer sinon un code envoyé pour l'un pourrait être accepté pour l'autre.

**Pourquoi `Used` ?** Un code ne doit servir qu'une fois (anti-replay). Après validation on met `used = true`.

### 5.2 `services/sms.go` — wrapper Twilio

```go
var clientTwilio *twilio.RestClient   // client singleton
var numeroExpediteur string           // le numéro "From:" configuré sur Twilio
```
Variables de package (visibles dans tout `services/`). On les initialise une fois au démarrage.

```go
func InitSMS() {
    sid := os.Getenv("TWILIO_ACCOUNT_SID")
    token := os.Getenv("TWILIO_AUTH_TOKEN")
    numeroExpediteur = os.Getenv("TWILIO_PHONE_NUMBER")
```
Lit les variables d'environnement (chargées depuis `.env` par `config.LoadEnv()`).

```go
    if sid == "" || token == "" {
        fmt.Println("[SMS] Variables Twilio absentes — les SMS seront simulés dans les logs")
        return
    }
```
**Mode dev sans Twilio :** si aucun compte n'est configuré, le client reste `nil` et on log les SMS dans la console. Très pratique pour développer sans dépenser du crédit SMS.

```go
    clientTwilio = twilio.NewRestClientWithParams(twilio.ClientParams{
        Username: sid,
        Password: token,
    })
```
Initialise le client HTTP Twilio avec les credentials.

```go
func EnvoyerSMS(destinataire, contenu string) error {
    if clientTwilio == nil {
        fmt.Printf("[SMS DEV] Destinataire: %s | Message: %s\n", destinataire, contenu)
        return nil
    }
```
Si pas de client (mode dev), on log et on retourne `nil` (pas d'erreur — on considère que c'est OK).

```go
    params := &openapi.CreateMessageParams{}
    params.SetTo(destinataire)
    params.SetFrom(numeroExpediteur)
    params.SetBody(contenu)

    _, err := clientTwilio.Api.CreateMessage(params)
    if err != nil {
        return fmt.Errorf("erreur envoi SMS : %w", err)
    }
    return nil
}
```
Appel Twilio classique. `%w` dans `fmt.Errorf` = wrap l'erreur (permet à l'appelant de la décortiquer avec `errors.Is` / `errors.As`).

### 5.3 `services/verification.go`

#### `NormaliserTelephone`
```go
func NormaliserTelephone(numero, regionParDefaut string) (string, error) {
    parsed, err := phonenumbers.Parse(numero, regionParDefaut)
    if err != nil {
        return "", errors.New("numéro de téléphone invalide")
    }
    if !phonenumbers.IsValidNumber(parsed) {
        return "", errors.New("numéro de téléphone invalide")
    }
    return phonenumbers.Format(parsed, phonenumbers.E164), nil
}
```
Transforme `06 12 34 56 78` ou `+33612345678` ou `33 6 12 34 56 78` en une forme unique **E.164** : `+33612345678`. Sinon la même personne pourrait contourner le rate-limit en changeant le formatage.

#### `verifierRateLimit`
```go
func verifierRateLimit(userID uint) error {
    var compteParMinute int64
    config.DB.Model(&models.PhoneVerification{}).
        Where("user_id = ? AND created_at > ?", userID, time.Now().Add(-1*time.Minute)).
        Count(&compteParMinute)

    if compteParMinute >= 1 {
        return errors.New("vous devez attendre 1 minute avant de renvoyer un code")
    }
```
Compte combien de codes ce user a demandés dans la dernière minute. Si ≥ 1, on refuse. Anti-spam simple.

```go
    var compteParHeure int64
    config.DB.Model(&models.PhoneVerification{}).
        Where("user_id = ? AND created_at > ?", userID, time.Now().Add(-1*time.Hour)).
        Count(&compteParHeure)

    if compteParHeure >= 5 {
        return errors.New("vous avez dépassé la limite de 5 SMS par heure, réessayez plus tard")
    }
    return nil
}
```
Deuxième fenêtre : max 5 SMS/heure. Protection contre le "ok 61 secondes OK re-go".

#### `EnvoyerCodeVerification`
```go
func EnvoyerCodeVerification(userID uint, telephone, purpose string) error {
    telNormalise, err := NormaliserTelephone(telephone, "FR")
    if err != nil { return err }

    if err := verifierRateLimit(userID); err != nil { return err }
```
Normalise le numéro, check le rate-limit.

```go
    code := config.GenerateCode()   // 6 chiffres crypto/rand
    codeHash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
```
Génère un code de 6 chiffres aléatoire cryptographique, puis le **hashe** avant de stocker en DB.

```go
    verification := models.PhoneVerification{
        UserID:    userID,
        Phone:     telNormalise,
        CodeHash:  string(codeHash),
        Purpose:   purpose,
        ExpiresAt: time.Now().Add(10 * time.Minute),
    }
    config.DB.Create(&verification)
```
Enregistre la ligne en DB. `Used` et `Attempts` prennent leur valeur `default`.

```go
    message := fmt.Sprintf("Votre code UpcycleConnect : %s\nValable 10 minutes.", code)
    EnvoyerSMS(telNormalise, message)
```
Envoie le code **en clair par SMS** (seulement l'utilisateur doit pouvoir le lire). Le hash reste côté serveur.

#### `ValiderCode`
```go
var verification models.PhoneVerification
err := config.DB.
    Where("user_id = ? AND purpose = ? AND used = false AND expires_at > ?",
        userID, purpose, time.Now()).
    Order("created_at DESC").
    First(&verification).Error
```
Cherche **le dernier code valide** (pas utilisé, pas expiré) pour ce user + ce purpose. `Order DESC` au cas où plusieurs codes existeraient (ex: user a cliqué "Renvoyer").

```go
if err != nil {
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return errors.New("aucun code valide trouvé, demandez un nouveau code")
    }
    return fmt.Errorf("erreur base de données : %w", err)
}
```
`errors.Is` = la bonne façon Go de tester un type d'erreur (gère le wrapping).

```go
if verification.Attempts >= 5 {
    config.DB.Model(&verification).Update("used", true)
    return errors.New("trop de tentatives, demandez un nouveau code")
}
```
**Anti brute-force :** 5 essais max. Au 5e, on brûle le code.

```go
err = bcrypt.CompareHashAndPassword([]byte(verification.CodeHash), []byte(codeSaisi))
if err != nil {
    config.DB.Model(&verification).Update("attempts", verification.Attempts+1)
    restantes := 5 - (verification.Attempts + 1)
    return fmt.Errorf("code incorrect, %d tentative(s) restante(s)", restantes)
}

config.DB.Model(&verification).Update("used", true)
return nil
```
Compare bcrypt. Si KO, incrémente `attempts` et retourne une erreur explicite. Si OK, marque `used = true` (anti-replay).

### 5.4 `handlers/phone.go`

#### `SendPhoneCode`
```go
func SendPhoneCode(c *gin.Context) {
    userID, _ := c.Get("userID")
```
L'ID vient du middleware `AuthRequired()`. On ignore l'erreur car la route est déjà protégée (si on arrive ici, `userID` existe).

```go
    var req struct {
        Phone string `json:"phone" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Numéro de téléphone requis"})
        return
    }
```
Une **struct anonyme** pour parser le JSON du body. `binding:"required"` = Gin valide automatiquement que le champ est présent.

```go
    err := services.EnvoyerCodeVerification(userID.(uint), req.Phone, "phone_verify")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Code envoyé par SMS"})
}
```
`userID.(uint)` = **type assertion** : `userID` vient d'un `interface{}`, on dit "c'est un uint". Purpose = `"phone_verify"`.

#### `VerifyPhone`
Même début. Après validation du code :

```go
telNormalise, err := services.NormaliserTelephone(req.Phone, "FR")
// ...
var user models.User
config.DB.First(&user, userID)
config.DB.Model(&user).Updates(map[string]interface{}{
    "phone":          telNormalise,
    "phone_verified": true,
})
config.DB.First(&user, userID)   // re-lit pour renvoyer les valeurs fraîches
```
Normalisation à nouveau (le front pouvait envoyer `06...` mais on veut stocker `+33...`). Puis update + re-lecture.

#### `Toggle2FA`
```go
if req.Enabled && !user.PhoneVerified {
    c.JSON(http.StatusBadRequest, gin.H{
        "error": "Vous devez d'abord vérifier votre numéro de téléphone",
    })
    return
}
```
**Règle métier :** pas de 2FA sans téléphone vérifié. Sans ça, un user pourrait activer la 2FA avec un numéro random et se bloquer lui-même.

### 5.5 `handlers/auth.go` — extraits 2FA dans `Login`

```go
if user.TwoFAEnabled {
    err := services.EnvoyerCodeVerification(user.ID, user.Phone, "two_fa")
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible d'envoyer le code SMS"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "requires_2fa": true,
        "user_id":      user.ID,
    })
    return
}
```
**Point capital :** on ne renvoie **pas** de token ici. Juste `requires_2fa: true` + `user_id`. Le front comprend qu'il doit afficher l'écran 6 cases.

#### `Verify2FA`
```go
if err := services.ValiderCode(req.UserID, req.Code, "two_fa"); err != nil { ... }

var user models.User
config.DB.First(&user, req.UserID)

token, _ := generateToken(user)
c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
```
Si le code est bon → on génère enfin le JWT et on le renvoie.

**Sécurité à noter :** cet endpoint n'a **pas** de middleware `AuthRequired` (logique, le user n'a pas encore de token). La sécurité repose sur le fait qu'il faut connaître `user_id` ET recevoir le SMS sur le bon téléphone.

#### `Resend2FACode`
Même logique, mais on vérifie que `TwoFAEnabled && PhoneVerified` avant de renvoyer, pour éviter d'utiliser cet endpoint comme vecteur de spam SMS.

### 5.6 `cmd/main.go` — extraits 2FA

```go
services.InitSMS()
```
Initialise le client Twilio au démarrage (ou mode dev si pas configuré).

```go
if err := migDB.AutoMigrate(
    // ...
    &models.PhoneVerification{},
); err != nil { ... }
```
AutoMigrate crée/modifie la table `phone_verifications` à chaque démarrage. Pratique en dev, en prod on ferait des migrations versionnées.

```go
auth := api.Group("/auth")
{
    auth.POST("/verify-2fa", handlers.Verify2FA)
    auth.POST("/resend-2fa", handlers.Resend2FACode)
}

phone := api.Group("/phone")
phone.Use(middleware.AuthRequired())
{
    phone.POST("/send-code", handlers.SendPhoneCode)
    phone.POST("/verify", handlers.VerifyPhone)
    phone.POST("/toggle-2fa", handlers.Toggle2FA)
}
```
Deux groupes :
- `/auth/verify-2fa` et `/auth/resend-2fa` : **publics** (pas de JWT, normal, le user n'en a pas encore)
- `/phone/*` : **protégées** (AuthRequired), on a besoin de savoir qui est connecté

---

## 6. Frontend — explication ligne par ligne

### 6.1 `types/index.ts` (ajouts 2FA)

```ts
export interface User {
  // ... champs existants
  is_banned?: boolean;
  siret?: string;
  siret_verified?: boolean;
  phone_verified?: boolean;
  two_fa_enabled?: boolean;
}
```
Le `?` rend les champs optionnels côté TS. Ça évite des `undefined` qui planteraient si le backend ne renvoie pas le champ (ancien user, par exemple).

### 6.2 `services/api.ts` (ajouts 2FA)

```ts
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});
```
Crée une instance axios avec `/api` en base. Toutes les requêtes utiliseront ce préfixe. Ici on utilise un **chemin relatif** car nginx (côté container `react`) proxy `/api` vers le backend.

```ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```
**Intercepteur de requête :** avant chaque appel, on lit le token en localStorage et on l'ajoute dans `Authorization`. Pas besoin de le faire à la main dans chaque appel.

```ts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```
**Intercepteur de réponse :** si le backend renvoie 401 (token invalide/expiré), on nettoie le localStorage et on force une redirection vers `/login`.

```ts
export const authService = {
  // ...
  verify2FA: (userId: number, code: string) =>
    api.post<{ token: string; user: User }>('/auth/verify-2fa', { user_id: userId, code }),
  resend2FA: (userId: number) =>
    api.post('/auth/resend-2fa', { user_id: userId }),
};
```
Helpers pour les deux endpoints 2FA. Le `<{ token, user }>` = on type la réponse (TS connaît la shape de `res.data`).

```ts
export const phoneService = {
  sendCode: (phone: string) =>
    api.post('/phone/send-code', { phone }),
  verify: (phone: string, code: string) =>
    api.post<{ message: string; user: User }>('/phone/verify', { phone, code }),
  toggle2FA: (enabled: boolean) =>
    api.post<{ message: string; user: User }>('/phone/toggle-2fa', { enabled }),
};
```
3 helpers pour les endpoints "phone" (protégés — le token est ajouté automatiquement par l'intercepteur).

### 6.3 `components/PhoneVerification.tsx`

```tsx
import { useState } from 'react';
import { Phone, CheckCircle, Loader2 } from 'lucide-react';
import { phoneService } from '../services/api';
import type { User } from '../types';
import toast from 'react-hot-toast';
```
- `useState` : le hook d'état
- 3 icônes SVG
- `phoneService` : nos helpers axios
- `type { User }` : `type` signifie "import pour les types seulement" (TS l'efface à la compilation)
- `toast` : notifications

```tsx
interface Props {
  currentPhone?: string;
  isVerified?: boolean;
  onSuccess: (user: User) => void;
}
```
Les props du composant. `onSuccess` est une **callback** : le parent passe une fonction que l'enfant appellera quand la vérif réussit. C'est le pattern "remonter l'info au parent".

```tsx
export default function PhoneVerification({ currentPhone, isVerified, onSuccess }: Props) {
  const [etape, setEtape] = useState<'saisie_numero' | 'saisie_code'>('saisie_numero');
  const [telephone, setTelephone] = useState(currentPhone || '');
  const [code, setCode] = useState('');
  const [enChargement, setEnChargement] = useState(false);
```
4 morceaux d'état :
- `etape` : le type `'saisie_numero' | 'saisie_code'` = une union, seules ces 2 strings sont valides
- `telephone` : contenu de l'input téléphone (pré-rempli si déjà un numéro)
- `code` : contenu de l'input code
- `enChargement` : pour griser le bouton pendant l'appel API

```tsx
const envoyerCode = async () => {
    if (!telephone.trim()) {
      toast.error('Saisissez votre numéro de téléphone');
      return;
    }
    setEnChargement(true);
    try {
      await phoneService.sendCode(telephone);
      toast.success('Code envoyé par SMS !');
      setEtape('saisie_code');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi du SMS');
    } finally {
      setEnChargement(false);
    }
  };
```
Fonction asynchrone :
1. Validation basique côté client
2. `setEnChargement(true)` → UI grise le bouton
3. `await` l'appel API (axios retourne une Promise)
4. Succès : toast + passage à l'étape 2
5. Erreur : on lit le message du backend (chaîne d'optional chaining `?.`) avec fallback
6. `finally` : dans tous les cas on réactive le bouton

```tsx
const verifierCode = async () => {
    if (code.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }
    setEnChargement(true);
    try {
      const res = await phoneService.verify(telephone, code);
      toast.success('Téléphone vérifié !');
      onSuccess(res.data.user);   // ← remonte le nouvel user au parent
      setCode('');
    } catch (err: unknown) { /* ... */ }
    finally { setEnChargement(false); }
  };
```
Pareil pour la 2e étape. Note `onSuccess(res.data.user)` : c'est comme ça que la ProfilePage reçoit les données fraîches et peut mettre à jour son affichage.

```tsx
return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <Phone className="w-4 h-4 text-gray-400" />
        <h2 className="font-semibold text-gray-900">Vérification du téléphone</h2>
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded ml-auto">
            <CheckCircle className="w-3 h-3" /> Vérifié
          </span>
        )}
      </div>
```
Les `className` sont des classes Tailwind — chaque classe = une propriété CSS. `flex items-center gap-2` = flexbox centré verticalement avec 0.5rem de gap.

`{isVerified && <span>...</span>}` = affiche le badge seulement si `isVerified` est `true`.

```tsx
{etape === 'saisie_numero' && (
  <div className="space-y-4">
    // ...
    <input
      type="tel"
      className="input"
      placeholder="+33 6 12 34 56 78"
      value={telephone}
      onChange={e => setTelephone(e.target.value)}
    />
```
**Input contrôlé** : `value={telephone}` + `onChange` qui met à jour l'état. React est **la source de vérité**, pas le DOM. Chaque frappe → event → setState → re-render → nouvelle valeur affichée.

```tsx
<button
  onClick={envoyerCode}
  disabled={enChargement}
  className="btn-primary flex items-center gap-2"
>
  {enChargement && <Loader2 className="w-4 h-4 animate-spin" />}
  Envoyer le code
</button>
```
Bouton désactivé pendant le chargement + affiche un spinner si en chargement.

**Branche `saisie_code` :**
```tsx
<input
  type="text"
  inputMode="numeric"
  maxLength={6}
  className="input tracking-widest text-center text-lg font-mono"
  placeholder="000000"
  value={code}
  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
/>
```
- `inputMode="numeric"` : sur mobile, clavier numérique
- `maxLength={6}` : 6 caractères max
- `.replace(/\D/g, '')` : regex qui supprime tout ce qui n'est pas un chiffre (empêche de taper des lettres)

```tsx
<button onClick={() => { setEtape('saisie_numero'); setCode(''); }}>
  Changer de numéro
</button>
```
Inline arrow function : réinit vers l'étape 1 et vide le code.

```tsx
<button
  onClick={verifierCode}
  disabled={enChargement || code.length !== 6}
>
```
Désactivé tant que le code n'a pas 6 chiffres ou pendant le chargement.

### 6.4 `components/TwoFAToggle.tsx`

```tsx
const [active, setActive] = useState(isEnabled ?? false);
```
`??` = nullish coalescing. `isEnabled ?? false` = si `isEnabled` est `null` ou `undefined`, utilise `false`. Équivalent Go : `if isEnabled == nil { active = false } else { active = *isEnabled }`.

```tsx
const basculer = async () => {
    if (!isPhoneVerified && !active) {
      toast.error('Vérifiez d\'abord votre numéro de téléphone');
      return;
    }
    // ...
    const nouvelleValeur = !active;
    const res = await phoneService.toggle2FA(nouvelleValeur);
    setActive(nouvelleValeur);
```
Empêche d'**activer** si pas vérifié. Mais **désactiver** reste possible (cas où tu veux couper la 2FA même si le téléphone n'est plus confirmé pour une raison X).

Le switch visuel :
```tsx
<button
  type="button"
  onClick={basculer}
  disabled={enChargement || (!isPhoneVerified && !active)}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
    ${active ? 'bg-green-500' : 'bg-gray-200'}
    ${(!isPhoneVerified && !active) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
>
  <span
    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
      ${active ? 'translate-x-6' : 'translate-x-1'}`}
  />
</button>
```
Template literals (` `` `) pour construire dynamiquement la `className`. La pastille blanche translate de `translate-x-1` à `translate-x-6` = l'animation slide. CSS pur, pas de JS.

### 6.5 `components/Login2FAScreen.tsx`

```tsx
import { useState, useRef, KeyboardEvent } from 'react';
```
`useRef` permet de garder une référence persistante (ici les 6 `<input>` DOM pour faire le focus programmatiquement).

```tsx
export default function Login2FAScreen({ userId, onSuccess, onCancel }: Props) {
  const [chiffres, setChiffres] = useState<string[]>(['', '', '', '', '', '']);
  const [enChargement, setEnChargement] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
```
- `chiffres` : tableau de 6 strings (un par case)
- `refs` : tableau qui va stocker les 6 références DOM (pour `.focus()`)

```tsx
const handleChange = (index: number, valeur: string) => {
    const chiffre = valeur.replace(/\D/g, '').slice(-1);
```
1. Supprime tout ce qui n'est pas un chiffre
2. `.slice(-1)` = ne garde que **le dernier** caractère. Utile si l'user tape vite et qu'il y a déjà un chiffre dans la case.

```tsx
    const nouveauxChiffres = [...chiffres];
    nouveauxChiffres[index] = chiffre;
    setChiffres(nouveauxChiffres);
```
**IMPORTANT :** on ne fait jamais `chiffres[index] = chiffre` directement. On crée une **nouvelle** copie avec le spread `[...chiffres]`. React détecte le changement par référence — si tu mutes, il ne re-render pas.

```tsx
    if (chiffre && index < 5) {
      refs.current[index + 1]?.focus();
    }
```
Auto-avance : dès qu'un chiffre est saisi, focus sur la case suivante (sauf si dernière case).

```tsx
    const codeComplet = nouveauxChiffres.join('');
    if (codeComplet.length === 6) {
      soumettre(codeComplet);
    }
```
Si les 6 cases sont remplies, on soumet automatiquement (UX : pas besoin de cliquer "Valider").

```tsx
const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chiffres[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };
```
Gestion de Backspace : si la case est vide et qu'on appuie Backspace, on revient à la case précédente.

```tsx
const soumettre = async (code: string) => {
    setEnChargement(true);
    try {
      const res = await authService.verify2FA(userId, code);
      const { token, user } = res.data;
      toast.success('Connexion réussie !');
      onSuccess(token, user);
    } catch (err: unknown) {
      // ...
      setChiffres(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    }
```
En cas d'erreur, on vide les cases et on refocus la première : l'user peut immédiatement retaper.

```tsx
return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
```
`min-h-screen` = hauteur minimum 100vh. Flex + items-center + justify-center = centré vertical ET horizontal.

```tsx
<div className="flex justify-center gap-2 mb-6">
  {chiffres.map((chiffre, index) => (
    <input
      key={index}
      ref={el => { refs.current[index] = el; }}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={chiffre}
      onChange={e => handleChange(index, e.target.value)}
      onKeyDown={e => handleKeyDown(index, e)}
      onFocus={e => e.target.select()}
      autoFocus={index === 0}
      className="w-11 h-12 text-center text-xl font-bold border border-gray-300 rounded-lg
        focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
    />
  ))}
</div>
```
- `.map()` = génère 6 inputs
- `key={index}` = obligatoire
- `ref={el => { refs.current[index] = el; }}` = quand React crée l'input DOM, il nous passe l'élément, on le stocke dans notre tableau
- `onFocus={e => e.target.select()}` = au focus, sélectionne le contenu (pour que taper remplace direct)
- `autoFocus={index === 0}` = focus automatique sur la 1re case au montage

### 6.6 `pages/public/LoginPage.tsx` (extraits 2FA)

```tsx
interface LoginResponse {
  token?: string;
  user?: User;
  requires_2fa?: boolean;
  user_id?: number;
}
```
Les 4 champs sont optionnels car le backend renvoie soit `{ token, user }` soit `{ requires_2fa, user_id }`.

```tsx
const [userId2FA, setUserId2FA] = useState<number | null>(null);
```
Si `null` → on affiche le formulaire login. Si `number` → on a l'ID à valider, on affiche l'écran 6 cases.

```tsx
const onSubmit = async (data: LoginForm) => {
    try {
      const { authService } = await import('../../services/api');
      const res = await authService.login(data.email, data.password);
      const reponse = res.data as LoginResponse;

      if (reponse.requires_2fa && reponse.user_id) {
        setUserId2FA(reponse.user_id);
        return;
      }

      if (reponse.token && reponse.user) {
        setSession(reponse.token, reponse.user);
        toast.success('Connexion réussie');
        redirectApresLogin(reponse.user);
      }
    } catch (err: unknown) { /* ... */ }
  };
```
- `await import(...)` = import dynamique (code-splitting, chargé à la demande)
- Si `requires_2fa` → stocke l'ID et **s'arrête là** (le render affichera l'écran 2FA)
- Sinon (pas de 2FA) → pose session + redirige vers le bon dashboard

```tsx
const apresValidation2FA = (token: string, user: User) => {
    setSession(token, user);
    redirectApresLogin(user);
  };

if (userId2FA !== null) {
    return (
      <Login2FAScreen
        userId={userId2FA}
        onSuccess={apresValidation2FA}
        onCancel={() => setUserId2FA(null)}
      />
    );
}
```
**Early return** : si on est en mode 2FA, on rend directement `Login2FAScreen`. Sinon, on continue vers le formulaire email/password.

`onCancel={() => setUserId2FA(null)}` : le bouton "Retour" remet `userId2FA` à `null`, on revient au formulaire de base.

### 6.7 `pages/profil/ProfilePage.tsx` (extraits 2FA)

```tsx
import PhoneVerification from '../../components/PhoneVerification';
import TwoFAToggle from '../../components/TwoFAToggle';

// ...

<PhoneVerification
  currentPhone={user.phone}
  isVerified={user.phone_verified}
  onSuccess={handleUserUpdated}
/>

<TwoFAToggle
  isEnabled={user.two_fa_enabled}
  isPhoneVerified={user.phone_verified}
  onSuccess={handleUserUpdated}
/>
```
On passe les 3 props à chaque composant. `handleUserUpdated` est défini plus haut dans ProfilePage — c'est lui qui met à jour le `user` local (state de la page) quand un enfant remonte un nouveau `User`.

Ainsi, après vérif du téléphone, `isPhoneVerified` passe à `true` → le bouton 2FA devient cliquable → tout est synchro.

---

## 7. Questions types (oral / soutenance)

### Q1. Pourquoi hasher le code SMS en DB ?
Parce que si la DB est compromise, l'attaquant ne voit que des hashs bcrypt. Il ne peut pas utiliser un code en cours de validité. Même logique que pour les mots de passe.

### Q2. Pourquoi 2 fenêtres de rate-limit (1 min ET 1 h) ?
- La minute empêche le spam instantané (clic frénétique sur "Renvoyer").
- L'heure empêche la technique "ok j'attends 61 secondes, re-spam".

### Q3. Pourquoi pas de JWT lors de la 1re étape du login 2FA ?
Émettre le token trop tôt = la 2FA devient inutile : si quelqu'un a le mot de passe, il aurait un token avant d'avoir prouvé qu'il contrôle le téléphone. Le token n'est émis QUE dans `Verify2FA`, après validation du code SMS.

### Q4. Pourquoi `Used` + `Attempts` sur `PhoneVerification` ?
- `Used = true` **à la validation** : un code ne sert qu'une fois (anti-replay).
- `Used = true` **au 5e essai raté** : brûle le code après brute-force.
- `Attempts` : compteur d'essais ratés pour la réponse "X tentatives restantes".

### Q5. Pourquoi normaliser les numéros en E.164 ?
1. Unicité : `06 12 34 56 78`, `+33612345678`, `0033612345678` = **même numéro**, mais strings différentes. Sans normalisation, le rate-limit et la comparaison seraient contournables.
2. Twilio exige E.164 pour envoyer.

### Q6. Quelle différence entre "props" et "state" en React ?
- **Props** : valeurs **passées du parent à l'enfant**, lecture seule côté enfant.
- **State** : valeurs **internes au composant**, mutables via setter, déclenchent un re-render au changement.

### Q7. Pourquoi copier le tableau avec `[...chiffres]` au lieu de muter ?
React compare les références (`===`). Si tu mutes, la référence ne change pas, React pense que rien n'a changé, pas de re-render. En créant une nouvelle copie, la référence change, React re-render.

### Q8. À quoi sert l'intercepteur axios sur 401 ?
Si le JWT expire pendant la session, chaque requête protégée renvoie 401. L'intercepteur attrape ça globalement, nettoie le localStorage et redirige vers `/login`. Pas besoin de gérer le cas dans chaque composant.

### Q9. Pourquoi un `const refs = useRef(...)` et pas un `useState` pour les inputs ?
Un `useState` déclencherait un re-render à chaque mise à jour de ref. Ici on veut juste garder un pointeur vers le DOM pour appeler `.focus()`. `useRef` = ref persistante qui ne re-render pas.

### Q10. Qu'est-ce que AutoMigrate ne fait pas ?
Il ne **supprime jamais** de colonne, même si tu retires un champ du struct. Et il ne renomme pas : renommer = nouvelle colonne + ancienne colonne gardée. En prod, on utilise des migrations SQL versionnées (ex: `golang-migrate`).
