# StreetBite — Project Context

## Wat is het?
Gamified streetfood discovery app. Gebruikers verzamelen gerechten per land als trading cards, met progressie, unlocks en ratings. Vibe: Untappd × Pokémon GO × streetfood.

---

## 📁 Bestandslocaties

| Bestand | Locatie |
|---|---|
| Frontend | `~/Documents/Claude/Projects/streetbite/index.html` |
| Admin panel | `~/Documents/Claude/Projects/streetbite/admin.html` |
| GitHub repo | `github.com/camarados-crypto/streetbite` |
| Live URL | `https://gertjanbos.com/streetbite/` |

**Elke sessie:** upload `index.html` in de chat zodat Claude de huidige code heeft.  
**Na elke sessie:** `git add . && git commit -m "..." && git push`

---

## 🗄️ Supabase

**Project ID:** `ztipltgnprzxxbkmsokj`

### Schema

```
countries         id, name
collections       id, country_id, name, unlock_type, unlock_requirement, order_index
dishes            id, collection_id, name, image_url, rarity, first_bite_order
experiences       id, dish_id, rating, location_text, note
user_dishes       user_id, dish_id, status
user_collections  user_id, collection_id, progress, completed_dishes, total_dishes, status
dish_stats        dish_id, total_tried
```

### Unlock types
- `default` — altijd open
- `progress` — vereist % (50% voor Hidden Gems, 70% voor Daredevil)

### Edge Functions / Triggers
- **`fetch-dish-image`** — Edge Function, vult automatisch Wikipedia foto bij INSERT
- **`trg_fetch_dish_image`** — trigger after insert on dishes
- **`trg_update_collection_progress`** — houdt voortgang per collectie bij

### Auth
- Anonymous auth (speelt meteen, geen registratie)
- Google OAuth (sync naar Supabase)
- Site URL: `https://gertjanbos.com/streetbite`

---

## 🌍 Database status

| Land | Collecties | Dishes | Status |
|---|---|---|---|
| 🇻🇳 Vietnam | 6 | 72 | ✅ Volledig uitgewerkt |
| 🇹🇭 Thailand | 5 | ~31 | ⚠️ Structuur klaar, descriptions leeg |
| 🇯🇵 Japan | 5 | ~32 | ⚠️ Structuur klaar, descriptions leeg |

### Vietnam First Bites (first_bite_order kolom toegevoegd)
1. Phở bò — `892fca8f-f4a7-4088-8c19-e5625fed648b`
2. Bánh mì — `65ac54a1-027c-496d-98ec-a1a5e3f544ca`
3. Gỏi cuốn — `e06e0da9-3e43-4a2b-b15e-1cf0639268fb`
4. Bún chả — `b6962205-83ec-4a4c-879a-e3c37b4db3f9`
5. Cà phê trứng — `98e3ca6e-1f7e-4b4b-a656-86e0cbd6b8ca`

---

## 🎯 UX / App flow

**Country view:**
1. **🔥 "First Bites"** — featured bovenaan, 5 dishes, visueel groter
2. Daarna: gewone collecties (Street Classics, Sandwiches, etc.)

**Kaart mechanic:** trading card flip — voorkant foto, achterkant info  
**Bottom nav:** scroll-based  
**Check-in flow:** rating + locatie + korte note

---

## 📋 Backlog

### Nu
- [ ] "First Bites" UI implementeren in `index.html` (DB is al klaar)
- [ ] Thailand + Japan descriptions + price_range invullen via admin
- [ ] Admin panel bugs fixen

### Middellang
- [ ] Badges — collectie / land / karakter (First Blood, Daredevil, Globetrotter)
- [ ] Homepage redesign — landen als passport cards, recent finds

### Later
- [ ] Next.js migratie
- [ ] Social layer — vrienden, activity feed
- [ ] Passport view — wereldkaart
- [ ] `streetbite.app` domein

---

## 💡 Handige SQL snippets

```sql
-- Bulk insert zonder image trigger
ALTER TABLE dishes DISABLE TRIGGER trg_fetch_dish_image;
-- inserts hier
ALTER TABLE dishes ENABLE TRIGGER trg_fetch_dish_image;

-- Dish counts per land
SELECT c.name, COUNT(DISTINCT col.id) cols, COUNT(d.id) dishes
FROM countries c
LEFT JOIN collections col ON col.country_id = c.id
LEFT JOIN dishes d ON d.collection_id = col.id
GROUP BY c.name ORDER BY c.name;

-- First Bites van een land opvragen
SELECT d.name, d.first_bite_order
FROM dishes d
JOIN collections col ON col.id = d.collection_id
JOIN countries c ON c.id = col.country_id
WHERE c.name = 'Vietnam' AND d.first_bite_order IS NOT NULL
ORDER BY d.first_bite_order;
```
