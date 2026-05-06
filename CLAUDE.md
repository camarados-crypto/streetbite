# StreetBite — Project Documentatie

## Deploy

```bash
./deploy.sh "omschrijving"
```

- Uploadt `files/` via rsync naar de server
- Commit + push naar GitHub

| | |
|---|---|
| **Server pad** | `www/gertjanbos.com/public_html/streetbite/` |
| **SSH host** | `ssh.gertjanbos.com` poort `18765` |
| **SSH user** | `u1494-ufbwddutwcpa` |
| **SSH alias** | `streetbite` (staat in `~/.ssh/config`) |
| **GitHub remote** | `git@github.com:camarados-crypto/streetbite.git` |
| **Live URL** | `https://gertjanbos.com/streetbite/` |

Bestanden staan lokaal in `files/` — dat is wat gedeployed wordt.

---

## Wat is het?
Een gamified streetfood app waarin gebruikers gerechten ontdekken, verzamelen en delen.

## Product Vision

StreetBite is a social streetfood discovery platform where users:

- Track dishes they've tried
- Share experiences (photos, ratings, locations)
- Discover new food via collections
- Build a public food profile

Core loop:
Discover → Try → Check-in → Share → Unlock → Progress → Repeat

  ## Core Flows

1. First time user
- Select country
- Complete First Bites
- Unlock next collection

2. Returning user
- See progress
- Continue collections
- Check recent activity

3. Check-in flow
- Open dish
- Add rating + photo + location
- Mark as collected
- Trigger unlock / XP / badge


## Design principes

- Mobile-first ontwerp
- Supersnel, geen frameworks
- Visueel boven tekst (afbeeldingen zijn leidend)
- Card-based interactie (swipen, flippen, modals)
- Beloning-gedreven UX (unlock momenten, badges, animaties)
- Simpel houden: één duidelijke actie per scherm

## Primary Goal

Users should always have a clear next dish to try.

---

## Stack

| Laag | Tech |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (geen framework) |
| Backend | Supabase (Postgres + Auth + Storage) |
| Hosting | gertjanbos.com/streetbite/ |
| Auth | Supabase anonymous + Google OAuth |

---




## Bestandsstructuur

```
streetbite/
├── index.html              (alleen HTML, ~329 regels)
├── admin.html              (beheer panel)
├── css/
│   ├── base.css            (reset, screens, nav, misc)
│   ├── hero.css            (hero, first bites, explore, completion)
│   ├── modals.css          (kaart flip, detail sheet, check-in, country picker, badge sheet)
│   ├── passport.css        (food passport, stamps, badges)
│   └── profile.css         (profiel scherm, passport preview)
└── js/
    ├── config.js           (constanten: SB URL, keys, country maps, badge data)
    ├── state.js            (centrale state manager)
    ├── api.js              (API helper, auth, sign in/out)
    ├── data.js             (data laden: landen, collecties, gerechten)
    ├── ui.js               (scroll reveal, confetti, unlock moment, formatPrice)
    ├── badges.js           (badge storage, badge sheet)
    ├── home.js             (streak, welcome, recent check-ins, renderHome)
    ├── collections.js      (navigatie, renderColl, country picker)
    ├── card.js             (kaart modal, flip, collect button)
    ├── detail.js           (dish detail sheet, experiences, photo viewer)
    ├── checkin.js          (check-in sheet, foto upload, GPS, markCollected)
    ├── passport.js         (food passport sheet)
    ├── profile.js          (renderProfile)
    └── app.js              (init, swipe listener)
```

**Laadvolgorde scripts (belangrijk):**
`supabase → config → state → api → data → ui → badges → home → collections → card → detail → checkin → passport → profile → app`

---

## Database Schema

### `countries`
| kolom | type |
|---|---|
| id | uuid |
| name | text |

### `collections`
| kolom | type |
|---|---|
| id | uuid |
| country_id | uuid |
| name | text |
| unlock_type | text |
| unlock_requirement | int |
| order_index | int |

### `dishes`
| kolom | type | omschrijving |
|---|---|---|
| id | uuid | |
| collection_id | uuid | |
| name | text | Originele naam (bijv. Bún chả) |
| name_en | text | Engelse vertaling max 3 woorden (bijv. Grilled Pork Noodles) |
| rarity | text | common / uncommon / rare / epic / legendary |
| image_url | text | Publieke URL of Supabase storage URL |
| description | text | Korte omschrijving voor kaart voorkant (max ~120 tekens) |
| description_long | text | Uitgebreide tekst voor kaart achterkant (max ~300 tekens) |
| price_range | text | Bijv. "20–50k VND" |
| first_bite_order | int | Volgorde in First Bites (1–5), null = geen first bite |

