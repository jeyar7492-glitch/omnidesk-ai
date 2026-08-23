import { useEffect } from "react";
import { wsClient, LiveEvent } from "../api/websocket";

export function useLiveEvents(eventType: string, callback: (event: LiveEvent) => void) {
  useEffect(() => {
    const unsubscribe = wsClient.subscribe(eventType, callback);
    return () => {
      unsubscribe();
    };
  }, [eventType, callback]);
}
