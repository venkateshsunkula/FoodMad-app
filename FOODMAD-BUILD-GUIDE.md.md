# FOODMAD APP — Complete Build Instructions for Claude Code

## WHO I AM
I'm Venky, a recent graduate with a Technology Management degree. I'm learning to code as I build. Explain technical decisions when you make them. Don't assume I know advanced concepts. When you make changes, tell me what you changed and why.

## WHAT FOODMAD IS
Foodmad (temporary name, real name is Saltnote) is a street food discovery and social food logging app for India — think "Letterboxd for food." Users discover street food vendors that don't exist on Google Maps, log what they eat, and build their personal food identity.

The tagline: "The street food discovery platform India never had."

### Core Value Propositions:
1. **Discover** — Browse a map of street food vendors and restaurants in your neighborhood
2. **Log** — Share what you ate in under 30 seconds (photo + rating + tags, no paragraphs)
3. **Map the unmapped** — Pin new street vendors that don't exist on any platform and earn Discoverer credit
4. **Build your food identity** — Your profile is your personal food journey

### Key Design Principles:
- Logging a meal must take UNDER 30 SECONDS — this is non-negotiable
- Frame it as "share what you ate" NOT "write a review" — no paragraph text boxes
- Street vendors get golden pins on the map, restaurants get grey pins
- Users who pin new vendors get permanent "Discoverer" credit
- Dark theme throughout (Letterboxd-inspired aesthetic)
- Mobile-first design — this will be used primarily on phones as a PWA
- The app should feel social, not like a utility/calorie tracker

### How It's Different From Competitors:
- Zomato/Swiggy: They focus on restaurants + delivery. We map street vendors they ignore.
- Beli: Restaurant-focused, US market. We're India-focused with street vendors.
- Yummi: Personal food diary only. We have community mapping + social discovery.
- Kartbites: Tried this and died. They were US-based, couldn't seed data in India, pivoted to delivery.
- Google Maps: Their system rejects "seasonal businesses without permanent location" — most Indian street vendors.

---

## TECH STACK (Already Set Up)

### Frontend:
- **Next.js** with TypeScript and App Router
- **Tailwind CSS** for styling
- **@vis.gl/react-google-maps** for Google Maps integration

### Backend:
- **Supabase** — Postgres database, Auth, Storage, Real-time
- **PostGIS** extension enabled for location queries

### APIs:
- **Google Maps JavaScript API** — for map display
- **Google Places API** — enabled, for bootstrapping restaurant data later

### Hosting:
- **Vercel** (not connected yet, will deploy later)

### Environment Variables (.env.local):
```
NEXT_PUBLIC_SUPABASE_URL=https://sturgbszvapzqdrgvsbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[stored in .env.local]
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[stored in .env.local]
```

---

## DATABASE SCHEMA (Already Created in Supabase)

### Tables:

**users**
- id: UUID PRIMARY KEY
- name: TEXT NOT NULL
- email: TEXT UNIQUE NOT NULL
- avatar_url: TEXT
- city: TEXT
- created_at: TIMESTAMPTZ

**vendors**
- id: UUID PRIMARY KEY
- name: TEXT NOT NULL
- type: TEXT (pushcart, street_stall, small_shop, restaurant)
- location: GEOGRAPHY(POINT, 4326) — exists but we use lat/lng columns instead
- lat: DOUBLE PRECISION
- lng: DOUBLE PRECISION
- cuisine_tags: TEXT[]
- hours: TEXT
- photo_url: TEXT
- source: TEXT (manual, google)
- added_by: UUID REFERENCES users(id)
- city: TEXT
- neighborhood: TEXT
- created_at: TIMESTAMPTZ

**meal_logs**
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES users(id) — currently nullable (auth not built yet)
- vendor_id: UUID REFERENCES vendors(id) NOT NULL
- dish_name: TEXT NOT NULL
- rating: INTEGER (1-5)
- price_inr: INTEGER
- photo_url: TEXT
- tags: TEXT[]
- note: TEXT
- location: GEOGRAPHY(POINT, 4326)
- lat: DOUBLE PRECISION
- lng: DOUBLE PRECISION
- time_of_day: TEXT (morning, lunch, evening, late)
- logged_at: TIMESTAMPTZ

