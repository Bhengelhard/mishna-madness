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
      users: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          created_at?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          seed: number | null
          eliminated: boolean
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          seed?: number | null
          eliminated?: boolean
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          seed?: number | null
          eliminated?: boolean
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          id: string
          name: string
          status: 'registration' | 'active' | 'completed'
          current_round: number
          registration_deadline: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: 'registration' | 'active' | 'completed'
          current_round?: number
          registration_deadline: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'registration' | 'active' | 'completed'
          current_round?: number
          registration_deadline?: string
          created_at?: string
        }
        Relationships: []
      }
      rounds: {
        Row: {
          id: string
          tournament_id: string
          round_number: number
          start_date: string
          end_date: string
          special_seder: string | null
          status: 'upcoming' | 'active' | 'completed'
        }
        Insert: {
          id?: string
          tournament_id: string
          round_number: number
          start_date: string
          end_date: string
          special_seder?: string | null
          status?: 'upcoming' | 'active' | 'completed'
        }
        Update: {
          id?: string
          tournament_id?: string
          round_number?: number
          start_date?: string
          end_date?: string
          special_seder?: string | null
          status?: 'upcoming' | 'active' | 'completed'
        }
        Relationships: []
      }
      matchups: {
        Row: {
          id: string
          round_id: string
          matchup_number: number
          participant_1_id: string | null
          participant_2_id: string | null
          special_masechta: string
          winner_id: string | null
          next_matchup_id: string | null
          p1_total_score: number
          p2_total_score: number
        }
        Insert: {
          id?: string
          round_id: string
          matchup_number: number
          participant_1_id?: string | null
          participant_2_id?: string | null
          special_masechta: string
          winner_id?: string | null
          next_matchup_id?: string | null
          p1_total_score?: number
          p2_total_score?: number
        }
        Update: {
          id?: string
          round_id?: string
          matchup_number?: number
          participant_1_id?: string | null
          participant_2_id?: string | null
          special_masechta?: string
          winner_id?: string | null
          next_matchup_id?: string | null
          p1_total_score?: number
          p2_total_score?: number
        }
        Relationships: []
      }
      score_submissions: {
        Row: {
          id: string
          matchup_id: string
          participant_id: string
          masechta: string
          seder: string
          mishnayos_count: number
          is_special_masechta: boolean
          is_special_seder: boolean
          learned_entire_masechta: boolean
          raw_points: number
          multiplied_points: number
          submitted_at: string
          is_late: boolean
        }
        Insert: {
          id?: string
          matchup_id: string
          participant_id: string
          masechta: string
          seder: string
          mishnayos_count: number
          is_special_masechta: boolean
          is_special_seder: boolean
          learned_entire_masechta: boolean
          raw_points: number
          multiplied_points: number
          submitted_at?: string
          is_late?: boolean
        }
        Update: {
          id?: string
          matchup_id?: string
          participant_id?: string
          masechta?: string
          seder?: string
          mishnayos_count?: number
          is_special_masechta?: boolean
          is_special_seder?: boolean
          learned_entire_masechta?: boolean
          raw_points?: number
          multiplied_points?: number
          submitted_at?: string
          is_late?: boolean
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          id: string
          participant_id: string
          type: 'bracket_update' | 'reminder_5pm' | 'reminder_9pm' | 'late_grace_8am' | 'round_results'
          sent_at: string
          channel: 'email' | 'sms'
        }
        Insert: {
          id?: string
          participant_id: string
          type: 'bracket_update' | 'reminder_5pm' | 'reminder_9pm' | 'late_grace_8am' | 'round_results'
          sent_at?: string
          channel: 'email' | 'sms'
        }
        Update: {
          id?: string
          participant_id?: string
          type?: 'bracket_update' | 'reminder_5pm' | 'reminder_9pm' | 'late_grace_8am' | 'round_results'
          sent_at?: string
          channel?: 'email' | 'sms'
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience type aliases
export type User = Database['public']['Tables']['users']['Row']
export type Participant = Database['public']['Tables']['participants']['Row']
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type Round = Database['public']['Tables']['rounds']['Row']
export type Matchup = Database['public']['Tables']['matchups']['Row']
export type ScoreSubmission = Database['public']['Tables']['score_submissions']['Row']
export type NotificationLog = Database['public']['Tables']['notifications_log']['Row']

// Insert type aliases
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type ParticipantInsert = Database['public']['Tables']['participants']['Insert']
export type TournamentInsert = Database['public']['Tables']['tournaments']['Insert']
export type RoundInsert = Database['public']['Tables']['rounds']['Insert']
export type MatchupInsert = Database['public']['Tables']['matchups']['Insert']
export type ScoreSubmissionInsert = Database['public']['Tables']['score_submissions']['Insert']
export type NotificationLogInsert = Database['public']['Tables']['notifications_log']['Insert']

// Update type aliases
export type UserUpdate = Database['public']['Tables']['users']['Update']
export type ParticipantUpdate = Database['public']['Tables']['participants']['Update']
export type TournamentUpdate = Database['public']['Tables']['tournaments']['Update']
export type RoundUpdate = Database['public']['Tables']['rounds']['Update']
export type MatchupUpdate = Database['public']['Tables']['matchups']['Update']
export type ScoreSubmissionUpdate = Database['public']['Tables']['score_submissions']['Update']
export type NotificationLogUpdate = Database['public']['Tables']['notifications_log']['Update']

// Enum type aliases
export type TournamentStatus = Tournament['status']
export type RoundStatus = Round['status']
export type NotificationType = NotificationLog['type']
export type NotificationChannel = NotificationLog['channel']
