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
      crm_deals: {
        Row: {
          archived: boolean
          city: string
          created_at: string
          email: string | null
          id: string
          last_contact: string | null
          name: string
          notes: string | null
          outsider_lead: boolean
          photo_url: string | null
          postcode: string
          profit: number
          property_id: string | null
          rent: number
          stage: Database["public"]["Enums"]["crm_stage"]
          type: string
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          archived?: boolean
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          notes?: string | null
          outsider_lead?: boolean
          photo_url?: string | null
          postcode?: string
          profit?: number
          property_id?: string | null
          rent?: number
          stage?: Database["public"]["Enums"]["crm_stage"]
          type?: string
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          archived?: boolean
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          notes?: string | null
          outsider_lead?: boolean
          photo_url?: string | null
          postcode?: string
          profit?: number
          property_id?: string | null
          rent?: number
          stage?: Database["public"]["Enums"]["crm_stage"]
          type?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          created_at: string
          id: string
          module_id: string | null
          order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          module_id?: string | null
          order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          module_id?: string | null
          order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          photo_url: string | null
          samcart_customer_id: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
          whatsapp_verified: boolean | null
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          photo_url?: string | null
          samcart_customer_id?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
          whatsapp_verified?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          photo_url?: string | null
          samcart_customer_id?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
          whatsapp_verified?: boolean | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          beds: number
          city: string
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          landlord_approved: boolean | null
          landlord_whatsapp: string | null
          name: string
          photos: string[] | null
          postcode: string
          profit_est: number
          rent_monthly: number
          status: Database["public"]["Enums"]["property_status"]
          type: string
          updated_at: string
          submitted_by: string | null
          property_category: string | null
          bedrooms: number | null
          bathrooms: number | null
          garage: boolean
          deposit: number | null
          agent_fee: number | null
          sa_approved: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          contact_email: string | null
          notes: string | null
        }
        Insert: {
          beds?: number
          city: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          landlord_approved?: boolean
          landlord_whatsapp?: string | null
          name: string
          photos?: string[] | null
          postcode?: string
          profit_est?: number
          rent_monthly?: number
          status?: Database["public"]["Enums"]["property_status"]
          type?: string
          updated_at?: string
          submitted_by?: string | null
          property_category?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          garage?: boolean
          deposit?: number | null
          agent_fee?: number | null
          sa_approved?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          contact_email?: string | null
          notes?: string | null
        }
        Update: {
          beds?: number
          city?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          landlord_approved?: boolean
          landlord_whatsapp?: string | null
          name?: string
          photos?: string[] | null
          postcode?: string
          profit_est?: number
          rent_monthly?: number
          status?: Database["public"]["Enums"]["property_status"]
          type?: string
          updated_at?: string
          submitted_by?: string | null
          property_category?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          garage?: boolean
          deposit?: number | null
          agent_fee?: number | null
          sa_approved?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          contact_email?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          samcart_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          samcart_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          samcart_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      crm_stage:
        | "New Lead"
        | "Under Negotiation"
        | "Contract Sent"
        | "Follow Up"
        | "Closed"
        | "Portfolio"
      property_status: "live" | "on-offer" | "inactive"
      subscription_status: "active" | "cancelled" | "paused" | "trial"
      subscription_tier: "monthly" | "yearly" | "lifetime"
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
    Enums: {
      app_role: ["admin", "user"],
      crm_stage: [
        "New Lead",
        "Under Negotiation",
        "Contract Sent",
        "Follow Up",
        "Closed",
        "Portfolio",
      ],
      property_status: ["live", "on-offer", "inactive"],
      subscription_status: ["active", "cancelled", "paused", "trial"],
      subscription_tier: ["monthly", "yearly", "lifetime"],
    },
  },
} as const