**dishes**
- id: UUID PRIMARY KEY
- canonical_name: TEXT NOT NULL
- aliases: TEXT[] (e.g., Puchka = Pani Puri = Golgappe)
- cuisine: TEXT
- category: TEXT
- is_veg: BOOLEAN
- meal_types: TEXT[]

**follows**
- follower_id: UUID REFERENCES users(id)
- following_id: UUID REFERENCES users(id)
- PRIMARY KEY (follower_id, following_id)
- created_at: TIMESTAMPTZ

### Important Notes:
- Row Level Security is DISABLED on vendors and meal_logs (for development)
- PostGIS extension is enabled
- Indexes exist on vendors(location), meal_logs(user_id), meal_logs(vendor_id)
- Supabase Storage bucket called "photos" exists (public bucket)

---

## WHAT'S ALREADY BUILT

### File Structure:
```
foodmad-app/
├── app/
│   ├── lib/
│   │   └── supabase.ts       ← Supabase client connection
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── log.tsx                ← Meal logging component
│   └── page.tsx               ← Home page with map
├── public/
├── .env.local                 ← API keys (DO NOT modify or expose)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

### What's Working:
1. **Supabase connection** (app/lib/supabase.ts) — createClient configured
2. **Map screen** (app/page.tsx):
   - Full-screen Google Map centered on user's GPS location
   - Falls back to Hyderabad (17.385, 78.4867) if location denied
   - Fetches vendors from Supabase and displays as pins
   - Golden pins for source='manual' (user-added vendors)
   - Grey pins for source='google' (bootstrapped restaurants)
   - Tap a pin → dark popup card shows vendor name, type, hours, cuisine tags
   - Golden "+" button at bottom center opens meal logging
3. **Meal logging** (app/log.tsx):
   - Step 1: Pick a vendor from list
   - Step 2: Enter dish name, rating (1-5), price (₹), tags, optional note
   - Tags: spicy, veg, non-veg, sweet, must-try, comfort food, late night, seasonal
   - Auto-captures time_of_day from current hour
   - Saves to Supabase meal_logs table
   - Shows "Meal saved!" alert on success
4. **Test data in database**:
   - "Sharma Ji Chaat" vendor in Hyderabad (2 duplicate entries)
   - "Test Taco Cart" vendor in Houston

### What's NOT Working / Not Built Yet:
- Photo upload is NOT connected yet (Storage bucket exists but upload code not integrated)
- No user authentication
- No vendor pinning flow
- No profile page
- No bottom navigation
- No social features (follows, feed)
- No search/filter
- No dark theme applied consistently
- Default Next.js globals.css still has boilerplate styles

---

## WHAT TO BUILD — COMPLETE FEATURE LIST IN ORDER

### PHASE 1: Fix & Complete Current Features

#### 1.1 Photo Upload for Meal Logging
- Add photo capture/upload to the meal logging flow (log.tsx)
- Use `<input type="file" accept="image/*" capture="environment">` for mobile camera
- Upload photos to Supabase Storage "photos" bucket
- Save the public URL to meal_logs.photo_url
- Show photo preview before saving
- Allow removing photo before saving
- Compress images before upload (keep under 1MB)

#### 1.2 Clean Up Test Data
- Remove duplicate "Sharma Ji Chaat" entries (keep one)
- Keep the Houston test vendor for development

---

### PHASE 2: Vendor Pinning Flow

#### 2.1 "Add New Vendor" Screen
- Accessible from the map screen (add a button like "Add vendor" or show it when "+" is pressed with no nearby vendors)
- Full-screen dark overlay (matches log.tsx style)

#### 2.2 Draggable Pin on Map
- Show Google Map centered on user's GPS
- User can drag a pin to the exact vendor location
- Display the address/area name below the map as user moves the pin

#### 2.3 Vendor Details Form
- Vendor name: text input (required)
- Vendor type: tappable chips — Pushcart | Street stall | Small shop | Restaurant
- Cuisine tags: tappable chips (multi-select) — Chaat | Momos | South Indian | Biryani | Chinese | Tea/Coffee | Sweets | Rolls/Wraps | North Indian | Dosa | Juice/Shakes
- Usually open: tappable chips — Morning | Lunch | Evening | Late night | All day
- Photo: optional camera/upload (same as meal log photo)

#### 2.4 Proximity Duplicate Check
- Before saving, query vendors within 50 meters of the pin location
- If potential duplicate found, show: "Is this the same as [vendor name]?" with Yes/No
- If Yes, redirect to that vendor's page
- If No, allow creation

#### 2.5 Save Vendor
- Save to vendors table with source='manual', lat/lng from pin position
- added_by will be null until auth is built
- After saving, auto-redirect to meal logging with that vendor pre-selected
- Show "Vendor added!" success message

---

### PHASE 3: User Authentication

#### 3.1 Google Sign-In
- Use Supabase Auth with Google OAuth provider
- Configure in Supabase dashboard: Authentication → Providers → Google
- Sign in button on the app (not blocking — users can browse map without signing in)
- Require sign-in only when trying to: log a meal, pin a vendor, or view profile

#### 3.2 User Profile Creation
- After first Google sign-in, create entry in users table
- Pull name and avatar from Google account
- Ask user to select their city

#### 3.3 Connect User to Actions
- Set user_id on meal_logs when logging
- Set added_by on vendors when pinning
- Show "Discovered by [username]" on vendor detail popup

---

### PHASE 4: Profile Page & Food Diary

#### 4.1 Profile Page (/profile)
- Dark themed, Letterboxd-inspired layout
- Top section: avatar, name, city
- Stats row: total meals logged | vendors discovered | unique dishes tried
- Grid of meal logs in reverse chronological order
- Each meal card shows: photo (if exists), dish name, vendor name, rating, date
- Tap a meal card to see full details

#### 4.2 Calendar View (optional but nice)
- Toggle between grid view and calendar view
- Calendar shows food photos on each day (like Yummi app does)

---

### PHASE 5: Bottom Navigation Bar

#### 5.1 Navigation Structure
- Fixed bottom bar with 3 tabs:
  - Map (home icon) — the map screen
  - "+" (plus icon) — opens meal logging
  - Profile (person icon) — opens profile page
- Active tab highlighted in gold (#F59E0B)
- Dark background (#111)
- Should persist across all pages

#### 5.2 Page Routing
- / → Map screen
- /profile → Profile page
- Meal logging and vendor pinning are overlays/modals, not separate routes

---

### PHASE 6: Vendor Detail Page

#### 6.1 Full Vendor Page
- Shows when you tap a vendor pin and then tap "View details" on the popup
- Vendor name, type, cuisine tags, hours
- "Discovered by [username]" credit (if source='manual')
- Map showing vendor location with directions link
- All meal logs for this vendor (from all users)
- Average rating calculated from all meal logs
- All photos from meal logs
- Top dishes (most frequently logged dish names)

---

### PHASE 7: Social Features

#### 7.1 Follow Users
- Follow/unfollow button on other users' profiles
- Uses follows table (follower_id, following_id)

#### 7.2 Discovery Feed (/feed)
- Chronological feed of meal logs from people you follow
- Each feed item shows: user avatar+name, photo, dish name, vendor name, rating, time ago
- Tap to see full details
- Add Feed as 4th item in bottom nav (between Map and Profile)

#### 7.3 Shareable Profile Links
- Public URL for each user profile (e.g., /user/[username])
- Can be shared on Instagram, WhatsApp, etc.

---

### PHASE 8: Polish & PWA

#### 8.1 Dark Theme
- Consistent dark theme across ALL pages
- Background: #111 or #0a0a0a
- Cards: #1a1a1a
- Borders: #333
- Primary accent: #F59E0B (amber/gold)
- Text primary: white
- Text secondary: #9CA3AF
- All form inputs dark styled
- No white flash on page load

#### 8.2 PWA Setup
- Add manifest.json with app name "Foodmad", icons, theme color
- Add service worker for offline support
- "Add to Home Screen" should work on Android
- App icon should be a food/salt related design (placeholder is fine)

#### 8.3 Responsive Design
- All screens must work on mobile (320px-428px width)
- Map should be full screen on mobile
- Bottom nav should have safe area padding for phones with home indicators
- Forms should not be cut off by mobile keyboards

#### 8.4 Loading States
- Show skeleton loaders while data loads
- Show spinner while photos upload
- Disable save button while saving (already done in log.tsx)

#### 8.5 Error Handling
- Show user-friendly error messages (not console errors)
- Handle network failures gracefully
- Handle location permission denial (already falls back to Hyderabad)

---

### PHASE 9: Restaurant Bootstrapping (Google Places API)

#### 9.1 Bootstrap Script
- Create a script (can be a Next.js API route or standalone script)
- Use Google Places API to search for restaurants in a specific area
- Pull: name, location (lat/lng), cuisine type, rating, photos, hours
- Insert into vendors table with source='google'
- Target: 50-100 restaurants per neighborhood

#### 9.2 Target Launch Neighborhood
- Start with ONE neighborhood in an Indian city (likely Hyderabad or the city where I have contacts)
- The script should accept a center point (lat/lng) and radius

---

### PHASE 10: Deployment

#### 10.1 Vercel Deployment
- Connect GitHub repo to Vercel
- Add environment variables in Vercel dashboard
- Deploy to production
- Custom domain setup (if available)

#### 10.2 Google Maps API Restrictions
- Add production domain to Google Maps API key restrictions
- Keep localhost for development

---

## DESIGN & STYLE GUIDE

### Colors:
- Background primary: #0a0a0a or #111
- Background card: #1a1a1a
- Background input: #1a1a1a
- Border default: #333
- Border active/selected: #F59E0B
- Accent/Primary: #F59E0B (amber gold)
- Accent hover: #D97706
- Text primary: #FFFFFF
- Text secondary: #9CA3AF
- Text tertiary: #6B7280
- Success: #10B981
- Error: #EF4444
- Vendor pin: #F59E0B (gold)
- Restaurant pin: #9CA3AF (grey)

### Typography:
- Use system font stack or Inter
- Headings: 18-24px, font-weight 600-700
- Body: 14-16px, font-weight 400
- Captions/labels: 12-13px, color #9CA3AF

### Components:
- Cards: background #1a1a1a, border 1px solid #333, border-radius 10-12px
- Buttons primary: background #F59E0B, color black, border-radius 10px, font-weight 700
- Buttons secondary: background transparent, border 1px solid #333, color #9CA3AF
- Tags/chips: padding 8px 14px, border-radius 20px, border 1px solid #333
- Tags selected: border-color #F59E0B, background #F59E0B22, color #F59E0B
- Inputs: background #1a1a1a, border 1px solid #333, border-radius 8px, color white, padding 12px
- Rating buttons: 44x44px, border-radius 8px, gold when selected

### Layout:
- Mobile-first (design for 375px width, scale up)
- Full-screen map on home
- Overlays/modals for logging and vendor pinning (position fixed, inset 0)
- Bottom navigation: fixed, 60px height, background #111, border-top 1px solid #222
- Safe area padding at bottom for mobile home indicators

---

## IMPORTANT RULES

1. **Read existing code before making changes** — understand what's already built
2. **Don't break existing features** — map, pins, meal logging must keep working
3. **Don't modify .env.local** — API keys are already configured
4. **Mobile-first** — test everything at 375px width
5. **Keep the meal logging flow under 30 seconds** — don't add unnecessary steps
6. **Dark theme everywhere** — no white backgrounds, no light mode
7. **Use Tailwind CSS** for new styling instead of inline styles (existing code uses inline styles, you can gradually migrate)
8. **Commit after each major feature** with descriptive messages
9. **Don't add features I didn't ask for** — stick to the phases above
10. **When in doubt, keep it simple** — we can always add complexity later

---

## BUILD ORDER SUMMARY

Start with Phase 1, complete it fully, then move to Phase 2, and so on:

1. Photo upload + clean up test data
2. Vendor pinning flow
3. User authentication (Google sign-in)
4. Profile page & food diary
5. Bottom navigation bar
6. Vendor detail page
7. Social features (follow + feed)
8. Polish & PWA setup
9. Restaurant bootstrapping script
10. Vercel deployment

After each phase, tell me what you built and ask if I want to proceed to the next phase.

---

## START NOW

Read all existing files in the project first. Then start with Phase 1.1: Add photo upload to the meal logging flow. The Supabase Storage bucket "photos" already exists and is public. Build the feature, test it, and let me know when it's done.
