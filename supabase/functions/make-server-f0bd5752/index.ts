import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import * as kv from './kv_store.ts';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

// Utility to get today's date in YYYY-MM-DD format (in user's timezone, adjusted for 4am reset)
function getTodayKey(): string {
  const now = new Date();
  // If it's before 4am, use yesterday's date
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1);
  }
  return now.toISOString().split('T')[0];
}

// Generate random household code
function generateHouseholdCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new household
app.post('/make-server-f0bd5752/household/create', async (c) => {
  try {
    const { user1Name, user2Name } = await c.req.json();
    
    const code = generateHouseholdCode();
    
    // Initialize household config
    const config = {
      code,
      user1Name: user1Name || 'Martin',
      user2Name: user2Name || 'Elise',
      customHabits: [
        {
          id: 'habit_morning_shower',
          name: 'Morning shower',
          assignedTo: 'both',
          createdAt: new Date().toISOString()
        },
        {
          id: 'habit_brush_teeth_1',
          name: 'Brush teeth',
          assignedTo: 'both',
          createdAt: new Date().toISOString()
        },
        {
          id: 'habit_walk_10k_steps',
          name: 'Walk 10k steps',
          assignedTo: 'both',
          createdAt: new Date().toISOString()
        },
        {
          id: 'habit_gym',
          name: 'Gym',
          assignedTo: 'both',
          createdAt: new Date().toISOString()
        },
        {
          id: 'habit_eat_sharp',
          name: 'Eat sharp',
          assignedTo: 'both',
          createdAt: new Date().toISOString()
        },
        {
          id: 'habit_brush_teeth_2',
          name: 'Brush teeth',
          assignedTo: 'both',
          createdAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`household:${code}:config`, config);
    
    // Initialize today's data
    const todayKey = getTodayKey();
    const todayData = {
      date: todayKey,
      weight: { user1: 88.1, user2: 55.5 },
      steps: { user1: 0, user2: 0 },
      journal: '',
      journalSubmitted: false,
      habits: {}
    };
    
    await kv.set(`household:${code}:day:${todayKey}`, todayData);
    
    return c.json({ success: true, code, config });
  } catch (error) {
    console.error('Error creating household:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Join an existing household
app.post('/make-server-f0bd5752/household/join', async (c) => {
  try {
    const { code } = await c.req.json();
    
    const config = await kv.get(`household:${code}:config`);
    
    if (!config) {
      return c.json({ success: false, error: 'Household not found' }, 404);
    }
    
    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error joining household:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get today's data
app.get('/make-server-f0bd5752/household/:code/today', async (c) => {
  try {
    const code = c.req.param('code');
    const todayKey = getTodayKey();
    
    let todayData = await kv.get(`household:${code}:day:${todayKey}`);
    
    // If today's data doesn't exist, initialize it
    if (!todayData) {
      // Get yesterday's weight to pre-populate
      const yesterday = new Date();
      if (yesterday.getHours() < 4) {
        yesterday.setDate(yesterday.getDate() - 2);
      } else {
        yesterday.setDate(yesterday.getDate() - 1);
      }
      const yesterdayKey = yesterday.toISOString().split('T')[0];
      const yesterdayData = await kv.get(`household:${code}:day:${yesterdayKey}`);
      
      todayData = {
        date: todayKey,
        weight: {
          user1: yesterdayData?.weight?.user1 || null,
          user2: yesterdayData?.weight?.user2 || null
        },
        steps: { user1: 0, user2: 0 },
        journal: '',
        journalSubmitted: false,
        habits: {}
      };
      
      await kv.set(`household:${code}:day:${todayKey}`, todayData);
    }
    
    const config = await kv.get(`household:${code}:config`);
    
    return c.json({ success: true, data: todayData, config });
  } catch (error) {
    console.error('Error getting today data:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update weight
app.post('/make-server-f0bd5752/household/:code/weight', async (c) => {
  try {
    const code = c.req.param('code');
    const { user, weight } = await c.req.json();
    const todayKey = getTodayKey();
    
    const todayData = await kv.get(`household:${code}:day:${todayKey}`);
    
    if (!todayData) {
      return c.json({ success: false, error: 'Today data not found' }, 404);
    }
    
    todayData.weight[user] = weight;
    await kv.set(`household:${code}:day:${todayKey}`, todayData);
    
    return c.json({ success: true, data: todayData });
  } catch (error) {
    console.error('Error updating weight:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update steps
app.post('/make-server-f0bd5752/household/:code/steps', async (c) => {
  try {
    const code = c.req.param('code');
    const { user, steps } = await c.req.json();
    const todayKey = getTodayKey();
    
    const todayData = await kv.get(`household:${code}:day:${todayKey}`);
    
    if (!todayData) {
      return c.json({ success: false, error: 'Today data not found' }, 404);
    }
    
    todayData.steps[user] = steps;
    await kv.set(`household:${code}:day:${todayKey}`, todayData);
    
    return c.json({ success: true, data: todayData });
  } catch (error) {
    console.error('Error updating steps:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update journal
app.post('/make-server-f0bd5752/household/:code/journal', async (c) => {
  try {
    const code = c.req.param('code');
    const { journal, submitted } = await c.req.json();
    const todayKey = getTodayKey();
    
    const todayData = await kv.get(`household:${code}:day:${todayKey}`);
    
    if (!todayData) {
      return c.json({ success: false, error: 'Today data not found' }, 404);
    }
    
    todayData.journal = journal;
    if (submitted !== undefined) {
      todayData.journalSubmitted = submitted;
    }
    await kv.set(`household:${code}:day:${todayKey}`, todayData);
    
    return c.json({ success: true, data: todayData });
  } catch (error) {
    console.error('Error updating journal:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Toggle habit completion
app.post('/make-server-f0bd5752/household/:code/habit', async (c) => {
  try {
    const code = c.req.param('code');
    const { habitId, user, completed } = await c.req.json();
    const todayKey = getTodayKey();
    
    const todayData = await kv.get(`household:${code}:day:${todayKey}`);
    
    if (!todayData) {
      return c.json({ success: false, error: 'Today data not found' }, 404);
    }
    
    if (!todayData.habits[habitId]) {
      todayData.habits[habitId] = { user1: false, user2: false };
    }
    
    todayData.habits[habitId][user] = completed;
    await kv.set(`household:${code}:day:${todayKey}`, todayData);
    
    return c.json({ success: true, data: todayData });
  } catch (error) {
    console.error('Error toggling habit:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Add custom habit
app.post('/make-server-f0bd5752/household/:code/habits/add', async (c) => {
  try {
    const code = c.req.param('code');
    const { name, assignedTo } = await c.req.json();
    
    const config = await kv.get(`household:${code}:config`);
    
    if (!config) {
      return c.json({ success: false, error: 'Household not found' }, 404);
    }
    
    const newHabit = {
      id: `habit_${Date.now()}`,
      name,
      assignedTo, // 'user1', 'user2', or 'both'
      createdAt: new Date().toISOString()
    };
    
    config.customHabits.push(newHabit);
    await kv.set(`household:${code}:config`, config);
    
    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error adding habit:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update custom habit
app.put('/make-server-f0bd5752/household/:code/habits/:habitId', async (c) => {
  try {
    const code = c.req.param('code');
    const habitId = c.req.param('habitId');
    const { name, assignedTo } = await c.req.json();

    const config = await kv.get(`household:${code}:config`);

    if (!config) {
      return c.json({ success: false, error: 'Household not found' }, 404);
    }

    const habitIndex = config.customHabits.findIndex((h: any) => h.id === habitId);
    if (habitIndex === -1) {
      return c.json({ success: false, error: 'Habit not found' }, 404);
    }

    config.customHabits[habitIndex] = {
      ...config.customHabits[habitIndex],
      name,
      assignedTo
    };

    await kv.set(`household:${code}:config`, config);

    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error updating habit:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Reorder custom habits
app.put('/make-server-f0bd5752/household/:code/habits/reorder', async (c) => {
  try {
    const code = c.req.param('code');
    const { habits } = await c.req.json();

    const config = await kv.get(`household:${code}:config`);

    if (!config) {
      return c.json({ success: false, error: 'Household not found' }, 404);
    }

    // Update the order of habits based on the provided array
    const reorderedHabits = habits.map((habitUpdate: any) => {
      const habit = config.customHabits.find((h: any) => h.id === habitUpdate.id);
      if (habit) {
        return { ...habit, order: habitUpdate.order };
      }
      return null;
    }).filter(Boolean);

    config.customHabits = reorderedHabits;
    await kv.set(`household:${code}:config`, config);

    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error reordering habits:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete custom habit
app.delete('/make-server-f0bd5752/household/:code/habits/:habitId', async (c) => {
  try {
    const code = c.req.param('code');
    const habitId = c.req.param('habitId');

    const config = await kv.get(`household:${code}:config`);

    if (!config) {
      return c.json({ success: false, error: 'Household not found' }, 404);
    }

    config.customHabits = config.customHabits.filter((h: any) => h.id !== habitId);
    await kv.set(`household:${code}:config`, config);

    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error deleting habit:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get calendar data (month view)
app.get('/make-server-f0bd5752/household/:code/calendar/:year/:month', async (c) => {
  try {
    const code = c.req.param('code');
    const year = c.req.param('year');
    const month = c.req.param('month');
    
    // Get all days for this month
    const prefix = `household:${code}:day:${year}-${month}`;
    const daysData = await kv.getByPrefix(prefix);
    
    const config = await kv.get(`household:${code}:config`);
    
    return c.json({ success: true, days: daysData, config });
  } catch (error) {
    console.error('Error getting calendar data:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update household config
app.put('/make-server-f0bd5752/household/:code/config', async (c) => {
  try {
    const code = c.req.param('code');
    const updates = await c.req.json();

    const config = await kv.get(`household:${code}:config`);

    if (!config) {
      return c.json({ success: false, error: 'Household not found' }, 404);
    }

    // Merge updates
    Object.assign(config, updates);

    await kv.set(`household:${code}:config`, config);

    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error updating config:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update historical day data
app.post('/make-server-f0bd5752/household/:code/day/:date', async (c) => {
  try {
    const code = c.req.param('code');
    const date = c.req.param('date');
    const updates = await c.req.json();

    let dayData = await kv.get(`household:${code}:day:${date}`);

    if (!dayData) {
      // Create if doesn't exist
      dayData = {
        date,
        weight: { user1: null, user2: null },
        steps: { user1: 0, user2: 0 },
        journal: '',
        journalSubmitted: false,
        habits: {}
      };
    }

    // Merge updates
    Object.assign(dayData, updates);

    await kv.set(`household:${code}:day:${date}`, dayData);

    return c.json({ success: true, data: dayData });
  } catch (error) {
    console.error('Error updating historical day:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