### `experiences`
| kolom | type |
|---|---|
| id | uuid |
| dish_id | uuid |
| user_id | uuid |
| rating | int (1–5) |
| location_text | text |
| note | text |
| price | float |
| currency | text |
| photo_url | text |
| user_display_name | text |
| user_avatar_url | text |
| created_at | timestamptz |

### `user_dishes`
| kolom | type |
|---|---|
| user_id | uuid |
| dish_id | uuid |
| experience_id | uuid |
| collected_at | timestamptz |

---

## Supabase Storage Buckets

| Bucket | Gebruik |
|---|---|
| `checkin-photos` | Foto's van gebruikers bij check-ins |
| `dish-images` | Dish afbeeldingen geüpload via admin panel |

Beide buckets zijn **public**.

---

## State Manager (`state.js`)

Alle app state zit in één object. Geen globale variabelen.

```js
const State = {
  auth:  { user, uid, token },
  app:   { currentCountry, countryId, unlockShown },
  data:  { allCountries, collections, allDishes, userDishes, recentDishIds, passportData, claimedBadges },
  ui:    { activeColl, activeDish, activeDishNum, flipped, ciRating, ciPhotoFile, ciPhotoDataUrl }
}
```

**Lezen:**  `getState('data.userDishes')`
**Schrijven:** `setState('app.countryId', id)` → triggert automatisch `render()`
**render()** kijkt welk scherm zichtbaar is en roept het juiste renderXxx() aan.

---

## Badges

Badges zitten in `config.js` onder `BADGES`. Ze worden opgeslagen in `State.data.claimedBadges` (Set) én gesynchroniseerd naar localStorage (`sb_badges`).

Huidige badges:
- `first_bites_Vietnam` — alle 5 First Bites Vietnam geprobeerd
- `first_bites_Thailand`
- `first_bites_Japan`

**Badge toevoegen:** voeg toe aan `BADGES` object in `config.js`.

---

## Food Passport

Opent als bottom sheet vanuit het profiel. Per land een stempel met 4 staten:

| State | Conditie |
|---|---|
| `unvisited` | 0 gerechten geprobeerd |
| `started` | 1–49% geprobeerd |
| `halfway` | 50–99% geprobeerd |
| `complete` | 100% — gouden animatie |

Passport data wordt gecached in `State.data.passportData` en geladen bij eerste open.

---

## Admin Panel (`admin.html`)

- Landen / collecties / gerechten beheren
- Per gerecht: naam, foto URL, rarity, **EN naam**, **front card tekst**, **back card tekst**, prijs, First Bites volgorde
- 📷 Upload knop: uploadt naar `dish-images` Supabase bucket
- Status dots (⚫🟡🟢🔴) bij foto URL
- Opslaan via expliciete knop per gerecht (geen auto-save op blur)

---

## Landen toevoegen

1. Voeg toe via admin panel of direct in Supabase
2. Voeg vlag toe aan `COUNTRY_FLAGS` in `config.js`
3. Voeg valuta toe aan `COUNTRY_CURRENCY` in `config.js`
4. Voeg hero data toe aan `COUNTRY_DATA` in `config.js` (tagline + Unsplash URL)
5. Voeg COL_ICONS toe voor collectienamen van dat land

---

## Bekende TODO's / Volgende stappen

- [ ] Meer landen data (Mexico, India, Korea, Italië)
- [ ] `description` en `description_long` invullen per gerecht (via admin)
- [ ] Social layer: vrienden / activity feed
- [ ] Food passport uitbreiden (datum eerste bezoek, stats per land)
- [ ] Badges uitbreiden (Street Master, Daredevil, Globetrotter, Legend)
- [ ] XP systeem uitbreiden (nu: dishes × 10)
- [ ] users (profile uitbreiden)
- [ ] Social layer implementeren (zie Geplande uitbreidingen)
- [ ] Locatie systeem implementeren
- [ ] dish_likes / comments


## Geplande uitbreidingen

### Social

Voor toekomstige social features:

- `follows`  
  - user_id  
  - follows_user_id  

- `activity_feed`  
  - id  
  - user_id  
  - type (checkin, badge, unlock)  
  - ref_id (verwijzing naar dish / experience / badge)  
  - created_at  

---

### Locaties

Voor echte plekken en map-functionaliteit:

- `locations`  
  - id  
  - name  
  - lat  
  - lng  
  - city  
  - country  

Aanpassing bestaande tabel:

- `experiences`  
  - location_id (FK naar locations)  

