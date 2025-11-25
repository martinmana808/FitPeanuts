# Shared Discipline

A minimal, mobile-first PWA designed for two people to rebuild daily discipline together.

## Concept

This app is a shared accountability tool where Martin & Elise can track their daily habits, weight, steps, and journal in real-time. Both users see the exact same interface — a clean table showing each person's progress side by side.

## Key Features

### Special Habits (Always at Top)
1. **Weigh Yourself** - Daily weight entry with ±0.1 kg adjusters
2. **Walk 10,000 Steps** - Step tracking (manual in this prototype)
3. **Journal (Shared)** - One shared journal entry per day for both users

### Custom Habits
- Create unlimited custom habits
- Assign to Martin, Elise, or both
- Simple checkbox completion

### Daily Reset
The system resets every day at 4 AM:
- Habits return to uncompleted
- New journal entry created
- Weight shows last recorded value
- Steps reset to 0

### Calendar View
- Monthly view with color-coded completion percentages
- Edit historical data
- View past weights, journals, and habit completion

### Real-time Sync
- All updates sync between both devices within 5 seconds
- No login required — household code-based pairing

## Setup

1. **First Device**: Choose your identity (Martin or Elise), then "Create New Household"
2. **Second Device**: Choose your identity, then "Join Existing Household" and enter the code
3. Start tracking!

## Technical Notes

- **Backend**: Supabase with Hono server for real-time sync
- **Frontend**: React with Tailwind CSS
- **PWA**: Installable on mobile devices via manifest.json
- **Storage**: Key-value store for all household data
- **Prototype Limitation**: Apple Health integration is not available in this environment

## Design Philosophy

Ultra-minimal, strict, and calm — a tool for discipline, not entertainment. No animations, no gamification, no motivational quotes. Just clean data and shared accountability.

## Daily Reset Logic

The app considers a "day" to start at 4 AM (not midnight). This is handled by:
- Server-side date calculation in `getTodayKey()` function
- Automatic data initialization for new days
- Weight carries forward from previous day

## Important Note

This is a **prototype for demonstration purposes**. For production use with real personal health data:
- Add proper authentication
- Implement data encryption
- Add privacy controls
- Deploy with production-grade infrastructure
- Ensure GDPR/HIPAA compliance as needed
