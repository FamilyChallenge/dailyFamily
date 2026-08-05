// Remplis ces deux valeurs avec celles de ton projet Supabase
// (Project Settings -> API -> Project URL / anon public key)
const SUPABASE_URL = "https://doyfvqihmwzxfykvtolo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveWZ2cWlobXd6eGZ5a3Z0b2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MjUyOTQsImV4cCI6MjEwMTMwMTI5NH0.Cmv8I1OGo6IUouVR_f0EdsQT7oXMhm-DnUWnDArrjOI"; // ⚠️ à remettre : ta vraie clé anon (celle que tu avais déjà collée avant)

const CATEGORIES = ["Photo", "Musique", "Lieu", "Autre"];

// Mot de passe pour pouvoir ajouter/supprimer des participants.
// ⚠️ à remettre : ton propre mot de passe admin (pas "change-moi")
const ADMIN_PASSWORD = "change-moi";

// Notifications push : clé publique VAPID (sans risque à exposer côté client)
const VAPID_PUBLIC_KEY = "BMpWlwZ9aKFtH-IVbOLdR-VcrUndEUtlx_ZJS9k2vWciHv5apr7ovW_0LL7c5JNRahAhxydBhiqelfsBvxAKN0I";

// URL de l'Edge Function Supabase qui envoie les notifications
const NOTIFY_FUNCTION_URL = "https://doyfvqihmwzxfykvtolo.supabase.co/functions/v1/send-notification";
