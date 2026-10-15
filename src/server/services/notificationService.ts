import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as OneSignal from '@onesignal/node-onesignal';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// OneSignal configuration
const ONESIGNAL_APP_ID = process.env.VITE_ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

let oneSignalClient: OneSignal.DefaultApi | null = null;

if (ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY) {
  const configuration = OneSignal.createConfiguration({
    authMethods: {
      rest_api_key: {
        tokenProvider: {
          getToken: () => ONESIGNAL_REST_API_KEY,
        },
      },
    },
  });
  oneSignalClient = new OneSignal.DefaultApi(configuration);
}

export interface NotificationPayload {
  userId?: string | string[]; // Can be individual ID, array of IDs, or undefined for broadcast
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  metadata?: any;
  broadcast?: boolean; // If true, send to all subscribed users
}

export const sendNotification = async (payload: NotificationPayload | NotificationPayload[]) => {
  const payloads = Array.isArray(payload) ? payload : [payload];
  const results = [];

  for (const p of payloads) {
    const { userId, title, message, type = 'info', metadata = {}, broadcast = false } = p;

    try {
      // 1. Save to Database (In-App)
      // If broadacst, we don't save a specific DB notification yet, 
      // though usually we'd want a "global_notifications" table.
      // For now, if array or broadcast, we handle each or skip DB per-user if broadcast.
      
      let dbNotifIds: string[] = [];

      if (broadcast) {
        console.log(`[NotificationService] Processing broadcast DB storage for all users...`);
        const { data: allUsers } = await supabase.from('users').select('id');
        
        if (allUsers && allUsers.length > 0) {
          // Iterate and insert one by one to ensure Supabase Realtime reliably triggers
          let insertCount = 0;
          for (const u of allUsers) {
            const { error: dbError } = await supabase.from('notifications').insert({
              user_id: u.id,
              title,
              message,
              type,
              created_at: new Date().toISOString()
            });
            if (dbError) {
              console.error(`[NotificationService] Broadcast DB Insert Error for user ${u.id}:`, dbError.message);
            } else {
              insertCount++;
            }
          }
          console.log(`[NotificationService] Broadcast DB saved for ${insertCount} users.`);
        }
      } else if (userId) {
        const targetIds = Array.isArray(userId) ? userId : [userId];
        
        for (const id of targetIds) {
          console.log(`[NotificationService] Inserting notification into DB for user: ${id}`);
          const { data: notif, error: dbError } = await supabase
            .from('notifications')
            .insert({
              user_id: id,
              title,
              message,
              type,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (dbError) {
            console.error(`[NotificationService] DB Insert Error for user ${id}:`, dbError.message);
          } else if (notif) {
            dbNotifIds.push(notif.id);
            results.push(notif);
          }
        }
      }

      // 2. Send Push Notification via OneSignal
      if (oneSignalClient && ONESIGNAL_APP_ID) {
        console.log(`[NotificationService] OneSignal delivery attempt: ${broadcast ? 'BROADCAST' : (userId ? 'TARGETED' : 'INVALID')}`);
        
        const notification = new OneSignal.Notification();
        
        notification.app_id = ONESIGNAL_APP_ID;
        notification.headings = { en: title, es: title };
        notification.contents = { en: message, es: message };
        notification.data = { ...metadata };
        notification.web_url = `${process.env.APP_URL || ''}/notifications`;
        
        // Handle targeting
        if (broadcast) {
          // Fetch all users to target them directly via external_id, same as instant notifications mapping
          const { data: allUsers } = await supabase.from('users').select('id');
          if (allUsers && allUsers.length > 0) {
            const allUserIds = allUsers.map(u => u.id);
            // OneSignal limits target channels, but for aliases, it can take arrays.
            // A max of 2000 external IDs is supported per request based on OneSignal limits,
            // but we pass all that we have for now.
            notification.include_aliases = {
              external_id: allUserIds
            };
            notification.target_channel = 'push';
            console.log(`[NotificationService] OneSignal BROADCAST targeting ${allUserIds.length} external user IDs.`);
          } else {
             console.log('[NotificationService] OneSignal targeting: Subscribed Users segment (fallback)');
             notification.included_segments = ['Subscribed Users'];
          }
        } else if (userId) {
          const targetIds = Array.isArray(userId) ? userId : [userId];
          if (targetIds.length > 0) {
            notification.include_aliases = {
              external_id: targetIds
            };
            notification.target_channel = 'push';
            console.log(`[NotificationService] OneSignal targeting: ${targetIds.length} external user IDs: ${targetIds.join(', ')}`);
          } else {
            console.warn('[NotificationService] Skipping OneSignal: target list is empty');
            continue;
          }
        } else {
          console.warn('[NotificationService] Skipping OneSignal: no target provided and not a broadcast');
          continue;
        }
        
        try {
          const response = await oneSignalClient.createNotification(notification);
          console.log(`[NotificationService] OneSignal Response SUCCESS:`, response.id);
        } catch (pushError: any) {
          console.error("[NotificationService] OneSignal Push Error:", pushError.message);
          if (pushError.body) {
            console.error("[NotificationService] Error Body Details:", JSON.stringify(pushError.body));
          }
        }
      }
    } catch (error) {
      console.error("Error in sendNotification:", error);
    }
  }

  return Array.isArray(payload) ? results : results[0];
};
