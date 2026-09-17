import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface QuestAvatar {
  id: string;
  imageUrl: string | null;
  name: string;
  rpgClass: string;
}

interface QuestState {
  avatar: QuestAvatar | null;
  lastSync: string | null;
  setAvatar: (avatar: QuestAvatar | null) => void;
  syncAvatar: () => Promise<void>;
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set) => ({
      avatar: null,
      lastSync: null,

      setAvatar: (avatar) => set({ avatar }),

      syncAvatar: async () => {
        try {
          // Get user ID from localStorage (set by Supabase auth)
          const weave = localStorage.getItem('cheeky-weave');
          if (!weave) return;
          const weaveData = JSON.parse(weave);
          const userId = weaveData.state?.userId;
          if (!userId) return;

          const res = await fetch(`/api/quest/avatars?userId=${userId}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.avatars?.[0]) {
            const av = data.avatars[0];
            set({
              avatar: {
                id: av.id,
                imageUrl: av.image_url,
                name: av.name,
                rpgClass: av.rpg_class
              }
            });
          }
        } catch (e) {
          console.error('syncQuestAvatar failed:', e);
        }
      }
    }),
    { name: 'quest-state', storage: createJSONStorage(() => localStorage) }
  )
);
