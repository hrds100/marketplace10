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
      inquiries: {
        Row: {
          always_authorised: boolean | null
          authorisation_type: string | null
          authorized: boolean
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
          about_photo: string | null
          accent_color: string | null
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
          faqs: Json | null
          favicon_url: string | null
          fees_options_enabled: boolean | null
          first_name: string | null
          google_analytics_id: string | null
          google_business_url: string | null
          hero_headline: string | null
          hero_photo: string | null
          hero_subheadline: string | null
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
        }
        Insert: {
          about_bio?: string | null
          about_photo?: string | null
          accent_color?: string | null
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
          faqs?: Json | null
          favicon_url?: string | null
          fees_options_enabled?: boolean | null
          first_name?: string | null
          google_analytics_id?: string | null
          google_business_url?: string | null
          hero_headline?: string | null
          hero_photo?: string | null
          hero_subheadline?: string | null
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
        }
        Update: {
          about_bio?: string | null
          about_photo?: string | null
          accent_color?: string | null
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
          faqs?: Json | null
          favicon_url?: string | null
          fees_options_enabled?: boolean | null
          first_name?: string | null
          google_analytics_id?: string | null
          google_business_url?: string | null
          hero_headline?: string | null
          hero_photo?: string | null
          hero_subheadline?: string | null
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
          description: string | null
          extra_guest_fee: Json | null
          hospitable_connected: boolean | null
          hospitable_connection_id: string | null
          hospitable_customer_id: string | null
          hospitable_last_sync_at: string | null
          hospitable_platform_mappings: Json | null
          hospitable_property_id: string | null
          hospitable_sync_status: string | null
          id: string
          images: Json | null
          inbound_calendars: Json | null
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
          description?: string | null
          extra_guest_fee?: Json | null
          hospitable_connected?: boolean | null
          hospitable_connection_id?: string | null
          hospitable_customer_id?: string | null
          hospitable_last_sync_at?: string | null
          hospitable_platform_mappings?: Json | null
          hospitable_property_id?: string | null
          hospitable_sync_status?: string | null
          id?: string
          images?: Json | null
          inbound_calendars?: Json | null
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
          description?: string | null
          extra_guest_fee?: Json | null
          hospitable_connected?: boolean | null
          hospitable_connection_id?: string | null
          hospitable_customer_id?: string | null
          hospitable_last_sync_at?: string | null
          hospitable_platform_mappings?: Json | null
          hospitable_property_id?: string | null
          hospitable_sync_status?: string | null
          id?: string
          images?: Json | null
          inbound_calendars?: Json | null
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
          check_in_time: string
          check_out: string
          check_out_time: string
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
          avatar_url: string | null
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
        }
        Insert: {
          admin_label?: string | null
          avatar_url?: string | null
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
        }
        Update: {
          admin_label?: string | null
          avatar_url?: string | null
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
        }
        Relationships: []
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
