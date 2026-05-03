# StreetBite 🍜

Gamified street food discovery app. Collect dishes, check in with photos, track prices and locations.

## Stack
- **Frontend:** Standalone HTML/CSS/JS (single file, no build step)
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Hosting:** gertjanbos.com/streetbite

## Structure
```
index.html        ← The entire app
README.md
.gitignore
```

## Features
- 🗺️ Journey view per country
- 📦 Collections with unlock system (Essentials, Street Classics, Daredevil, Drinks, Regional)
- 🃏 Trading card flip with rarity system
- ✅ Check-in with photo, price, location, rating
- 👤 Google OAuth + anonymous auth
- 🏆 Badges (coming soon)

## Countries
- 🇻🇳 Vietnam — 72 dishes, 6 collections
- 🇹🇭 Thailand — coming soon
- 🇳🇱 Netherlands — coming soon

## Database (Supabase)
Project: `ztipltgnprzxxbkmsokj`

Tables: `countries`, `collections`, `dishes`, `experiences`, `user_dishes`, `user_collections`
Storage bucket: `checkin-photos`
