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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
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
          city: string | null
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          phone: string | null
          property_name: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          property_name?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          property_name?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          id: string
          name: string | null
          notif_email_daily: boolean | null
          notif_whatsapp_daily: boolean | null
          notif_whatsapp_new_deals: boolean | null
          notif_whatsapp_status: boolean | null
          photo_url: string | null
          role: string | null
          samcart_cust_id: string | null
          suspended: boolean | null
          tier: string | null
          whatsapp: string | null
          whatsapp_verified: boolean | null
        }
        Insert: {
          id: string
          name?: string | null
          notif_email_daily?: boolean | null
          notif_whatsapp_daily?: boolean | null
          notif_whatsapp_new_deals?: boolean | null
          notif_whatsapp_status?: boolean | null
          photo_url?: string | null
          role?: string | null
          samcart_cust_id?: string | null
          suspended?: boolean | null
          tier?: string | null
          whatsapp?: string | null
          whatsapp_verified?: boolean | null
        }
        Update: {
          id?: string
          name?: string | null
          notif_email_daily?: boolean | null
          notif_whatsapp_daily?: boolean | null
          notif_whatsapp_new_deals?: boolean | null
          notif_whatsapp_status?: boolean | null
          photo_url?: string | null
          role?: string | null
          samcart_cust_id?: string | null
          suspended?: boolean | null
          tier?: string | null
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
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string | null
          days_since_added: number | null
          deposit: number | null
          description: string | null
          edit_requested_at: string | null
          estimated_monthly_revenue: number | null
          estimated_nightly_rate: number | null
          estimated_profit: number | null
          estimation_confidence: string | null
          estimation_notes: string | null
          featured: boolean | null
          garage: boolean | null
          id: string
          in_crm: boolean | null
          landlord_whatsapp: string | null
          name: string | null
          notes: string | null
          pending_reason: string | null
          photos: string[] | null
          postcode: string | null
          profit_est: number | null
          property_category: string | null
          rent_monthly: number | null
          sa_approved: string | null
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
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          days_since_added?: number | null
          deposit?: number | null
          description?: string | null
          edit_requested_at?: string | null
          estimated_monthly_revenue?: number | null
          estimated_nightly_rate?: number | null
          estimated_profit?: number | null
          estimation_confidence?: string | null
          estimation_notes?: string | null
          featured?: boolean | null
          garage?: boolean | null
          id?: string
          in_crm?: boolean | null
          landlord_whatsapp?: string | null
          name?: string | null
          notes?: string | null
          pending_reason?: string | null
          photos?: string[] | null
          postcode?: string | null
          profit_est?: number | null
          property_category?: string | null
          rent_monthly?: number | null
          sa_approved?: string | null
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
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          days_since_added?: number | null
          deposit?: number | null
          description?: string | null
          edit_requested_at?: string | null
          estimated_monthly_revenue?: number | null
          estimated_nightly_rate?: number | null
          estimated_profit?: number | null
          estimation_confidence?: string | null
          estimation_notes?: string | null
          featured?: boolean | null
          garage?: boolean | null
          id?: string
          in_crm?: boolean | null
          landlord_whatsapp?: string | null
          name?: string | null
          notes?: string | null
          pending_reason?: string | null
          photos?: string[] | null
          postcode?: string | null
          profit_est?: number | null
          property_category?: string | null
          rent_monthly?: number | null
          sa_approved?: string | null
          status?: string | null
          submitted_by?: string | null
          type?: string | null
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
