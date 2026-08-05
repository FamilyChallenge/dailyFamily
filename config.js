// Remplis ces deux valeurs avec celles de ton projet Supabase
// (Project Settings -> API -> Project URL / anon public key)
const SUPABASE_URL = "https://TON-PROJET.supabase.co";
const SUPABASE_ANON_KEY = "TA_CLE_ANON_ICI";

const CATEGORIES = ["Photo", "Musique", "Lieu", "Autre"];

// Mot de passe pour pouvoir ajouter/supprimer des participants.
// Choisis-en un simple mais que les autres ne devineront pas facilement.
const ADMIN_PASSWORD = "change-moi";

// Notifications push : clé publique VAPID (sans risque à exposer côté client)
const VAPID_PUBLIC_KEY = "BMpWlwZ9aKFtH-IVbOLdR-VcrUndEUtlx_ZJS9k2vWciHv5apr7ovW_0LL7c5JNRahAhxydBhiqelfsBvxAKN0I";

// URL de l'Edge Function Supabase qui envoie les notifications (à remplir après l'étape 2 du guide)
const NOTIFY_FUNCTION_URL = "https://TON-PROJET.supabase.co/functions/v1/send-notification";
