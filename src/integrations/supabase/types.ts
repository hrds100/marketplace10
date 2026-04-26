export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      _deprecated_affiliate_events: {
        Row: {
          affiliate_id: string
          amount: number | null
          commission_type: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          referred_user_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount?: number | null
          commission_type?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          referred_user_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number | null
          commission_type?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          referred_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "_deprecated_affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      _deprecated_affiliate_profiles: {
        Row: {
          bank_account_number: string | null
          bank_holder_name: string | null
          bank_sort_code: string | null
          created_at: string
          id: string
          other_payout_details: string | null
          paypal_email: string | null
          pending_balance: number
          rank: string
          referral_code: string
          total_clicks: number
          total_earned: number
          total_paid_out: number
          total_paid_users: number
          total_signups: number
          user_id: string
        }
        Insert: {
          bank_account_number?: string | null
          bank_holder_name?: string | null
          bank_sort_code?: string | null
          created_at?: string
          id?: string
          other_payout_details?: string | null
          paypal_email?: string | null
          pending_balance?: number
          rank?: string
          referral_code: string
          total_clicks?: number
          total_earned?: number
          total_paid_out?: number
          total_paid_users?: number
          total_signups?: number
          user_id: string
        }
        Update: {
          bank_account_number?: string | null
          bank_holder_name?: string | null
          bank_sort_code?: string | null
          created_at?: string
          id?: string
          other_payout_details?: string | null
          paypal_email?: string | null
          pending_balance?: number
          rank?: string
          referral_code?: string
          total_clicks?: number
          total_earned?: number
          total_paid_out?: number
          total_paid_users?: number
          total_signups?: number
          user_id?: string
        }
        Relationships: []
      }
      ab_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: number
          metadata: Json | null
          page_url: string | null
          variant: string
          visitor_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: never
          metadata?: Json | null
          page_url?: string | null
          variant: string
          visitor_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: never
          metadata?: Json | null
          page_url?: string | null
          variant?: string
          visitor_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string
          target_table: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id: string
          target_table: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string
          target_table?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_leads: {
        Row: {
          created_at: string | null
          default_message: string | null
          email: string
          id: string
          is_default: boolean | null
          name: string
          phone: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_message?: string | null
          email: string
          id?: string
          is_default?: boolean | null
          name: string
          phone: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_message?: string | null
          email?: string
          id?: string
          is_default?: boolean | null
          name?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      aff_commission_settings: {
        Row: {
          commission_type: string
          created_at: string | null
          id: string
          rate: number
          set_by: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          commission_type: string
          created_at?: string | null
          id?: string
          rate: number
          set_by?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          commission_type?: string
          created_at?: string | null
          id?: string
          rate?: number
          set_by?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      aff_commissions: {
        Row: {
          affiliate_id: string
          claim_method: string | null
          claimable_at: string | null
          claimed_at: string | null
          commission_amount: number
          commission_rate: number
          created_at: string | null
          currency: string | null
          gross_amount: number
          id: string
          paid_at: string | null
          property_id: number | null
          referred_user_id: string | null
          source: string
          source_id: string
          status: string | null
          tx_hash: string | null
        }
        Insert: {
          affiliate_id: string
          claim_method?: string | null
          claimable_at?: string | null
          claimed_at?: string | null
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          currency?: string | null
          gross_amount: number
          id?: string
          paid_at?: string | null
          property_id?: number | null
          referred_user_id?: string | null
          source: string
          source_id: string
          status?: string | null
          tx_hash?: string | null
        }
        Update: {
          affiliate_id?: string
          claim_method?: string | null
          claimable_at?: string | null
          claimed_at?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          currency?: string | null
          gross_amount?: number
          id?: string
          paid_at?: string | null
          property_id?: number | null
          referred_user_id?: string | null
          source?: string
          source_id?: string
          status?: string | null
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aff_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "aff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aff_commissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "inv_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      aff_events: {
        Row: {
          affiliate_id: string
          amount: number | null
          commission_type: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          referred_user_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount?: number | null
          commission_type?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          referred_user_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number | null
          commission_type?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          referred_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aff_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "aff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      aff_profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          link_clicks: number | null
          paid_users: number | null
          payout_details: Json | null
          payout_method: string | null
          pending_balance: number | null
          previous_codes: string[] | null
          referral_code: string
          signups: number | null
          tier: string | null
          total_claimed: number | null
          total_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          link_clicks?: number | null
          paid_users?: number | null
          payout_details?: Json | null
          payout_method?: string | null
          pending_balance?: number | null
          previous_codes?: string[] | null
          referral_code: string
          signups?: number | null
          tier?: string | null
          total_claimed?: number | null
          total_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          link_clicks?: number | null
          paid_users?: number | null
          payout_details?: Json | null
          payout_method?: string | null
          pending_balance?: number | null
          previous_codes?: string[] | null
          referral_code?: string
          signups?: number | null
          tier?: string | null
          total_claimed?: number | null
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agreement_acceptances: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          landlord_id: string
          metadata: Json | null
          thread_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          landlord_id: string
          metadata?: Json | null
          thread_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          landlord_id?: string
          metadata?: Json | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_acceptances_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_acceptances_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          id: string
          model_description: string | null
          model_pricing: string | null
          model_university: string | null
          system_prompt_description: string | null
          system_prompt_pricing: string | null
          system_prompt_university: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          model_description?: string | null
          model_pricing?: string | null
          model_university?: string | null
          system_prompt_description?: string | null
          system_prompt_pricing?: string | null
          system_prompt_university?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          model_description?: string | null
          model_pricing?: string | null
          model_university?: string | null
          system_prompt_description?: string | null
          system_prompt_pricing?: string | null
          system_prompt_university?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      auth_link_events: {
        Row: {
          created_at: string | null
          email: string
          id: number
          ip: string | null
          particle_uuid: string
          provider: string
          user_agent: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: never
          ip?: string | null
          particle_uuid: string
          provider: string
          user_agent?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: never
          ip?: string | null
          particle_uuid?: string
          provider?: string
          user_agent?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          body_original: string | null
          body_receiver: string | null
          created_at: string
          id: string
          is_masked: boolean
          mask_type: string | null
          message_type: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          body_original?: string | null
          body_receiver?: string | null
          created_at?: string
          id?: string
          is_masked?: boolean
          mask_type?: string | null
          message_type?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          body_original?: string | null
          body_receiver?: string | null
          created_at?: string
          id?: string
          is_masked?: boolean
          mask_type?: string | null
          message_type?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          landlord_id: string | null
          operator_id: string | null
          property_id: string | null
          starred: boolean
          status: string
          terms_accepted: boolean
          terms_accepted_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          landlord_id?: string | null
          operator_id?: string | null
          property_id?: string | null
          starred?: boolean
          status?: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          landlord_id?: string | null
          operator_id?: string | null
          property_id?: string | null
          starred?: boolean
          status?: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          archived: boolean | null
          city: string
          created_at: string | null
          email: string | null
          id: string
          last_contact: string | null
          name: string
          notes: string | null
          outsider_lead: boolean | null
          photo_url: string | null
          postcode: string | null
          profit: number | null
          property_id: string | null
          rent: number | null
          stage: string | null
          type: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          archived?: boolean | null
          city: string
          created_at?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name: string
          notes?: string | null
          outsider_lead?: boolean | null
          photo_url?: string | null
          postcode?: string | null
          profit?: number | null
          property_id?: string | null
          rent?: number | null
          stage?: string | null
          type?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          archived?: boolean | null
          city?: string
          created_at?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          notes?: string | null
          outsider_lead?: boolean | null
          photo_url?: string | null
          postcode?: string | null
          profit?: number | null
          property_id?: string | null
          rent?: number | null
          stage?: string | null
          type?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          html_body: string
          id: string
          label: string
          subject: string
          type: string
          updated_at: string | null
          updated_by: string | null
          variables: string[] | null
        }
        Insert: {
          category?: string
          html_body: string
          id?: string
          label: string
          subject: string
          type: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: string[] | null
        }
        Update: {
          category?: string
          html_body?: string
          id?: string
          label?: string
          subject?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          question?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      growth_config: {
        Row: {
          ab_enabled: boolean
          ab_weights: Json
          id: number
          social_proof_enabled: boolean
          social_proof_interval_seconds: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ab_enabled?: boolean
          ab_weights?: Json
          id?: number
          social_proof_enabled?: boolean
          social_proof_interval_seconds?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ab_enabled?: boolean
          ab_weights?: Json
          id?: number
          social_proof_enabled?: boolean
          social_proof_interval_seconds?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          always_authorised: boolean | null
          authorisation_type: string | null
          authorized: boolean
          authorized_at: string | null
          channel: string
          created_at: string | null
          id: string
          lister_email: string | null
          lister_id: string | null
          lister_name: string | null
          lister_phone: string | null
          lister_type: string | null
          message: string | null
          nda_required: boolean | null
          nda_signed: boolean | null
          nda_signed_at: string | null
          property_id: string | null
          stage: string | null
          status: string | null
          tenant_email: string | null
          tenant_id: string | null
          tenant_name: string | null
          tenant_phone: string | null
          token: string
          viewed_at: string | null
        }
        Insert: {
          always_authorised?: boolean | null
          authorisation_type?: string | null
          authorized?: boolean
          authorized_at?: string | null
          channel?: string
          created_at?: string | null
          id?: string
          lister_email?: string | null
          lister_id?: string | null
          lister_name?: string | null
          lister_phone?: string | null
          lister_type?: string | null
          message?: string | null
          nda_required?: boolean | null
          nda_signed?: boolean | null
          nda_signed_at?: string | null
          property_id?: string | null
          stage?: string | null
          status?: string | null
          tenant_email?: string | null
          tenant_id?: string | null
          tenant_name?: string | null
          tenant_phone?: string | null
          token: string
          viewed_at?: string | null
        }
        Update: {
          always_authorised?: boolean | null
          authorisation_type?: string | null
          authorized?: boolean
          authorized_at?: string | null
          channel?: string
          created_at?: string | null
          id?: string
          lister_email?: string | null
          lister_id?: string | null
          lister_name?: string | null
          lister_phone?: string | null
          lister_type?: string | null
          message?: string | null
          nda_required?: boolean | null
          nda_signed?: boolean | null
          nda_signed_at?: string | null
          property_id?: string | null
          stage?: string | null
          status?: string | null
          tenant_email?: string | null
          tenant_id?: string | null
          tenant_name?: string | null
          tenant_phone?: string | null
          token?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_boost_status: {
        Row: {
          base_apr: number | null
          boost_cost_usdc: number | null
          boosted_apr: number | null
          boosted_at: string | null
          expires_at: string | null
          id: string
          is_boosted: boolean | null
          property_id: number
          stay_earned: number | null
          user_id: string
        }
        Insert: {
          base_apr?: number | null
          boost_cost_usdc?: number | null
          boosted_apr?: number | null
          boosted_at?: string | null
          expires_at?: string | null
          id?: string
          is_boosted?: boolean | null
          property_id: number
          stay_earned?: number | null
          user_id: string
        }
        Update: {
          base_apr?: number | null
          boost_cost_usdc?: number | null
          boosted_apr?: number | null
          boosted_at?: string | null
          expires_at?: string | null
          id?: string
          is_boosted?: boolean | null
          property_id?: number
          stay_earned?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_boost_status_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "inv_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_kyc_sessions: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
          status: string
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      inv_orders: {
        Row: {
          agent_id: string | null
          amount_paid: number
          created_at: string | null
          external_order_id: string | null
          id: string
          payment_method: string | null
          property_id: number
          shares_requested: number
          status: string | null
          tx_hash: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          amount_paid: number
          created_at?: string | null
          external_order_id?: string | null
          id?: string
          payment_method?: string | null
          property_id: number
          shares_requested: number
          status?: string | null
          tx_hash?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          amount_paid?: number
          created_at?: string | null
          external_order_id?: string | null
          id?: string
          payment_method?: string | null
          property_id?: number
          shares_requested?: number
          status?: string | null
          tx_hash?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_orders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "inv_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_payouts: {
        Row: {
          amount: number
          claim_method: string | null
          claimed_at: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          period_date: string
          property_id: number
          shares_owned: number | null
          status: string | null
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          amount: number
          claim_method?: string | null
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          period_date: string
          property_id: number
          shares_owned?: number | null
          status?: string | null
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          claim_method?: string | null
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          period_date?: string
          property_id?: number
          shares_owned?: number | null
          status?: string | null
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_payouts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "inv_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_properties: {
        Row: {
          annual_yield: number | null
          appreciation_rate: number | null
          area: number | null
          bathrooms: number | null
          bedrooms: number | null
          blockchain_property_id: number | null
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          documents: string[] | null
          financials: Json | null
          highlights: string[] | null
          id: number
          image: string | null
          images: string[] | null
          list_on_deals: boolean | null
          location: string
          monthly_rent: number | null
          occupancy_rate: number | null
          photos: string[] | null
          price_per_share: number
          property_docs: Json | null
          property_value: number | null
          rent_cost: number | null
          shares_sold: number | null
          status: string | null
          title: string
          total_shares: number
          type: string | null
          updated_at: string | null
          year_built: number | null
        }
        Insert: {
          annual_yield?: number | null
          appreciation_rate?: number | null
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          blockchain_property_id?: number | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          documents?: string[] | null
          financials?: Json | null
          highlights?: string[] | null
          id?: number
          image?: string | null
          images?: string[] | null
          list_on_deals?: boolean | null
          location: string
          monthly_rent?: number | null
          occupancy_rate?: number | null
          photos?: string[] | null
          price_per_share: number
          property_docs?: Json | null
          property_value?: number | null
          rent_cost?: number | null
          shares_sold?: number | null
          status?: string | null
          title: string
          total_shares: number
          type?: string | null
          updated_at?: string | null
          year_built?: number | null
        }
        Update: {
          annual_yield?: number | null
          appreciation_rate?: number | null
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          blockchain_property_id?: number | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          documents?: string[] | null
          financials?: Json | null
          highlights?: string[] | null
          id?: number
          image?: string | null
          images?: string[] | null
          list_on_deals?: boolean | null
          location?: string
          monthly_rent?: number | null
          occupancy_rate?: number | null
          photos?: string[] | null
          price_per_share?: number
          property_docs?: Json | null
          property_value?: number | null
          rent_cost?: number | null
          shares_sold?: number | null
          status?: string | null
          title?: string
          total_shares?: number
          type?: string | null
          updated_at?: string | null
          year_built?: number | null
        }
        Relationships: []
      }
      inv_proposals: {
        Row: {
          blockchain_proposal_id: number | null
          created_at: string | null
          description: string
          ends_at: string | null
          id: string
          property_id: number
          proposer_id: string
          quorum: number | null
          result: string | null
          starts_at: string | null
          title: string
          total_eligible_votes: number | null
          type: string
          votes_no: number | null
          votes_yes: number | null
        }
        Insert: {
          blockchain_proposal_id?: number | null
          created_at?: string | null
          description: string
          ends_at?: string | null
          id?: string
          property_id: number
          proposer_id: string
          quorum?: number | null
          result?: string | null
          starts_at?: string | null
          title: string
          total_eligible_votes?: number | null
          type: string
          votes_no?: number | null
          votes_yes?: number | null
        }
        Update: {
          blockchain_proposal_id?: number | null
          created_at?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          property_id?: number
          proposer_id?: string
          quorum?: number | null
          result?: string | null
          starts_at?: string | null
          title?: string
          total_eligible_votes?: number | null
          type?: string
          votes_no?: number | null
          votes_yes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_proposals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "inv_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_shareholdings: {
        Row: {
          created_at: string | null
          current_value: number | null
          id: string
          invested_amount: number
          last_payout_date: string | null
          property_id: number
          shares_owned: number
          total_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          id?: string
          invested_amount: number
          last_payout_date?: string | null
          property_id: number
          shares_owned: number
          total_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          id?: string
          invested_amount?: number
          last_payout_date?: string | null
          property_id?: number
          shares_owned?: number
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_shareholdings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "inv_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_votes: {
        Row: {
          choice: string
          created_at: string | null
          id: string
          proposal_id: string
          shares_weight: number | null
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          choice: string
          created_at?: string | null
          id?: string
          proposal_id: string
          shares_weight?: number | null
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          choice?: string
          created_at?: string | null
          id?: string
          proposal_id?: string
          shares_weight?: number | null
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "inv_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_invites: {
        Row: {
          created_at: string
          id: string
          lister_type: string | null
          magic_token: string
          phone: string | null
          thread_id: string | null
          used: boolean
          used_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lister_type?: string | null
          magic_token?: string
          phone?: string | null
          thread_id?: string | null
          used?: boolean
          used_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lister_type?: string | null
          magic_token?: string
          phone?: string | null
          thread_id?: string | null
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landlord_invites_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          created_at: string | null
          emoji: string | null
          estimated_minutes: number | null
          id: string
          is_published: boolean
          module_id: string | null
          order_index: number
          tier_required: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          emoji?: string | null
          estimated_minutes?: number | null
          id: string
          is_published?: boolean
          module_id?: string | null
          order_index?: number
          tier_required?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          emoji?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean
          module_id?: string | null
          order_index?: number
          tier_required?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string | null
          description: string | null
          emoji: string | null
          id: string
          is_locked: boolean
          learning_outcomes: string[] | null
          order_index: number
          tier_required: string
          title: string
          updated_at: string | null
          xp_reward: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id: string
          is_locked?: boolean
          learning_outcomes?: string[] | null
          order_index?: number
          tier_required?: string
          title: string
          updated_at?: string | null
          xp_reward?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_locked?: boolean
          learning_outcomes?: string[] | null
          order_index?: number
          tier_required?: string
          title?: string
          updated_at?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      nfs_analytics: {
        Row: {
          booking_data: Json | null
          created_at: string | null
          device_type: string | null
          event_type: string
          id: string
          ip_address: string | null
          operator_id: string
          property_id: string | null
          referrer: string | null
          reservation_id: string | null
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          view_source: string | null
        }
        Insert: {
          booking_data?: Json | null
          created_at?: string | null
          device_type?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          operator_id: string
          property_id?: string | null
          referrer?: string | null
          reservation_id?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          view_source?: string | null
        }
        Update: {
          booking_data?: Json | null
          created_at?: string | null
          device_type?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          operator_id?: string
          property_id?: string | null
          referrer?: string | null
          reservation_id?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          view_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfs_analytics_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "nfs_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfs_analytics_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "nfs_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfs_analytics_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "nfs_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_auth_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          operator_id: string | null
          token: string
          type: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          operator_id?: string | null
          token: string
          type: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          operator_id?: string | null
          token?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfs_auth_tokens_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "nfs_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_blocked_dates: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          property_id: string
          source: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          property_id: string
          source?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          property_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfs_blocked_dates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "nfs_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_guest_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          linked_at: string | null
          linked_reservations: string[] | null
          linked_user_id: string | null
          session_data: Json | null
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          linked_at?: string | null
          linked_reservations?: string[] | null
          linked_user_id?: string | null
          session_data?: Json | null
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          linked_at?: string | null
          linked_reservations?: string[] | null
          linked_user_id?: string | null
          session_data?: Json | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfs_guest_sessions_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_hospitable_connections: {
        Row: {
          auth_code: string | null
          auth_code_expires_at: string | null
          channel_info: Json | null
          connected_at: string | null
          connected_platforms: Json | null
          created_at: string | null
          disconnected_at: string | null
          health_status: string | null
          hospitable_connection_id: string | null
          hospitable_customer_id: string
          id: string
          is_active: boolean | null
          last_error: Json | null
          last_health_check: string | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_results: Json | null
          operator_id: string
          profile_id: string
          status: string | null
          sync_progress: Json | null
          sync_status: string | null
          total_properties: number | null
          total_reservations: number | null
          updated_at: string | null
          user_metadata: Json | null
        }
        Insert: {
          auth_code?: string | null
          auth_code_expires_at?: string | null
          channel_info?: Json | null
          connected_at?: string | null
          connected_platforms?: Json | null
          created_at?: string | null
          disconnected_at?: string | null
          health_status?: string | null
          hospitable_connection_id?: string | null
          hospitable_customer_id: string
          id?: string
          is_active?: boolean | null
          last_error?: Json | null
          last_health_check?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_results?: Json | null
          operator_id: string
          profile_id: string
          status?: string | null
          sync_progress?: Json | null
          sync_status?: string | null
          total_properties?: number | null
          total_reservations?: number | null
          updated_at?: string | null
          user_metadata?: Json | null
        }
        Update: {
          auth_code?: string | null
          auth_code_expires_at?: string | null
          channel_info?: Json | null
          connected_at?: string | null
          connected_platforms?: Json | null
          created_at?: string | null
          disconnected_at?: string | null
          health_status?: string | null
          hospitable_connection_id?: string | null
          hospitable_customer_id?: string
          id?: string
          is_active?: boolean | null
          last_error?: Json | null
          last_health_check?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_results?: Json | null
          operator_id?: string
          profile_id?: string
          status?: string | null
          sync_progress?: Json | null
          sync_status?: string | null
          total_properties?: number | null
          total_reservations?: number | null
          updated_at?: string | null
          user_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nfs_hospitable_connections_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "nfs_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfs_hospitable_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_legal_pages: {
        Row: {
          content: string
          content_translations: Json | null
          id: string
          owner_id: string
          owner_type: string
          page_type: string
          updated_at: string
        }
        Insert: {
          content?: string
          content_translations?: Json | null
          id?: string
          owner_id: string
          owner_type: string
          page_type: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_translations?: Json | null
          id?: string
          owner_id?: string
          owner_type?: string
          page_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      nfs_legal_protected_blocks: {
        Row: {
          active: boolean
          content: string
          id: string
          page_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content?: string
          id?: string
          page_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          id?: string
          page_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      nfs_operator_users: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invited_by: string | null
          operator_id: string
          profile_id: string
          role: string
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_by?: string | null
          operator_id: string
          profile_id: string
          role: string
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_by?: string | null
          operator_id?: string
          profile_id?: string
          role?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfs_operator_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfs_operator_users_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "nfs_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfs_operator_users_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_operators: {
        Row: {
          about_bio: string | null
          about_bio_translations: Json | null
          about_photo: string | null
          accent_color: string | null
          accept_cash_booking: boolean | null
          airbnb_url: string | null
          booking_mode: string | null
          brand_name: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_telegram: string | null
          contact_whatsapp: string | null
          created_at: string | null
          custom_domain: string | null
          custom_domain_cf: Json | null
          custom_domain_dns_checked_at: string | null
          custom_domain_dns_method: string | null
          custom_domain_dns_verified: boolean | null
          custom_domain_verified: boolean | null
          default_currency: string | null
          default_language: string | null
          faqs: Json | null
          favicon_url: string | null
          fees_options_enabled: boolean | null
          first_name: string | null
          google_analytics_id: string | null
          google_business_url: string | null
          hero_headline: string | null
          hero_headline_translations: Json | null
          hero_photo: string | null
          hero_subheadline: string | null
          hero_subheadline_translations: Json | null
          id: string
          landing_page_enabled: boolean | null
          last_name: string | null
          legal_name: string | null
          listings_count: number | null
          logo_alt: string | null
          logo_url: string | null
          meta_description: string | null
          meta_pixel_id: string | null
          meta_title: string | null
          og_image_url: string | null
          onboarding_completed_steps: string[] | null
          onboarding_preference: string | null
          onboarding_skipped_steps: string[] | null
          onboarding_step: string | null
          onboarding_updated_at: string | null
          persona_type: string | null
          primary_domain_type: string | null
          profile_id: string
          social_facebook: string | null
          social_instagram: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_youtube: string | null
          subdomain: string | null
          updated_at: string | null
          usage_intent: string | null
          whatsapp_prefill_message: string | null
        }
        Insert: {
          about_bio?: string | null
          about_bio_translations?: Json | null
          about_photo?: string | null
          accent_color?: string | null
          accept_cash_booking?: boolean | null
          airbnb_url?: string | null
          booking_mode?: string | null
          brand_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          custom_domain?: string | null
          custom_domain_cf?: Json | null
          custom_domain_dns_checked_at?: string | null
          custom_domain_dns_method?: string | null
          custom_domain_dns_verified?: boolean | null
          custom_domain_verified?: boolean | null
          default_currency?: string | null
          default_language?: string | null
          faqs?: Json | null
          favicon_url?: string | null
          fees_options_enabled?: boolean | null
          first_name?: string | null
          google_analytics_id?: string | null
          google_business_url?: string | null
          hero_headline?: string | null
          hero_headline_translations?: Json | null
          hero_photo?: string | null
          hero_subheadline?: string | null
          hero_subheadline_translations?: Json | null
          id?: string
          landing_page_enabled?: boolean | null
          last_name?: string | null
          legal_name?: string | null
          listings_count?: number | null
          logo_alt?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_pixel_id?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          onboarding_completed_steps?: string[] | null
          onboarding_preference?: string | null
          onboarding_skipped_steps?: string[] | null
          onboarding_step?: string | null
          onboarding_updated_at?: string | null
          persona_type?: string | null
          primary_domain_type?: string | null
          profile_id: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          subdomain?: string | null
          updated_at?: string | null
          usage_intent?: string | null
          whatsapp_prefill_message?: string | null
        }
        Update: {
          about_bio?: string | null
          about_bio_translations?: Json | null
          about_photo?: string | null
          accent_color?: string | null
          accept_cash_booking?: boolean | null
          airbnb_url?: string | null
          booking_mode?: string | null
          brand_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          custom_domain?: string | null
          custom_domain_cf?: Json | null
          custom_domain_dns_checked_at?: string | null
          custom_domain_dns_method?: string | null
          custom_domain_dns_verified?: boolean | null
          custom_domain_verified?: boolean | null
          default_currency?: string | null
          default_language?: string | null
          faqs?: Json | null
          favicon_url?: string | null
          fees_options_enabled?: boolean | null
          first_name?: string | null
          google_analytics_id?: string | null
          google_business_url?: string | null
          hero_headline?: string | null
          hero_headline_translations?: Json | null
          hero_photo?: string | null
          hero_subheadline?: string | null
          hero_subheadline_translations?: Json | null
          id?: string
          landing_page_enabled?: boolean | null
          last_name?: string | null
          legal_name?: string | null
          listings_count?: number | null
          logo_alt?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_pixel_id?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          onboarding_completed_steps?: string[] | null
          onboarding_preference?: string | null
          onboarding_skipped_steps?: string[] | null
          onboarding_step?: string | null
          onboarding_updated_at?: string | null
          persona_type?: string | null
          primary_domain_type?: string | null
          profile_id?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          subdomain?: string | null
          updated_at?: string | null
          usage_intent?: string | null
          whatsapp_prefill_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfs_operators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_promo_codes: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          currency: string | null
          current_uses: number | null
          discount_percent: number
          discount_type: string
          expires_at: string | null
          id: string
          limited_uses: boolean | null
          max_uses: number | null
          name: string | null
          operator_id: string | null
          status: string | null
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
          value: number
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          currency?: string | null
          current_uses?: number | null
          discount_percent?: number
          discount_type: string
          expires_at?: string | null
          id?: string
          limited_uses?: boolean | null
          max_uses?: number | null
          name?: string | null
          operator_id?: string | null
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value: number
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          currency?: string | null
          current_uses?: number | null
          discount_percent?: number
          discount_type?: string
          expires_at?: string | null
          id?: string
          limited_uses?: boolean | null
          max_uses?: number | null
          name?: string | null
          operator_id?: string | null
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "nfs_promo_codes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "nfs_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_properties: {
        Row: {
          accommodation_type: string | null
          addons: Json | null
          address: string | null
          advance_notice: number | null
          allow_children: boolean | null
          amenities: Json | null
          availability_window: string | null
          base_rate_amount: number | null
          base_rate_currency: string | null
          blocked_date_ranges: Json | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          city: string | null
          cleaning_fee: Json | null
          completed_steps: string[] | null
          country: string | null
          created_at: string | null
          current_step: string | null
          custom_fees: Json | null
          custom_rates: Json | null
          custom_taxes: Json | null
          daily_rates: Json | null
          date_ranges: Json | null
          day_prices: Json | null
          day_prices_enabled: boolean | null
          description: string | null
          description_translations: Json | null
          extra_guest_fee: Json | null
          hospitable_connected: boolean | null
          hospitable_connection_id: string | null
          hospitable_customer_id: string | null
          hospitable_last_sync_at: string | null
          hospitable_platform_mappings: Json | null
          hospitable_property_id: string | null
          hospitable_sync_status: string | null
          ical_feeds: Json
          ical_last_sync_at: string | null
          ical_token: string
          id: string
          images: Json | null
          inbound_calendars: Json | null
          internal_name: string | null
          internal_title: string | null
          lat: number | null
          listing_status: string | null
          lng: number | null
          max_guests: number | null
          max_pets: number | null
          minimum_stay: number | null
          monthly_discount: Json | null
          operator_id: string
          outbound_calendar_url: string | null
          postal_code: string | null
          property_type: string | null
          public_title: string | null
          rental_type: string | null
          room_counts: Json | null
          room_sections: Json | null
          rules: string | null
          size_unit: string | null
          size_value: number | null
          slug: string | null
          source: string | null
          state: string | null
          status: string | null
          street: string | null
          synced_rate_modifier: Json | null
          timezone: string | null
          title_translations: Json | null
          updated_at: string | null
          weekly_discount: Json | null
        }
        Insert: {
          accommodation_type?: string | null
          addons?: Json | null
          address?: string | null
          advance_notice?: number | null
          allow_children?: boolean | null
          amenities?: Json | null
          availability_window?: string | null
          base_rate_amount?: number | null
          base_rate_currency?: string | null
          blocked_date_ranges?: Json | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          cleaning_fee?: Json | null
          completed_steps?: string[] | null
          country?: string | null
          created_at?: string | null
          current_step?: string | null
          custom_fees?: Json | null
          custom_rates?: Json | null
          custom_taxes?: Json | null
          daily_rates?: Json | null
          date_ranges?: Json | null
          day_prices?: Json | null
          day_prices_enabled?: boolean | null
          description?: string | null
          description_translations?: Json | null
          extra_guest_fee?: Json | null
          hospitable_connected?: boolean | null
          hospitable_connection_id?: string | null
          hospitable_customer_id?: string | null
          hospitable_last_sync_at?: string | null
          hospitable_platform_mappings?: Json | null
          hospitable_property_id?: string | null
          hospitable_sync_status?: string | null
          ical_feeds?: Json
          ical_last_sync_at?: string | null
          ical_token?: string
          id?: string
          images?: Json | null
          inbound_calendars?: Json | null
          internal_name?: string | null
          internal_title?: string | null
          lat?: number | null
          listing_status?: string | null
          lng?: number | null
          max_guests?: number | null
          max_pets?: number | null
          minimum_stay?: number | null
          monthly_discount?: Json | null
          operator_id: string
          outbound_calendar_url?: string | null
          postal_code?: string | null
          property_type?: string | null
          public_title?: string | null
          rental_type?: string | null
          room_counts?: Json | null
          room_sections?: Json | null
          rules?: string | null
          size_unit?: string | null
          size_value?: number | null
          slug?: string | null
          source?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          synced_rate_modifier?: Json | null
          timezone?: string | null
          title_translations?: Json | null
          updated_at?: string | null
          weekly_discount?: Json | null
        }
        Update: {
          accommodation_type?: string | null
          addons?: Json | null
          address?: string | null
          advance_notice?: number | null
          allow_children?: boolean | null
          amenities?: Json | null
          availability_window?: string | null
          base_rate_amount?: number | null
          base_rate_currency?: string | null
          blocked_date_ranges?: Json | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          cleaning_fee?: Json | null
          completed_steps?: string[] | null
          country?: string | null
          created_at?: string | null
          current_step?: string | null
          custom_fees?: Json | null
          custom_rates?: Json | null
          custom_taxes?: Json | null
          daily_rates?: Json | null
          date_ranges?: Json | null
          day_prices?: Json | null
          day_prices_enabled?: boolean | null
          description?: string | null
          description_translations?: Json | null
          extra_guest_fee?: Json | null
          hospitable_connected?: boolean | null
          hospitable_connection_id?: string | null
          hospitable_customer_id?: string | null
          hospitable_last_sync_at?: string | null
          hospitable_platform_mappings?: Json | null
          hospitable_property_id?: string | null
          hospitable_sync_status?: string | null
          ical_feeds?: Json
          ical_last_sync_at?: string | null
          ical_token?: string
          id?: string
          images?: Json | null
          inbound_calendars?: Json | null
          internal_name?: string | null
          internal_title?: string | null
          lat?: number | null
          listing_status?: string | null
          lng?: number | null
          max_guests?: number | null
          max_pets?: number | null
          minimum_stay?: number | null
          monthly_discount?: Json | null
          operator_id?: string
          outbound_calendar_url?: string | null
          postal_code?: string | null
          property_type?: string | null
          public_title?: string | null
          rental_type?: string | null
          room_counts?: Json | null
          room_sections?: Json | null
          rules?: string | null
          size_unit?: string | null
          size_value?: number | null
          slug?: string | null
          source?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          synced_rate_modifier?: Json | null
          timezone?: string | null
          title_translations?: Json | null
          updated_at?: string | null
          weekly_discount?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nfs_properties_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "nfs_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_property_date_overrides: {
        Row: {
          created_at: string | null
          custom_price: number | null
          date: string
          id: string
          min_stay: number | null
          property_id: string
        }
        Insert: {
          created_at?: string | null
          custom_price?: number | null
          date: string
          id?: string
          min_stay?: number | null
          property_id: string
        }
        Update: {
          created_at?: string | null
          custom_price?: number | null
          date?: string
          id?: string
          min_stay?: number | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfs_property_date_overrides_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "nfs_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_reservations: {
        Row: {
          add_ons: Json | null
          adults: number | null
          block_dates: boolean | null
          booking_source: string | null
          check_in: string
          check_in_time: string
          check_out: string
          check_out_time: string
          children: number | null
          created_at: string | null
          created_by: string | null
          custom_fees: Json | null
          discount_amount: number | null
          discounts: Json | null
          expiration: Json | null
          guest_address: string | null
          guest_city: string | null
          guest_country: string | null
          guest_email: string | null
          guest_first_name: string | null
          guest_last_name: string | null
          guest_message: string | null
          guest_phone: string | null
          guest_token: string | null
          hospitable_connection_id: string | null
          hospitable_financials: Json | null
          hospitable_last_sync_at: string | null
          hospitable_platform: string | null
          hospitable_platform_id: string | null
          hospitable_reservation_id: string | null
          hospitable_status: string | null
          hospitable_status_history: Json | null
          id: string
          infants: number | null
          is_linked_to_user: boolean | null
          linked_at: string | null
          operator_domain: string | null
          operator_id: string | null
          payment_amounts: Json | null
          payment_currency: string | null
          payment_fee_breakdown: Json | null
          payment_processed_at: string | null
          payment_status: string | null
          pets: number | null
          promo_code: string | null
          promo_discount_amount: number | null
          property_id: string
          refund_amount: number | null
          refund_at: string | null
          refund_reason: string | null
          refund_status: string | null
          selected_addons: Json | null
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_session_id: string | null
          stripe_transfer_id: string | null
          synced_rate_modifier: Json | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          add_ons?: Json | null
          adults?: number | null
          block_dates?: boolean | null
          booking_source?: string | null
          check_in: string
          check_in_time?: string
          check_out: string
          check_out_time?: string
          children?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_fees?: Json | null
          discount_amount?: number | null
          discounts?: Json | null
          expiration?: Json | null
          guest_address?: string | null
          guest_city?: string | null
          guest_country?: string | null
          guest_email?: string | null
          guest_first_name?: string | null
          guest_last_name?: string | null
          guest_message?: string | null
          guest_phone?: string | null
          guest_token?: string | null
          hospitable_connection_id?: string | null
          hospitable_financials?: Json | null
          hospitable_last_sync_at?: string | null
          hospitable_platform?: string | null
          hospitable_platform_id?: string | null
          hospitable_reservation_id?: string | null
          hospitable_status?: string | null
          hospitable_status_history?: Json | null
          id?: string
          infants?: number | null
          is_linked_to_user?: boolean | null
          linked_at?: string | null
          operator_domain?: string | null
          operator_id?: string | null
          payment_amounts?: Json | null
          payment_currency?: string | null
          payment_fee_breakdown?: Json | null
          payment_processed_at?: string | null
          payment_status?: string | null
          pets?: number | null
          promo_code?: string | null
          promo_discount_amount?: number | null
          property_id: string
          refund_amount?: number | null
          refund_at?: string | null
          refund_reason?: string | null
          refund_status?: string | null
          selected_addons?: Json | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          stripe_transfer_id?: string | null
          synced_rate_modifier?: Json | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          add_ons?: Json | null
          adults?: number | null
          block_dates?: boolean | null
          booking_source?: string | null
          check_in?: string
          check_in_time?: string
          check_out?: string
          check_out_time?: string
          children?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_fees?: Json | null
          discount_amount?: number | null
          discounts?: Json | null
          expiration?: Json | null
          guest_address?: string | null
          guest_city?: string | null
          guest_country?: string | null
          guest_email?: string | null
          guest_first_name?: string | null
          guest_last_name?: string | null
          guest_message?: string | null
          guest_phone?: string | null
          guest_token?: string | null
          hospitable_connection_id?: string | null
          hospitable_financials?: Json | null
          hospitable_last_sync_at?: string | null
          hospitable_platform?: string | null
          hospitable_platform_id?: string | null
          hospitable_reservation_id?: string | null
          hospitable_status?: string | null
          hospitable_status_history?: Json | null
          id?: string
          infants?: number | null
          is_linked_to_user?: boolean | null
          linked_at?: string | null
          operator_domain?: string | null
          operator_id?: string | null
          payment_amounts?: Json | null
          payment_currency?: string | null
          payment_fee_breakdown?: Json | null
          payment_processed_at?: string | null
          payment_status?: string | null
          pets?: number | null
          promo_code?: string | null
          promo_discount_amount?: number | null
          property_id?: string
          refund_amount?: number | null
          refund_at?: string | null
          refund_reason?: string | null
          refund_status?: string | null
          selected_addons?: Json | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          stripe_transfer_id?: string | null
          synced_rate_modifier?: Json | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfs_reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfs_reservations_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "nfs_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfs_reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "nfs_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_stripe_accounts: {
        Row: {
          access_token: string | null
          account_status: string | null
          charges_enabled: boolean | null
          connect_account_id: string | null
          connected_at: string | null
          connection_status: string | null
          created_at: string | null
          currently_due: string[] | null
          details_submitted: boolean | null
          disconnected_at: string | null
          id: string
          last_error: Json | null
          last_payout_amount: number | null
          last_payout_date: string | null
          oauth_code_verifier: string | null
          oauth_state: string | null
          onboarding_completed: boolean | null
          operator_id: string
          past_due: string[] | null
          payouts_enabled: boolean | null
          pending_amount: number | null
          platform_fee_pct: number | null
          refresh_token: string | null
          stripe_fee_fixed: number | null
          stripe_fee_pct: number | null
          stripe_publishable_key: string | null
          stripe_user_id: string | null
          total_earned: number | null
          total_paid_out: number | null
          total_platform_fees: number | null
          total_transferred: number | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          account_status?: string | null
          charges_enabled?: boolean | null
          connect_account_id?: string | null
          connected_at?: string | null
          connection_status?: string | null
          created_at?: string | null
          currently_due?: string[] | null
          details_submitted?: boolean | null
          disconnected_at?: string | null
          id?: string
          last_error?: Json | null
          last_payout_amount?: number | null
          last_payout_date?: string | null
          oauth_code_verifier?: string | null
          oauth_state?: string | null
          onboarding_completed?: boolean | null
          operator_id: string
          past_due?: string[] | null
          payouts_enabled?: boolean | null
          pending_amount?: number | null
          platform_fee_pct?: number | null
          refresh_token?: string | null
          stripe_fee_fixed?: number | null
          stripe_fee_pct?: number | null
          stripe_publishable_key?: string | null
          stripe_user_id?: string | null
          total_earned?: number | null
          total_paid_out?: number | null
          total_platform_fees?: number | null
          total_transferred?: number | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          account_status?: string | null
          charges_enabled?: boolean | null
          connect_account_id?: string | null
          connected_at?: string | null
          connection_status?: string | null
          created_at?: string | null
          currently_due?: string[] | null
          details_submitted?: boolean | null
          disconnected_at?: string | null
          id?: string
          last_error?: Json | null
          last_payout_amount?: number | null
          last_payout_date?: string | null
          oauth_code_verifier?: string | null
          oauth_state?: string | null
          onboarding_completed?: boolean | null
          operator_id?: string
          past_due?: string[] | null
          payouts_enabled?: boolean | null
          pending_amount?: number | null
          platform_fee_pct?: number | null
          refresh_token?: string | null
          stripe_fee_fixed?: number | null
          stripe_fee_pct?: number | null
          stripe_publishable_key?: string | null
          stripe_user_id?: string | null
          total_earned?: number | null
          total_paid_out?: number | null
          total_platform_fees?: number | null
          total_transferred?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfs_stripe_accounts_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "nfs_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_webhook_events: {
        Row: {
          created_at: string | null
          data: Json
          error: string | null
          event_type: string
          external_event_id: string
          id: string
          last_retry_at: string | null
          processed: boolean | null
          processed_at: string | null
          retry_count: number | null
          source: string
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          error?: string | null
          event_type: string
          external_event_id: string
          id?: string
          last_retry_at?: string | null
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
          source: string
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          error?: string | null
          event_type?: string
          external_event_id?: string
          id?: string
          last_retry_at?: string | null
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
          source?: string
          success?: boolean | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          bell_enabled: boolean
          category: string
          email_enabled: boolean
          event_key: string
          id: string
          label: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bell_enabled?: boolean
          category?: string
          email_enabled?: boolean
          event_key: string
          id?: string
          label: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bell_enabled?: boolean
          category?: string
          email_enabled?: boolean
          event_key?: string
          id?: string
          label?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          property_id: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          property_id?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          property_id?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      otps: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      payout_audit_log: {
        Row: {
          claim_id: string | null
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_status: string | null
          old_status: string | null
          performed_by: string | null
          user_id: string | null
        }
        Insert: {
          claim_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          performed_by?: string | null
          user_id?: string | null
        }
        Update: {
          claim_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          performed_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_audit_log_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "payout_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_claims: {
        Row: {
          amount_entitled: number
          bank_account_id: string | null
          claimed_at: string | null
          created_at: string | null
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          revolut_payment_draft_id: string | null
          revolut_transaction_id: string | null
          status: string | null
          user_id: string
          user_type: string
          week_ref: string
        }
        Insert: {
          amount_entitled: number
          bank_account_id?: string | null
          claimed_at?: string | null
          created_at?: string | null
          currency: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          revolut_payment_draft_id?: string | null
          revolut_transaction_id?: string | null
          status?: string | null
          user_id: string
          user_type: string
          week_ref: string
        }
        Update: {
          amount_entitled?: number
          bank_account_id?: string | null
          claimed_at?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          revolut_payment_draft_id?: string | null
          revolut_transaction_id?: string | null
          status?: string | null
          user_id?: string
          user_type?: string
          week_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_claims_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "user_bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_payments: {
        Row: {
          amount: number | null
          claimed: boolean | null
          claimed_at: string | null
          claimed_by: string | null
          contact_id: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: number
          phone: string | null
          product_id: string | null
          tier: string
        }
        Insert: {
          amount?: number | null
          claimed?: boolean | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_id?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: never
          phone?: string | null
          product_id?: string | null
          tier: string
        }
        Update: {
          amount?: number | null
          claimed?: boolean | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: never
          phone?: string | null
          product_id?: string | null
          tier?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          id: string
          pipeline_type: string
          stages: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          pipeline_type: string
          stages?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          pipeline_type?: string
          stages?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_label: string | null
          agent_extension: string | null
          agent_status: string | null
          agent_status_updated_at: string | null
          avatar_url: string | null
          default_caller_id_number_id: string | null
          email: string | null
          id: string
          legacy_wallet_dismissed: boolean | null
          name: string | null
          notif_email_daily: boolean | null
          notif_whatsapp_daily: boolean | null
          notif_whatsapp_new_deals: boolean | null
          notif_whatsapp_status: boolean | null
          photo_url: string | null
          referred_by: string | null
          role: string | null
          samcart_cust_id: string | null
          suspended: boolean | null
          tier: string | null
          wallet_address: string | null
          wallet_auth_method: string | null
          wallet_change_allowed_until: string | null
          whatsapp: string | null
          whatsapp_verified: boolean | null
          workspace_role: string | null
        }
        Insert: {
          admin_label?: string | null
          agent_extension?: string | null
          agent_status?: string | null
          agent_status_updated_at?: string | null
          avatar_url?: string | null
          default_caller_id_number_id?: string | null
          email?: string | null
          id: string
          legacy_wallet_dismissed?: boolean | null
          name?: string | null
          notif_email_daily?: boolean | null
          notif_whatsapp_daily?: boolean | null
          notif_whatsapp_new_deals?: boolean | null
          notif_whatsapp_status?: boolean | null
          photo_url?: string | null
          referred_by?: string | null
          role?: string | null
          samcart_cust_id?: string | null
          suspended?: boolean | null
          tier?: string | null
          wallet_address?: string | null
          wallet_auth_method?: string | null
          wallet_change_allowed_until?: string | null
          whatsapp?: string | null
          whatsapp_verified?: boolean | null
          workspace_role?: string | null
        }
        Update: {
          admin_label?: string | null
          agent_extension?: string | null
          agent_status?: string | null
          agent_status_updated_at?: string | null
          avatar_url?: string | null
          default_caller_id_number_id?: string | null
          email?: string | null
          id?: string
          legacy_wallet_dismissed?: boolean | null
          name?: string | null
          notif_email_daily?: boolean | null
          notif_whatsapp_daily?: boolean | null
          notif_whatsapp_new_deals?: boolean | null
          notif_whatsapp_status?: boolean | null
          photo_url?: string | null
          referred_by?: string | null
          role?: string | null
          samcart_cust_id?: string | null
          suspended?: boolean | null
          tier?: string | null
          wallet_address?: string | null
          wallet_auth_method?: string | null
          wallet_change_allowed_until?: string | null
          whatsapp?: string | null
          whatsapp_verified?: boolean | null
          workspace_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_caller_id_number_fk"
            columns: ["default_caller_id_number_id"]
            isOneToOne: false
            referencedRelation: "wk_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          agent_fee: number | null
          ai_model_used: string | null
          airbnb_search_url_30d: string | null
          airbnb_search_url_7d: string | null
          airbnb_search_url_90d: string | null
          bathrooms: number | null
          bedrooms: number | null
          beds: number | null
          below_market_value: number | null
          capacity: number | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string | null
          days_since_added: number | null
          deal_type: string | null
          deposit: number | null
          description: string | null
          edit_requested_at: string | null
          end_value: number | null
          estimated_monthly_revenue: number | null
          estimated_nightly_rate: number | null
          estimated_profit: number | null
          estimation_confidence: string | null
          estimation_notes: string | null
          featured: boolean | null
          first_contact_sent: boolean | null
          first_landlord_inquiry: boolean | null
          garage: boolean | null
          gdv: number | null
          gross_yield: number | null
          holding_deposit: number | null
          id: string
          in_crm: boolean | null
          landlord_whatsapp: string | null
          lister_type: string | null
          listing_type: string
          name: string | null
          nda_required: boolean | null
          nightly_rate_projected: number | null
          notes: string | null
          outreach_sent: boolean
          outreach_sent_at: string | null
          pending_reason: string | null
          photos: string[] | null
          postcode: string | null
          prime: boolean | null
          profit_est: number | null
          property_category: string | null
          purchase_price: number | null
          refurb_cost: number | null
          rent_monthly: number | null
          roi: number | null
          sa_approved: string | null
          slug: string | null
          source: string | null
          sourcing_fee: number | null
          status: string | null
          submitted_by: string | null
          type: string | null
        }
        Insert: {
          agent_fee?: number | null
          ai_model_used?: string | null
          airbnb_search_url_30d?: string | null
          airbnb_search_url_7d?: string | null
          airbnb_search_url_90d?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          below_market_value?: number | null
          capacity?: number | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          days_since_added?: number | null
          deal_type?: string | null
          deposit?: number | null
          description?: string | null
          edit_requested_at?: string | null
          end_value?: number | null
          estimated_monthly_revenue?: number | null
          estimated_nightly_rate?: number | null
          estimated_profit?: number | null
          estimation_confidence?: string | null
          estimation_notes?: string | null
          featured?: boolean | null
          first_contact_sent?: boolean | null
          first_landlord_inquiry?: boolean | null
          garage?: boolean | null
          gdv?: number | null
          gross_yield?: number | null
          holding_deposit?: number | null
          id?: string
          in_crm?: boolean | null
          landlord_whatsapp?: string | null
          lister_type?: string | null
          listing_type?: string
          name?: string | null
          nda_required?: boolean | null
          nightly_rate_projected?: number | null
          notes?: string | null
          outreach_sent?: boolean
          outreach_sent_at?: string | null
          pending_reason?: string | null
          photos?: string[] | null
          postcode?: string | null
          prime?: boolean | null
          profit_est?: number | null
          property_category?: string | null
          purchase_price?: number | null
          refurb_cost?: number | null
          rent_monthly?: number | null
          roi?: number | null
          sa_approved?: string | null
          slug?: string | null
          source?: string | null
          sourcing_fee?: number | null
          status?: string | null
          submitted_by?: string | null
          type?: string | null
        }
        Update: {
          agent_fee?: number | null
          ai_model_used?: string | null
          airbnb_search_url_30d?: string | null
          airbnb_search_url_7d?: string | null
          airbnb_search_url_90d?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          below_market_value?: number | null
          capacity?: number | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          days_since_added?: number | null
          deal_type?: string | null
          deposit?: number | null
          description?: string | null
          edit_requested_at?: string | null
          end_value?: number | null
          estimated_monthly_revenue?: number | null
          estimated_nightly_rate?: number | null
          estimated_profit?: number | null
          estimation_confidence?: string | null
          estimation_notes?: string | null
          featured?: boolean | null
          first_contact_sent?: boolean | null
          first_landlord_inquiry?: boolean | null
          garage?: boolean | null
          gdv?: number | null
          gross_yield?: number | null
          holding_deposit?: number | null
          id?: string
          in_crm?: boolean | null
          landlord_whatsapp?: string | null
          lister_type?: string | null
          listing_type?: string
          name?: string | null
          nda_required?: boolean | null
          nightly_rate_projected?: number | null
          notes?: string | null
          outreach_sent?: boolean
          outreach_sent_at?: string | null
          pending_reason?: string | null
          photos?: string[] | null
          postcode?: string | null
          prime?: boolean | null
          profit_est?: number | null
          property_category?: string | null
          purchase_price?: number | null
          refurb_cost?: number | null
          rent_monthly?: number | null
          roi?: number | null
          sa_approved?: string | null
          slug?: string | null
          source?: string | null
          sourcing_fee?: number | null
          status?: string | null
          submitted_by?: string | null
          type?: string | null
        }
        Relationships: []
      }
      sms_automation_runs: {
        Row: {
          automation_id: string
          completed_at: string | null
          conversation_id: string
          created_at: string
          current_node_id: string | null
          error: string | null
          id: string
          message_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          automation_id: string
          completed_at?: string | null
          conversation_id: string
          created_at?: string
          current_node_id?: string | null
          error?: string | null
          id?: string
          message_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          automation_id?: string
          completed_at?: string | null
          conversation_id?: string
          created_at?: string
          current_node_id?: string | null
          error?: string | null
          id?: string
          message_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "sms_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_automation_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_automation_runs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "sms_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_automation_state: {
        Row: {
          automation_id: string
          completed_at: string | null
          context_data: Json | null
          conversation_id: string
          created_at: string
          current_node_id: string
          exit_reason: string | null
          id: string
          last_message_at: string | null
          started_at: string
          status: string
          step_number: number
        }
        Insert: {
          automation_id: string
          completed_at?: string | null
          context_data?: Json | null
          conversation_id: string
          created_at?: string
          current_node_id: string
          exit_reason?: string | null
          id?: string
          last_message_at?: string | null
          started_at?: string
          status?: string
          step_number?: number
        }
        Update: {
          automation_id?: string
          completed_at?: string | null
          context_data?: Json | null
          conversation_id?: string
          created_at?: string
          current_node_id?: string
          exit_reason?: string | null
          id?: string
          last_message_at?: string | null
          started_at?: string
          status?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sms_automation_state_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "sms_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_automation_state_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_automation_step_runs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          input_data: Json | null
          node_id: string
          node_type: string
          output_data: Json | null
          run_id: string
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          input_data?: Json | null
          node_id: string
          node_type: string
          output_data?: Json | null
          run_id: string
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          input_data?: Json | null
          node_id?: string
          node_type?: string
          output_data?: Json | null
          run_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_automation_step_runs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "sms_automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_automations: {
        Row: {
          created_at: string
          description: string | null
          flow_json: Json | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          run_count: number
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flow_json?: Json | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flow_json?: Json | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_campaign_recipients: {
        Row: {
          campaign_id: string
          contact_id: string
          id: string
          message_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          id?: string
          message_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          id?: string
          message_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sms_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sms_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_campaign_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "sms_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_campaigns: {
        Row: {
          automation_id: string | null
          batch_name: string | null
          batch_size: number | null
          created_at: string
          delivered_count: number
          failed_count: number
          id: string
          include_opt_out: boolean
          message_body: string
          name: string
          number_ids: string[] | null
          rotation: boolean
          scheduled_at: string | null
          send_speed: Json | null
          sent_count: number
          skipped_count: number
          status: string
          template_rotation: boolean
          templates: Json | null
          total_recipients: number
        }
        Insert: {
          automation_id?: string | null
          batch_name?: string | null
          batch_size?: number | null
          created_at?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          include_opt_out?: boolean
          message_body?: string
          name: string
          number_ids?: string[] | null
          rotation?: boolean
          scheduled_at?: string | null
          send_speed?: Json | null
          sent_count?: number
          skipped_count?: number
          status?: string
          template_rotation?: boolean
          templates?: Json | null
          total_recipients?: number
        }
        Update: {
          automation_id?: string | null
          batch_name?: string | null
          batch_size?: number | null
          created_at?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          include_opt_out?: boolean
          message_body?: string
          name?: string
          number_ids?: string[] | null
          rotation?: boolean
          scheduled_at?: string | null
          send_speed?: Json | null
          sent_count?: number
          skipped_count?: number
          status?: string
          template_rotation?: boolean
          templates?: Json | null
          total_recipients?: number
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaigns_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "sms_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_contact_labels: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          label_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          label_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_contact_labels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sms_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_contact_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "sms_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_contacts: {
        Row: {
          assigned_to: string | null
          batch_name: string | null
          created_at: string
          display_name: string | null
          external_id: string | null
          id: string
          notes: string | null
          opted_out: boolean
          phone_number: string
          pipeline_stage_id: string | null
          response_status: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          batch_name?: string | null
          created_at?: string
          display_name?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          opted_out?: boolean
          phone_number: string
          pipeline_stage_id?: string | null
          response_status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          batch_name?: string | null
          created_at?: string
          display_name?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          opted_out?: boolean
          phone_number?: string
          pipeline_stage_id?: string | null
          response_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_contacts_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "sms_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_conversations: {
        Row: {
          automation_enabled: boolean
          automation_id: string | null
          channel: string
          contact_id: string
          created_at: string
          id: string
          is_archived: boolean
          is_locked_by: string | null
          last_message_at: string | null
          last_message_preview: string | null
          locked_at: string | null
          number_id: string
          unread_count: number
        }
        Insert: {
          automation_enabled?: boolean
          automation_id?: string | null
          channel?: string
          contact_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_locked_by?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          locked_at?: string | null
          number_id: string
          unread_count?: number
        }
        Update: {
          automation_enabled?: boolean
          automation_id?: string | null
          channel?: string
          contact_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_locked_by?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          locked_at?: string | null
          number_id?: string
          unread_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sms_conversations_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "sms_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sms_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_conversations_number_id_fkey"
            columns: ["number_id"]
            isOneToOne: false
            referencedRelation: "sms_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_internal_notes: {
        Row: {
          author_id: string
          body: string
          conversation_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          conversation_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_internal_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_labels: {
        Row: {
          colour: string
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          colour?: string
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          colour?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          body: string
          campaign_id: string | null
          channel: string
          contact_id: string | null
          created_at: string
          direction: string
          error_code: string | null
          error_message: string | null
          from_number: string
          id: string
          media_urls: string[] | null
          number_id: string | null
          scheduled_at: string | null
          status: string
          to_number: string
          twilio_sid: string | null
        }
        Insert: {
          body?: string
          campaign_id?: string | null
          channel?: string
          contact_id?: string | null
          created_at?: string
          direction: string
          error_code?: string | null
          error_message?: string | null
          from_number: string
          id?: string
          media_urls?: string[] | null
          number_id?: string | null
          scheduled_at?: string | null
          status?: string
          to_number: string
          twilio_sid?: string | null
        }
        Update: {
          body?: string
          campaign_id?: string | null
          channel?: string
          contact_id?: string | null
          created_at?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          from_number?: string
          id?: string
          media_urls?: string[] | null
          number_id?: string | null
          scheduled_at?: string | null
          status?: string
          to_number?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sms_messages_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sms_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sms_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_number_id_fkey"
            columns: ["number_id"]
            isOneToOne: false
            referencedRelation: "sms_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_numbers: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          phone_number: string
          twilio_sid: string
          webhook_url: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          phone_number: string
          twilio_sid: string
          webhook_url?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          phone_number?: string
          twilio_sid?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      sms_opt_outs: {
        Row: {
          created_at: string
          id: string
          phone_number: string
          reason: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone_number: string
          reason?: string
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string
          reason?: string
        }
        Relationships: []
      }
      sms_pipeline_stages: {
        Row: {
          colour: string
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          colour?: string
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          colour?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      sms_quick_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          label: string
          position: number
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          label: string
          position?: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          label?: string
          position?: number
        }
        Relationships: []
      }
      sms_scheduled_tasks: {
        Row: {
          attempts: number
          created_at: string
          execute_at: string
          id: string
          last_error: string | null
          node_id: string | null
          reference_id: string
          status: string
          type: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          execute_at: string
          id?: string
          last_error?: string | null
          node_id?: string | null
          reference_id: string
          status?: string
          type: string
        }
        Update: {
          attempts?: number
          created_at?: string
          execute_at?: string
          id?: string
          last_error?: string | null
          node_id?: string | null
          reference_id?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_webhook_endpoints: {
        Row: {
          created_at: string
          id: string
          name: string
          send_window_end: string
          send_window_start: string
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          send_window_end?: string
          send_window_start?: string
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          send_window_end?: string
          send_window_start?: string
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      sms_webhook_logs: {
        Row: {
          attempt: number
          created_at: string
          endpoint_id: string | null
          error: string | null
          http_status: number | null
          id: string
          phone: string
          queue_id: string | null
          response_body: string | null
          status: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          endpoint_id?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          phone: string
          queue_id?: string | null
          response_body?: string | null
          status: string
        }
        Update: {
          attempt?: number
          created_at?: string
          endpoint_id?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          phone?: string
          queue_id?: string | null
          response_body?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_webhook_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "sms_webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_webhook_queue: {
        Row: {
          attempts: number
          contact_id: string | null
          created_at: string
          endpoint_id: string | null
          id: string
          last_error: string | null
          phone: string
          scheduled_for: string
          sent_at: string | null
          stage_id: string | null
          status: string
        }
        Insert: {
          attempts?: number
          contact_id?: string | null
          created_at?: string
          endpoint_id?: string | null
          id?: string
          last_error?: string | null
          phone: string
          scheduled_for?: string
          sent_at?: string | null
          stage_id?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          contact_id?: string | null
          created_at?: string
          endpoint_id?: string | null
          id?: string
          last_error?: string | null
          phone?: string
          scheduled_for?: string
          sent_at?: string | null
          stage_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_webhook_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sms_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_webhook_queue_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "sms_webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_webhook_settings: {
        Row: {
          delay_seconds: number
          enabled: boolean
          id: string
          move_to_stage_id: string | null
          numbers_per_hour: number
          trigger_stages: string[]
          updated_at: string
          workflow_name: string
        }
        Insert: {
          delay_seconds?: number
          enabled?: boolean
          id?: string
          move_to_stage_id?: string | null
          numbers_per_hour?: number
          trigger_stages?: string[]
          updated_at?: string
          workflow_name?: string
        }
        Update: {
          delay_seconds?: number
          enabled?: boolean
          id?: string
          move_to_stage_id?: string | null
          numbers_per_hour?: number
          trigger_stages?: string[]
          updated_at?: string
          workflow_name?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          bank_country: string
          bic: string | null
          created_at: string | null
          currency: string
          iban: string | null
          id: string
          is_verified: boolean | null
          revolut_counterparty_account_id: string | null
          revolut_counterparty_id: string | null
          sort_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_country: string
          bic?: string | null
          created_at?: string | null
          currency: string
          iban?: string | null
          id?: string
          is_verified?: boolean | null
          revolut_counterparty_account_id?: string | null
          revolut_counterparty_id?: string | null
          sort_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_country?: string
          bic?: string | null
          created_at?: string | null
          currency?: string
          iban?: string | null
          id?: string
          is_verified?: boolean | null
          revolut_counterparty_account_id?: string | null
          revolut_counterparty_id?: string | null
          sort_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_favourites: {
        Row: {
          created_at: string | null
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          id: string
          lesson_id: string
          module_id: string
          step_index: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          lesson_id: string
          module_id: string
          step_index?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          lesson_id?: string
          module_id?: string
          step_index?: number | null
          user_id?: string
        }
        Relationships: []
      }
      wa_scraper_activity: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          group_name: string | null
          id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          group_name?: string | null
          id?: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          group_name?: string | null
          id?: string
        }
        Relationships: []
      }
      wa_scraper_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      wa_scraper_deals: {
        Row: {
          created_at: string | null
          group_id: string | null
          group_name: string | null
          id: string
          images: string[] | null
          parsed_data: Json | null
          property_id: string | null
          raw_text: string | null
          sender_name: string | null
          sender_phone: string | null
          status: string | null
          wa_message_id: string | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          images?: string[] | null
          parsed_data?: Json | null
          property_id?: string | null
          raw_text?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
          wa_message_id?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          images?: string[] | null
          parsed_data?: Json | null
          property_id?: string | null
          raw_text?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_scraper_deals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "wa_scraper_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_scraper_groups: {
        Row: {
          created_at: string | null
          deals_found: number | null
          group_name: string
          id: string
          is_active: boolean | null
          last_scanned_at: string | null
          member_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deals_found?: number | null
          group_name: string
          id?: string
          is_active?: boolean | null
          last_scanned_at?: string | null
          member_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deals_found?: number | null
          group_name?: string
          id?: string
          is_active?: boolean | null
          last_scanned_at?: string | null
          member_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wk_activities: {
        Row: {
          agent_id: string | null
          body: string | null
          call_id: string | null
          contact_id: string | null
          id: string
          kind: string
          meta: Json | null
          title: string
          ts: string
        }
        Insert: {
          agent_id?: string | null
          body?: string | null
          call_id?: string | null
          contact_id?: string | null
          id?: string
          kind: string
          meta?: Json | null
          title: string
          ts?: string
        }
        Update: {
          agent_id?: string | null
          body?: string | null
          call_id?: string | null
          contact_id?: string | null
          id?: string
          kind?: string
          meta?: Json | null
          title?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_activities_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "wk_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wk_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_ai_settings: {
        Row: {
          ai_enabled: boolean
          id: string
          live_coach_enabled: boolean
          live_coach_model: string
          live_coach_system_prompt: string
          name: string
          openai_api_key: string | null
          postcall_model: string
          postcall_system_prompt: string
          updated_at: string
          updated_by: string | null
          whisper_model: string
        }
        Insert: {
          ai_enabled?: boolean
          id?: string
          live_coach_enabled?: boolean
          live_coach_model?: string
          live_coach_system_prompt?: string
          name?: string
          openai_api_key?: string | null
          postcall_model?: string
          postcall_system_prompt?: string
          updated_at?: string
          updated_by?: string | null
          whisper_model?: string
        }
        Update: {
          ai_enabled?: boolean
          id?: string
          live_coach_enabled?: boolean
          live_coach_model?: string
          live_coach_system_prompt?: string
          name?: string
          openai_api_key?: string | null
          postcall_model?: string
          postcall_system_prompt?: string
          updated_at?: string
          updated_by?: string | null
          whisper_model?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_ai_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json | null
          ts: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json | null
          ts?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_call_intelligence: {
        Row: {
          call_id: string
          cost_pence: number | null
          created_at: string
          id: string
          llm_model: string | null
          next_steps: Json | null
          objections: Json | null
          sentiment: string | null
          summary: string | null
          talk_ratio: number | null
        }
        Insert: {
          call_id: string
          cost_pence?: number | null
          created_at?: string
          id?: string
          llm_model?: string | null
          next_steps?: Json | null
          objections?: Json | null
          sentiment?: string | null
          summary?: string | null
          talk_ratio?: number | null
        }
        Update: {
          call_id?: string
          cost_pence?: number | null
          created_at?: string
          id?: string
          llm_model?: string | null
          next_steps?: Json | null
          objections?: Json | null
          sentiment?: string | null
          summary?: string | null
          talk_ratio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wk_call_intelligence_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: true
            referencedRelation: "wk_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_call_scripts: {
        Row: {
          body_md: string
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          body_md: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_call_scripts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_calls: {
        Row: {
          agent_id: string | null
          agent_note: string | null
          ai_coach_enabled: boolean
          ai_status: string | null
          answered_at: string | null
          answered_by: string | null
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          direction: string
          disposition_column_id: string | null
          duration_sec: number | null
          ended_at: string | null
          from_e164: string | null
          id: string
          number_id: string | null
          started_at: string | null
          status: string
          to_e164: string | null
          twilio_call_sid: string | null
          twilio_parent_call_sid: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_note?: string | null
          ai_coach_enabled?: boolean
          ai_status?: string | null
          answered_at?: string | null
          answered_by?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          direction: string
          disposition_column_id?: string | null
          duration_sec?: number | null
          ended_at?: string | null
          from_e164?: string | null
          id?: string
          number_id?: string | null
          started_at?: string | null
          status?: string
          to_e164?: string | null
          twilio_call_sid?: string | null
          twilio_parent_call_sid?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_note?: string | null
          ai_coach_enabled?: boolean
          ai_status?: string | null
          answered_at?: string | null
          answered_by?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          direction?: string
          disposition_column_id?: string | null
          duration_sec?: number | null
          ended_at?: string | null
          from_e164?: string | null
          id?: string
          number_id?: string | null
          started_at?: string | null
          status?: string
          to_e164?: string | null
          twilio_call_sid?: string | null
          twilio_parent_call_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wk_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_calls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wk_dialer_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wk_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_calls_disposition_column_id_fkey"
            columns: ["disposition_column_id"]
            isOneToOne: false
            referencedRelation: "wk_pipeline_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_calls_number_id_fkey"
            columns: ["number_id"]
            isOneToOne: false
            referencedRelation: "wk_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_contact_tags: {
        Row: {
          added_at: string
          added_by: string | null
          contact_id: string
          id: string
          tag: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          contact_id: string
          id?: string
          tag: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          contact_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_contact_tags_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wk_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_contacts: {
        Row: {
          created_at: string
          custom_fields: Json
          deal_value_pence: number | null
          email: string | null
          id: string
          is_hot: boolean
          last_contact_at: string | null
          name: string
          owner_agent_id: string | null
          phone: string
          pipeline_column_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json
          deal_value_pence?: number | null
          email?: string | null
          id?: string
          is_hot?: boolean
          last_contact_at?: string | null
          name: string
          owner_agent_id?: string | null
          phone: string
          pipeline_column_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json
          deal_value_pence?: number | null
          email?: string | null
          id?: string
          is_hot?: boolean
          last_contact_at?: string | null
          name?: string
          owner_agent_id?: string | null
          phone?: string
          pipeline_column_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_contacts_owner_agent_id_fkey"
            columns: ["owner_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_contacts_pipeline_column_id_fkey"
            columns: ["pipeline_column_id"]
            isOneToOne: false
            referencedRelation: "wk_pipeline_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_dialer_campaigns: {
        Row: {
          ai_coach_enabled: boolean
          ai_coach_prompt_id: string | null
          auto_advance_seconds: number
          created_at: string
          created_by: string | null
          default_outcome_column_id: string | null
          id: string
          is_active: boolean
          name: string
          parallel_lines: number
          pipeline_id: string | null
          script_md: string | null
        }
        Insert: {
          ai_coach_enabled?: boolean
          ai_coach_prompt_id?: string | null
          auto_advance_seconds?: number
          created_at?: string
          created_by?: string | null
          default_outcome_column_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          parallel_lines?: number
          pipeline_id?: string | null
          script_md?: string | null
        }
        Update: {
          ai_coach_enabled?: boolean
          ai_coach_prompt_id?: string | null
          auto_advance_seconds?: number
          created_at?: string
          created_by?: string | null
          default_outcome_column_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parallel_lines?: number
          pipeline_id?: string | null
          script_md?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wk_dialer_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_dialer_campaigns_default_outcome_column_id_fkey"
            columns: ["default_outcome_column_id"]
            isOneToOne: false
            referencedRelation: "wk_pipeline_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_dialer_campaigns_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "wk_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_dialer_queue: {
        Row: {
          agent_id: string | null
          attempts: number
          campaign_id: string
          contact_id: string
          created_at: string
          id: string
          last_attempt_at: string | null
          priority: number
          scheduled_for: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          attempts?: number
          campaign_id: string
          contact_id: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          priority?: number
          scheduled_for?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          attempts?: number
          campaign_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          priority?: number
          scheduled_for?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_dialer_queue_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_dialer_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wk_dialer_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_dialer_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wk_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          kind: string
          last_attempt_at: string | null
          last_error: string | null
          payload: Json
          scheduled_for: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          kind: string
          last_attempt_at?: string | null
          last_error?: string | null
          payload?: Json
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_attempt_at?: string | null
          last_error?: string | null
          payload?: Json
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wk_killswitches: {
        Row: {
          cleared_at: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          kind: string
          reason: string | null
          scope_agent_id: string | null
        }
        Insert: {
          cleared_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind: string
          reason?: string | null
          scope_agent_id?: string | null
        }
        Update: {
          cleared_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          reason?: string | null
          scope_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wk_killswitches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_killswitches_scope_agent_id_fkey"
            columns: ["scope_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_lead_assignments: {
        Row: {
          agent_id: string | null
          assigned_at: string | null
          campaign_id: string | null
          contact_id: string
          created_at: string
          id: string
          queue_id: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          assigned_at?: string | null
          campaign_id?: string | null
          contact_id: string
          created_at?: string
          id?: string
          queue_id?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          assigned_at?: string | null
          campaign_id?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          queue_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_lead_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_lead_assignments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wk_dialer_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_lead_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wk_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_lead_assignments_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "wk_lead_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_lead_queues: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          is_active: boolean
          mode: string
          name: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          mode: string
          name: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          mode?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_lead_queues_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wk_dialer_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_live_coach_events: {
        Row: {
          body: string | null
          call_id: string
          id: string
          kind: string
          meta: Json | null
          title: string | null
          ts: string
        }
        Insert: {
          body?: string | null
          call_id: string
          id?: string
          kind: string
          meta?: Json | null
          title?: string | null
          ts?: string
        }
        Update: {
          body?: string | null
          call_id?: string
          id?: string
          kind?: string
          meta?: Json | null
          title?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_live_coach_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "wk_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_live_transcripts: {
        Row: {
          body: string
          call_id: string
          id: string
          speaker: string
          ts: string
        }
        Insert: {
          body: string
          call_id: string
          id?: string
          speaker: string
          ts?: string
        }
        Update: {
          body?: string
          call_id?: string
          id?: string
          speaker?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_live_transcripts_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "wk_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_numbers: {
        Row: {
          assigned_agent_id: string | null
          cooldown_seconds_after_call: number
          created_at: string
          e164: string
          id: string
          last_used_at: string | null
          max_calls_per_minute: number
          recording_enabled: boolean
          rotation_pool_id: string | null
          sms_enabled: boolean
          twilio_sid: string | null
          voice_enabled: boolean
          voicemail_greeting_url: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          cooldown_seconds_after_call?: number
          created_at?: string
          e164: string
          id?: string
          last_used_at?: string | null
          max_calls_per_minute?: number
          recording_enabled?: boolean
          rotation_pool_id?: string | null
          sms_enabled?: boolean
          twilio_sid?: string | null
          voice_enabled?: boolean
          voicemail_greeting_url?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          cooldown_seconds_after_call?: number
          created_at?: string
          e164?: string
          id?: string
          last_used_at?: string | null
          max_calls_per_minute?: number
          recording_enabled?: boolean
          rotation_pool_id?: string | null
          sms_enabled?: boolean
          twilio_sid?: string | null
          voice_enabled?: boolean
          voicemail_greeting_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wk_numbers_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_pipeline_automations: {
        Row: {
          add_tag: boolean
          column_id: string
          create_task: boolean
          created_at: string
          id: string
          move_to_pipeline_id: string | null
          retry_dial: boolean
          retry_in_hours: number | null
          send_sms: boolean
          sms_template_id: string | null
          tag: string | null
          task_due_in_hours: number | null
          task_title: string | null
          updated_at: string
        }
        Insert: {
          add_tag?: boolean
          column_id: string
          create_task?: boolean
          created_at?: string
          id?: string
          move_to_pipeline_id?: string | null
          retry_dial?: boolean
          retry_in_hours?: number | null
          send_sms?: boolean
          sms_template_id?: string | null
          tag?: string | null
          task_due_in_hours?: number | null
          task_title?: string | null
          updated_at?: string
        }
        Update: {
          add_tag?: boolean
          column_id?: string
          create_task?: boolean
          created_at?: string
          id?: string
          move_to_pipeline_id?: string | null
          retry_dial?: boolean
          retry_in_hours?: number | null
          send_sms?: boolean
          sms_template_id?: string | null
          tag?: string | null
          task_due_in_hours?: number | null
          task_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_pipeline_automations_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: true
            referencedRelation: "wk_pipeline_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_pipeline_automations_move_to_pipeline_id_fkey"
            columns: ["move_to_pipeline_id"]
            isOneToOne: false
            referencedRelation: "wk_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_pipeline_automations_sms_template_fk"
            columns: ["sms_template_id"]
            isOneToOne: false
            referencedRelation: "wk_sms_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_pipeline_columns: {
        Row: {
          colour: string
          created_at: string
          icon: string | null
          id: string
          is_default_on_timeout: boolean
          name: string
          pipeline_id: string
          position: number
          sort_order: number
        }
        Insert: {
          colour?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_default_on_timeout?: boolean
          name: string
          pipeline_id: string
          position: number
          sort_order?: number
        }
        Update: {
          colour?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_default_on_timeout?: boolean
          name?: string
          pipeline_id?: string
          position?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "wk_pipeline_columns_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "wk_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_pipelines: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          scope: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          scope?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_pipelines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_recordings: {
        Row: {
          call_id: string
          channels: number
          created_at: string
          duration_sec: number | null
          id: string
          ingested_at: string | null
          retention_until: string
          size_bytes: number | null
          status: string
          storage_path: string | null
          twilio_media_url: string | null
          twilio_sid: string | null
        }
        Insert: {
          call_id: string
          channels?: number
          created_at?: string
          duration_sec?: number | null
          id?: string
          ingested_at?: string | null
          retention_until?: string
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          twilio_media_url?: string | null
          twilio_sid?: string | null
        }
        Update: {
          call_id?: string
          channels?: number
          created_at?: string
          duration_sec?: number | null
          id?: string
          ingested_at?: string | null
          retention_until?: string
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          twilio_media_url?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wk_recordings_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "wk_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_sms_templates: {
        Row: {
          body_md: string
          created_at: string
          created_by: string | null
          id: string
          merge_fields: Json
          name: string
          updated_at: string
        }
        Insert: {
          body_md: string
          created_at?: string
          created_by?: string | null
          id?: string
          merge_fields?: Json
          name: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          created_by?: string | null
          id?: string
          merge_fields?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_sms_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_tasks: {
        Row: {
          assignee_id: string | null
          body: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          body?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          body?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wk_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_terminologies: {
        Row: {
          created_at: string
          definition_md: string
          id: string
          is_active: boolean
          short_gist: string | null
          sort_order: number
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          definition_md: string
          id?: string
          is_active?: boolean
          short_gist?: string | null
          sort_order?: number
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          definition_md?: string
          id?: string
          is_active?: boolean
          short_gist?: string | null
          sort_order?: number
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      wk_transcripts: {
        Row: {
          body: string
          call_id: string
          created_at: string
          id: string
          segments: Json | null
          source: string
        }
        Insert: {
          body: string
          call_id: string
          created_at?: string
          id?: string
          segments?: Json | null
          source: string
        }
        Update: {
          body?: string
          call_id?: string
          created_at?: string
          id?: string
          segments?: Json | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_transcripts_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "wk_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_twilio_account: {
        Row: {
          account_sid: string
          auth_token: string
          connected_at: string
          connected_by: string | null
          friendly_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_sid: string
          auth_token: string
          connected_at?: string
          connected_by?: string | null
          friendly_name?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          account_sid?: string
          auth_token?: string
          connected_at?: string
          connected_by?: string | null
          friendly_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_twilio_account_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_voice_agent_limits: {
        Row: {
          agent_id: string
          block_outbound: boolean
          daily_limit_pence: number | null
          daily_spend_pence: number
          id: string
          is_admin: boolean
          spend_reset_at: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          block_outbound?: boolean
          daily_limit_pence?: number | null
          daily_spend_pence?: number
          id?: string
          is_admin?: boolean
          spend_reset_at?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          block_outbound?: boolean
          daily_limit_pence?: number | null
          daily_spend_pence?: number
          id?: string
          is_admin?: boolean
          spend_reset_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_voice_agent_limits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_voice_call_costs: {
        Row: {
          ai_cost_pence: number
          call_id: string
          carrier_cost_pence: number
          computed_at: string
          id: string
          total_pence: number | null
        }
        Insert: {
          ai_cost_pence?: number
          call_id: string
          carrier_cost_pence?: number
          computed_at?: string
          id?: string
          total_pence?: number | null
        }
        Update: {
          ai_cost_pence?: number
          call_id?: string
          carrier_cost_pence?: number
          computed_at?: string
          id?: string
          total_pence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wk_voice_call_costs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: true
            referencedRelation: "wk_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_voicemails: {
        Row: {
          call_id: string | null
          contact_id: string | null
          created_at: string
          duration_sec: number | null
          id: string
          recording_id: string | null
          transcript: string | null
        }
        Insert: {
          call_id?: string | null
          contact_id?: string | null
          created_at?: string
          duration_sec?: number | null
          id?: string
          recording_id?: string | null
          transcript?: string | null
        }
        Update: {
          call_id?: string | null
          contact_id?: string | null
          created_at?: string
          duration_sec?: number | null
          id?: string
          recording_id?: string | null
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wk_voicemails_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "wk_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_voicemails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wk_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wk_voicemails_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "wk_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      wk_webhook_outbox: {
        Row: {
          attempts: number
          created_at: string
          event_kind: string
          id: string
          last_attempt_at: string | null
          payload: Json
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_kind: string
          id?: string
          last_attempt_at?: string | null
          payload: Json
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_kind?: string
          id?: string
          last_attempt_at?: string | null
          payload?: Json
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_user_email: {
        Args: { p_email: string; p_user_id: string }
        Returns: undefined
      }
      claim_landlord_email: {
        Args: { p_new_email: string; p_user_id: string }
        Returns: boolean
      }
      create_landlord_user: {
        Args: { p_email: string; p_phone: string; p_whatsapp: string }
        Returns: string
      }
      get_property_blocked_dates: {
        Args: { p_property_id: string }
        Returns: {
          date_from: string
          date_to: string
        }[]
      }
      get_tomorrow_checkins: {
        Args: never
        Returns: {
          check_in: string
          check_out: string
          guest_email: string
          guest_first_name: string
          guest_last_name: string
          id: string
          operator_name: string
          property_name: string
          status: string
          total_amount: number
        }[]
      }
      nfs_bulk_update_listing_status: {
        Args: { new_status: string; property_ids: string[] }
        Returns: undefined
      }
      nfs_check_availability: {
        Args: { p_check_in: string; p_check_out: string; p_property_id: string }
        Returns: boolean
      }
      update_profile_tier_by_email: {
        Args: { customer_email: string; new_tier: string }
        Returns: undefined
      }
      wk_add_ai_cost: {
        Args: { p_call_id: string; p_pence: number }
        Returns: undefined
      }
      wk_apply_outcome: {
        Args: {
          p_agent_note?: string
          p_call_id: string
          p_column_id: string
          p_contact_id: string
        }
        Returns: Json
      }
      wk_check_spend: { Args: { p_agent_id: string }; Returns: Json }
      wk_claim_jobs: {
        Args: { batch_size?: number }
        Returns: {
          attempts: number
          id: string
          kind: string
          payload: Json
        }[]
      }
      wk_get_ai_settings: {
        Args: never
        Returns: {
          ai_enabled: boolean
          live_coach_enabled: boolean
          live_coach_model: string
          live_coach_system_prompt: string
          openai_api_key: string
          postcall_model: string
          postcall_system_prompt: string
          whisper_model: string
        }[]
      }
      wk_is_admin: { Args: never; Returns: boolean }
      wk_is_agent_or_admin: { Args: never; Returns: boolean }
      wk_killswitch_state: { Args: never; Returns: Json }
      wk_pick_next_lead: {
        Args: { p_agent_id: string; p_campaign_id?: string }
        Returns: {
          attempts: number
          campaign_id: string
          contact_id: string
          queue_id: string
        }[]
      }
      wk_purge_expired_recordings: { Args: never; Returns: number }
      wk_recompute_hot_leads: { Args: never; Returns: undefined }
      wk_record_carrier_cost: {
        Args: { p_call_id: string; p_pence: number }
        Returns: undefined
      }
      wk_set_killswitch: {
        Args: {
          p_active: boolean
          p_kind: string
          p_reason?: string
          p_scope_agent_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
