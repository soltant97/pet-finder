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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      found_reports: {
        Row: {
          area: string | null
          city: string | null
          created_at: string
          description: string | null
          finder_id: string
          found_at: string | null
          id: string
          photo_paths: string[]
          species: Database["public"]["Enums"]["pet_species"] | null
        }
        Insert: {
          area?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          finder_id: string
          found_at?: string | null
          id?: string
          photo_paths?: string[]
          species?: Database["public"]["Enums"]["pet_species"] | null
        }
        Update: {
          area?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          finder_id?: string
          found_at?: string | null
          id?: string
          photo_paths?: string[]
          species?: Database["public"]["Enums"]["pet_species"] | null
        }
        Relationships: []
      }
      lost_reports: {
        Row: {
          circumstances: string
          created_at: string
          last_location: string
          last_seen_date: string
          owner_id: string
          pet_id: string
          updated_at: string
        }
        Insert: {
          circumstances: string
          created_at?: string
          last_location: string
          last_seen_date: string
          owner_id: string
          pet_id: string
          updated_at?: string
        }
        Update: {
          circumstances?: string
          created_at?: string
          last_location?: string
          last_seen_date?: string
          owner_id?: string
          pet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_reports_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_photos: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          pet_id: string
          position: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          pet_id: string
          position?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          pet_id?: string
          position?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_photos_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age: string | null
          breed: string | null
          color: string
          created_at: string
          description: string | null
          id: string
          marks: string | null
          microchip: string | null
          name: string
          owner_id: string
          sex: Database["public"]["Enums"]["pet_sex"]
          species: Database["public"]["Enums"]["pet_species"]
          status: Database["public"]["Enums"]["pet_status"]
          updated_at: string
        }
        Insert: {
          age?: string | null
          breed?: string | null
          color: string
          created_at?: string
          description?: string | null
          id?: string
          marks?: string | null
          microchip?: string | null
          name: string
          owner_id: string
          sex?: Database["public"]["Enums"]["pet_sex"]
          species: Database["public"]["Enums"]["pet_species"]
          status?: Database["public"]["Enums"]["pet_status"]
          updated_at?: string
        }
        Update: {
          age?: string | null
          breed?: string | null
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          marks?: string | null
          microchip?: string | null
          name?: string
          owner_id?: string
          sex?: Database["public"]["Enums"]["pet_sex"]
          species?: Database["public"]["Enums"]["pet_species"]
          status?: Database["public"]["Enums"]["pet_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_username: { Args: never; Returns: string }
      get_lost_pets: {
        Args: never
        Returns: {
          age: string
          breed: string
          circumstances: string
          color: string
          id: string
          last_location: string
          last_seen_date: string
          marks: string
          name: string
          photo_paths: string[]
          reported_at: string
          sex: Database["public"]["Enums"]["pet_sex"]
          species: Database["public"]["Enums"]["pet_species"]
        }[]
      }
      is_lost_pet_photo: { Args: { _path: string }; Returns: boolean }
      is_username_available: { Args: { _username: string }; Returns: boolean }
      search_lost_pets: {
        Args: {
          _found_date?: string
          _location_term?: string
          _species?: Database["public"]["Enums"]["pet_species"]
        }
        Returns: {
          age: string
          breed: string
          circumstances: string
          color: string
          id: string
          last_location: string
          last_seen_date: string
          marks: string
          name: string
          photo_paths: string[]
          reported_at: string
          sex: Database["public"]["Enums"]["pet_sex"]
          species: Database["public"]["Enums"]["pet_species"]
        }[]
      }
    }
    Enums: {
      pet_sex: "hane" | "hona" | "okant"
      pet_species: "katt" | "hund" | "annat"
      pet_status: "registrerad" | "borttappad" | "aterfunnen"
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
      pet_sex: ["hane", "hona", "okant"],
      pet_species: ["katt", "hund", "annat"],
      pet_status: ["registrerad", "borttappad", "aterfunnen"],
    },
  },
} as const
