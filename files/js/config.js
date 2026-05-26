const APP_VERSION = '2026.05.26';

// ── SUPABASE ──────────────────────────────────────────
const SB  = 'https://ztipltgnprzxxbkmsokj.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aXBsdGducHJ6eHhia21zb2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTMwODMsImV4cCI6MjA5MzE4OTA4M30.bsltWzAaFFQiF07nrPIlzRsxkBZhfNsPpegE1uqQxtk';
const sbClient = (typeof supabase !== 'undefined') ? supabase.createClient(SB, KEY) : null;

// ── DOM HELPER ────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── COUNTRY DATA ──────────────────────────────────────
const COUNTRY_FLAGS = {
  'Vietnam':'🇻🇳','Thailand':'🇹🇭','Japan':'🇯🇵',
  'Indonesia':'🇮🇩','Korea':'🇰🇷','India':'🇮🇳',
  'Mexico':'🇲🇽','Italy':'🇮🇹','Netherlands':'🇳🇱','Nederland':'🇳🇱',
  'Malaysia':'🇲🇾','Singapore':'🇸🇬','Taiwan':'🇹🇼',
};
const COUNTRY_CURRENCY = {
  'Vietnam':'VND','Thailand':'THB','Japan':'JPY',
  'Indonesia':'IDR','Netherlands':'EUR','Italy':'EUR',
  'Malaysia':'MYR','Singapore':'SGD','Taiwan':'TWD',
};
const COUNTRY_DATA = {
  'Vietnam': { tagline:'Bold flavors. Fresh ingredients. Unforgettable street food.', bg:'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=75' },
  'Thailand': { tagline:'Spicy, sweet, sour. Thailand\'s streets never disappoint.', bg:'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=900&q=75' },
  'Japan': { tagline:'Precision, umami, tradition. Every bite tells a story.', bg:'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=75' },
};

// ── COLLECTION META ───────────────────────────────────
const COL_ICONS = {
  'Vietnam Essentials':     { emoji:'⭐', bg:'#FFF3E0', color:'#C85A00' },
  'Thailand Essentials':    { emoji:'⭐', bg:'#FFF3E0', color:'#C85A00' },
  'Japan Essentials':       { emoji:'⭐', bg:'#FFF3E0', color:'#C85A00' },
  'Street Classics':        { emoji:'🍜', bg:'#FFF8E1', color:'#B07800' },
  'Daredevil Eats':         { emoji:'🌶️', bg:'#FFEAEA', color:'#C02020' },
  'Drinks & Coffee':        { emoji:'☕', bg:'#E0F5F0', color:'#006B5A' },
  'Drinks & Snacks':        { emoji:'🧋', bg:'#E3F2F9', color:'#0066A0' },
  'Drinks & Sweets':        { emoji:'🍵', bg:'#E8F5E9', color:'#2E7D32' },
  'Night Market Finds':     { emoji:'🌙', bg:'#EDE7F6', color:'#5E35B1' },
  'Hanoi Streets':          { emoji:'🏮', bg:'#FCE4EC', color:'#AD1457' },
  'Saigon Nights':          { emoji:'🌃', bg:'#E8EAF6', color:'#3949AB' },
  'Bangkok Nights':         { emoji:'🌆', bg:'#E8EAF6', color:'#3949AB' },
  'Tokyo Nights':           { emoji:'🗼', bg:'#E8EAF6', color:'#3949AB' },
  'Convenience Store Gems': { emoji:'🏪', bg:'#E8F5E9', color:'#2E7D32' },
  'Northern Thailand':      { emoji:'🏔️', bg:'#E0F5F0', color:'#00695C' },
};
const COL_DESCRIPTIONS = {
  'Vietnam Essentials':'The classics every visitor must try',
  'Thailand Essentials':'The classics every visitor must try',
  'Japan Essentials':'The classics every visitor must try',
  'Street Classics':'Popular dishes you\'ll find everywhere',
  'Daredevil Eats':'For the adventurous eaters',
  'Drinks & Coffee':'Vietnam\'s legendary drink culture',
  'Drinks & Snacks':'Cool down with local favorites',
  'Drinks & Sweets':'Unique Japanese sweet drinks',
  'Night Market Finds':'What to eat after dark',
  'Hanoi Streets':'Northern flavors from the capital',
  'Saigon Nights':'Southern street food at its finest',
  'Bangkok Nights':'The city that never sleeps',
  'Tokyo Nights':'After-dark Tokyo specialties',
  'Convenience Store Gems':'Surprisingly good konbini food',
};

