# StreetBite — Project Documentatie

## Wat is het?
Een persoonlijke app voor het verzamelen en beoordelen van streetfood-gerechten per land. Werkt als een poke-achtige collector: gerechten ontgrendelen, check-ins doen, badges verdienen.

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
