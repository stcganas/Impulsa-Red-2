import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { sendNotification } from './notificationService.ts';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Initialize all scheduled tasks
 */
export const initScheduler = async () => {
  console.log('[Scheduler] Initializing notification scheduler...');

  // Verification check on start
  try {
    const { count, error } = await supabase
      .from('scheduled_notifications')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.warn('[Scheduler] Verification warning (table might not be ready):', error.message);
    } else {
      console.log(`[Scheduler] Connected. ${count} scheduled notifications pending found.`);
    }
  } catch (err) {
    console.error('[Scheduler] Connection test failed:', err);
  }

  // 1. Task Reminder: Every day at 10:00 AM (server time)
  cron.schedule('0 10 * * *', async () => {
    console.log('[Scheduler] Running daily task check...');
    await sendTaskReminders();
  });

  // 2. Daily Motivation: Every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Sending daily motivation...');
    await sendDailyMotivation();
  });

  // 3. Weekly Summary: Every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('[Scheduler] Sending weekly summary...');
    await sendWeeklySummary();
  });

  // 4. Dynamic Scheduled Notifications: Every minute
  cron.schedule('* * * * *', async () => {
    // console.log('[Scheduler] Heartbeat - Checking for scheduled notifications...');
    await processScheduledNotifications();
  });
};

/**
 * Check for notifications that are due and send them
 */
async function processScheduledNotifications() {
  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // Fetch pending notifications that should have been sent by now
    const { data: dueNotifications, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', nowIso);

    if (error) {
      if (error.message?.includes('schema cache')) {
        return;
      }
      console.error('[Scheduler] Error fetching due notifications:', error.message || error);
      return;
    }
    
    if (!dueNotifications || dueNotifications.length === 0) {
      // Periodic check to see if there are any upcoming ones to confirm clock sync in logs
      const { data: nextTask } = await supabase
        .from('scheduled_notifications')
        .select('scheduled_at')
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true })
        .limit(1);
      
      if (nextTask && nextTask.length > 0) {
        const diff = new Date(nextTask[0].scheduled_at).getTime() - now.getTime();
        if (diff > 0 && diff < 300000) { // If less than 5 mins away
          console.log(`[Scheduler] Next notification due in ${Math.round(diff/1000)}s (at ${nextTask[0].scheduled_at}, server time is ${nowIso})`);
        }
      }
      return;
    }
    
    console.log(`[Scheduler] TRIGGERED: Found ${dueNotifications.length} due notifications at ${nowIso}`);

    for (const notif of dueNotifications) {
      console.log(`[Scheduler] Processing notification: "${notif.title}" for ID: ${notif.id}`);
      
      try {
        // Mark as processing to avoid race conditions
        const { error: updateError } = await supabase
          .from('scheduled_notifications')
          .update({ status: 'processing' })
          .eq('id', notif.id);

        if (updateError) {
          console.error(`[Scheduler] Could not lock notif ${notif.id}:`, updateError.message);
          continue;
        }

        let sentSuccess = false;

        if (notif.user_id) {
          // Send to specific user
          console.log(`[Scheduler] Sending targeted: user ${notif.user_id}`);
          await sendNotification({
            userId: notif.user_id,
            title: notif.title,
            message: notif.message,
            type: notif.type
          });
          sentSuccess = true;
        } else if (notif.target_role) {
          // Send to role
          console.log(`[Scheduler] Sending to role: ${notif.target_role}`);
          const { data: users, error: roleError } = await supabase
            .from('users')
            .select('id')
            .eq('role', notif.target_role);
          
          if (roleError) throw roleError;
          
          if (users && users.length > 0) {
            const userIds = users.map(u => u.id);
            console.log(`[Scheduler] Target users found: ${userIds.length}`);
            await sendNotification({
              userId: userIds,
              title: notif.title,
              message: notif.message,
              type: notif.type
            });
          } else {
            console.log(`[Scheduler] No users found with role: ${notif.target_role}`);
          }
          sentSuccess = true;
        } else {
          // Send to all users efficiently
          console.log(`[Scheduler] Sending BROADCAST (All Users)`);
          await sendNotification({
            broadcast: true,
            title: notif.title,
            message: notif.message,
            type: notif.type
          });
          sentSuccess = true;
        }

        if (sentSuccess) {
          // Mark as sent
          const { error: finalStatusError } = await supabase
            .from('scheduled_notifications')
            .update({ status: 'sent' })
            .eq('id', notif.id);
          
          if (finalStatusError) {
            console.error(`[Scheduler] Failed to mark as sent for ${notif.id}:`, finalStatusError.message);
          } else {
            console.log(`[Scheduler] Success: Notification ${notif.id} marked as sent.`);
          }
        }
          
      } catch (innerErr: any) {
        console.error(`[Scheduler] Failed delivering notif ${notif.id}:`, innerErr?.message || innerErr);
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'failed' })
          .eq('id', notif.id);
      }
    }
  } catch (err: any) {
    console.error('[Scheduler] Critical loop error:', err?.message || err);
  }
}

/**
 * Send reminders to users with pending tasks for today
 */
async function sendTaskReminders() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch users with pending tasks for today
    // This logic depends on your specific db schema. 
    // Assuming a 'user_tasks' table joined with 'tasks'
    const { data: pendingTasks, error } = await supabase
      .from('user_tasks')
      .select('user_id, tasks(name)')
      .eq('completed', false);

    if (error) {
      console.error('[Scheduler] Error in sendTaskReminders:', error.message || error);
      return;
    }
    if (!pendingTasks || pendingTasks.length === 0) return;

    // Group by user to avoid spamming
    const userMap: Record<string, string[]> = {};
    pendingTasks.forEach((item: any) => {
      if (!userMap[item.user_id]) userMap[item.user_id] = [];
      userMap[item.user_id].push(item.tasks?.name || 'una tarea');
    });

    for (const userId in userMap) {
      const taskCount = userMap[userId].length;
      await sendNotification({
        userId,
        title: '¡Tienes tareas pendientes!',
        message: `Hola, tienes ${taskCount} tareas pendientes por completar hoy. ¡No pierdas tu racha!`,
        type: 'warning'
      });
    }
  } catch (err: any) {
    console.error('[Scheduler] Critical error in sendTaskReminders:', err?.message || err);
  }
}

/**
 * Send a generic daily motivation punch
 */
async function sendDailyMotivation() {
  try {
    const { data: users, error } = await supabase.from('users').select('id');
    if (error) throw error;

    const messages = [
      '¡Buenos días! Hoy es un gran día para avanzar en tus metas.',
      'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
      '¿Listo para ganar XP hoy? Mira tus nuevas misiones.',
      'Tu disciplina de hoy es tu libertad de mañana.'
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    for (const user of users || []) {
      await sendNotification({
        userId: user.id,
        title: 'Motivación del día 🚀',
        message: randomMessage,
        type: 'info'
      });
    }
  } catch (err: any) {
    console.error('[Scheduler] Error in sendDailyMotivation:', err?.message || err);
  }
}

/**
 * Send weekly summary (simulated)
 */
async function sendWeeklySummary() {
  // Logic to calculate stats and send summary
  console.log('[Scheduler] Weekly summary logic would go here.');
}
