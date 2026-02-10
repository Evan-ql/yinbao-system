import { useState, useEffect, useCallback } from "react";

const API_BASE = "/api/settings";

export function useSettingsData<T extends { id: string }>(endpoint: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${endpoint}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(`Failed to fetch ${endpoint}:`, e);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<T, "id">) => {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const update = async (id: string, item: Partial<T>) => {
    const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchData();
    }
  };

  return { data, loading, add, update, remove, refresh: fetchData };
}
