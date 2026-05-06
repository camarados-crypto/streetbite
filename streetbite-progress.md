# StreetBite — Project voortgang

**Laatste update:** 3 mei 2026
**Supabase project:** `ztipltgnprzxxbkmsokj.supabase.co`

---

## Wat is StreetBite?

Mobile-first, gamified food discovery platform. Gebruikers verzamelen streetfood-gerechten als trading cards, gegroepeerd per land en collectie. Kern is gamification: verzamelen, badges, progressie, social layer. Vergelijkbaar met Untappd maar dan voor eten.

---

## Database schema

```sql
countries       (id uuid, name text)
collections     (id uuid, country_id, name, unlock_type[default/progress], unlock_requirement int, order_index int)
dishes          (id uuid, collection_id, name, image_url, rarity, description text, price_range text)
experiences     (id uuid, dish_id, user_id, rating int, location_text, note, price, currency, photo_url, user_display_name, user_avatar_url, created_at)
user_dishes     (user_id uuid, dish_id uuid, experience_id, created_at)
user_collections(user_id, collection_id, progress, completed_dishes, total_dishes, status, updated_at)
dish_stats      (dish_id, total_tried)
```

**Trigger:** `trg_fetch_dish_image` — standaard UIT bij bulk inserts
**Storage bucket:** `checkin-photos`

### RLS status
| Tabel | RLS | Policies |
|-------|-----|----------|
| countries | ✅ | public read |
| collections | ✅ | public read |
| dishes | ✅ | public read + update/insert (admin) |
| experiences | ✅ | public read, own write/update/delete |
| user_dishes | ✅ | own read/write/update/delete |
| user_collections | ✅ | own read/write/update |
| dish_stats | ✅ | public read/write |

---

## Landen & collecties

### Vaste collectienaam-structuur per land
1. `[Land] Essentials` — default
2. `Street Classics` — default
3. `Daredevil Eats` — progress unlock
4. `Drinks & [X]` — default
5. Landspecifieke collectie — default
6. Landspecifieke collectie — progress unlock

### 🇻🇳 Vietnam — 72 dishes
Vietnam Essentials / Street Classics / Daredevil Eats (50%) / Drinks & Coffee / Hanoi Streets (30%) / Saigon Nights (60%)

### 🇹🇭 Thailand — 31 dishes
Thailand Essentials / Street Classics / Night Market Finds / Drinks & Snacks / Daredevil Eats (5) / Bangkok Nights (10)

### 🇯🇵 Japan — 32 dishes
Japan Essentials / Street Classics / Daredevil Eats (10) / Drinks & Sweets / Convenience Store Gems / Tokyo Nights (5)

**UUIDs:** Vietnam `11111111-...` · Thailand `44444444-...` · Japan `55555555-...`

---

## Frontend

### streetbite.html
- **Country picker** — pill knop → sheet, laadt nieuwe collecties, opgeslagen in localStorage
- **Home** — Featured Essentials + collecties scroll + Recent finds
- **Collection detail** — progress bar bovenaan, ← Home pill knop, dish grid
- **Card modal:**
  - Hoogte `min(520px, 72vh)` — werkt op alle schermformaten
  - Voorkant: foto 2/3 · info strip 1/3 (beschrijving + prijs + ⭐ async)
  - Achterkant: stats + check-in knop
  - Tap voor- én achterkant → flip terug
  - Openingsanimatie: smooth inzwaaien met bounce
- **Check-in** — foto upload, sterren, prijs (auto-currency op basis van land), GPS, notitie
- **Auth** — anonymous + Google OAuth, cloud sync

### admin.html
- Dishes bewerken zonder SQL incl. description + price_range
- RLS update policy staat aan voor dishes

---

## Backlog

### Komende sessie
- [ ] Kaart tweaks (lijst volgt)
- [ ] description + price_range invullen Thailand + Japan via admin
- [ ] Admin overige bugs

### Middellang
- [ ] Badges — collectie / land / karakter badges (First Blood, Daredevil, Globetrotter)
- [ ] Homepage redesign — passport view, recent finds cross-country

### Later
- [ ] Next.js migratie
- [ ] Social layer — vrienden, activity feed
- [ ] Passport view — wereldkaart
- [ ] streetbite.app domein

---

## Handige SQL

```sql
-- Bulk insert zonder trigger
ALTER TABLE dishes DISABLE TRIGGER trg_fetch_dish_image;
-- inserts hier
ALTER TABLE dishes ENABLE TRIGGER trg_fetch_dish_image;

-- Beschrijving + prijs toevoegen
UPDATE dishes SET description = '...', price_range = '50–80฿' WHERE name = '...';

-- Dish counts per land
SELECT c.name, COUNT(DISTINCT col.id) cols, COUNT(d.id) dishes
FROM countries c
LEFT JOIN collections col ON col.country_id = c.id
LEFT JOIN dishes d ON d.collection_id = col.id
GROUP BY c.name ORDER BY c.name;
```
