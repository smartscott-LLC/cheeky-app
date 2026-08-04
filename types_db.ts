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
      badge_catalog: {
        Row: {
          created_at: string
          description: string
          emoji: string
          how_to_earn: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description: string
          emoji: string
          how_to_earn: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string
          emoji?: string
          how_to_earn?: string
          id?: string
          name?: string
          slug?: string
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
          id?: string
          kind?: string
          min_fill?: number
          starts_at?: string
          status?: string
          token_cost?: number
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
          user_id_a: string
          user_id_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          source?: string
          status?: string
          user_id_a: string
          user_id_b: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          status?: string
          user_id_a?: string
          user_id_b?: string
        }
        Relationships: []
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
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: never
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: never
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
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count: number | null
          metadata: Json | null
          product_id: string | null
          trial_period_days: number | null
          type: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
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
          bio: string
          bot_flagged_at: string | null
          created_at: string
          display_name: string
          gender: string | null
          id: string
          interested_in: string
          message_retention_days: number
          one_liner: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          bio?: string
          bot_flagged_at?: string | null
          created_at?: string
          display_name?: string
          gender?: string | null
          id: string
          interested_in?: string
          message_retention_days?: number
          one_liner?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          bio?: string
          bot_flagged_at?: string | null
          created_at?: string
          display_name?: string
          gender?: string | null
          id?: string
          interested_in?: string
          message_retention_days?: number
          one_liner?: string | null
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
      [_ in never]: never
    }
    Functions: {
      add_special_interest: {
        Args: {
          p_interest_user: string
        }
        Returns: string
      }
      award_badge: {
        Args: {
          p_user: string
          p_slug: string
        }
        Returns: undefined
      }
      award_gem: {
        Args: {
          p_user: string
          p_slug: string
        }
        Returns: undefined
      }
      buy_gift: {
        Args: {
          p_slug: string
        }
        Returns: string
      }
      compatible: {
        Args: {
          a: string
          b: string
        }
        Returns: boolean
      }
      create_like: {
        Args: {
          p_likee: string
        }
        Returns: {
          match_id: string
        }[]
      }
      current_tier: {
        Args: {
          p_user: string
        }
        Returns: string
      }
      date_night_leaderboard: {
        Args: {
          p_pack: string
        }
        Returns: {
          score: number
        }[]
      }
      date_night_state: {
        Args: {
          p_game: string
        }
        Returns: Json
      }
      ensure_events: {
        Args: {
          p_hours?: number
        }
        Returns: undefined
      }
      ensure_floor_events: {
        Args: {
          p_hours?: number
        }
        Returns: undefined
      }
      ensure_speed_dating_events: {
        Args: {
          p_hours?: number
        }
        Returns: undefined
      }
      finalize_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      flag_honeypot_catch:
        | {
            Args: {
              p_field: string
              p_page: string
              p_email?: string
              p_user?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_user: string
              p_field: string
              p_page: string
              p_email?: string
            }
            Returns: undefined
          }
      flag_swag_request: {
        Args: {
          p_user: string
          p_actor_ref: string
          p_benefit_type: string
          p_benefit_value: string
          p_reason?: string
        }
        Returns: undefined
      }
      generate_swag_code: {
        Args: {
          p_benefit_type: string
          p_benefit_value: string
          p_actor_type: string
          p_actor_ref?: string
          p_expires_at?: string
          p_max_uses?: number
          p_notes?: string
        }
        Returns: string
      }
      get_or_create_conversation: {
        Args: {
          p_other: string
        }
        Returns: string
      }
      join_event: {
        Args: {
          p_event_id: string
        }
        Returns: string
      }
      leave_event: {
        Args: {
          p_event_id: string
        }
        Returns: undefined
      }
      mark_webhook_processed: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_payload: Json
        }
        Returns: boolean
      }
      owner_grant: {
        Args: {
          p_user: string
          p_benefit_type: string
          p_benefit_value: string
          p_reason?: string
          p_days?: number
        }
        Returns: undefined
      }
      pick_on_floor: {
        Args: {
          p_event_id: string
          p_pickee: string
        }
        Returns: {
          matched: boolean
          match_id: string
        }[]
      }
      record_character_moment: {
        Args: {
          p_user: string
          p_character_slug: string
          p_milestone: string
          p_message: string
        }
        Returns: undefined
      }
      record_checkin: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      record_common_moment: {
        Args: {
          p_user: string
          p_milestone: string
        }
        Returns: undefined
      }
      record_personal_moment: {
        Args: {
          p_user: string
          p_milestone: string
        }
        Returns: undefined
      }
      redeem_swag_code: {
        Args: {
          p_code: string
        }
        Returns: {
          benefit_type: string
          benefit_value: string
        }[]
      }
      resolve_song: {
        Args: {
          p_match_id: string
          p_continue: boolean
        }
        Returns: undefined
      }
      resolve_speed_dating: {
        Args: {
          p_event_id: string
        }
        Returns: undefined
      }
      respond_gift: {
        Args: {
          p_send_id: string
          p_accept: boolean
        }
        Returns: undefined
      }
      select_speed_rank: {
        Args: {
          p_event_id: string
          p_pick_rank: number
          p_picked: string
        }
        Returns: undefined
      }
      send_event_message: {
        Args: {
          p_conversation_id: string
          p_body: string
        }
        Returns: number
      }
      send_gift: {
        Args: {
          p_gift_id: string
          p_recipient: string
        }
        Returns: undefined
      }
      send_guest_pass: {
        Args: {
          p_guest: string
        }
        Returns: string
      }
      send_message: {
        Args: {
          p_conversation_id: string
          p_body: string
        }
        Returns: number
      }
      send_speed_message: {
        Args: {
          p_event_id: string
          p_group: number
          p_slot: number
          p_body: string
        }
        Returns: number
      }
      setup_speed_dating: {
        Args: {
          p_event_id: string
        }
        Returns: undefined
      }
      start_date_night: {
        Args: {
          p_other: string
        }
        Returns: string
      }
      tap_date_night: {
        Args: {
          p_game: string
          p_index: number
          p_pick: number
        }
        Returns: undefined
      }
      tier_rank: {
        Args: {
          p_tier: string
        }
        Returns: number
      }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

