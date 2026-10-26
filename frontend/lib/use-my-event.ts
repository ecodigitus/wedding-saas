"use client";

import { useCallback, useEffect, useState } from "react";
import { listMyEvents } from "./api";
import type { Event } from "./types";

/** Fase 1: 1 akun = 1 event aktif, jadi cukup ambil event pertama. */
export function useMyEvent() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Dipakai dari event handler (mis. tombol refresh) — bukan dari effect,
  // jadi setState sinkron di awal fungsi ini aman-aman saja di sana.
  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const events = await listMyEvents();
      setEvent(events[0] ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch awal saat mount: state hanya diubah di dalam callback promise
  // (bukan sinkron di badan effect), plus flag `ignore` untuk cleanup.
  useEffect(() => {
    let ignore = false;
    listMyEvents()
      .then((events) => {
        if (!ignore) setEvent(events[0] ?? null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { event, setEvent, loading, refetch };
}
