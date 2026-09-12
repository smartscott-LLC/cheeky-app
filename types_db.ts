export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          display_style: string
          ends_at: string | null
          id: number
          link: string | null
          message: string
          starts_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          display_style?: string
          ends_at?: string | null
          id?: never
          link?: string | null
          message: string
          starts_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          display_style?: string
          ends_at?: string | null
          id?: never
          link?: string | null
          message?: string
          starts_at?: string
        }
        Relationships: []
      }
      badge_catalog: {
        Row: {
          created_at: string
          description: string
          emoji: string
          family: string
          floor: string | null
          how_to_earn: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description: string
          emoji: string
          family?: string
          floor?: string | null
          how_to_earn: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string
          emoji?: string
          family?: string
          floor?: string | null
          how_to_earn?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      banned_accounts: {
        Row: {
          banned_until: string | null
          created_at: string
          created_by: string | null
          email: string
          evidence: string | null
          id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          banned_until?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          evidence?: string | null
          id?: string
          reason: string
          user_id?: string | null
        }
        Update: {
          banned_until?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          evidence?: string | null
          id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: []
      }
      benefit_grants: {
        Row: {
          actor_ref: string | null
          actor_type: string
          benefit_type: string
          benefit_value: string
          code_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          actor_ref?: string | null
          actor_type: string
          benefit_type: string
          benefit_value: string
          code_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string
          user_id: string
        }
        Update: {
          actor_ref?: string | null
          actor_type?: string
          benefit_type?: string
          benefit_value?: string
          code_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefit_grants_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "swag_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_grants_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "swag_codes_stale"
            referencedColumns: ["id"]
          },
        ]
      }
      blind_date_answers: {
        Row: {
          body: string
          created_at: string
          id: string
          round_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          round_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blind_date_answers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "blind_date_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      blind_date_rounds: {
        Row: {
          created_at: string
          event_id: string
          id: string
          phase: string
          phase_started_at: string
          question: string | null
          round_index: number
          skipped: boolean
          tally_user_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          phase?: string
          phase_started_at?: string
          question?: string | null
          round_index: number
          skipped?: boolean
          tally_user_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          phase?: string
          phase_started_at?: string
          question?: string | null
          round_index?: number
          skipped?: boolean
          tally_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blind_date_rounds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: number
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: never
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: never
        }
        Relationships: []
      }
      center_stage: {
        Row: {
          center_stage_until: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          center_stage_until?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          center_stage_until?: string | null
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          issued_at: string
          kind: string
          match_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          issued_at?: string
          kind?: string
          match_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          issued_at?: string
          kind?: string
          match_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_leaderboard: {
        Row: {
          bonus_breakdown: Json | null
          created_at: string
          day: string
          id: number
          is_bot: boolean
          match_id: string | null
          p1_name: string
          p1_score: number
          p2_name: string
          p2_score: number
          total_score: number
        }
        Insert: {
          bonus_breakdown?: Json | null
          created_at?: string
          day: string
          id?: never
          is_bot?: boolean
          match_id?: string | null
          p1_name: string
          p1_score?: number
          p2_name: string
          p2_score?: number
          total_score?: number
        }
        Update: {
          bonus_breakdown?: Json | null
          created_at?: string
          day?: string
          id?: never
          is_bot?: boolean
          match_id?: string | null
          p1_name?: string
          p1_score?: number
          p2_name?: string
          p2_score?: number
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_leaderboard_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "challenge_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_matches: {
        Row: {
          bonus_breakdown: Json | null
          completed_at: string | null
          created_at: string
          grand_total: number
          id: string
          p1_is_bot: boolean
          p1_name: string
          p1_round_scores: Json | null
          p1_score: number
          p1_tier: string
          p2_is_bot: boolean
          p2_name: string
          p2_round_scores: Json | null
          p2_score: number
          p2_tier: string
          player1_id: string
          player2_id: string
          seed: number
          status: string
        }
        Insert: {
          bonus_breakdown?: Json | null
          completed_at?: string | null
          created_at?: string
          grand_total?: number
          id?: string
          p1_is_bot?: boolean
          p1_name: string
          p1_round_scores?: Json | null
          p1_score?: number
          p1_tier?: string
          p2_is_bot?: boolean
          p2_name: string
          p2_round_scores?: Json | null
          p2_score?: number
          p2_tier?: string
          player1_id: string
          player2_id: string
          seed?: number
          status?: string
        }
        Update: {
          bonus_breakdown?: Json | null
          completed_at?: string | null
          created_at?: string
          grand_total?: number
          id?: string
          p1_is_bot?: boolean
          p1_name?: string
          p1_round_scores?: Json | null
          p1_score?: number
          p1_tier?: string
          p2_is_bot?: boolean
          p2_name?: string
          p2_round_scores?: Json | null
          p2_score?: number
          p2_tier?: string
          player1_id?: string
          player2_id?: string
          seed?: number
          status?: string
        }
        Relationships: []
      }
      challenge_queue: {
        Row: {
          id: number
          joined_at: string
          name: string
          preference: string
          tier: string
          user_id: string
        }
        Insert: {
          id?: never
          joined_at?: string
          name: string
          preference?: string
          tier?: string
          user_id: string
        }
        Update: {
          id?: never
          joined_at?: string
          name?: string
          preference?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      character_moments: {
        Row: {
          character_id: string
          created_at: string
          id: string
          message: string
          milestone: string
          seen_at: string | null
          user_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          message: string
          milestone: string
          seen_at?: string | null
          user_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          message?: string
          milestone?: string
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_moments_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_relations: {
        Row: {
          character_id: string
          created_at: string
          id: string
          last_interaction_at: string | null
          level: number
          points: number
          user_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          level?: number
          points?: number
          user_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          level?: number
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_relations_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          active: boolean
          created_at: string
          fullbody_path: string | null
          greeting_lines: Json
          id: string
          name: string
          persona_prompt: string | null
          portrait_path: string | null
          role: string
          scene_video_path: string | null
          slug: string
          tagline: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          fullbody_path?: string | null
          greeting_lines?: Json
          id?: string
          name: string
          persona_prompt?: string | null
          portrait_path?: string | null
          role: string
          scene_video_path?: string | null
          slug: string
          tagline?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          fullbody_path?: string | null
          greeting_lines?: Json
          id?: string
          name?: string
          persona_prompt?: string | null
          portrait_path?: string | null
          role?: string
          scene_video_path?: string | null
          slug?: string
          tagline?: string | null
        }
        Relationships: []
      }
      club_announcements: {
        Row: {
          body: string
          created_at: string
          id: number
          kind: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: never
          kind?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: never
          kind?: string
        }
        Relationships: []
      }
      club_chat_bans: {
        Row: {
          banned_until: string
          created_at: string
          created_by: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          banned_until: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          banned_until?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      club_chat_invites: {
        Row: {
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      club_chat_messages: {
        Row: {
          body: string
          created_at: string
          floor_tag: string
          horn: boolean
          id: number
          room: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          floor_tag: string
          horn?: boolean
          id?: never
          room: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          floor_tag?: string
          horn?: boolean
          id?: never
          room?: string
          sender_id?: string
        }
        Relationships: []
      }
      club_chat_time: {
        Row: {
          day: string
          seconds: number
          user_id: string
        }
        Insert: {
          day?: string
          seconds?: number
          user_id: string
        }
        Update: {
          day?: string
          seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      club_chat_whisper_messages: {
        Row: {
          body: string
          created_at: string
          id: number
          sender_id: string
          whisper_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: never
          sender_id: string
          whisper_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: never
          sender_id?: string
          whisper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_chat_whisper_messages_whisper_id_fkey"
            columns: ["whisper_id"]
            isOneToOne: false
            referencedRelation: "club_chat_whispers"
            referencedColumns: ["id"]
          },
        ]
      }
      club_chat_whispers: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          accepted_at: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          id: number
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          id?: never
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          consent_type?: Database["public"]["Enums"]["consent_type"]
          id?: never
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          user_id_a: string
          user_id_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id_a: string
          user_id_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id_a?: string
          user_id_b?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string
          day: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: never
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      date_night_picks: {
        Row: {
          created_at: string
          game_id: string
          id: number
          picked_index: number | null
          question_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: never
          picked_index?: number | null
          question_index: number
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: never
          picked_index?: number | null
          question_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_night_picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "date_nights"
            referencedColumns: ["id"]
          },
        ]
      }
      date_nights: {
        Row: {
          current_index: number
          finished_at: string | null
          id: string
          pack_id: string
          question_ids: Json
          question_started_at: string
          results: Json
          score: number
          started_at: string
          status: string
          user_a: string
          user_b: string
        }
        Insert: {
          current_index?: number
          finished_at?: string | null
          id?: string
          pack_id: string
          question_ids: Json
          question_started_at?: string
          results?: Json
          score?: number
          started_at?: string
          status?: string
          user_a: string
          user_b: string
        }
        Update: {
          current_index?: number
          finished_at?: string | null
          id?: string
          pack_id?: string
          question_ids?: Json
          question_started_at?: string
          results?: Json
          score?: number
          started_at?: string
          status?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_nights_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "trivia_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      date_rooms: {
        Row: {
          created_at: string
          expires_at: string
          floor: string
          gift_send_id: string | null
          id: string
          source: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          floor?: string
          gift_send_id?: string | null
          id?: string
          source?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          floor?: string
          gift_send_id?: string | null
          id?: string
          source?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_rooms_gift_send_id_fkey"
            columns: ["gift_send_id"]
            isOneToOne: false
            referencedRelation: "gift_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_grants: {
        Row: {
          created_at: string
          expires_at: string
          granted_by: string | null
          id: string
          reason: string
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          granted_by?: string | null
          id?: string
          reason?: string
          tier: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          granted_by?: string | null
          id?: string
          reason?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      event_entries: {
        Row: {
          created_at: string
          event_id: string
          group_number: number | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          group_number?: number | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          group_number?: number | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_picks: {
        Row: {
          created_at: string
          event_id: string
          id: number
          pickee_id: string
          picker_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: never
          pickee_id: string
          picker_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: never
          pickee_id?: string
          picker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_picks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          floor: string
          host_id: string | null
          id: string
          kind: string
          min_fill: number
          starts_at: string
          status: string
          token_cost: number
        }
        Insert: {
          created_at?: string
          floor?: string
          host_id?: string | null
          id?: string
          kind?: string
          min_fill?: number
          starts_at: string
          status?: string
          token_cost?: number
        }
        Update: {
          created_at?: string
          floor?: string
          host_id?: string | null
          id?: string
          kind?: string
          min_fill?: number
          starts_at?: string
          status?: string
          token_cost?: number
        }
        Relationships: []
      }
      floor_closures: {
        Row: {
          created_at: string
          floor: string
          reason: string | null
          until: string | null
        }
        Insert: {
          created_at?: string
          floor: string
          reason?: string | null
          until?: string | null
        }
        Update: {
          created_at?: string
          floor?: string
          reason?: string | null
          until?: string | null
        }
        Relationships: []
      }
      gem_catalog: {
        Row: {
          active: boolean
          created_at: string
          emoji: string
          how_to_earn: string
          id: string
          name: string
          rarity: string
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          emoji: string
          how_to_earn: string
          id?: string
          name: string
          rarity?: string
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          emoji?: string
          how_to_earn?: string
          id?: string
          name?: string
          rarity?: string
          slug?: string
        }
        Relationships: []
      }
      gift_catalog: {
        Row: {
          active: boolean
          created_at: string
          emoji: string
          floor: string
          id: string
          kind: string
          matchmaker_only: boolean
          name: string
          slug: string
          token_cost: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          emoji: string
          floor: string
          id?: string
          kind?: string
          matchmaker_only?: boolean
          name: string
          slug: string
          token_cost: number
        }
        Update: {
          active?: boolean
          created_at?: string
          emoji?: string
          floor?: string
          id?: string
          kind?: string
          matchmaker_only?: boolean
          name?: string
          slug?: string
          token_cost?: number
        }
        Relationships: []
      }
      gift_inventory: {
        Row: {
          catalog_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          catalog_id: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          catalog_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_inventory_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "gift_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_sends: {
        Row: {
          catalog_id: string
          id: string
          inventory_id: string
          recipient_id: string
          responded_at: string | null
          sender_id: string
          sent_at: string
          status: string
        }
        Insert: {
          catalog_id: string
          id?: string
          inventory_id: string
          recipient_id: string
          responded_at?: string | null
          sender_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          catalog_id?: string
          id?: string
          inventory_id?: string
          recipient_id?: string
          responded_at?: string | null
          sender_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_sends_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "gift_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_sends_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: true
            referencedRelation: "gift_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_passes: {
        Row: {
          created_at: string
          expires_at: string
          guest_id: string
          host_id: string
          id: string
          tier: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          guest_id: string
          host_id: string
          id?: string
          tier: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          guest_id?: string
          host_id?: string
          id?: string
          tier?: string
        }
        Relationships: []
      }
      honeypot_catches: {
        Row: {
          created_at: string
          email: string | null
          field: string
          id: number
          page: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          field: string
          id?: never
          page: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          field?: string
          id?: never
          page?: string
          user_id?: string | null
        }
        Relationships: []
      }
      l3_picks: {
        Row: {
          choice: string
          created_at: string
          id: number
          picker_id: string
          target_id: string
        }
        Insert: {
          choice: string
          created_at?: string
          id?: never
          picker_id: string
          target_id: string
        }
        Update: {
          choice?: string
          created_at?: string
          id?: never
          picker_id?: string
          target_id?: string
        }
        Relationships: []
      }
      l3_rewards: {
        Row: {
          created_at: string
          id: number
          match_id: string
          messages_left: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          match_id: string
          messages_left?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          match_id?: string
          messages_left?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "l3_rewards_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: number
          likee_id: string
          liker_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          likee_id: string
          liker_id: string
        }
        Update: {
          created_at?: string
          id?: never
          likee_id?: string
          liker_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          source: string
          status: string
          tier: string | null
          user_id_a: string
          user_id_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          source?: string
          status?: string
          tier?: string | null
          user_id_a: string
          user_id_b: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          status?: string
          tier?: string | null
          user_id_a?: string
          user_id_b?: string
        }
        Relationships: []
      }
      matchmaker_boards: {
        Row: {
          completed_at: string | null
          created_at: string
          flipped_card_id: string | null
          id: string
          matches_found: number
          status: string
          strikes: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          flipped_card_id?: string | null
          id?: string
          matches_found?: number
          status?: string
          strikes?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          flipped_card_id?: string | null
          id?: string
          matches_found?: number
          status?: string
          strikes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaker_boards_flipped_card_fk"
            columns: ["flipped_card_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaker_cards: {
        Row: {
          board_id: string
          card_position: number
          id: string
          is_stake: boolean
          matched: boolean
          pair_id: string
          target_id: string
        }
        Insert: {
          board_id: string
          card_position: number
          id?: string
          is_stake?: boolean
          matched?: boolean
          pair_id: string
          target_id: string
        }
        Update: {
          board_id?: string
          card_position?: number
          id?: string
          is_stake?: boolean
          matched?: boolean
          pair_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaker_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaker_drafts: {
        Row: {
          board_id: string
          id: string
          picked_at: string
          target_id: string
        }
        Insert: {
          board_id: string
          id?: string
          picked_at?: string
          target_id: string
        }
        Update: {
          board_id?: string
          id?: string
          picked_at?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaker_drafts_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaker_unlocks: {
        Row: {
          board_id: string
          conversation_id: string | null
          created_at: string
          gift_inventory_id: string | null
          id: string
          message: string
          recipient_id: string
          responded_at: string | null
          sender_floor: string
          sender_id: string
          status: string
        }
        Insert: {
          board_id: string
          conversation_id?: string | null
          created_at?: string
          gift_inventory_id?: string | null
          id?: string
          message: string
          recipient_id: string
          responded_at?: string | null
          sender_floor: string
          sender_id: string
          status?: string
        }
        Update: {
          board_id?: string
          conversation_id?: string | null
          created_at?: string
          gift_inventory_id?: string | null
          id?: string
          message?: string
          recipient_id?: string
          responded_at?: string | null
          sender_floor?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaker_unlocks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaker_unlocks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaker_unlocks_gift_inventory_id_fkey"
            columns: ["gift_inventory_id"]
            isOneToOne: false
            referencedRelation: "gift_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      member_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      member_gems: {
        Row: {
          earned_at: string
          gem_id: string
          id: string
          ref: string | null
          user_id: string
        }
        Insert: {
          earned_at?: string
          gem_id: string
          id?: string
          ref?: string | null
          user_id: string
        }
        Update: {
          earned_at?: string
          gem_id?: string
          id?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_gems_gem_id_fkey"
            columns: ["gem_id"]
            isOneToOne: false
            referencedRelation: "gem_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: number
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: never
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: never
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      miss_streaks: {
        Row: {
          count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      model_config: {
        Row: {
          cast_model: string
          id: boolean
          updated_at: string
          watchdog_model: string
        }
        Insert: {
          cast_model?: string
          id?: boolean
          updated_at?: string
          watchdog_model?: string
        }
        Update: {
          cast_model?: string
          id?: boolean
          updated_at?: string
          watchdog_model?: string
        }
        Relationships: []
      }
      owner_accounts: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          created_at: string
          held_at: string | null
          id: string
          is_primary: boolean
          position: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          held_at?: string | null
          id?: string
          is_primary?: boolean
          position?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          held_at?: string | null
          id?: string
          is_primary?: boolean
          position?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      prices: {
        Row: {
          active: boolean | null
          currency: string | null
          description: string | null
          id: string
          interval: string | null
          interval_count: number | null
          metadata: Json | null
          product_id: string | null
          trial_period_days: number | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          unit_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Relationships: []
      }
      profile_private: {
        Row: {
          birthday: string | null
          id: string
          updated_at: string
          verification_attempts: number
          verification_escalated_at: string | null
          verification_provider: string | null
          verification_ref: string | null
        }
        Insert: {
          birthday?: string | null
          id: string
          updated_at?: string
          verification_attempts?: number
          verification_escalated_at?: string | null
          verification_provider?: string | null
          verification_ref?: string | null
        }
        Update: {
          birthday?: string | null
          id?: string
          updated_at?: string
          verification_attempts?: number
          verification_escalated_at?: string | null
          verification_provider?: string | null
          verification_ref?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepts_gifts: boolean
          accepts_private_invites: boolean
          bio: string
          bot_flagged_at: string | null
          chat_messages_sent: number
          created_at: string
          display_name: string
          gender: string | null
          id: string
          interested_in: string
          message_retention_days: number
          one_liner: string | null
          test_member: boolean
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          accepts_gifts?: boolean
          accepts_private_invites?: boolean
          bio?: string
          bot_flagged_at?: string | null
          chat_messages_sent?: number
          created_at?: string
          display_name?: string
          gender?: string | null
          id: string
          interested_in?: string
          message_retention_days?: number
          one_liner?: string | null
          test_member?: boolean
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          accepts_gifts?: boolean
          accepts_private_invites?: boolean
          bio?: string
          bot_flagged_at?: string | null
          chat_messages_sent?: number
          created_at?: string
          display_name?: string
          gender?: string | null
          id?: string
          interested_in?: string
          message_retention_days?: number
          one_liner?: string | null
          test_member?: boolean
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      promo_config: {
        Row: {
          engine_enabled: boolean
          id: boolean
          updated_at: string
        }
        Insert: {
          engine_enabled?: boolean
          id?: boolean
          updated_at?: string
        }
        Update: {
          engine_enabled?: boolean
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket_start: string
          calls: number
          key: string
        }
        Insert: {
          bucket_start?: string
          calls?: number
          key: string
        }
        Update: {
          bucket_start?: string
          calls?: number
          key?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          category: string | null
          confidence: number | null
          context: string | null
          created_at: string
          held_at: string | null
          human_confirmed_at: string | null
          human_verdict: string | null
          id: number
          image_url: string | null
          outcome: string | null
          reason: string
          reported_id: string
          reporter_id: string
          resolved_at: string | null
          review_summary: string | null
          reviewed_at: string | null
          status: string
          verdict: string | null
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          context?: string | null
          created_at?: string
          held_at?: string | null
          human_confirmed_at?: string | null
          human_verdict?: string | null
          id?: never
          image_url?: string | null
          outcome?: string | null
          reason: string
          reported_id: string
          reporter_id: string
          resolved_at?: string | null
          review_summary?: string | null
          reviewed_at?: string | null
          status?: string
          verdict?: string | null
        }
        Update: {
          category?: string | null
          confidence?: number | null
          context?: string | null
          created_at?: string
          held_at?: string | null
          human_confirmed_at?: string | null
          human_verdict?: string | null
          id?: never
          image_url?: string | null
          outcome?: string | null
          reason?: string
          reported_id?: string
          reporter_id?: string
          resolved_at?: string | null
          review_summary?: string | null
          reviewed_at?: string | null
          status?: string
          verdict?: string | null
        }
        Relationships: []
      }
      rooftop_picks: {
        Row: {
          created_at: string
          event_id: string
          id: number
          pickee_id: string
          picker_id: string
          round_index: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: never
          pickee_id: string
          picker_id: string
          round_index: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: never
          pickee_id?: string
          picker_id?: string
          round_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "rooftop_picks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      rooftop_rounds: {
        Row: {
          event_id: string
          id: string
          resolved: boolean
          round_index: number
          started_at: string
        }
        Insert: {
          event_id: string
          id?: string
          resolved?: boolean
          round_index: number
          started_at?: string
        }
        Update: {
          event_id?: string
          id?: string
          resolved?: boolean
          round_index?: number
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooftop_rounds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      special_interests: {
        Row: {
          created_at: string
          id: number
          interest_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          interest_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          interest_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      speed_selections: {
        Row: {
          created_at: string
          event_id: string
          id: number
          pick_rank: number
          picked_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: never
          pick_rank: number
          picked_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: never
          pick_rank?: number
          picked_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_selections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_session_messages: {
        Row: {
          body: string
          created_at: string
          event_id: string
          group_number: number
          id: number
          sender_id: string
          slot_index: number
        }
        Insert: {
          body: string
          created_at?: string
          event_id: string
          group_number: number
          id?: never
          sender_id: string
          slot_index: number
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string
          group_number?: number
          id?: never
          sender_id?: string
          slot_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "speed_session_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_sessions: {
        Row: {
          created_at: string
          event_id: string
          group_number: number
          id: number
          slot_index: number
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          event_id: string
          group_number: number
          id?: never
          slot_index: number
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          event_id?: string
          group_number?: number
          id?: never
          slot_index?: number
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      story_beat_completion: {
        Row: {
          beat_number: number
          choice_made: string | null
          completed_at: string | null
          id: number
          run_number: number
          score_earned: number | null
          user_id: string
        }
        Insert: {
          beat_number: number
          choice_made?: string | null
          completed_at?: string | null
          id?: number
          run_number?: number
          score_earned?: number | null
          user_id: string
        }
        Update: {
          beat_number?: number
          choice_made?: string | null
          completed_at?: string | null
          id?: number
          run_number?: number
          score_earned?: number | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created: string
          created_at: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          metadata: Json | null
          price_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
        ]
      }
      supabase_migrations: {
        Row: {
          inserted_at: string
          name: string | null
          success: boolean
          version: string
        }
        Insert: {
          inserted_at?: string
          name?: string | null
          success?: boolean
          version: string
        }
        Update: {
          inserted_at?: string
          name?: string | null
          success?: boolean
          version?: string
        }
        Relationships: []
      }
      swag_codes: {
        Row: {
          actor_ref: string | null
          actor_type: string
          benefit_type: string
          benefit_value: string
          claimed_at: string | null
          claimed_by_user_id: string | null
          code: string
          created_at: string
          deliver_shown_at: string | null
          deliver_to_user_id: string | null
          deliver_via_actor: string | null
          expires_at: string | null
          id: string
          max_uses: number
          notes: string | null
          used_count: number
        }
        Insert: {
          actor_ref?: string | null
          actor_type: string
          benefit_type: string
          benefit_value: string
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          code: string
          created_at?: string
          deliver_shown_at?: string | null
          deliver_to_user_id?: string | null
          deliver_via_actor?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          notes?: string | null
          used_count?: number
        }
        Update: {
          actor_ref?: string | null
          actor_type?: string
          benefit_type?: string
          benefit_value?: string
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          code?: string
          created_at?: string
          deliver_shown_at?: string | null
          deliver_to_user_id?: string | null
          deliver_via_actor?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          notes?: string | null
          used_count?: number
        }
        Relationships: []
      }
      swag_flags: {
        Row: {
          actor_ref: string | null
          benefit_type: string
          benefit_value: string
          created_at: string
          id: string
          reason: string | null
          resolved_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          actor_ref?: string | null
          benefit_type: string
          benefit_value: string
          created_at?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          actor_ref?: string | null
          benefit_type?: string
          benefit_value?: string
          created_at?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      swag_rules: {
        Row: {
          benefit_type: string
          benefit_value: string
          owner_only: boolean
          weekly_limit: number | null
        }
        Insert: {
          benefit_type: string
          benefit_value: string
          owner_only?: boolean
          weekly_limit?: number | null
        }
        Update: {
          benefit_type?: string
          benefit_value?: string
          owner_only?: boolean
          weekly_limit?: number | null
        }
        Relationships: []
      }
      token_ledger: {
        Row: {
          created_at: string
          delta: number
          id: number
          reason: string
          ref: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: never
          reason: string
          ref?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: never
          reason?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trivia_packs: {
        Row: {
          active: boolean
          id: string
          name: string
          question_ids: Json
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          question_ids: Json
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          question_ids?: Json
        }
        Relationships: []
      }
      trivia_questions: {
        Row: {
          active: boolean
          category: string
          correct_index: number
          id: string
          options: Json
          prompt: string
        }
        Insert: {
          active?: boolean
          category?: string
          correct_index: number
          id: string
          options: Json
          prompt: string
        }
        Update: {
          active?: boolean
          category?: string
          correct_index?: number
          id?: string
          options?: Json
          prompt?: string
        }
        Relationships: []
      }
      user_story_progress: {
        Row: {
          choices_made: Json | null
          completion_date: string | null
          created_at: string | null
          current_beat: number | null
          current_score: number | null
          final_score: number | null
          id: number
          is_complete: boolean | null
          last_tier_earned: string | null
          reward_tiers_claimed: Json | null
          selected_persona: string | null
          total_runs: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          choices_made?: Json | null
          completion_date?: string | null
          created_at?: string | null
          current_beat?: number | null
          current_score?: number | null
          final_score?: number | null
          id?: number
          is_complete?: boolean | null
          last_tier_earned?: string | null
          reward_tiers_claimed?: Json | null
          selected_persona?: string | null
          total_runs?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          choices_made?: Json | null
          completion_date?: string | null
          created_at?: string | null
          current_beat?: number | null
          current_score?: number | null
          final_score?: number | null
          id?: number
          is_complete?: boolean | null
          last_tier_earned?: string | null
          reward_tiers_claimed?: Json | null
          selected_persona?: string | null
          total_runs?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          billing_address: Json | null
          full_name: string | null
          id: string
          payment_method: Json | null
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id: string
          payment_method?: Json | null
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id?: string
          payment_method?: Json | null
        }
        Relationships: []
      }
      waves: {
        Row: {
          created_at: string
          id: number
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: never
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_id: string
          event_type: string
          payload: Json | null
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          payload?: Json | null
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          payload?: Json | null
          processed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      swag_codes_stale: {
        Row: {
          actor_ref: string | null
          actor_type: string | null
          benefit_type: string | null
          benefit_value: string | null
          code: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          notes: string | null
        }
        Insert: {
          actor_ref?: string | null
          actor_type?: string | null
          benefit_type?: string | null
          benefit_value?: string | null
          code?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          notes?: string | null
        }
        Update: {
          actor_ref?: string | null
          actor_type?: string | null
          benefit_type?: string | null
          benefit_value?: string | null
          code?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          notes?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_special_interest: {
        Args: { p_interest_user: string }
        Returns: string
      }
      advance_blind_date: { Args: { p_event_id: string }; Returns: undefined }
      auto_match_rooftop: { Args: { p_event_id: string }; Returns: undefined }
      award_badge: {
        Args: { p_slug: string; p_user: string }
        Returns: undefined
      }
      award_gem: {
        Args: { p_slug: string; p_user: string }
        Returns: undefined
      }
      bump_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      buy_gift: { Args: { p_slug: string }; Returns: string }
      club_chat_ban: {
        Args: { p_hours: number; p_reason: string; p_user: string }
        Returns: undefined
      }
      club_chat_bump_badges: { Args: { p_user: string }; Returns: undefined }
      club_chat_heartbeat: { Args: { p_seconds: number }; Returns: boolean }
      club_chat_horn: { Args: { p_body: string }; Returns: number }
      club_chat_invite: { Args: { p_user: string }; Returns: string }
      club_chat_profanity: { Args: { p_body: string }; Returns: boolean }
      club_chat_respond_invite: {
        Args: { p_accept: boolean; p_invite_id: string }
        Returns: undefined
      }
      club_chat_send: {
        Args: { p_body: string; p_room: string }
        Returns: number
      }
      club_chat_whisper_get: { Args: { p_other: string }; Returns: string }
      club_chat_whisper_send: {
        Args: { p_body: string; p_whisper_id: string }
        Returns: number
      }
      compatible: { Args: { a: string; b: string }; Returns: boolean }
      create_blind_date: { Args: never; Returns: string }
      create_l3_pick: {
        Args: { p_choice: string; p_target: string }
        Returns: {
          match_id: string
          tier: string
        }[]
      }
      create_like: {
        Args: { p_likee: string }
        Returns: {
          match_id: string
        }[]
      }
      current_streak: { Args: never; Returns: number }
      current_tier: { Args: { p_user: string }; Returns: string }
      date_night_leaderboard: {
        Args: { p_pack: string }
        Returns: {
          score: number
        }[]
      }
      date_night_state: { Args: { p_game: string }; Returns: Json }
      ensure_events: { Args: { p_hours?: number }; Returns: undefined }
      ensure_floor_events: { Args: { p_hours?: number }; Returns: undefined }
      ensure_speed_dating_events: {
        Args: { p_hours?: number }
        Returns: undefined
      }
      finalize_events: { Args: never; Returns: undefined }
      flag_honeypot_catch:
        | {
            Args: {
              p_email?: string
              p_field: string
              p_page: string
              p_user?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_email?: string
              p_field: string
              p_page: string
              p_user: string
            }
            Returns: undefined
          }
      flag_swag_request: {
        Args: {
          p_actor_ref: string
          p_benefit_type: string
          p_benefit_value: string
          p_reason?: string
          p_user: string
        }
        Returns: undefined
      }
      generate_swag_code: {
        Args: {
          p_actor_ref?: string
          p_actor_type: string
          p_benefit_type: string
          p_benefit_value: string
          p_expires_at?: string
          p_max_uses?: number
          p_notes?: string
        }
        Returns: string
      }
      get_challenge_leaderboard: {
        Args: never
        Returns: {
          bonus_breakdown: Json
          created_at: string
          is_bot: boolean
          match_id: string
          p1_name: string
          p2_name: string
          rank: number
          total_score: number
        }[]
      }
      get_or_create_conversation: { Args: { p_other: string }; Returns: string }
      insert_challenge_leaderboard: {
        Args: {
          p_bonus_breakdown: Json
          p_is_bot: boolean
          p_match_id: string
          p_p1_name: string
          p_p1_score: number
          p_p2_name: string
          p_p2_score: number
          p_total_score: number
        }
        Returns: undefined
      }
      is_test_member: { Args: never; Returns: boolean }
      join_blind_date: { Args: { p_event_id: string }; Returns: string }
      join_event: { Args: { p_event_id: string }; Returns: string }
      l3_trio: {
        Args: never
        Returns: {
          bio: string
          display_name: string
          gender: string
          id: string
          interested_in: string
          one_liner: string
          photo_path: string
        }[]
      }
      leave_blind_date: { Args: { p_event_id: string }; Returns: undefined }
      leave_event: { Args: { p_event_id: string }; Returns: undefined }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mark_webhook_processed: {
        Args: { p_event_id: string; p_event_type: string; p_payload: Json }
        Returns: boolean
      }
      matchmaker_award_gift: {
        Args: { p_floor: string; p_user: string }
        Returns: string
      }
      matchmaker_board_cards: {
        Args: { p_board_id: string }
        Returns: {
          card_position: number
          display_name: string
          id: string
          is_stake: boolean
          matched: boolean
          photo_path: string
          target_id: string
        }[]
      }
      matchmaker_draft_candidates: {
        Args: never
        Returns: {
          bio: string
          display_name: string
          gender: string
          id: string
          interested_in: string
          one_liner: string
          photo_path: string
          picked: boolean
        }[]
      }
      matchmaker_flip: {
        Args: { p_card_id: string }
        Returns: {
          board_status: string
          card_id: string
          card_position: number
          display_name: string
          first_card_id: string
          is_match: boolean
          is_stake: boolean
          matches_found: number
          photo_path: string
          strikes: number
          target_id: string
        }[]
      }
      matchmaker_incoming: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          message: string
          photo_path: string
          sender_id: string
          unlock_id: string
        }[]
      }
      matchmaker_pick_draft: { Args: { p_target: string }; Returns: undefined }
      matchmaker_unpick_draft: { Args: { p_target: string }; Returns: undefined }
      matchmaker_respond_unlock: {
        Args: { p_accept: boolean; p_unlock_id: string }
        Returns: undefined
      }
      matchmaker_send_unlock: {
        Args: { p_card_id: string; p_message: string }
        Returns: string
      }
      matchmaker_start_board: {
        Args: never
        Returns: {
          board_id: string
          card_id: string
          card_position: number
          is_stake: boolean
          matched: boolean
          matches_found: number
          status: string
          strikes: number
        }[]
      }
      matchmaker_start_draft: { Args: never; Returns: string }
      next_event_minutes: { Args: { p_kind: string }; Returns: number }
      owner_grant: {
        Args: {
          p_benefit_type: string
          p_benefit_value: string
          p_days?: number
          p_reason?: string
          p_user: string
        }
        Returns: undefined
      }
      pick_on_floor: {
        Args: { p_event_id: string; p_pickee: string }
        Returns: {
          match_id: string
          matched: boolean
        }[]
      }
      record_character_moment: {
        Args: {
          p_character_slug: string
          p_message: string
          p_milestone: string
          p_user: string
        }
        Returns: undefined
      }
      record_checkin: { Args: never; Returns: number }
      record_common_moment: {
        Args: { p_milestone: string; p_user: string }
        Returns: undefined
      }
      record_personal_moment: {
        Args: { p_milestone: string; p_user: string }
        Returns: undefined
      }
      redeem_swag_code: {
        Args: { p_code: string }
        Returns: {
          benefit_type: string
          benefit_value: string
        }[]
      }
      resolve_song: {
        Args: { p_continue: boolean; p_match_id: string }
        Returns: undefined
      }
      resolve_speed_dating: { Args: { p_event_id: string }; Returns: undefined }
      respond_gift: {
        Args: { p_accept: boolean; p_send_id: string }
        Returns: undefined
      }
      select_blind_tally: {
        Args: { p_event_id: string; p_round: number; p_selected: string }
        Returns: undefined
      }
      select_speed_rank: {
        Args: { p_event_id: string; p_pick_rank: number; p_picked: string }
        Returns: undefined
      }
      send_event_message: {
        Args: { p_body: string; p_conversation_id: string }
        Returns: number
      }
      send_gift: {
        Args: { p_gift_id: string; p_recipient: string }
        Returns: undefined
      }
      send_guest_pass: { Args: { p_guest: string }; Returns: string }
      send_message: {
        Args: { p_body: string; p_conversation_id: string }
        Returns: number
      }
      send_speed_message: {
        Args: {
          p_body: string
          p_event_id: string
          p_group: number
          p_slot: number
        }
        Returns: number
      }
      setup_speed_dating: { Args: { p_event_id: string }; Returns: undefined }
      start_date_night: { Args: { p_other: string }; Returns: string }
      submit_blind_answer: {
        Args: { p_body: string; p_event_id: string; p_round: number }
        Returns: undefined
      }
      submit_blind_question: {
        Args: { p_event_id: string; p_question: string; p_round: number }
        Returns: undefined
      }
      submit_rooftop_pick: {
        Args: { p_event_id: string; p_pickee: string; p_round: number }
        Returns: undefined
      }
      tap_date_night: {
        Args: { p_game: string; p_index: number; p_pick: number }
        Returns: undefined
      }
      taskbar_state: {
        Args: never
        Returns: {
          blind_date_joins_today: number
          checked_in_today: boolean
          gift_ready: boolean
          gift_ready_in_minutes: number
          matchmaker_plays_left: number
          messages_sent_today: number
          new_people_today: number
          tier: string
        }[]
      }
      tick_rooftop_events: { Args: never; Returns: undefined }
      tier_rank: { Args: { p_tier: string }; Returns: number }
    }
    Enums: {
      consent_type: "terms" | "privacy" | "verification" | "best_practices"
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      consent_type: ["terms", "privacy", "verification", "best_practices"],
      pricing_plan_interval: ["day", "week", "month", "year"],
      pricing_type: ["one_time", "recurring"],
      subscription_status: [
        "trialing",
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "unpaid",
        "paused",
      ],
    },
  },
} as const