// ── BADGES ────────────────────────────────────────────
const BADGES = {
  first_bites_Vietnam:  { icon:'🏅', title:'First Bites Vietnam',  sub:'Tried all 5 must-eat dishes in Vietnam',  country:'Vietnam',  flag:'🇻🇳' },
  first_bites_Thailand: { icon:'🏅', title:'First Bites Thailand', sub:'Tried all 5 must-eat dishes in Thailand', country:'Thailand', flag:'🇹🇭' },
  first_bites_Japan:        { icon:'🏅', title:'First Bites Japan',        sub:'Tried all 5 must-eat dishes in Japan',        country:'Japan',        flag:'🇯🇵' },
  first_bites_Netherlands:  { icon:'🏅', title:'First Bites Netherlands',  sub:'Tried all 5 must-eat dishes in the Netherlands', country:'Netherlands', flag:'🇳🇱' },
};
const BADGES_COMING = [
  { icon:'🔥', name:'Street Master',  hint:'Complete Street Classics' },
  { icon:'🌶️', name:'Daredevil',      hint:'Try all Daredevil dishes' },
  { icon:'🌍', name:'Globetrotter',   hint:'Eat in 3 countries' },
  { icon:'⭐', name:'Legend',         hint:'Complete a full country' },
];

// ── DISH COPY (fallback descriptions) ─────────────────
const DESCRIPTIONS = {
  'Phở bò':'Het nationale symbool van Vietnam — een bouillon die uren suddert. Elke kom is een verhaal.',
  'Bánh mì':'De perfecte fusie van Frans stokbrood en Vietnamese smaken. Knapperig, fris, pittig.',
  'Gỏi cuốn':'Verse rijstpapier-rolletjes met garnalen, kruiden en vermicelli. Gezond en verfrissend.',
  'Cơm tấm':'Gebroken rijst met gegrild varkensvlees. Hét straatvoedsel van Saigon.',
  'Bún chả':'Gegrild varkensvlees met vermicelli en een smaakvolle dipsaus. Obama at het ook.',
  'Bánh xèo':'Knapperige sizzling crêpe met garnalen en taugé. Rol hem in slabaadjes — wow.',
  'Cao lầu':'Exclusieve Hội An specialiteit — de noedels kunnen alleen hier gemaakt worden.',
  'Bún bò Huế':'Pittige runderbouillon uit de oude keizerstad Huế. Complexer en krachtiger dan phở.',
  'Cà phê trứng':'Eierkoffie van Hanoi — romige eidooier-crème op sterke Vietnamese koffie.',
  'Cà phê sữa đá':'IJskoffie met gecondenseerde melk over ijs. Sterk, zoet, onmisbaar in de hitte.',
};
const FIRST_BITE_LABELS = {
  'Phở bò':'The iconic noodle soup','Bánh mì':'Vietnam\'s famous sandwich',
  'Gỏi cuốn':'Light, fresh & full of flavor','Bún chả':'Hanoi\'s grilled pork favorite',
  'Cà phê trứng':'A unique Hanoi specialty',
  'Pad Thai':'Thailand\'s signature noodle dish','Som Tam':'Spicy green papaya salad',
  'Khao Soi':'Coconut curry noodles from Chiang Mai','Mango Sticky Rice':'The sweetest street dessert',
  'Moo Ping':'Grilled pork skewers, everywhere',
  'Onigiri':'Rice balls — convenience store gold','Takoyaki':'Octopus balls from Osaka',
  'Shoyu Ramen':'The classic soy broth ramen','Karaage':'Japan\'s legendary fried chicken',
  'Matcha Ice Cream':'The flavor of Japan in one scoop',
};

// ── RARITY COLORS ─────────────────────────────────────
const RARITY_COLOR = {common:'#888780',uncommon:'#3B6D11',rare:'#185FA5',epic:'#534AB7',legendary:'#BA7517'};
const RARITY_BG    = {common:'#F1EFE8',uncommon:'#EAF3DE',rare:'#E6F1FB',epic:'#EEEDFE',legendary:'#FAEEDA'};
const RARITY_TXT   = {common:'#5A5955',uncommon:'#245208',rare:'#0A4480',epic:'#3C3489',legendary:'#7A4A08'};
