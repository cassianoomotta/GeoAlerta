'use client';

import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { countPresenceConnections, isPresenceTrackSuccessful } from './presence';

export function PanelPresence() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    let closed = false;
    let trackingSucceeded = false;
    let channel: RealtimeChannel | undefined;

    const start = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (closed) return;
      if (error || !data.session) {
        setOnlineCount(null);
        return;
      }

      void fetch('/api/analytics/panel-entry', { method: 'POST', cache: 'no-store', keepalive: true }).catch(() => {});
      await supabase.realtime.setAuth(data.session.access_token);
      if (closed) return;

      channel = supabase.channel('geoalerta:panel-presence', {
        config: { private: true },
      });
      channel.on('presence', { event: 'sync' }, () => {
        if (trackingSucceeded && channel) setOnlineCount(countPresenceConnections(channel.presenceState() as Record<string, unknown>));
      });
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            if (!channel) return;
            const response = await channel.track({ online: true });
            trackingSucceeded = isPresenceTrackSuccessful(response);
            if (trackingSucceeded) setOnlineCount(countPresenceConnections(channel.presenceState() as Record<string, unknown>));
            else setOnlineCount(null);
          } catch {
            trackingSucceeded = false;
            setOnlineCount(null);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          trackingSucceeded = false;
          setOnlineCount(null);
        }
      });
    };

    void start().catch(() => setOnlineCount(null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        closed = true;
        setOnlineCount(null);
        if (channel) void supabase.removeChannel(channel);
      }
    });

    return () => {
      closed = true;
      subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  if (onlineCount === null) return null;

  const label = onlineCount === 1 ? 'conexão' : 'conexões';

  return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-label={`${onlineCount} ${label} online`}>
    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
    {onlineCount} {label}
  </span>;
}
